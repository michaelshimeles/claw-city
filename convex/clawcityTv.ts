import { query, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { components } from "./_generated/api";
import { R2 } from "@convex-dev/r2";

const r2 = new R2(components.r2);

type ClipStatus =
  | "planned"
  | "generating_image"
  | "generating_video"
  | "completed"
  | "failed";

// ============================================================================
// PUBLIC QUERIES (UI)
// ============================================================================

export const listEpisodes = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const episodes = await ctx.db
      .query("clawcityTvEpisodes")
      .order("desc")
      .take(limit);

    const episodesWithClips = await Promise.all(
      episodes.map(async (episode) => {
        const clips = await ctx.db
          .query("clawcityTvClips")
          .withIndex("by_episodeId", (q) => q.eq("episodeId", episode._id))
          .collect();

        const clipsWithUrls = await Promise.all(
          clips.map(async (clip) => {
            const videoUrl = clip.videoKey ? await r2.getUrl(clip.videoKey) : null;
            const imageUrl = clip.imageKey ? await r2.getUrl(clip.imageKey) : null;
            return {
              ...clip,
              videoUrl,
              imageUrl,
            };
          })
        );

        return {
          ...episode,
          clips: clipsWithUrls.sort((a, b) => a.index - b.index),
        };
      })
    );

    return episodesWithClips;
  },
});

// ============================================================================
// INTERNAL QUERIES (SERVER PIPELINE)
// ============================================================================

export const getEpisodeByDateKey = internalQuery({
  args: { dateKey: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clawcityTvEpisodes")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", args.dateKey))
      .first();
  },
});

export const getAgentDescriptors = internalQuery({
  args: { agentIds: v.array(v.id("agents")) },
  handler: async (ctx, args) => {
    const descriptors: Record<string, string> = {};
    for (const agentId of args.agentIds) {
      const record = await ctx.db
        .query("clawcityTvAgentDescriptors")
        .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
        .first();
      if (record) {
        descriptors[agentId.toString()] = record.descriptor;
      }
    }
    return descriptors;
  },
});

export const getStoryMaterials = internalQuery({
  args: {
    startTimestamp: v.number(),
    endTimestamp: v.number(),
    limitEvents: v.optional(v.number()),
    limitJournals: v.optional(v.number()),
    limitMessages: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limitEvents = args.limitEvents ?? 1000;
    const limitJournals = args.limitJournals ?? 200;
    const limitMessages = args.limitMessages ?? 200;

    const events = await ctx.db
      .query("events")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.startTimestamp).lt("timestamp", args.endTimestamp)
      )
      .order("desc")
      .take(limitEvents);

    const journals = await ctx.db
      .query("journals")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.startTimestamp).lt("timestamp", args.endTimestamp)
      )
      .order("desc")
      .take(limitJournals);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_timestamp", (q) =>
        q.gte("timestamp", args.startTimestamp).lt("timestamp", args.endTimestamp)
      )
      .order("desc")
      .take(limitMessages);

    const agentIds = new Set<string>();
    const zoneIds = new Set<string>();

    for (const event of events) {
      if (event.agentId) agentIds.add(event.agentId.toString());
      if (event.zoneId) zoneIds.add(event.zoneId.toString());
    }
    for (const journal of journals) {
      agentIds.add(journal.agentId.toString());
    }
    for (const message of messages) {
      agentIds.add(message.senderId.toString());
      agentIds.add(message.recipientId.toString());
    }

    const agents = await Promise.all(
      [...agentIds].map(async (id) => {
        const agent = await ctx.db.get(id as Id<"agents">);
        if (!agent) return null;
        return {
          _id: agent._id,
          name: agent.name,
          gangId: agent.gangId ?? null,
          locationZoneId: agent.locationZoneId,
          status: agent.status,
          heat: agent.heat,
          reputation: agent.reputation,
          skills: agent.skills,
          stats: agent.stats,
        };
      })
    );

    const zones = await Promise.all(
      [...zoneIds].map(async (id) => {
        const zone = await ctx.db.get(id as Id<"zones">);
        if (!zone) return null;
        return { _id: zone._id, name: zone.name };
      })
    );

    const agentById: Record<string, { name: string } | null> = {};
    for (const agent of agents) {
      if (agent) {
        agentById[agent._id.toString()] = { name: agent.name };
      }
    }

    const zoneById: Record<string, { name: string } | null> = {};
    for (const zone of zones) {
      if (zone) {
        zoneById[zone._id.toString()] = { name: zone.name };
      }
    }

    return {
      agents: agents.filter(Boolean),
      events: events.map((event) => ({
        _id: event._id,
        type: event.type,
        tick: event.tick,
        timestamp: event.timestamp,
        agentId: event.agentId,
        agentName: event.agentId
          ? agentById[event.agentId.toString()]?.name ?? null
          : null,
        zoneId: event.zoneId,
        zoneName: event.zoneId
          ? zoneById[event.zoneId.toString()]?.name ?? null
          : null,
        payload: event.payload,
      })),
      journals: journals.map((journal) => ({
        _id: journal._id,
        agentId: journal.agentId,
        agentName: agentById[journal.agentId.toString()]?.name ?? "Unknown",
        tick: journal.tick,
        timestamp: journal.timestamp,
        action: journal.action,
        reflection: journal.reflection,
        mood: journal.mood ?? null,
        result: journal.result ?? null,
      })),
      messages: messages.map((message) => ({
        _id: message._id,
        senderId: message.senderId,
        senderName: agentById[message.senderId.toString()]?.name ?? "Unknown",
        recipientId: message.recipientId,
        recipientName: agentById[message.recipientId.toString()]?.name ?? "Unknown",
        tick: message.tick,
        timestamp: message.timestamp,
        content: message.content,
      })),
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS (SERVER PIPELINE)
// ============================================================================

export const createEpisode = internalMutation({
  args: {
    dateKey: v.string(),
    startTimestamp: v.number(),
    endTimestamp: v.number(),
    clipCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("clawcityTvEpisodes")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", args.dateKey))
      .first();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("clawcityTvEpisodes", {
      dateKey: args.dateKey,
      startTimestamp: args.startTimestamp,
      endTimestamp: args.endTimestamp,
      clipCount: args.clipCount,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateEpisode = internalMutation({
  args: {
    episodeId: v.id("clawcityTvEpisodes"),
    status: v.optional(
      v.union(
        v.literal("queued"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    title: v.optional(v.string()),
    summary: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.status) updates.status = args.status;
    if (args.title !== undefined) updates.title = args.title;
    if (args.summary !== undefined) updates.summary = args.summary;
    if (args.error !== undefined) updates.error = args.error;
    await ctx.db.patch(args.episodeId, updates);
  },
});

export const createClip = internalMutation({
  args: {
    episodeId: v.id("clawcityTvEpisodes"),
    index: v.number(),
    title: v.string(),
    logline: v.string(),
    prompt: v.string(),
    script: v.string(),
    sceneNotes: v.optional(v.string()),
    agentIds: v.array(v.id("agents")),
    eventIds: v.optional(v.array(v.id("events"))),
    durationSeconds: v.number(),
    aspectRatio: v.string(),
    resolution: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("clawcityTvClips", {
      episodeId: args.episodeId,
      index: args.index,
      status: "planned",
      title: args.title,
      logline: args.logline,
      prompt: args.prompt,
      script: args.script,
      sceneNotes: args.sceneNotes,
      agentIds: args.agentIds,
      eventIds: args.eventIds,
      durationSeconds: args.durationSeconds,
      aspectRatio: args.aspectRatio,
      resolution: args.resolution,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateClip = internalMutation({
  args: {
    clipId: v.id("clawcityTvClips"),
    status: v.optional(
      v.union(
        v.literal("planned"),
        v.literal("generating_image"),
        v.literal("generating_video"),
        v.literal("completed"),
        v.literal("failed")
      )
    ),
    imageKey: v.optional(v.string()),
    videoKey: v.optional(v.string()),
    xaiRequestId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.status) updates.status = args.status;
    if (args.imageKey !== undefined) updates.imageKey = args.imageKey;
    if (args.videoKey !== undefined) updates.videoKey = args.videoKey;
    if (args.xaiRequestId !== undefined) updates.xaiRequestId = args.xaiRequestId;
    if (args.error !== undefined) updates.error = args.error;
    await ctx.db.patch(args.clipId, updates);
  },
});

export const upsertAgentDescriptor = internalMutation({
  args: {
    agentId: v.id("agents"),
    descriptor: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("clawcityTvAgentDescriptors")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        descriptor: args.descriptor,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("clawcityTvAgentDescriptors", {
      agentId: args.agentId,
      descriptor: args.descriptor,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// ============================================================================
// INTERNAL ACTIONS (R2 STORAGE)
// ============================================================================

export const storeR2FromUrl = internalAction({
  args: {
    url: v.string(),
    keyPrefix: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const response = await fetch(args.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch asset: ${response.status}`);
    }

    const blob = await response.blob();
    const contentType = args.type ?? blob.type ?? "application/octet-stream";
    const key = `${args.keyPrefix}/${crypto.randomUUID()}`;

    const storedKey = await r2.store(ctx, blob, {
      key,
      type: contentType,
    });

    const publicUrl = await r2.getUrl(storedKey);

    return {
      key: storedKey,
      publicUrl,
      contentType,
    };
  },
});
