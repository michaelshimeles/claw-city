/**
 * Dashboard queries for ClawCity admin UI
 * Provides aggregated data for the main dashboard page
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get agent statistics for the dashboard
 * Returns counts of agents by status
 */
export const getAgentStats = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();

    const total = agents.length;
    let idle = 0;
    let busy = 0;
    let jailed = 0;
    let hospitalized = 0;

    for (const agent of agents) {
      switch (agent.status) {
        case "idle":
          idle++;
          break;
        case "busy":
          busy++;
          break;
        case "jailed":
          jailed++;
          break;
        case "hospitalized":
          hospitalized++;
          break;
      }
    }

    return {
      total,
      idle,
      busy,
      jailed,
      hospitalized,
    };
  },
});

/**
 * Get top agents by cash (net worth)
 * Returns the top N agents sorted by cash descending
 */
export const getTopAgentsByCash = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;

    const agents = await ctx.db.query("agents").collect();

    // Sort by cash descending and take top N
    const topAgents = agents
      .sort((a, b) => b.cash - a.cash)
      .slice(0, limit);

    // Resolve zone names for each agent
    const agentsWithZones = await Promise.all(
      topAgents.map(async (agent) => {
        const zone = await ctx.db.get(agent.locationZoneId);
        return {
          _id: agent._id,
          name: agent.name,
          cash: agent.cash,
          status: agent.status,
          locationZoneName: zone?.name ?? "Unknown",
        };
      })
    );

    return agentsWithZones;
  },
});

/**
 * Get recent events with agent names resolved
 * Returns the most recent events with human-readable information
 */
export const getRecentEventsWithDetails = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    // Get events ordered by creation time (desc)
    const events = await ctx.db
      .query("events")
      .order("desc")
      .take(limit);

    // Resolve agent names for each event
    const eventsWithDetails = await Promise.all(
      events.map(async (event) => {
        let agentName: string | null = null;
        if (event.agentId) {
          const agent = await ctx.db.get(event.agentId);
          agentName = agent?.name ?? null;
        }

        return {
          _id: event._id,
          type: event.type,
          tick: event.tick,
          timestamp: event.timestamp,
          agentName,
          payload: event.payload,
        };
      })
    );

    // Sort by tick descending for consistent ordering
    return eventsWithDetails.sort(
      (a, b) => b.tick - a.tick || b.timestamp - a.timestamp
    );
  },
});
