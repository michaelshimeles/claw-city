/**
 * Data Preview Queries for ClawCity Data Monetization
 * Provides sample data and statistics for the data preview dashboard
 *
 * Note: Uses very small samples to avoid hitting 32k document read limit
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const DATA_PREVIEW_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const TRUST_EVENT_TYPES = [
  "GANG_BETRAYED",
  "FRIEND_REQUEST_ACCEPTED",
  "FRIEND_REMOVED",
  "GANG_MEMBER_KICKED",
  "GANG_LEFT",
  "AGENT_ROBBED",
  "ROB_ATTEMPT_FAILED",
  "COOP_CRIME_SUCCESS",
  "COOP_CRIME_FAILED",
];

function generateSessionToken(): string {
  return `dp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

async function getValidSession(ctx: { db: any }, sessionToken: string) {
  const session = await ctx.db
    .query("dataPreviewSessions")
    .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
    .first();

  if (!session) {
    return null;
  }

  if (session.expiresAt <= Date.now()) {
    return null;
  }

  return session;
}

function agentAlias(agentId?: string | null): string {
  if (!agentId) return "agent_unknown";
  return `agent_${agentId.toString().slice(-6)}`;
}

// Show full text without redaction
function showText(text: string) {
  return text;
}

// Return data as-is without redaction
function showDeep(value: unknown): unknown {
  return value;
}

async function countTable(ctx: { db: any }, tableName: string): Promise<number> {
  const query = ctx.db.query(tableName as any) as any;
  if (typeof query.count === "function") {
    return query.count();
  }
  const all = await ctx.db.query(tableName as any).collect();
  return all.length;
}

async function countTrustEvents(ctx: { db: any }): Promise<number> {
  let total = 0;
  for (const type of TRUST_EVENT_TYPES) {
    const events = await ctx.db
      .query("events")
      .withIndex("by_type", (q: any) => q.eq("type", type))
      .collect();
    total += events.length;
  }
  return total;
}

/**
 * Create a data preview session token
 */
export const createDataPreviewSession = mutation({
  args: { password: v.string() },
  handler: async (ctx, { password }) => {
    const expected = process.env.DATA_PREVIEW_PASSWORD;
    if (!expected) {
      throw new Error("DATA_PREVIEW_PASSWORD not set");
    }

    if (password !== expected) {
      return { ok: false };
    }

    const now = Date.now();
    const sessionToken = generateSessionToken();
    const expiresAt = now + DATA_PREVIEW_SESSION_TTL_MS;

    await ctx.db.insert("dataPreviewSessions", {
      token: sessionToken,
      createdAt: now,
      expiresAt,
    });

    return { ok: true, sessionToken, expiresAt };
  },
});

/**
 * Validate a data preview session token
 */
export const validateDataPreviewSession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await getValidSession(ctx, sessionToken);
    return {
      valid: Boolean(session),
      expiresAt: session?.expiresAt ?? null,
    };
  },
});

/**
 * Get aggregated dataset statistics
 * Uses very small samples to stay well under 32k limit
 */
export const getDatasetStats = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await getValidSession(ctx, sessionToken);
    if (!session) return null;

    const [
      totalAgents,
      totalDecisions,
      totalMessages,
      totalEvents,
      totalFriendships,
      totalCoopActions,
    ] = await Promise.all([
      countTable(ctx, "agents"),
      countTable(ctx, "journals"),
      countTable(ctx, "messages"),
      countTable(ctx, "events"),
      countTable(ctx, "friendships"),
      countTable(ctx, "coopActions"),
    ]);

    const trustBetrayalEvents = await countTrustEvents(ctx);

    const agentsSample = await ctx.db.query("agents").take(1000);

    // Calculate LLM distribution from agents
    const llmCounts: Record<string, number> = {};
    for (const agent of agentsSample) {
      if (agent.llmInfo?.provider) {
        const key = `${agent.llmInfo.provider}/${agent.llmInfo.modelName}`;
        llmCounts[key] = (llmCounts[key] || 0) + 1;
      }
    }

    return {
      totalAgents,
      totalDecisions,
      totalMessages,
      totalEvents,
      totalFriendships,
      totalCoopActions,
      trustBetrayalEvents,
      negotiationRecords: totalMessages,
      llmDistribution: llmCounts,
      uniqueLLMs: Object.keys(llmCounts).length,
    };
  },
});

/**
 * Get LLM distribution statistics
 */
export const getLLMDistribution = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    const session = await getValidSession(ctx, sessionToken);
    if (!session) return null;

    const agents = await ctx.db.query("agents").take(1000);

    // Count by provider
    const byProvider: Record<string, number> = {};
    // Count by full model (provider + model name)
    const byModel: Record<string, number> = {};

    for (const agent of agents) {
      if (agent.llmInfo) {
        const provider = agent.llmInfo.provider;
        const model = `${provider}/${agent.llmInfo.modelName}`;

        byProvider[provider] = (byProvider[provider] || 0) + 1;
        byModel[model] = (byModel[model] || 0) + 1;
      }
    }

    // Calculate percentages
    const total = agents.length;
    const withLLM = Object.values(byProvider).reduce((a, b) => a + b, 0);

    if (total - withLLM > 0) {
      byProvider.unknown = total - withLLM;
    }

    const providerStats = Object.entries(byProvider)
      .map(([provider, count]) => ({
        provider,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const modelStats = Object.entries(byModel)
      .map(([model, count]) => ({
        model,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalAgents: total,
      agentsWithLLM: withLLM,
      agentsWithoutLLM: total - withLLM,
      byProvider: providerStats,
      byModel: modelStats,
    };
  },
});

/**
 * Get sample decision logs (from journals)
 */
export const getSampleDecisionLogs = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 5 }) => {
    const session = await getValidSession(ctx, sessionToken);
    if (!session) return null;

    const journals = await ctx.db
      .query("journals")
      .order("desc")
      .take(20);

    // Get agent info for each journal
    const samples = [];
    const seenActions = new Set<string>();

    for (const journal of journals) {
      // Skip if we've seen this action type
      if (seenActions.has(journal.action)) continue;
      seenActions.add(journal.action);

      const agent = await ctx.db.get(journal.agentId);
      if (!agent) continue;

      samples.push({
        timestamp: journal.timestamp,
        tick: journal.tick,
        agentAlias: agentAlias(agent._id.toString()),
        action: journal.action,
        actionArgs: showDeep(journal.actionArgs),
        result: showDeep(journal.result),
        reflection: showText(journal.reflection),
        mood: journal.mood,
        agentState: {
          cash: agent.cash,
          health: agent.health,
          heat: agent.heat,
          reputation: agent.reputation,
        },
      });

      if (samples.length >= limit) break;
    }

    const recordCount = await countTable(ctx, "journals");

    return {
      datasetName: "Decision Logs",
      description:
        "Complete decision traces showing agent state, chosen action, outcome, and internal reasoning",
      recordCount,
      samples,
    };
  },
});

/**
 * Get sample negotiations (multi-message conversations between agents)
 */
export const getSampleNegotiations = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 5 }) => {
    const session = await getValidSession(ctx, sessionToken);
    if (!session) return null;

    // Get recent messages
    const messages = await ctx.db.query("messages").order("desc").take(50);

    // Group by conversation (sender-recipient pairs)
    const conversations: Map<
      string,
      {
        participants: string[];
        messages: Array<{
          senderId: string;
          recipientId: string;
          content: string;
          tick: number;
          timestamp: number;
        }>;
      }
    > = new Map();

    for (const msg of messages) {
      // Create consistent conversation key (lower ID first)
      const ids = [msg.senderId.toString(), msg.recipientId.toString()].sort();
      const key = ids.join("-");

      if (!conversations.has(key)) {
        conversations.set(key, {
          participants: ids.map((id) => agentAlias(id)),
          messages: [],
        });
      }

      conversations.get(key)!.messages.push({
        senderId: msg.senderId.toString(),
        recipientId: msg.recipientId.toString(),
        content: showText(msg.content),
        tick: msg.tick,
        timestamp: msg.timestamp,
      });
    }

    // Get conversations with at least 2 messages (back and forth)
    const negotiations = Array.from(conversations.values())
      .filter((conv) => conv.messages.length >= 2)
      .slice(0, limit)
      .map((conv) => ({
        participants: conv.participants,
        turnCount: conv.messages.length,
        messages: conv.messages.sort((a, b) => a.timestamp - b.timestamp),
      }));

    const recordCount = await countTable(ctx, "messages");

    return {
      datasetName: "Negotiation Transcripts",
      description:
        "Multi-turn conversations between agents including bargaining, coordination, and social dynamics",
      recordCount,
      samples: negotiations,
    };
  },
});

/**
 * Get sample trust and betrayal events
 */
export const getSampleTrustEvents = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 5 }) => {
    const session = await getValidSession(ctx, sessionToken);
    if (!session) return null;

    // Get recent events (limited)
    const events = await ctx.db.query("events").order("desc").take(200);

    const trustEvents = events.filter((e) => TRUST_EVENT_TYPES.includes(e.type));

    const samples = [];
    for (const event of trustEvents.slice(0, limit)) {
      const agentAliasName = event.agentId
        ? agentAlias(event.agentId.toString())
        : null;
      const targetAgentId = event.payload?.targetAgentId as
        | Id<"agents">
        | undefined;
      const targetAlias = targetAgentId ? agentAlias(targetAgentId.toString()) : null;

      samples.push({
        type: event.type,
        tick: event.tick,
        timestamp: event.timestamp,
        agentAlias: agentAliasName,
        targetAlias,
        payload: showDeep(event.payload),
      });
    }

    const recordCount = await countTrustEvents(ctx);

    return {
      datasetName: "Trust & Betrayal Events",
      description:
        "Relationship dynamics including friendship formation, gang loyalty, betrayals, and cooperative outcomes",
      recordCount,
      samples,
    };
  },
});

/**
 * Get sample economic/wealth trajectory data
 */
export const getSampleEconomicData = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 5 }) => {
    const session = await getValidSession(ctx, sessionToken);
    if (!session) return null;

    const totalAgents = await countTable(ctx, "agents");

    // Get agents (limited)
    const agents = await ctx.db.query("agents").take(100);

    // Sort by lifetime earnings to get most active economic actors
    const sortedAgents = agents
      .filter((a) => a.stats.lifetimeEarnings > 0)
      .sort((a, b) => b.stats.lifetimeEarnings - a.stats.lifetimeEarnings)
      .slice(0, limit);

    const samples = await Promise.all(
      sortedAgents.map(async (agent) => {
        // Get their recent economic events
        const events = await ctx.db
          .query("events")
          .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
          .order("desc")
          .take(10);

        const economicEvents = events.filter(
          (e) =>
            e.type === "JOB_COMPLETED" ||
            e.type === "CRIME_SUCCESS" ||
            e.type === "BUY" ||
            e.type === "SELL" ||
            e.type === "TAX_PAID"
        );

        return {
          agentAlias: agentAlias(agent._id.toString()),
          currentCash: agent.cash,
          lifetimeEarnings: agent.stats.lifetimeEarnings,
          jobsCompleted: agent.stats.jobsCompleted,
          totalCrimes: agent.stats.totalCrimes,
          skills: agent.skills,
          recentEconomicActivity: economicEvents.map((e) => ({
            type: e.type,
            tick: e.tick,
            payload: showDeep(e.payload),
          })),
        };
      })
    );

    return {
      datasetName: "Economic Strategies",
      description:
        "Wealth trajectories, income sources, spending patterns, and economic decision-making",
      recordCount: totalAgents,
      samples,
    };
  },
});

/**
 * Get sample reasoning chains (reflections from journals)
 */
export const getSampleReasoningChains = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { sessionToken, limit = 5 }) => {
    const session = await getValidSession(ctx, sessionToken);
    if (!session) return null;

    // Get journals with substantial reflections (limited)
    const journals = await ctx.db.query("journals").order("desc").take(30);

    // Filter for interesting reflections (longer ones with more detail)
    const interestingJournals = journals
      .filter((j) => j.reflection && j.reflection.length > 100)
      .slice(0, limit);

    const samples = await Promise.all(
      interestingJournals.map(async (journal) => {
        const agent = await ctx.db.get(journal.agentId);

        return {
          agentAlias: agentAlias(journal.agentId.toString()),
          action: journal.action,
          actionArgs: showDeep(journal.actionArgs),
          reasoning: showText(journal.reflection),
          mood: journal.mood,
          outcome: showDeep(journal.result),
          context: {
            tick: journal.tick,
            agentStats: agent
              ? {
                  cash: agent.cash,
                  health: agent.health,
                  heat: agent.heat,
                  reputation: agent.reputation,
                }
              : null,
          },
        };
      })
    );

    const recordCount = await countTable(ctx, "journals");

    return {
      datasetName: "Reasoning Chains",
      description:
        "Internal thought processes, decision rationale, emotional states, and strategic planning",
      recordCount,
      samples,
    };
  },
});
