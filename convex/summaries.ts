/**
 * Summary maintenance for dashboard/leaderboard reads.
 * Keeps small, read-optimized tables in sync without large reads.
 *
 * NOTE: Convex only allows one paginated query per mutation, so we split
 * the refresh logic into separate mutations for each table type.
 */

import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

const AGENT_BATCH_SIZE = 10;
const EVENT_BATCH_SIZE = 10;
const ZONE_BATCH_SIZE = 10;
const GANG_BATCH_SIZE = 10;

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
  "GAMBLE_WON",
  "GAMBLE_LOST",
  "DISGUISE_PURCHASED",
  "DISGUISE_EXPIRED",
];

async function getState(ctx: { db: any }, key: string): Promise<string | null> {
  const row = await ctx.db
    .query("summaryState")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  return row?.value ?? null;
}

async function setState(ctx: { db: any }, key: string, value: string | null) {
  const existing = await ctx.db
    .query("summaryState")
    .withIndex("by_key", (q: any) => q.eq("key", key))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { value: value ?? "" });
  } else {
    await ctx.db.insert("summaryState", { key, value: value ?? "" });
  }
}

async function resolveAgentName(ctx: { db: any }, agentId: string | null | undefined) {
  if (!agentId) return null;
  const summary = await ctx.db
    .query("agentSummaries")
    .withIndex("by_agentId", (q: any) => q.eq("agentId", agentId))
    .first();
  if (summary) return summary.name;
  const agent = await ctx.db.get(agentId);
  return agent?.name ?? null;
}

async function resolveZoneName(ctx: { db: any }, zoneId: string | null | undefined) {
  if (!zoneId) return null;
  const summary = await ctx.db
    .query("zoneSummaries")
    .withIndex("by_zoneId", (q: any) => q.eq("zoneId", zoneId))
    .first();
  if (summary) return summary.name;
  const zone = await ctx.db.get(zoneId);
  return zone?.name ?? null;
}

function classifyEvent(type: string): "crime" | "social" | "economic" | "other" {
  if (CRIME_EVENTS.includes(type)) return "crime";
  if (SOCIAL_EVENTS.includes(type)) return "social";
  if (ECONOMIC_EVENTS.includes(type)) return "economic";
  return "other";
}

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

function formatDramaDescription(
  type: string,
  agentName: string | null,
  zoneName: string | null,
  payload: unknown
): { description: string; dramaLevel: "normal" | "exciting" | "critical" } {
  const agent = agentName ?? "Someone";
  const zone = zoneName ?? "somewhere";
  const p = payload as Record<string, unknown> | null;

  let dramaLevel: "normal" | "exciting" | "critical" = "normal";
  if (
    type === "AGENT_KILLED" ||
    type === "JAILBREAK_SUCCESS" ||
    type === "GANG_BETRAYED" ||
    type === "BOUNTY_CLAIMED" ||
    type === "GOVERNMENT_TAKEDOWN" ||
    type === "GANG_DISBANDED"
  ) {
    dramaLevel = "critical";
  } else if (type === "CRIME_SUCCESS" || type === "COOP_CRIME_SUCCESS" || type === "GAMBLE_WON") {
    dramaLevel = "exciting";
  }

  switch (type) {
    case "CRIME_SUCCESS":
      return { description: `${agent} pulled off a ${p?.crimeType ?? "crime"} in ${zone}!`, dramaLevel };
    case "CRIME_FAILED":
      return { description: `${agent} botched a ${p?.crimeType ?? "crime"} in ${zone}`, dramaLevel };
    case "AGENT_ARRESTED":
      return { description: `${agent} got busted by the cops!`, dramaLevel };
    case "AGENT_RELEASED":
      return { description: `${agent} is back on the streets`, dramaLevel };
    case "AGENT_KILLED":
      return { description: `${agent} was killed by ${p?.killerName ?? "someone"}!`, dramaLevel };
    case "AGENT_ATTACKED":
      return { description: `${agent} attacked ${p?.targetName ?? "someone"} in ${zone}`, dramaLevel };
    case "JAILBREAK_SUCCESS":
      return { description: `${agent} escaped from jail!`, dramaLevel };
    case "JAILBREAK_FAILED":
      return { description: `${agent} failed to escape, more time added`, dramaLevel };
    case "BOUNTY_PLACED":
      return { description: `$${p?.amount ?? "?"} bounty on ${p?.targetName ?? "someone"}`, dramaLevel };
    case "BOUNTY_CLAIMED":
      return { description: `${agent} claimed the bounty on ${p?.targetName ?? "someone"}!`, dramaLevel };
    case "COOP_CRIME_SUCCESS":
      return { description: `A crew pulled off a ${p?.crimeType ?? "heist"} in ${zone}!`, dramaLevel };
    case "COOP_CRIME_FAILED":
      return { description: `A crew's ${p?.crimeType ?? "heist"} went wrong in ${zone}`, dramaLevel };
    case "GANG_BETRAYED":
      return { description: `${agent} betrayed their gang!`, dramaLevel };
    case "VEHICLE_STOLEN":
      return { description: `${agent} stole a ${p?.vehicleType ?? "vehicle"} in ${zone}`, dramaLevel };
    case "GAMBLE_WON":
      return { description: `${agent} won $${p?.winnings ?? "big"} gambling!`, dramaLevel };
    case "GAMBLE_LOST":
      return { description: `${agent} lost $${p?.amount ?? "?"} gambling`, dramaLevel };
    case "JOB_STARTED":
      return { description: `${agent} started working in ${zone}`, dramaLevel };
    case "JOB_COMPLETED":
      return { description: `${agent} earned $${p?.wage ?? "?"} from a job`, dramaLevel };
    case "TAX_EVADED":
      return { description: `${agent} was jailed for tax evasion!`, dramaLevel };
    case "GOVERNMENT_TAKEDOWN":
      return { description: (p?.headline as string) ?? `${p?.agency ?? "FBI"} arrested ${agent}!`, dramaLevel };
    case "GOVERNMENT_RELEASE":
      return { description: `${agent} was released from federal custody`, dramaLevel };
    case "GANG_DISBANDED":
      return { description: (p?.headline as string) ?? `${p?.agency ?? "FBI"} raided ${p?.gangName ?? "a gang"}!`, dramaLevel };
    case "GANG_CREATED":
      return { description: `${agent} founded a new gang!`, dramaLevel };
    case "GANG_JOINED":
      return { description: `${agent} joined a gang`, dramaLevel };
    case "PROPERTY_PURCHASED":
      return { description: `${agent} bought property in ${zone}`, dramaLevel };
    case "BUSINESS_STARTED":
      return { description: `${agent} opened a business in ${zone}`, dramaLevel };
    default:
      return { description: `${agent}: ${type.replace(/_/g, " ").toLowerCase()}`, dramaLevel };
  }
}

// ============================================================================
// Individual refresh mutations (one paginated query per mutation)
// ============================================================================

export const refreshAgentSummaries = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? AGENT_BATCH_SIZE;
    const cursor = await getState(ctx, "agent_cursor");
    const page = await ctx.db
      .query("agents")
      .paginate({ numItems: batchSize, cursor: cursor || null });

    for (const agent of page.page) {
      const existing = await ctx.db
        .query("agentSummaries")
        .withIndex("by_agentId", (q: any) => q.eq("agentId", agent._id))
        .first();
      const payload = {
        agentId: agent._id,
        name: agent.name,
        status: agent.status,
        cash: agent.cash,
        heat: agent.heat,
        health: agent.health,
        reputation: agent.reputation,
        locationZoneId: agent.locationZoneId ?? null,
        gangId: agent.gangId,
        lifetimeEarnings: agent.stats.lifetimeEarnings,
        totalCrimes: agent.stats.totalCrimes,
        totalArrests: agent.stats.totalArrests,
        daysSurvived: agent.stats.daysSurvived,
        giftsGiven: agent.socialStats?.giftsGiven ?? 0,
        taxOwed: agent.taxOwed,
        bannedAt: agent.bannedAt,
      };
      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("agentSummaries", payload);
      }
    }
    await setState(ctx, "agent_cursor", page.isDone ? "" : page.continueCursor);
    return { processed: page.page.length, isDone: page.isDone };
  },
});

export const refreshZoneSummaries = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? ZONE_BATCH_SIZE;
    const cursor = await getState(ctx, "zone_cursor");
    const page = await ctx.db
      .query("zones")
      .paginate({ numItems: batchSize, cursor: cursor || null });

    for (const zone of page.page) {
      const existing = await ctx.db
        .query("zoneSummaries")
        .withIndex("by_zoneId", (q: any) => q.eq("zoneId", zone._id))
        .first();
      const payload = { zoneId: zone._id, name: zone.name, slug: zone.slug };
      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("zoneSummaries", payload);
      }
    }
    await setState(ctx, "zone_cursor", page.isDone ? "" : page.continueCursor);
    return { processed: page.page.length, isDone: page.isDone };
  },
});

export const refreshGangSummaries = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? GANG_BATCH_SIZE;
    const cursor = await getState(ctx, "gang_cursor");
    const page = await ctx.db
      .query("gangs")
      .paginate({ numItems: batchSize, cursor: cursor || null });

    for (const gang of page.page) {
      const existing = await ctx.db
        .query("gangSummaries")
        .withIndex("by_gangId", (q: any) => q.eq("gangId", gang._id))
        .first();
      const payload = {
        gangId: gang._id,
        name: gang.name,
        tag: gang.tag,
        color: gang.color,
        disbandedAt: gang.disbandedAt,
      };
      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("gangSummaries", payload);
      }
    }
    await setState(ctx, "gang_cursor", page.isDone ? "" : page.continueCursor);
    return { processed: page.page.length, isDone: page.isDone };
  },
});

export const refreshEventSummaries = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? EVENT_BATCH_SIZE;
    const cursor = await getState(ctx, "event_cursor");
    const page = await ctx.db
      .query("events")
      .order("asc")
      .paginate({ numItems: batchSize, cursor: cursor || null });

    for (const event of page.page) {
      const existing = await ctx.db
        .query("eventSummaries")
        .withIndex("by_eventId", (q: any) => q.eq("eventId", event._id))
        .first();

      const agentName = await resolveAgentName(ctx, event.agentId?.toString());
      const zoneName = await resolveZoneName(ctx, event.zoneId?.toString());
      const category = classifyEvent(event.type);
      const description = formatEventDescription(event.type, agentName, zoneName, event.payload);
      const drama = formatDramaDescription(event.type, agentName, zoneName, event.payload);

      const eventPayload = event.payload as Record<string, unknown> | null;
      const payload = {
        eventId: event._id,
        type: event.type,
        tick: event.tick,
        timestamp: event.timestamp,
        agentId: event.agentId ?? null,
        agentName: agentName ?? undefined,
        zoneId: event.zoneId ?? null,
        zoneName: zoneName ?? undefined,
        targetAgentId:
          typeof eventPayload?.targetAgentId === "string"
            ? (eventPayload.targetAgentId as unknown as Id<"agents">)
            : null,
        category,
        description,
        dramaDescription: drama.description,
        dramaLevel: drama.dramaLevel,
        // Payload fields needed by frontend components (RapSheet, AgentTimeline)
        amount:
          typeof eventPayload?.amount === "number"
            ? eventPayload.amount
            : undefined,
        crimeType:
          typeof eventPayload?.crimeType === "string"
            ? eventPayload.crimeType
            : undefined,
        loot:
          typeof eventPayload?.loot === "number"
            ? eventPayload.loot
            : undefined,
        wage:
          typeof eventPayload?.wage === "number"
            ? eventPayload.wage
            : undefined,
        jobTitle:
          typeof eventPayload?.jobTitle === "string"
            ? eventPayload.jobTitle
            : undefined,
        targetName:
          typeof eventPayload?.targetName === "string"
            ? eventPayload.targetName
            : undefined,
        killerName:
          typeof eventPayload?.killerName === "string"
            ? eventPayload.killerName
            : undefined,
        winnings:
          typeof eventPayload?.winnings === "number"
            ? eventPayload.winnings
            : undefined,
        vehicleType:
          typeof eventPayload?.vehicleType === "string"
            ? eventPayload.vehicleType
            : undefined,
        disguiseType:
          typeof eventPayload?.type === "string"
            ? eventPayload.type
            : undefined,
        headline:
          typeof eventPayload?.headline === "string"
            ? eventPayload.headline
            : undefined,
        agency:
          typeof eventPayload?.agency === "string"
            ? eventPayload.agency
            : undefined,
        gangName:
          typeof eventPayload?.gangName === "string"
            ? eventPayload.gangName
            : undefined,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("eventSummaries", payload);
      }
    }
    await setState(ctx, "event_cursor", page.isDone ? "" : page.continueCursor);
    return { processed: page.page.length, isDone: page.isDone };
  },
});

// ============================================================================
// Coordinator action that calls each mutation sequentially
// ============================================================================

type RefreshResult = { processed: number; isDone: boolean };

export const refreshSummaries = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    agentsProcessed: number;
    zonesProcessed: number;
    gangsProcessed: number;
    eventsProcessed: number;
  }> => {
    // Call each mutation sequentially (each has only one paginated query)
    const agentResult: RefreshResult = await ctx.runMutation(internal.summaries.refreshAgentSummaries, {});
    const zoneResult: RefreshResult = await ctx.runMutation(internal.summaries.refreshZoneSummaries, {});
    const gangResult: RefreshResult = await ctx.runMutation(internal.summaries.refreshGangSummaries, {});
    const eventResult: RefreshResult = await ctx.runMutation(internal.summaries.refreshEventSummaries, {});

    return {
      agentsProcessed: agentResult.processed,
      zonesProcessed: zoneResult.processed,
      gangsProcessed: gangResult.processed,
      eventsProcessed: eventResult.processed,
    };
  },
});

// ============================================================================
// Backfill functions (for bulk initial population)
// ============================================================================

export const backfillAgentSummaries = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = Math.max(1, Math.min(args.batchSize ?? 25, 200));
    const cursor = await getState(ctx, "agent_cursor");
    const page = await ctx.db
      .query("agents")
      .paginate({ numItems: batchSize, cursor: cursor || null });

    for (const agent of page.page) {
      const existing = await ctx.db
        .query("agentSummaries")
        .withIndex("by_agentId", (q: any) => q.eq("agentId", agent._id))
        .first();
      const payload = {
        agentId: agent._id,
        name: agent.name,
        status: agent.status,
        cash: agent.cash,
        heat: agent.heat,
        health: agent.health,
        reputation: agent.reputation,
        locationZoneId: agent.locationZoneId ?? null,
        gangId: agent.gangId,
        lifetimeEarnings: agent.stats.lifetimeEarnings,
        totalCrimes: agent.stats.totalCrimes,
        totalArrests: agent.stats.totalArrests,
        daysSurvived: agent.stats.daysSurvived,
        giftsGiven: agent.socialStats?.giftsGiven ?? 0,
        taxOwed: agent.taxOwed,
        bannedAt: agent.bannedAt,
      };
      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("agentSummaries", payload);
      }
    }
    await setState(ctx, "agent_cursor", page.isDone ? "" : page.continueCursor);
    return { processed: page.page.length, isDone: page.isDone };
  },
});

export const backfillZoneSummaries = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = Math.max(1, Math.min(args.batchSize ?? 25, 200));
    const cursor = await getState(ctx, "zone_cursor");
    const page = await ctx.db
      .query("zones")
      .paginate({ numItems: batchSize, cursor: cursor || null });

    for (const zone of page.page) {
      const existing = await ctx.db
        .query("zoneSummaries")
        .withIndex("by_zoneId", (q: any) => q.eq("zoneId", zone._id))
        .first();
      const payload = { zoneId: zone._id, name: zone.name, slug: zone.slug };
      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("zoneSummaries", payload);
      }
    }
    await setState(ctx, "zone_cursor", page.isDone ? "" : page.continueCursor);
    return { processed: page.page.length, isDone: page.isDone };
  },
});

export const backfillGangSummaries = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = Math.max(1, Math.min(args.batchSize ?? 25, 200));
    const cursor = await getState(ctx, "gang_cursor");
    const page = await ctx.db
      .query("gangs")
      .paginate({ numItems: batchSize, cursor: cursor || null });

    for (const gang of page.page) {
      const existing = await ctx.db
        .query("gangSummaries")
        .withIndex("by_gangId", (q: any) => q.eq("gangId", gang._id))
        .first();
      const payload = {
        gangId: gang._id,
        name: gang.name,
        tag: gang.tag,
        color: gang.color,
        disbandedAt: gang.disbandedAt,
      };
      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("gangSummaries", payload);
      }
    }
    await setState(ctx, "gang_cursor", page.isDone ? "" : page.continueCursor);
    return { processed: page.page.length, isDone: page.isDone };
  },
});

export const backfillEventSummaries = internalMutation({
  args: { batchSize: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const batchSize = Math.max(1, Math.min(args.batchSize ?? 25, 200));
    const cursor = await getState(ctx, "event_cursor");
    const page = await ctx.db
      .query("events")
      .order("asc")
      .paginate({ numItems: batchSize, cursor: cursor || null });

    for (const event of page.page) {
      const existing = await ctx.db
        .query("eventSummaries")
        .withIndex("by_eventId", (q: any) => q.eq("eventId", event._id))
        .first();

      const agentName = await resolveAgentName(ctx, event.agentId?.toString());
      const zoneName = await resolveZoneName(ctx, event.zoneId?.toString());
      const category = classifyEvent(event.type);
      const description = formatEventDescription(event.type, agentName, zoneName, event.payload);
      const drama = formatDramaDescription(event.type, agentName, zoneName, event.payload);

      const eventPayload = event.payload as Record<string, unknown> | null;
      const payload = {
        eventId: event._id,
        type: event.type,
        tick: event.tick,
        timestamp: event.timestamp,
        agentId: event.agentId ?? null,
        agentName: agentName ?? undefined,
        zoneId: event.zoneId ?? null,
        zoneName: zoneName ?? undefined,
        targetAgentId:
          typeof eventPayload?.targetAgentId === "string"
            ? (eventPayload.targetAgentId as unknown as Id<"agents">)
            : null,
        category,
        description,
        dramaDescription: drama.description,
        dramaLevel: drama.dramaLevel,
        // Payload fields needed by frontend components (RapSheet, AgentTimeline)
        amount:
          typeof eventPayload?.amount === "number"
            ? eventPayload.amount
            : undefined,
        crimeType:
          typeof eventPayload?.crimeType === "string"
            ? eventPayload.crimeType
            : undefined,
        loot:
          typeof eventPayload?.loot === "number"
            ? eventPayload.loot
            : undefined,
        wage:
          typeof eventPayload?.wage === "number"
            ? eventPayload.wage
            : undefined,
        jobTitle:
          typeof eventPayload?.jobTitle === "string"
            ? eventPayload.jobTitle
            : undefined,
        targetName:
          typeof eventPayload?.targetName === "string"
            ? eventPayload.targetName
            : undefined,
        killerName:
          typeof eventPayload?.killerName === "string"
            ? eventPayload.killerName
            : undefined,
        winnings:
          typeof eventPayload?.winnings === "number"
            ? eventPayload.winnings
            : undefined,
        vehicleType:
          typeof eventPayload?.vehicleType === "string"
            ? eventPayload.vehicleType
            : undefined,
        disguiseType:
          typeof eventPayload?.type === "string"
            ? eventPayload.type
            : undefined,
        headline:
          typeof eventPayload?.headline === "string"
            ? eventPayload.headline
            : undefined,
        agency:
          typeof eventPayload?.agency === "string"
            ? eventPayload.agency
            : undefined,
        gangName:
          typeof eventPayload?.gangName === "string"
            ? eventPayload.gangName
            : undefined,
      };

      if (existing) {
        await ctx.db.patch(existing._id, payload);
      } else {
        await ctx.db.insert("eventSummaries", payload);
      }
    }
    await setState(ctx, "event_cursor", page.isDone ? "" : page.continueCursor);
    return { processed: page.page.length, isDone: page.isDone };
  },
});

export const backfillSummariesBatch = internalAction({
  args: {
    agentBatchSize: v.optional(v.number()),
    eventBatchSize: v.optional(v.number()),
    zoneBatchSize: v.optional(v.number()),
    gangBatchSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    agentsProcessed: number;
    zonesProcessed: number;
    gangsProcessed: number;
    eventsProcessed: number;
  }> => {
    // Call each backfill mutation sequentially
    const agentResult: RefreshResult = await ctx.runMutation(internal.summaries.backfillAgentSummaries, {
      batchSize: args.agentBatchSize,
    });
    const zoneResult: RefreshResult = await ctx.runMutation(internal.summaries.backfillZoneSummaries, {
      batchSize: args.zoneBatchSize,
    });
    const gangResult: RefreshResult = await ctx.runMutation(internal.summaries.backfillGangSummaries, {
      batchSize: args.gangBatchSize,
    });
    const eventResult: RefreshResult = await ctx.runMutation(internal.summaries.backfillEventSummaries, {
      batchSize: args.eventBatchSize,
    });

    return {
      agentsProcessed: agentResult.processed,
      zonesProcessed: zoneResult.processed,
      gangsProcessed: gangResult.processed,
      eventsProcessed: eventResult.processed,
    };
  },
});

export const runSummaryBackfill = internalAction({
  args: {
    iterations: v.optional(v.number()),
    agentBatchSize: v.optional(v.number()),
    eventBatchSize: v.optional(v.number()),
    zoneBatchSize: v.optional(v.number()),
    gangBatchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const iterations = Math.max(1, Math.min(args.iterations ?? 50, 500));
    let total = {
      agentsProcessed: 0,
      zonesProcessed: 0,
      gangsProcessed: 0,
      eventsProcessed: 0,
    };
    for (let i = 0; i < iterations; i++) {
      const result = await ctx.runAction(internal.summaries.backfillSummariesBatch, {
        agentBatchSize: args.agentBatchSize,
        eventBatchSize: args.eventBatchSize,
        zoneBatchSize: args.zoneBatchSize,
        gangBatchSize: args.gangBatchSize,
      });
      total = {
        agentsProcessed: total.agentsProcessed + result.agentsProcessed,
        zonesProcessed: total.zonesProcessed + result.zonesProcessed,
        gangsProcessed: total.gangsProcessed + result.gangsProcessed,
        eventsProcessed: total.eventsProcessed + result.eventsProcessed,
      };
      if (
        result.agentsProcessed === 0 &&
        result.zonesProcessed === 0 &&
        result.gangsProcessed === 0 &&
        result.eventsProcessed === 0
      ) {
        break;
      }
    }
    return total;
  },
});
