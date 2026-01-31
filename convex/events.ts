import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { DEFAULTS } from "./lib/constants";

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Log an event to the events table
 * This is an internal mutation - it can only be called from other Convex functions,
 * not directly from clients
 */
export const logEvent = internalMutation({
  args: {
    type: v.string(),
    agentId: v.optional(v.id("agents")),
    zoneId: v.optional(v.id("zones")),
    entityId: v.optional(v.string()),
    payload: v.any(),
    requestId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get current tick from world
    const world = await ctx.db.query("world").first();
    const tick = world?.tick ?? 0;

    const eventId = await ctx.db.insert("events", {
      tick,
      timestamp: Date.now(),
      type: args.type,
      agentId: args.agentId ?? null,
      zoneId: args.zoneId ?? null,
      entityId: args.entityId ?? null,
      payload: args.payload,
      requestId: args.requestId ?? null,
    });

    return eventId;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get events with optional filters
 * Returns events sorted by tick descending (most recent first)
 */
export const getEvents = query({
  args: {
    sinceTick: v.optional(v.number()),
    agentId: v.optional(v.id("agents")),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(
      args.limit ?? DEFAULTS.defaultEventsLimit,
      DEFAULTS.maxEventsPerQuery
    );

    let events;

    // Choose the best index based on filters provided
    if (args.agentId) {
      // Use by_agentId index
      events = await ctx.db
        .query("events")
        .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId!))
        .order("desc")
        .collect();
    } else if (args.type) {
      // Use by_type index
      events = await ctx.db
        .query("events")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .order("desc")
        .collect();
    } else if (args.sinceTick !== undefined) {
      // Use by_tick index for tick-based filtering
      events = await ctx.db
        .query("events")
        .withIndex("by_tick", (q) => q.gte("tick", args.sinceTick!))
        .order("desc")
        .collect();
    } else {
      // No specific filter, get all events ordered by creation time (desc)
      events = await ctx.db.query("events").order("desc").collect();
    }

    // Apply additional filters in memory if needed
    let filtered = events;

    if (args.sinceTick !== undefined && args.agentId) {
      // If we used agentId index but also need sinceTick filter
      filtered = filtered.filter((e) => e.tick >= args.sinceTick!);
    }

    if (args.sinceTick !== undefined && args.type) {
      // If we used type index but also need sinceTick filter
      filtered = filtered.filter((e) => e.tick >= args.sinceTick!);
    }

    if (args.type && args.agentId) {
      // If we used agentId index but also need type filter
      filtered = filtered.filter((e) => e.type === args.type);
    }

    // Sort by tick descending and apply limit
    return filtered
      .sort((a, b) => b.tick - a.tick || b.timestamp - a.timestamp)
      .slice(0, limit);
  },
});

/**
 * Get events for a specific agent
 * Returns events sorted by tick descending (most recent first)
 */
export const getAgentEvents = query({
  args: {
    agentId: v.id("agents"),
    sinceTick: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(
      args.limit ?? DEFAULTS.defaultEventsLimit,
      DEFAULTS.maxEventsPerQuery
    );

    // Use the by_agentId index
    let events = await ctx.db
      .query("events")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .collect();

    // Filter by sinceTick if provided
    if (args.sinceTick !== undefined) {
      events = events.filter((e) => e.tick >= args.sinceTick!);
    }

    // Sort by tick descending and apply limit
    return events
      .sort((a, b) => b.tick - a.tick || b.timestamp - a.timestamp)
      .slice(0, limit);
  },
});

/**
 * Get the most recent N events
 * Returns events sorted by tick descending (most recent first)
 */
export const getRecentEvents = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(
      args.limit ?? 20,
      DEFAULTS.maxEventsPerQuery
    );

    // Get events ordered by creation time (desc) which is the default index
    const events = await ctx.db
      .query("events")
      .order("desc")
      .take(limit);

    // Sort by tick descending for consistent ordering
    return events.sort((a, b) => b.tick - a.tick || b.timestamp - a.timestamp);
  },
});
