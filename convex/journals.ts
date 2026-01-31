/**
 * Journal queries for ClawCity
 * Agent reflection and thought logs
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get journal entries for a specific agent
 */
export const getAgentJournal = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const entries = await ctx.db
      .query("journals")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);

    const agent = await ctx.db.get(args.agentId);

    return {
      agent: agent
        ? { _id: agent._id, name: agent.name, status: agent.status }
        : null,
      entries,
    };
  },
});

/**
 * Get recent journal entries across all agents
 */
export const getRecentJournals = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const entries = await ctx.db
      .query("journals")
      .order("desc")
      .take(limit);

    // Get unique agent IDs
    const agentIds = [...new Set(entries.map((e) => e.agentId))];
    const agents = await Promise.all(agentIds.map((id) => ctx.db.get(id)));

    const agentsById: Record<string, { name: string; status: string }> = {};
    for (let i = 0; i < agentIds.length; i++) {
      const agent = agents[i];
      if (agent) {
        agentsById[agentIds[i].toString()] = {
          name: agent.name,
          status: agent.status,
        };
      }
    }

    return entries.map((entry) => ({
      ...entry,
      agentName: agentsById[entry.agentId.toString()]?.name ?? "Unknown",
      agentStatus: agentsById[entry.agentId.toString()]?.status ?? "unknown",
    }));
  },
});

/**
 * Get a single journal entry by ID
 */
export const getJournalEntry = query({
  args: { entryId: v.id("journals") },
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);
    if (!entry) return null;

    const agent = await ctx.db.get(entry.agentId);

    return {
      ...entry,
      agentName: agent?.name ?? "Unknown",
      agentStatus: agent?.status ?? "unknown",
    };
  },
});

/**
 * Get agents that have journal entries
 */
export const getAgentsWithJournals = query({
  args: {},
  handler: async (ctx) => {
    const entries = await ctx.db.query("journals").collect();

    // Get unique agent IDs and count entries
    const agentIds = new Set<string>();
    const entryCounts: Record<string, number> = {};
    for (const entry of entries) {
      const id = entry.agentId.toString();
      agentIds.add(id);
      entryCounts[id] = (entryCounts[id] ?? 0) + 1;
    }

    if (agentIds.size === 0) {
      return [];
    }

    // Fetch all agents and filter to those with journals
    const allAgents = await ctx.db.query("agents").collect();
    const agentsWithJournals = allAgents.filter((a) =>
      agentIds.has(a._id.toString())
    );

    return agentsWithJournals
      .map((a) => ({
        _id: a._id,
        name: a.name,
        status: a.status,
        entryCount: entryCounts[a._id.toString()] ?? 0,
      }))
      .sort((a, b) => b.entryCount - a.entryCount);
  },
});
