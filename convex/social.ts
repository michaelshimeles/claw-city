/**
 * Social network queries for ClawCity
 * Provides relationship data for social graph visualization
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all relationships for a specific agent
 */
export const getAgentRelationships = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return null;
    }

    // Get all friendships where this agent is involved
    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_agent1Id", (q) => q.eq("agent1Id", args.agentId))
      .collect();

    const friendships2 = await ctx.db
      .query("friendships")
      .withIndex("by_agent2Id", (q) => q.eq("agent2Id", args.agentId))
      .collect();

    const allFriendships = [...friendships1, ...friendships2];

    // Get friend agent details
    const friendIds = allFriendships.map((f) =>
      f.agent1Id === args.agentId ? f.agent2Id : f.agent1Id
    );
    const friendAgents = await Promise.all(
      friendIds.map((id) => ctx.db.get(id))
    );

    const friends = allFriendships
      .filter((f) => f.status === "accepted")
      .map((f, i) => {
        const friendAgent = friendAgents[i];
        return {
          friendshipId: f._id,
          agentId: friendIds[i],
          name: friendAgent?.name ?? "Unknown",
          strength: f.strength,
          loyalty: f.loyalty,
          lastInteractionTick: f.lastInteractionTick,
        };
      });

    // Get gang members if in a gang
    let gangMembers: Array<{
      agentId: string;
      name: string;
      role: string;
    }> = [];

    if (agent.gangId) {
      const memberships = await ctx.db
        .query("gangMembers")
        .withIndex("by_gangId", (q) => q.eq("gangId", agent.gangId!))
        .collect();

      const memberAgents = await Promise.all(
        memberships.map((m) => ctx.db.get(m.agentId))
      );

      gangMembers = memberships
        .filter((m) => m.agentId !== args.agentId)
        .map((m, i) => ({
          agentId: m.agentId.toString(),
          name: memberAgents[i]?.name ?? "Unknown",
          role: m.role,
        }));
    }

    // Get betrayal count from social stats
    const betrayals = agent.socialStats?.betrayals ?? 0;

    return {
      agent: {
        _id: agent._id,
        name: agent.name,
        gangId: agent.gangId,
      },
      friends,
      gangMembers,
      betrayals,
      totalFriends: friends.length,
    };
  },
});

/**
 * Get full social network for graph visualization
 */
export const getSocialNetwork = query({
  args: {},
  handler: async (ctx) => {
    // Get all agents (nodes)
    const agents = await ctx.db.query("agents").collect();

    // Get all accepted friendships (edges)
    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .collect();

    // Get all gang memberships
    const gangMembers = await ctx.db.query("gangMembers").collect();

    // Get all gangs
    const gangs = await ctx.db.query("gangs").collect();
    const gangsById: Record<string, { name: string; tag: string; color: string }> = {};
    for (const gang of gangs) {
      gangsById[gang._id.toString()] = { name: gang.name, tag: gang.tag, color: gang.color };
    }

    // Build nodes
    const nodes = agents.map((agent) => {
      const gang = agent.gangId ? gangsById[agent.gangId.toString()] : null;
      return {
        id: agent._id.toString(),
        name: agent.name,
        gangId: agent.gangId?.toString() ?? null,
        gangName: gang?.name ?? null,
        gangTag: gang?.tag ?? null,
        gangColor: gang?.color ?? null,
        status: agent.status,
        reputation: agent.reputation,
        heat: agent.heat,
        betrayals: agent.socialStats?.betrayals ?? 0,
        isBetrayer: (agent.socialStats?.betrayals ?? 0) > 0,
      };
    });

    // Build friendship edges
    const friendshipEdges = friendships.map((f) => ({
      id: f._id.toString(),
      source: f.agent1Id.toString(),
      target: f.agent2Id.toString(),
      type: "friendship" as const,
      strength: f.strength,
      loyalty: f.loyalty,
    }));

    // Build gang membership edges (for clustering)
    const gangEdges: Array<{
      id: string;
      source: string;
      target: string;
      type: "gang";
      gangId: string;
    }> = [];

    // Group members by gang
    const membersByGang: Record<string, string[]> = {};
    for (const membership of gangMembers) {
      const gangId = membership.gangId.toString();
      if (!membersByGang[gangId]) {
        membersByGang[gangId] = [];
      }
      membersByGang[gangId].push(membership.agentId.toString());
    }

    // Create edges between gang members (for clustering effect)
    for (const [gangId, members] of Object.entries(membersByGang)) {
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          gangEdges.push({
            id: `gang-${gangId}-${i}-${j}`,
            source: members[i],
            target: members[j],
            type: "gang",
            gangId,
          });
        }
      }
    }

    return {
      nodes,
      edges: [...friendshipEdges, ...gangEdges],
      gangs: Object.entries(gangsById).map(([id, gang]) => ({
        id,
        ...gang,
        memberCount: membersByGang[id]?.length ?? 0,
      })),
    };
  },
});

/**
 * Get agents with betrayal history
 */
export const getBetrayers = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();

    const betrayers = agents
      .filter((a) => (a.socialStats?.betrayals ?? 0) > 0)
      .sort(
        (a, b) =>
          (b.socialStats?.betrayals ?? 0) - (a.socialStats?.betrayals ?? 0)
      )
      .map((agent) => ({
        _id: agent._id,
        name: agent.name,
        betrayals: agent.socialStats?.betrayals ?? 0,
        reputation: agent.reputation,
        status: agent.status,
        gangBanUntilTick: agent.gangBanUntilTick ?? null,
      }));

    return betrayers;
  },
});

/**
 * Get relationship between two specific agents
 */
export const getRelationshipBetween = query({
  args: {
    agent1Id: v.id("agents"),
    agent2Id: v.id("agents"),
  },
  handler: async (ctx, args) => {
    // Ensure consistent ordering for lookup
    const [lowerId, higherId] =
      args.agent1Id < args.agent2Id
        ? [args.agent1Id, args.agent2Id]
        : [args.agent2Id, args.agent1Id];

    // Find friendship
    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_agent1Id", (q) => q.eq("agent1Id", lowerId))
      .collect();

    const friendship = friendships.find((f) => f.agent2Id === higherId);

    // Get both agents
    const [agent1, agent2] = await Promise.all([
      ctx.db.get(args.agent1Id),
      ctx.db.get(args.agent2Id),
    ]);

    // Check if in same gang
    const sameGang =
      agent1?.gangId && agent2?.gangId && agent1.gangId === agent2.gangId;

    return {
      agent1: agent1 ? { _id: agent1._id, name: agent1.name } : null,
      agent2: agent2 ? { _id: agent2._id, name: agent2.name } : null,
      friendship: friendship
        ? {
            _id: friendship._id,
            status: friendship.status,
            strength: friendship.strength,
            loyalty: friendship.loyalty,
            initiatorId: friendship.initiatorId,
            lastInteractionTick: friendship.lastInteractionTick,
          }
        : null,
      sameGang,
      gangId: sameGang ? agent1?.gangId : null,
    };
  },
});
