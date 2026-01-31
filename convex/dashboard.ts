/**
 * Dashboard queries for ClawCity admin UI
 * Provides aggregated data for the main dashboard page
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// Event category mappings for filtering
const CRIME_EVENTS = [
  "CRIME_ATTEMPTED",
  "CRIME_SUCCESS",
  "CRIME_FAILED",
  "AGENT_ARRESTED",
  "AGENT_RELEASED",
  "COOP_CRIME_INITIATED",
  "COOP_CRIME_JOINED",
  "COOP_CRIME_EXECUTED",
  "COOP_CRIME_SUCCESS",
  "COOP_CRIME_FAILED",
  "AGENT_ROBBED",
  "ROB_ATTEMPT_FAILED",
  // GTA-like features
  "JAILBREAK_SUCCESS",
  "JAILBREAK_FAILED",
  "BRIBE_SUCCESS",
  "BRIBE_FAILED",
  "AGENT_ATTACKED",
  "AGENT_KILLED",
  "BOUNTY_PLACED",
  "BOUNTY_CLAIMED",
  "BOUNTY_EXPIRED",
  "VEHICLE_STOLEN",
  "CONTRACT_ACCEPTED",
  "NPC_ACTION",
];

const SOCIAL_EVENTS = [
  "FRIEND_REQUEST_SENT",
  "FRIEND_REQUEST_ACCEPTED",
  "FRIEND_REQUEST_DECLINED",
  "FRIEND_REMOVED",
  "GANG_CREATED",
  "GANG_INVITE_SENT",
  "GANG_JOINED",
  "GANG_LEFT",
  "GANG_BETRAYED",
  "CASH_GIFTED",
  "ITEM_GIFTED",
];

const ECONOMIC_EVENTS = [
  "BUY",
  "SELL",
  "JOB_STARTED",
  "JOB_COMPLETED",
  "BUSINESS_STARTED",
  "PROPERTY_PURCHASED",
  "PROPERTY_SOLD",
  "PROPERTY_RENTED",
  "TERRITORY_CLAIMED",
  "TERRITORY_INCOME",
  // GTA-like features
  "GAMBLE_WON",
  "GAMBLE_LOST",
  "DISGUISE_PURCHASED",
  "DISGUISE_EXPIRED",
];

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

/**
 * Get recent activity feed with rich formatting and category filtering
 */
export const getRecentActivityFeed = query({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(
      v.union(
        v.literal("all"),
        v.literal("crime"),
        v.literal("social"),
        v.literal("economic")
      )
    ),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const category = args.category ?? "all";

    // Get events ordered by creation time (desc)
    let events = await ctx.db.query("events").order("desc").take(limit * 3); // Fetch more to filter

    // Filter by category if specified
    if (category !== "all") {
      const categoryEvents =
        category === "crime"
          ? CRIME_EVENTS
          : category === "social"
            ? SOCIAL_EVENTS
            : ECONOMIC_EVENTS;
      events = events.filter((e) => categoryEvents.includes(e.type));
    }

    events = events.slice(0, limit);

    // Get all agents for name lookup
    const agents = await ctx.db.query("agents").collect();
    const agentsById: Record<string, string> = {};
    for (const agent of agents) {
      agentsById[agent._id.toString()] = agent.name;
    }

    // Get all zones for name lookup
    const zones = await ctx.db.query("zones").collect();
    const zonesById: Record<string, string> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = zone.name;
    }

    // Format events with rich details
    const formattedEvents = events.map((event) => {
      const agentName = event.agentId
        ? agentsById[event.agentId.toString()] ?? null
        : null;
      const zoneName = event.zoneId
        ? zonesById[event.zoneId.toString()] ?? null
        : null;

      // Determine category
      let eventCategory: "crime" | "social" | "economic" | "other" = "other";
      if (CRIME_EVENTS.includes(event.type)) eventCategory = "crime";
      else if (SOCIAL_EVENTS.includes(event.type)) eventCategory = "social";
      else if (ECONOMIC_EVENTS.includes(event.type)) eventCategory = "economic";

      // Generate description based on event type
      const description = formatEventDescription(
        event.type,
        agentName,
        zoneName,
        event.payload
      );

      // Determine if this is a success/failure event
      const isSuccess =
        event.type.includes("SUCCESS") ||
        event.type.includes("COMPLETED") ||
        event.type.includes("ACCEPTED");
      const isFailure =
        event.type.includes("FAILED") ||
        event.type.includes("ARRESTED") ||
        event.type.includes("DECLINED");

      return {
        _id: event._id,
        type: event.type,
        category: eventCategory,
        tick: event.tick,
        timestamp: event.timestamp,
        agentId: event.agentId,
        agentName,
        zoneId: event.zoneId,
        zoneName,
        description,
        payload: event.payload,
        isSuccess,
        isFailure,
      };
    });

    return formattedEvents;
  },
});

/**
 * Format event description for human readability
 */
function formatEventDescription(
  type: string,
  agentName: string | null,
  zoneName: string | null,
  payload: unknown
): string {
  const agent = agentName ?? "An agent";
  const zone = zoneName ?? "a zone";
  const p = payload as Record<string, unknown> | null;

  switch (type) {
    case "CRIME_SUCCESS":
      return `${agent} successfully committed ${p?.crimeType ?? "a crime"} in ${zone}`;
    case "CRIME_FAILED":
      return `${agent} failed to commit ${p?.crimeType ?? "a crime"} in ${zone}`;
    case "AGENT_ARRESTED":
      return `${agent} was arrested in ${zone}`;
    case "AGENT_RELEASED":
      return `${agent} was released from jail`;
    case "JOB_COMPLETED":
      return `${agent} completed a job in ${zone}`;
    case "JOB_STARTED":
      return `${agent} started a job in ${zone}`;
    case "MOVE_COMPLETED":
      return `${agent} arrived at ${zone}`;
    case "BUY":
      return `${agent} bought items in ${zone}`;
    case "SELL":
      return `${agent} sold items in ${zone}`;
    case "GANG_CREATED":
      return `${agent} created a new gang`;
    case "GANG_JOINED":
      return `${agent} joined a gang`;
    case "GANG_LEFT":
      return `${agent} left their gang`;
    case "GANG_BETRAYED":
      return `${agent} betrayed their gang!`;
    case "FRIEND_REQUEST_ACCEPTED":
      return `${agent} made a new friend`;
    case "TERRITORY_CLAIMED":
      return `A gang claimed territory in ${zone}`;
    case "COOP_CRIME_SUCCESS":
      return `A crew pulled off a ${p?.crimeType ?? "heist"} in ${zone}`;
    case "COOP_CRIME_FAILED":
      return `A crew failed their ${p?.crimeType ?? "heist"} in ${zone}`;
    case "AGENT_ROBBED":
      return `${agent} was robbed in ${zone}`;
    case "CASH_GIFTED":
      return `${agent} gifted cash to another agent`;
    case "PROPERTY_PURCHASED":
      return `${agent} purchased property in ${zone}`;
    case "BUSINESS_STARTED":
      return `${agent} started a business in ${zone}`;
    // GTA-like features
    case "JAILBREAK_SUCCESS":
      return `${agent} escaped from jail!`;
    case "JAILBREAK_FAILED":
      return `${agent} failed to escape and got more time`;
    case "BRIBE_SUCCESS":
      return `${agent} bribed the cops`;
    case "BRIBE_FAILED":
      return `${agent}'s bribe attempt backfired`;
    case "AGENT_ATTACKED":
      return `${agent} attacked ${p?.targetName ?? "another agent"} in ${zone}`;
    case "AGENT_KILLED":
      return `${agent} killed ${p?.targetName ?? "another agent"} in ${zone}!`;
    case "BOUNTY_PLACED":
      return `$${p?.amount ?? "?"} bounty placed on ${p?.targetName ?? "an agent"}`;
    case "BOUNTY_CLAIMED":
      return `${agent} claimed the bounty on ${p?.targetName ?? "an agent"}`;
    case "BOUNTY_EXPIRED":
      return `Bounty on ${p?.targetName ?? "an agent"} has expired`;
    case "GAMBLE_WON":
      return `${agent} won $${p?.winnings ?? "?"} gambling!`;
    case "GAMBLE_LOST":
      return `${agent} lost $${p?.amount ?? "?"} gambling`;
    case "DISGUISE_PURCHASED":
      return `${agent} bought a ${p?.type ?? ""} disguise`;
    case "DISGUISE_EXPIRED":
      return `${agent}'s disguise wore off`;
    case "VEHICLE_STOLEN":
      return `${agent} stole a ${p?.vehicleType ?? "vehicle"} in ${zone}`;
    case "CONTRACT_ACCEPTED":
      return `${agent} accepted a hit contract`;
    case "NPC_SPAWNED":
      return `NPC ${agent} entered the city`;
    case "NPC_ACTION":
      return `NPC ${agent} performed an action`;
    default:
      return `${agent}: ${type.replace(/_/g, " ").toLowerCase()}`;
  }
}

/**
 * Get world stats for dashboard widgets
 */
export const getWorldStats = query({
  args: {},
  handler: async (ctx) => {
    const [world, agents, gangs, territories, coopActions] = await Promise.all([
      ctx.db.query("world").first(),
      ctx.db.query("agents").collect(),
      ctx.db.query("gangs").collect(),
      ctx.db.query("territories").collect(),
      ctx.db
        .query("coopActions")
        .withIndex("by_status", (q) => q.eq("status", "recruiting"))
        .collect(),
    ]);

    const currentTick = world?.tick ?? 0;

    // Calculate aggregate stats
    const totalCash = agents.reduce((sum, a) => sum + a.cash, 0);
    const totalHeat = agents.reduce((sum, a) => sum + a.heat, 0);
    const avgHeat = agents.length > 0 ? Math.round(totalHeat / agents.length) : 0;

    // Find hottest zone
    const zones = await ctx.db.query("zones").collect();
    const heatByZone: Record<string, { total: number; count: number; name: string }> = {};
    for (const zone of zones) {
      heatByZone[zone._id.toString()] = { total: 0, count: 0, name: zone.name };
    }
    for (const agent of agents) {
      const zoneId = agent.locationZoneId.toString();
      if (heatByZone[zoneId]) {
        heatByZone[zoneId].total += agent.heat;
        heatByZone[zoneId].count++;
      }
    }

    let hottestZone: { name: string; avgHeat: number } | null = null;
    let maxAvgHeat = 0;
    for (const data of Object.values(heatByZone)) {
      if (data.count > 0) {
        const avg = data.total / data.count;
        if (avg > maxAvgHeat) {
          maxAvgHeat = avg;
          hottestZone = { name: data.name, avgHeat: Math.round(avg) };
        }
      }
    }

    // Get crimes today (events in last 24 hours of ticks)
    const ticksIn24Hours = 1440;
    const cutoffTick = Math.max(0, currentTick - ticksIn24Hours);
    const recentEvents = await ctx.db
      .query("events")
      .withIndex("by_tick")
      .filter((q) => q.gte(q.field("tick"), cutoffTick))
      .collect();

    const crimesToday = recentEvents.filter(
      (e) => e.type === "CRIME_SUCCESS" || e.type === "CRIME_FAILED"
    ).length;
    const arrestsToday = recentEvents.filter(
      (e) => e.type === "AGENT_ARRESTED"
    ).length;

    return {
      currentTick,
      totalAgents: agents.length,
      totalCash,
      avgHeat,
      totalGangs: gangs.length,
      totalTerritories: territories.length,
      activeCoopCrimes: coopActions.length,
      hottestZone,
      crimesToday,
      arrestsToday,
      agentsByStatus: {
        idle: agents.filter((a) => a.status === "idle").length,
        busy: agents.filter((a) => a.status === "busy").length,
        jailed: agents.filter((a) => a.status === "jailed").length,
        hospitalized: agents.filter((a) => a.status === "hospitalized").length,
      },
    };
  },
});
