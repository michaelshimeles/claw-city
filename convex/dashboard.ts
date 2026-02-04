/**
 * Dashboard queries for ClawCity admin UI
 * Provides aggregated data for the main dashboard page
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

const AGENT_SAMPLE_LIMIT = 30;
const EVENT_FETCH_LIMIT = 40;

async function loadZoneSummaries(
  ctx: { db: any },
  zoneIds: Array<string | null | undefined>
): Promise<Record<string, string>> {
  const uniqueIds = Array.from(
    new Set(zoneIds.filter((id): id is string => typeof id === "string"))
  );
  const zones = await Promise.all(
    uniqueIds.map((id) =>
      ctx.db.query("zoneSummaries").withIndex("by_zoneId", (q: any) => q.eq("zoneId", id)).first()
    )
  );
  const zonesById: Record<string, string> = {};
  for (let i = 0; i < uniqueIds.length; i++) {
    const zone = zones[i];
    if (zone) {
      zonesById[uniqueIds[i]] = zone.name;
    }
  }
  return zonesById;
}

async function loadGangSummaries(
  ctx: { db: any },
  gangIds: Array<string | null | undefined>
): Promise<Record<string, { tag: string; color: string }>> {
  const uniqueIds = Array.from(
    new Set(gangIds.filter((id): id is string => typeof id === "string"))
  );
  const gangs = await Promise.all(
    uniqueIds.map((id) =>
      ctx.db.query("gangSummaries").withIndex("by_gangId", (q: any) => q.eq("gangId", id)).first()
    )
  );
  const gangsById: Record<string, { tag: string; color: string }> = {};
  for (let i = 0; i < uniqueIds.length; i++) {
    const gang = gangs[i];
    if (gang) {
      gangsById[uniqueIds[i]] = { tag: gang.tag, color: gang.color };
    }
  }
  return gangsById;
}

async function safeCount(query: any, sampleLimit = AGENT_SAMPLE_LIMIT): Promise<number> {
  if (typeof query.count === "function") {
    return query.count();
  }
  const sample = await query.take(sampleLimit);
  return sample.length;
}
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
    const [total, idle, busy, jailed, hospitalized] = await Promise.all([
      safeCount(ctx.db.query("agentSummaries")),
      safeCount(
        ctx.db.query("agentSummaries").withIndex("by_status", (q: any) => q.eq("status", "idle"))
      ),
      safeCount(
        ctx.db.query("agentSummaries").withIndex("by_status", (q: any) => q.eq("status", "busy"))
      ),
      safeCount(
        ctx.db.query("agentSummaries").withIndex("by_status", (q: any) => q.eq("status", "jailed"))
      ),
      safeCount(
        ctx.db
          .query("agentSummaries")
          .withIndex("by_status", (q: any) => q.eq("status", "hospitalized"))
      ),
    ]);

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

    const candidates = await ctx.db
      .query("agentSummaries")
      .withIndex("by_cash")
      .order("desc")
      .take(Math.min(AGENT_SAMPLE_LIMIT, limit * 3));
    const topAgents = candidates.filter((a) => !a.bannedAt).slice(0, limit);
    const zonesById = await loadZoneSummaries(
      ctx,
      topAgents.map((agent) => agent.locationZoneId?.toString())
    );

    return topAgents.map((agent) => ({
      _id: agent.agentId,
      name: agent.name,
      cash: agent.cash,
      status: agent.status,
      locationZoneName: agent.locationZoneId
        ? zonesById[agent.locationZoneId.toString()] ?? "Unknown"
        : "Unknown",
    }));
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
      .query("eventSummaries")
      .withIndex("by_tick")
      .order("desc")
      .take(limit);

    const eventsWithDetails = events.map((event) => ({
      _id: event.eventId,
      type: event.type,
      tick: event.tick,
      timestamp: event.timestamp,
      agentName: event.agentName ?? null,
      payload: null,
    }));

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
    const fetchLimit = Math.min(EVENT_FETCH_LIMIT, limit * 2);
    let events = await ctx.db
      .query("eventSummaries")
      .withIndex("by_tick")
      .order("desc")
      .take(fetchLimit); // Fetch more to filter

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

    // Format events with rich details
    const formattedEvents = events.map((event) => {
      const agentName = event.agentName ?? null;
      const zoneName = event.zoneName ?? null;
      const eventCategory = event.category as "crime" | "social" | "economic" | "other";
      const description = event.description;

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
        _id: event.eventId,
        type: event.type,
        category: eventCategory,
        tick: event.tick,
        timestamp: event.timestamp,
        agentId: event.agentId,
        agentName,
        zoneId: event.zoneId,
        zoneName,
        description,
        payload: null,
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
    const [world, agentSummaries, gangSummariesSample, totalGangsCount, territoriesCount, coopActionsCount, government] =
      await Promise.all([
      ctx.db.query("world").first(),
      ctx.db.query("agentSummaries").take(AGENT_SAMPLE_LIMIT),
      ctx.db.query("gangSummaries").take(AGENT_SAMPLE_LIMIT),
      safeCount(ctx.db.query("gangSummaries")),
      safeCount(ctx.db.query("territories")),
      safeCount(
        ctx.db
          .query("coopActions")
          .withIndex("by_status", (q: any) => q.eq("status", "recruiting"))
      ),
      ctx.db.query("government").first(),
    ]);

    // Filter out banned agents and disbanded gangs
    const agents = agentSummaries.filter((a) => !a.bannedAt);
    const gangs = gangSummariesSample.filter((g) => !g.disbandedAt);

    const currentTick = world?.tick ?? 0;

    // Calculate aggregate stats
    const totalCash = agents.reduce((sum, a) => sum + a.cash, 0);
    const totalHeat = agents.reduce((sum, a) => sum + a.heat, 0);
    const avgHeat = agents.length > 0 ? Math.round(totalHeat / agents.length) : 0;

    // Find hottest zone
    const zonesById = await loadZoneSummaries(
      ctx,
      agents.map((agent) => agent.locationZoneId?.toString())
    );
    const heatByZone: Record<string, { total: number; count: number; name: string }> = {};
    for (const [zoneId, name] of Object.entries(zonesById)) {
      heatByZone[zoneId] = { total: 0, count: 0, name };
    }
    for (const agent of agents) {
      if (!agent.locationZoneId) continue;
      const zoneId = agent.locationZoneId.toString();
      if (!heatByZone[zoneId]) {
        heatByZone[zoneId] = { total: 0, count: 0, name: "Unknown" };
      }
      heatByZone[zoneId].total += agent.heat;
      heatByZone[zoneId].count++;
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

    // Get crimes today (events in last 24 hours of ticks) - limited to avoid overload
    const ticksIn24Hours = 1440;
    const cutoffTick = Math.max(0, currentTick - ticksIn24Hours);

    // Use composite index for efficient type+tick queries
    const recentEvents24h = await ctx.db
      .query("eventSummaries")
      .withIndex("by_tick", (q: any) => q.gte("tick", cutoffTick))
      .order("desc")
      .take(400);

    const crimesToday = recentEvents24h.filter((e) => e.type === "CRIME_SUCCESS").length +
      recentEvents24h.filter((e) => e.type === "CRIME_FAILED").length;
    const arrestsToday = recentEvents24h.filter((e) => e.type === "AGENT_ARRESTED").length;

    // Calculate tax collection stats for last 24h
    const taxCollected24h = recentEvents24h
      .filter((e) => e.type === "TAX_PAID")
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);

    // Get total tax collected from government table
    const totalTaxCollected = government?.totalTaxRevenue ?? 0;

    // Count agents with pending taxes
    const agentsWithTaxDue = agents.filter((a) => (a.taxOwed ?? 0) > 0).length;
    const totalTaxOwed = agents.reduce((sum, a) => sum + (a.taxOwed ?? 0), 0);

    const totalAgents = await safeCount(ctx.db.query("agentSummaries"));

    return {
      currentTick,
      totalAgents,
      totalCash,
      avgHeat,
      totalGangs: totalGangsCount,
      totalTerritories: territoriesCount,
      activeCoopCrimes: coopActionsCount,
      hottestZone,
      crimesToday,
      arrestsToday,
      agentsByStatus: {
        idle: agents.filter((a) => a.status === "idle").length,
        busy: agents.filter((a) => a.status === "busy").length,
        jailed: agents.filter((a) => a.status === "jailed").length,
        hospitalized: agents.filter((a) => a.status === "hospitalized").length,
      },
      tax: {
        collected24h: taxCollected24h,
        totalCollected: totalTaxCollected,
        agentsWithTaxDue,
        totalOwed: totalTaxOwed,
      },
    };
  },
});

// ============================================================================
// DRAMA EVENTS
// ============================================================================

// Event types considered "dramatic" for the ticker/toaster
const DRAMA_EVENT_TYPES = [
  // Crime events
  "CRIME_SUCCESS",
  "CRIME_FAILED",
  "COOP_CRIME_SUCCESS",
  "COOP_CRIME_FAILED",
  // Law enforcement
  "AGENT_ARRESTED",
  "AGENT_RELEASED",
  "JAILBREAK_SUCCESS",
  "JAILBREAK_FAILED",
  "TAX_EVADED",
  // Government takedowns
  "GOVERNMENT_TAKEDOWN",
  "GOVERNMENT_RELEASE",
  "GANG_DISBANDED",
  // Violence
  "AGENT_KILLED",
  "AGENT_ATTACKED",
  "BOUNTY_PLACED",
  "BOUNTY_CLAIMED",
  // Social
  "GANG_BETRAYED",
  "GANG_CREATED",
  "GANG_JOINED",
  // Economy
  "VEHICLE_STOLEN",
  "GAMBLE_WON",
  "GAMBLE_LOST",
  "JOB_STARTED",
  "JOB_COMPLETED",
  "PROPERTY_PURCHASED",
  "BUSINESS_STARTED",
] as const;

/**
 * Get recent dramatic events for the global ticker and notifications
 * Returns events that are exciting/notable: crimes, arrests, big payouts, etc.
 */
export const getDramaEvents = query({
  args: {
    limit: v.optional(v.number()),
    afterId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);

    // Fetch more events to get variety
    const scanLimit = Math.min(EVENT_FETCH_LIMIT, limit * 2);
    const allEvents = await ctx.db
      .query("eventSummaries")
      .withIndex("by_tick")
      .order("desc")
      .take(scanLimit);

    // Filter to dramatic events only
    const dramaEvents = allEvents.filter((event) => {
      return DRAMA_EVENT_TYPES.includes(event.type as typeof DRAMA_EVENT_TYPES[number]);
    });

    // If afterId is provided, filter to events after that ID
    let filteredEvents = dramaEvents;
    if (args.afterId) {
      const afterIndex = dramaEvents.findIndex((e) => e.eventId === args.afterId);
      if (afterIndex >= 0) {
        filteredEvents = dramaEvents.slice(0, afterIndex);
      }
    }

    // Spread events to avoid showing same agent repeatedly
    // Take events ensuring variety by limiting consecutive events from same agent
    const spreadEvents: typeof filteredEvents = [];
    const recentAgents: string[] = [];

    for (const event of filteredEvents) {
      if (spreadEvents.length >= limit) break;

      const agentId = event.agentId?.toString() ?? "none";

      // Allow event if agent hasn't appeared in last 3 events
      if (!recentAgents.slice(-3).includes(agentId)) {
        spreadEvents.push(event);
        recentAgents.push(agentId);
      }
    }

    // If we don't have enough spread events, fill with remaining events
    if (spreadEvents.length < limit) {
      for (const event of filteredEvents) {
        if (spreadEvents.length >= limit) break;
        if (!spreadEvents.some(e => e._id === event._id)) {
          spreadEvents.push(event);
        }
      }
    }

    const events = spreadEvents;

    // Format events with human-readable descriptions
    return events.map((event) => ({
      _id: event.eventId,
      type: event.type,
      timestamp: event.timestamp,
      tick: event.tick,
      agentId: event.agentId,
      agentName: event.agentName ?? "Unknown",
      zoneName: event.zoneName ?? "somewhere",
      description: event.dramaDescription ?? event.description,
      dramaLevel: (event.dramaLevel as "normal" | "exciting" | "critical") ?? "normal",
      payload: null,
    }));
  },
});

/**
 * Format a drama event into a short, punchy description for the ticker
 */
function formatDramaDescription(
  type: string,
  agentName: string,
  zoneName: string,
  payload: unknown
): string {
  const p = payload as Record<string, unknown> | null;

  switch (type) {
    case "CRIME_SUCCESS":
      return `${agentName} pulled off a ${p?.crimeType ?? "crime"} in ${zoneName}!`;
    case "CRIME_FAILED":
      return `${agentName} botched a ${p?.crimeType ?? "crime"} in ${zoneName}`;
    case "AGENT_ARRESTED":
      return `${agentName} got busted by the cops!`;
    case "AGENT_RELEASED":
      return `${agentName} is back on the streets`;
    case "AGENT_KILLED":
      return `${agentName} was killed by ${p?.killerName ?? "someone"}!`;
    case "AGENT_ATTACKED":
      return `${agentName} attacked ${p?.targetName ?? "someone"} in ${zoneName}`;
    case "JAILBREAK_SUCCESS":
      return `${agentName} escaped from jail!`;
    case "JAILBREAK_FAILED":
      return `${agentName} failed to escape, more time added`;
    case "BOUNTY_PLACED":
      return `$${p?.amount ?? "?"} bounty on ${p?.targetName ?? "someone"}`;
    case "BOUNTY_CLAIMED":
      return `${agentName} claimed the bounty on ${p?.targetName ?? "someone"}!`;
    case "COOP_CRIME_SUCCESS":
      return `A crew pulled off a ${p?.crimeType ?? "heist"} in ${zoneName}!`;
    case "COOP_CRIME_FAILED":
      return `A crew's ${p?.crimeType ?? "heist"} went wrong in ${zoneName}`;
    case "GANG_BETRAYED":
      return `${agentName} betrayed their gang!`;
    case "VEHICLE_STOLEN":
      return `${agentName} stole a ${p?.vehicleType ?? "vehicle"} in ${zoneName}`;
    case "GAMBLE_WON":
      return `${agentName} won $${p?.winnings ?? "big"} gambling!`;
    case "GAMBLE_LOST":
      return `${agentName} lost $${p?.amount ?? "?"} gambling`;
    case "JOB_STARTED":
      return `${agentName} started working in ${zoneName}`;
    case "JOB_COMPLETED":
      return `${agentName} earned $${p?.wage ?? "?"} from a job`;
    case "TAX_EVADED":
      return `${agentName} was jailed for tax evasion!`;
    case "GOVERNMENT_TAKEDOWN":
      return p?.headline as string ?? `${p?.agency ?? "FBI"} arrested ${agentName}!`;
    case "GOVERNMENT_RELEASE":
      return `${agentName} was released from federal custody`;
    case "GANG_DISBANDED":
      return p?.headline as string ?? `${p?.agency ?? "FBI"} raided ${p?.gangName ?? "a gang"}!`;
    case "GANG_CREATED":
      return `${agentName} founded a new gang!`;
    case "GANG_JOINED":
      return `${agentName} joined a gang`;
    case "PROPERTY_PURCHASED":
      return `${agentName} bought property in ${zoneName}`;
    case "BUSINESS_STARTED":
      return `${agentName} opened a business in ${zoneName}`;
    default:
      return `${agentName}: ${type.replace(/_/g, " ").toLowerCase()}`;
  }
}

/**
 * Get events for followed agents (Spectate Mode)
 * Returns events where the agent is the actor OR the target
 */
export const getFollowedAgentEvents = query({
  args: {
    agentIds: v.array(v.id("agents")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50);

    // If no agents to follow, return empty array
    if (args.agentIds.length === 0) {
      return [];
    }

    // Create a Set for fast lookup
    const followedAgentSet = new Set(args.agentIds.map((id) => id.toString()));

    const perAgentLimit = Math.max(10, Math.ceil(limit / args.agentIds.length) + 5);
    const actorEventPages = await Promise.all(
      args.agentIds.map((agentId) =>
        ctx.db
          .query("eventSummaries")
          .withIndex("by_agentId", (q: any) => q.eq("agentId", agentId))
          .order("desc")
          .take(perAgentLimit)
      )
    );

    const targetEventPages = await Promise.all(
      args.agentIds.map((agentId) =>
        ctx.db
          .query("eventSummaries")
          .withIndex("by_targetAgentId", (q: any) => q.eq("targetAgentId", agentId.toString()))
          .order("desc")
          .take(perAgentLimit)
      )
    );

    const mergedEvents = [...actorEventPages.flat(), ...targetEventPages.flat()];
    const byId = new Map<string, (typeof mergedEvents)[number]>();
    for (const event of mergedEvents) {
      byId.set(event.eventId.toString(), event);
    }

    const events = Array.from(byId.values())
      .sort((a, b) => b.tick - a.tick || b.timestamp - a.timestamp)
      .slice(0, limit);

    // Format events with human-readable descriptions
    return events.map((event) => ({
      _id: event.eventId,
      type: event.type,
      timestamp: event.timestamp,
      tick: event.tick,
      agentId: event.agentId,
      agentName: event.agentName ?? "Unknown",
      zoneName: event.zoneName ?? "somewhere",
      description: event.dramaDescription ?? event.description,
      dramaLevel: (event.dramaLevel as "normal" | "exciting" | "critical") ?? "normal",
      payload: null,
    }));
  },
});
