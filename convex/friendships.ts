/**
 * Friendship queries for ClawCity
 * Provides detailed friendship data for agents
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all friendships for an agent
 */
export const listFriendships = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    // Get friendships where agent is agent1
    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_agent1Id", (q) => q.eq("agent1Id", args.agentId))
      .collect();

    // Get friendships where agent is agent2
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

    // Get zones for location info
    const zones = await ctx.db.query("zones").collect();
    const zonesById: Record<string, string> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = zone.name;
    }

    return allFriendships.map((f, i) => {
      const friendAgent = friendAgents[i];
      const isInitiator = f.initiatorId === args.agentId;

      return {
        _id: f._id,
        friendId: friendIds[i],
        friendName: friendAgent?.name ?? "Unknown",
        friendStatus: friendAgent?.status ?? "unknown",
        friendLocation: friendAgent
          ? zonesById[friendAgent.locationZoneId.toString()] ?? "Unknown"
          : "Unknown",
        status: f.status,
        strength: f.strength,
        loyalty: f.loyalty,
        isInitiator,
        createdAt: f.createdAt,
        lastInteractionTick: f.lastInteractionTick,
        // Derived status
        isStrong: f.strength >= 75,
        isLoyal: f.loyalty >= 75,
      };
    });
  },
});

/**
 * Get pending friend requests for an agent
 */
export const getPendingRequests = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    // Get all pending friendships
    const pendingFriendships = await ctx.db
      .query("friendships")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Filter to ones involving this agent
    const relevant = pendingFriendships.filter(
      (f) => f.agent1Id === args.agentId || f.agent2Id === args.agentId
    );

    // Separate into incoming and outgoing
    const incoming: Array<{
      _id: string;
      fromAgentId: string;
      fromAgentName: string;
      createdAt: number;
    }> = [];

    const outgoing: Array<{
      _id: string;
      toAgentId: string;
      toAgentName: string;
      createdAt: number;
    }> = [];

    for (const f of relevant) {
      const otherId =
        f.agent1Id === args.agentId ? f.agent2Id : f.agent1Id;
      const otherAgent = await ctx.db.get(otherId);

      if (f.initiatorId === args.agentId) {
        // Outgoing request
        outgoing.push({
          _id: f._id.toString(),
          toAgentId: otherId.toString(),
          toAgentName: otherAgent?.name ?? "Unknown",
          createdAt: f.createdAt,
        });
      } else {
        // Incoming request
        incoming.push({
          _id: f._id.toString(),
          fromAgentId: otherId.toString(),
          fromAgentName: otherAgent?.name ?? "Unknown",
          createdAt: f.createdAt,
        });
      }
    }

    return {
      incoming,
      outgoing,
      totalPending: incoming.length + outgoing.length,
    };
  },
});

/**
 * Get detailed friendship between two agents
 */
export const getFriendDetail = query({
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

    if (!friendship) {
      return null;
    }

    // Get both agents
    const [agent1, agent2] = await Promise.all([
      ctx.db.get(args.agent1Id),
      ctx.db.get(args.agent2Id),
    ]);

    // Get zones
    const zones = await ctx.db.query("zones").collect();
    const zonesById: Record<string, string> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = zone.name;
    }

    // Get world for current tick
    const world = await ctx.db.query("world").first();
    const currentTick = world?.tick ?? 0;

    // Calculate interaction stats
    const ticksSinceInteraction = currentTick - friendship.lastInteractionTick;
    const isStale = ticksSinceInteraction > 100;

    return {
      _id: friendship._id,
      status: friendship.status,
      strength: friendship.strength,
      loyalty: friendship.loyalty,
      initiatorId: friendship.initiatorId,
      createdAt: friendship.createdAt,
      lastInteractionTick: friendship.lastInteractionTick,
      ticksSinceInteraction,
      isStale,
      isStrong: friendship.strength >= 75,
      isLoyal: friendship.loyalty >= 75,
      agent1: agent1
        ? {
            _id: agent1._id,
            name: agent1.name,
            status: agent1.status,
            location: zonesById[agent1.locationZoneId.toString()] ?? "Unknown",
          }
        : null,
      agent2: agent2
        ? {
            _id: agent2._id,
            name: agent2.name,
            status: agent2.status,
            location: zonesById[agent2.locationZoneId.toString()] ?? "Unknown",
          }
        : null,
    };
  },
});

/**
 * Get friendship stats for an agent
 */
export const getFriendshipStats = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    // Get all accepted friendships
    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_agent1Id", (q) => q.eq("agent1Id", args.agentId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const friendships2 = await ctx.db
      .query("friendships")
      .withIndex("by_agent2Id", (q) => q.eq("agent2Id", args.agentId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();

    const allFriendships = [...friendships1, ...friendships2];

    const totalFriends = allFriendships.length;
    const strongFriends = allFriendships.filter((f) => f.strength >= 75).length;
    const loyalFriends = allFriendships.filter((f) => f.loyalty >= 75).length;
    const avgStrength =
      totalFriends > 0
        ? Math.round(
            allFriendships.reduce((sum, f) => sum + f.strength, 0) / totalFriends
          )
        : 0;
    const avgLoyalty =
      totalFriends > 0
        ? Math.round(
            allFriendships.reduce((sum, f) => sum + f.loyalty, 0) / totalFriends
          )
        : 0;

    return {
      totalFriends,
      strongFriends,
      loyalFriends,
      avgStrength,
      avgLoyalty,
    };
  },
});
