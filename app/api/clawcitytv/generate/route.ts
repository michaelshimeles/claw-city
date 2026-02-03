import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { internal } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const runtime = "nodejs";
export const maxDuration = 300;

type StoryMaterials = {
  agents: Array<{
    _id: Id<"agents">;
    name: string;
    gangId: Id<"gangs"> | null;
    locationZoneId: Id<"zones">;
    status: string;
    heat: number;
    reputation: number;
    skills: Record<string, number>;
    stats: Record<string, number>;
  } | null>;
  events: Array<{
    _id: Id<"events">;
    type: string;
    tick: number;
    timestamp: number;
    agentId: Id<"agents"> | null;
    agentName: string | null;
    zoneId: Id<"zones"> | null;
    zoneName: string | null;
    payload: unknown;
  }>;
  journals: Array<{
    _id: Id<"journals">;
    agentId: Id<"agents">;
    agentName: string;
    tick: number;
    timestamp: number;
    action: string;
    reflection: string;
    mood: string | null;
    result: unknown;
  }>;
  messages: Array<{
    _id: Id<"messages">;
    senderId: Id<"agents">;
    senderName: string;
    recipientId: Id<"agents">;
    recipientName: string;
    tick: number;
    timestamp: number;
    content: string;
  }>;
};

type ClipPlan = {
  title: string;
  logline: string;
  prompt: string;
  script: string;
  sceneNotes?: string;
  agentIds: Id<"agents">[];
  eventIds?: Id<"events">[];
};

const DEFAULT_CLIP_DURATION = 8;
const DEFAULT_ASPECT_RATIO = "16:9";
const DEFAULT_RESOLUTION = "720p";

export async function POST(request: Request) {
  const secret = request.headers.get("x-clawcitytv-secret");
  if (!secret || secret !== process.env.CLAWCITYTV_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const convexUrl =
    process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexAdminKey = process.env.CONVEX_ADMIN_KEY;
  const xaiApiKey = process.env.XAI_API_KEY;

  if (!convexUrl || !convexAdminKey || !xaiApiKey) {
    return NextResponse.json(
      { error: "Missing CONVEX_URL/CONVEX_ADMIN_KEY/XAI_API_KEY" },
      { status: 500 }
    );
  }

  const client = new ConvexHttpClient(convexUrl);
  client.setAdminAuth(convexAdminKey);

  const now = Date.now();
  const endTimestamp = now;
  const startTimestamp = now - 24 * 60 * 60 * 1000;
  const dateKey = getDateKey(endTimestamp);

  const existingEpisode = await client.query(
    internal.clawcityTv.getEpisodeByDateKey,
    { dateKey }
  );

  if (existingEpisode && existingEpisode.status !== "failed") {
    return NextResponse.json({
      ok: true,
      message: "Episode already exists",
      episodeId: existingEpisode._id,
      status: existingEpisode.status,
    });
  }

  const episodeId = await client.mutation(internal.clawcityTv.createEpisode, {
    dateKey,
    startTimestamp,
    endTimestamp,
    clipCount: 5,
  });

  await client.mutation(internal.clawcityTv.updateEpisode, {
    episodeId,
    status: "processing",
  });

  try {
    const materials = (await client.query(internal.clawcityTv.getStoryMaterials, {
      startTimestamp,
      endTimestamp,
      limitEvents: 1500,
      limitJournals: 300,
      limitMessages: 300,
    })) as StoryMaterials;

    const agentMap = new Map(
      materials.agents
        .filter(Boolean)
        .map((agent) => [agent!._id, agent!])
    );

    const clipPlans = await generateClipPlans(materials, xaiApiKey);

    await client.mutation(internal.clawcityTv.updateEpisode, {
      episodeId,
      title: clipPlans.episodeTitle,
      summary: clipPlans.episodeSummary,
    });

    const descriptors = await ensureAgentDescriptors(
      client,
      xaiApiKey,
      clipPlans.clips,
      agentMap
    );

    for (let index = 0; index < clipPlans.clips.length; index++) {
      const clip = clipPlans.clips[index];
      const clipId = await client.mutation(internal.clawcityTv.createClip, {
        episodeId,
        index,
        title: clip.title,
        logline: clip.logline,
        prompt: clip.prompt,
        script: clip.script,
        sceneNotes: clip.sceneNotes,
        agentIds: clip.agentIds,
        eventIds: clip.eventIds,
        durationSeconds: DEFAULT_CLIP_DURATION,
        aspectRatio: DEFAULT_ASPECT_RATIO,
        resolution: DEFAULT_RESOLUTION,
      });

      await client.mutation(internal.clawcityTv.updateClip, {
        clipId,
        status: "generating_image",
      });

      const agentDescriptorText = clip.agentIds
        .map((id) => descriptors[id.toString()])
        .filter(Boolean)
        .join(" ");

      const imagePrompt = buildImagePrompt(
        clip,
        agentDescriptorText || "gritty cyberpunk outlaw"
      );

      const imageUrl = await generateImage(imagePrompt, xaiApiKey);

      const storedImage = await client.action(
        internal.clawcityTv.storeR2FromUrl,
        {
          url: imageUrl,
          keyPrefix: `clawcitytv/${dateKey}/clip-${index + 1}/image`,
          type: "image/jpeg",
        }
      );

      await client.mutation(internal.clawcityTv.updateClip, {
        clipId,
        status: "generating_video",
        imageKey: storedImage.key,
      });

      const videoPrompt = buildVideoPrompt(
        clip,
        agentDescriptorText || "gritty cyberpunk outlaw"
      );

      const requestId = await startVideoGeneration(
        {
          prompt: videoPrompt,
          imageUrl: storedImage.publicUrl,
          duration: DEFAULT_CLIP_DURATION,
          aspectRatio: DEFAULT_ASPECT_RATIO,
          resolution: DEFAULT_RESOLUTION,
        },
        xaiApiKey
      );

      await client.mutation(internal.clawcityTv.updateClip, {
        clipId,
        xaiRequestId: requestId,
      });

      const videoUrl = await pollVideo(requestId, xaiApiKey);

      const storedVideo = await client.action(
        internal.clawcityTv.storeR2FromUrl,
        {
          url: videoUrl,
          keyPrefix: `clawcitytv/${dateKey}/clip-${index + 1}/video`,
          type: "video/mp4",
        }
      );

      await client.mutation(internal.clawcityTv.updateClip, {
        clipId,
        status: "completed",
        videoKey: storedVideo.key,
      });
    }

    await client.mutation(internal.clawcityTv.updateEpisode, {
      episodeId,
      status: "completed",
    });

    return NextResponse.json({ ok: true, episodeId });
  } catch (error) {
    await client.mutation(internal.clawcityTv.updateEpisode, {
      episodeId,
      status: "failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function getDateKey(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
}

function buildImagePrompt(clip: ClipPlan, agentDescriptor: string): string {
  return [
    "Character portal still, cinematic composition.",
    `Subject: ${agentDescriptor}.`,
    `Story beat: ${clip.logline}.`,
    "Glowing portal light, neon city haze, dramatic rim lighting, shallow depth of field.",
    "No text, no watermarks, 16:9 framing.",
  ].join(" ");
}

function buildVideoPrompt(clip: ClipPlan, agentDescriptor: string): string {
  return [
    "Cinematic short video, 8 seconds.",
    `Focus on: ${agentDescriptor}.`,
    `Story: ${clip.script}.`,
    "Camera moves subtly, portal light pulses, city atmosphere, high contrast.",
    "No subtitles, no text overlays.",
  ].join(" ");
}

async function generateClipPlans(materials: StoryMaterials, apiKey: string) {
  const events = materials.events.map((event) => ({
    id: event._id,
    type: event.type,
    time: new Date(event.timestamp).toISOString(),
    agentId: event.agentId,
    agentName: event.agentName,
    zoneName: event.zoneName,
    summary: summarizePayload(event.payload),
    score: scoreEvent(event.type, event.payload),
  }));

  const journals = materials.journals.map((entry) => ({
    id: entry._id,
    agentId: entry.agentId,
    agentName: entry.agentName,
    time: new Date(entry.timestamp).toISOString(),
    action: entry.action,
    mood: entry.mood,
    reflection: truncate(entry.reflection, 240),
  }));

  const messages = materials.messages.map((message) => ({
    id: message._id,
    senderId: message.senderId,
    senderName: message.senderName,
    recipientId: message.recipientId,
    recipientName: message.recipientName,
    time: new Date(message.timestamp).toISOString(),
    content: truncate(message.content, 200),
  }));

  const topEvents = [...events].sort((a, b) => b.score - a.score).slice(0, 120);

  const systemPrompt =
    "You are the showrunner for ClawCityTV. Output strict JSON only.";

  const userPrompt = JSON.stringify({
    task:
      "Create a 5-clip episode for the last 24 hours. Each clip is a story beat. Use agentIds and eventIds from the input. Keep clips distinct with clear tension and payoff.",
    outputSchema: {
      episodeTitle: "string",
      episodeSummary: "string",
      clips: [
        {
          title: "string",
          logline: "string",
          script: "string",
          prompt: "string",
          sceneNotes: "string optional",
          agentIds: ["agentId"],
          eventIds: ["eventId optional"],
        },
      ],
    },
    data: {
      events: topEvents,
      journals: journals.slice(0, 120),
      messages: messages.slice(0, 120),
    },
  });

  const response = await xaiChatCompletion({
    apiKey,
    model: process.env.XAI_TEXT_MODEL || "grok-2-latest",
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.6,
  });

  const parsed = safeJsonParse(response);

  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray(parsed.clips) &&
    parsed.clips.length >= 5
  ) {
    return {
      episodeTitle: parsed.episodeTitle ?? "ClawCityTV",
      episodeSummary: parsed.episodeSummary ?? "Five beats from the streets.",
      clips: parsed.clips.slice(0, 5).map((clip: ClipPlan) => ({
        title: clip.title ?? "Untitled",
        logline: clip.logline ?? clip.script ?? "A new turn in ClawCity.",
        prompt: clip.prompt ?? clip.script ?? "Cinematic crime scene.",
        script: clip.script ?? clip.logline ?? "A new turn in ClawCity.",
        sceneNotes: clip.sceneNotes,
        agentIds: clip.agentIds ?? [],
        eventIds: clip.eventIds ?? [],
      })),
    };
  }

  const fallback = topEvents.slice(0, 5).map((event, index) => ({
    title: event.type.replace(/_/g, " "),
    logline: event.summary || event.type,
    prompt: `Cinematic crime scene inspired by ${event.type}`,
    script: event.summary || event.type,
    agentIds: event.agentId ? [event.agentId] : [],
    eventIds: [event.id],
  }));

  return {
    episodeTitle: "ClawCityTV Daily",
    episodeSummary: "The biggest moves from the last 24 hours.",
    clips: fallback,
  };
}

async function ensureAgentDescriptors(
  client: ConvexHttpClient,
  apiKey: string,
  clips: ClipPlan[],
  agentMap: Map<Id<"agents">, StoryMaterials["agents"][number]>
) {
  const agentIds = new Set<string>();
  for (const clip of clips) {
    for (const agentId of clip.agentIds) {
      agentIds.add(agentId.toString());
    }
  }

  const ids = [...agentIds].map((id) => id as Id<"agents">);
  if (ids.length === 0) {
    return {};
  }

  const existing = await client.query(
    internal.clawcityTv.getAgentDescriptors,
    { agentIds: ids }
  );

  const missing = ids.filter((id) => !existing[id.toString()]);
  if (missing.length === 0) {
    return existing;
  }

  const agentDetails = missing
    .map((id) => agentMap.get(id))
    .filter(Boolean)
    .map((agent) => ({
      id: agent!._id,
      name: agent!.name,
      status: agent!.status,
      heat: agent!.heat,
      reputation: agent!.reputation,
      skills: agent!.skills,
    }));

  const systemPrompt =
    "You are crafting concise character descriptors for cinematic visuals. Output strict JSON only.";
  const userPrompt = JSON.stringify({
    task:
      "Create a vivid but compact visual descriptor (15-25 words) for each agent. Focus on physical look, style, vibe. No names in the descriptor.",
    agents: agentDetails,
    outputSchema: { descriptors: { agentId: "descriptor" } },
  });

  const response = await xaiChatCompletion({
    apiKey,
    model: process.env.XAI_TEXT_MODEL || "grok-2-latest",
    system: systemPrompt,
    user: userPrompt,
    temperature: 0.7,
  });

  const parsed = safeJsonParse(response);
  const descriptors: Record<string, string> =
    parsed?.descriptors && typeof parsed.descriptors === "object"
      ? parsed.descriptors
      : {};

  for (const [agentId, descriptor] of Object.entries(descriptors)) {
    if (typeof descriptor === "string" && descriptor.trim().length > 0) {
      await client.mutation(internal.clawcityTv.upsertAgentDescriptor, {
        agentId: agentId as Id<"agents">,
        descriptor,
      });
      existing[agentId] = descriptor;
    }
  }

  return existing;
}

async function xaiChatCompletion({
  apiKey,
  model,
  system,
  user,
  temperature,
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  temperature: number;
}) {
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`xAI chat error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content =
    data?.choices?.[0]?.message?.content ??
    data?.output?.[0]?.content ??
    "";
  return String(content);
}

async function generateImage(prompt: string, apiKey: string) {
  const response = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.XAI_IMAGE_MODEL || "grok-imagine-image",
      prompt,
      image_format: "url",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`xAI image error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const url = data?.data?.[0]?.url ?? data?.url;
  if (!url) {
    throw new Error("xAI image response missing URL");
  }
  return url as string;
}

async function startVideoGeneration(
  {
    prompt,
    imageUrl,
    duration,
    aspectRatio,
    resolution,
  }: {
    prompt: string;
    imageUrl: string;
    duration: number;
    aspectRatio: string;
    resolution: string;
  },
  apiKey: string
) {
  const response = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.XAI_VIDEO_MODEL || "grok-imagine-video",
      prompt,
      image_url: imageUrl,
      duration,
      aspect_ratio: aspectRatio,
      resolution,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`xAI video start error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const requestId = data?.request_id ?? data?.id ?? null;
  if (!requestId) {
    throw new Error("xAI video response missing request_id");
  }
  return requestId as string;
}

async function pollVideo(requestId: string, apiKey: string) {
  const maxAttempts = 60;
  const delayMs = 8000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`https://api.x.ai/v1/videos/${requestId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`xAI video poll error: ${response.status} ${text}`);
    }

    const data = await response.json();
    const status = String(
      data?.status ?? data?.state ?? data?.result?.status ?? ""
    ).toLowerCase();
    const videoUrl =
      data?.video_url ??
      data?.url ??
      data?.data?.[0]?.url ??
      data?.output?.url ??
      data?.output?.[0]?.url ??
      null;

    if (videoUrl) {
      return videoUrl as string;
    }

    if (status === "failed" || status === "error") {
      throw new Error(`xAI video failed: ${JSON.stringify(data)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("xAI video polling timed out");
}

function summarizePayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const obj = payload as Record<string, unknown>;
  const keys = [
    "crimeType",
    "amount",
    "wage",
    "jobTitle",
    "targetName",
    "vehicleType",
    "zoneName",
    "message",
  ];
  const parts = keys
    .filter((key) => obj[key] !== undefined)
    .map((key) => `${key}:${String(obj[key])}`);
  return parts.join(", ");
}

function scoreEvent(type: string, payload: unknown) {
  const base: Record<string, number> = {
    AGENT_KILLED: 10,
    GANG_BETRAYED: 9,
    BOUNTY_CLAIMED: 8,
    JAILBREAK_SUCCESS: 8,
    COOP_CRIME_SUCCESS: 7,
    CRIME_SUCCESS: 6,
    AGENT_ARRESTED: 6,
    VEHICLE_STOLEN: 6,
    PROPERTY_PURCHASED: 5,
    BUSINESS_STARTED: 5,
    GANG_CREATED: 5,
    GANG_JOINED: 4,
    JOB_COMPLETED: 3,
  };

  let score = base[type] ?? 2;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.amount === "number") score += Math.min(5, obj.amount / 5000);
    if (typeof obj.wage === "number") score += Math.min(3, obj.wage / 2000);
  }
  return score;
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}
