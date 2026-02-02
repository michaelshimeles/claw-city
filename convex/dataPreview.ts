/**
 * Data Preview Queries for ClawCity Data Monetization
 * Provides sample data and statistics for the data preview dashboard
 */

import { v } from "convex/values";
import { query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Get aggregated dataset statistics
 */
export const getDatasetStats = query({
  handler: async (ctx) => {
    // Get counts from each table
    const agents = await ctx.db.query("agents").collect();
    const journals = await ctx.db.query("journals").collect();
    const messages = await ctx.db.query("messages").collect();
    const events = await ctx.db.query("events").collect();
    const friendships = await ctx.db.query("friendships").collect();
    const coopActions = await ctx.db.query("coopActions").collect();

    // Calculate LLM distribution
    const llmCounts: Record<string, number> = {};
    for (const agent of agents) {
      if (agent.llmInfo?.provider) {
        const key = `${agent.llmInfo.provider}/${agent.llmInfo.modelName}`;
        llmCounts[key] = (llmCounts[key] || 0) + 1;
      }
    }

    // Count trust/betrayal events
    const trustEvents = events.filter(
      (e) =>
        e.type === "BETRAY_GANG" ||
        e.type === "FRIENDSHIP_ACCEPTED" ||
        e.type === "FRIENDSHIP_BLOCKED" ||
        e.type === "GANG_MEMBER_KICKED"
    );

    // Count negotiation-like messages (conversations between agents)
    const negotiationCount = messages.length;

    return {
      totalAgents: agents.length,
      totalDecisions: journals.length,
      totalMessages: messages.length,
      totalEvents: events.length,
      totalFriendships: friendships.length,
      totalCoopActions: coopActions.length,
      trustBetrayalEvents: trustEvents.length,
      negotiationRecords: negotiationCount,
      llmDistribution: llmCounts,
      uniqueLLMs: Object.keys(llmCounts).length,
    };
  },
});

/**
 * Get LLM distribution statistics
 */
export const getLLMDistribution = query({
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();

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

    const providerStats = Object.entries(byProvider)
      .map(([provider, count]) => ({
        provider,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    const modelStats = Object.entries(byModel)
      .map(([model, count]) => ({
        model,
        count,
        percentage: Math.round((count / total) * 100),
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
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    const journals = await ctx.db
      .query("journals")
      .order("desc")
      .take(limit * 2); // Get more to filter out duplicates

    // Get agent info for each journal
    const samples = [];
    const seenActions = new Set<string>();

    for (const journal of journals) {
      // Skip if we've seen this action type
      if (seenActions.has(journal.action)) continue;
      seenActions.add(journal.action);

      const agent = await ctx.db.get(journal.agentId);
      if (!agent) continue;

      // Get zone info if available in result
      let zoneName = null;
      if (journal.result?.data?.newLocation) {
        const zone = await ctx.db
          .query("zones")
          .filter((q) => q.eq(q.field("slug"), journal.result.data.newLocation))
          .first();
        zoneName = zone?.name;
      }

      samples.push({
        timestamp: journal.timestamp,
        tick: journal.tick,
        agentName: agent.name,
        action: journal.action,
        actionArgs: journal.actionArgs,
        result: journal.result,
        reflection: journal.reflection,
        mood: journal.mood,
        agentState: {
          cash: agent.cash,
          health: agent.health,
          heat: agent.heat,
          reputation: agent.reputation,
        },
        zoneName,
      });

      if (samples.length >= limit) break;
    }

    return {
      datasetName: "Decision Logs",
      description:
        "Complete decision traces showing agent state, chosen action, outcome, and internal reasoning",
      recordCount: await ctx.db.query("journals").collect().then((j) => j.length),
      samples,
    };
  },
});

/**
 * Get sample negotiations (multi-message conversations between agents)
 */
export const getSampleNegotiations = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    // Get recent messages
    const messages = await ctx.db.query("messages").order("desc").take(100);

    // Group by conversation (sender-recipient pairs)
    const conversations: Map<
      string,
      Array<{
        senderId: string;
        senderName: string;
        recipientId: string;
        recipientName: string;
        content: string;
        tick: number;
        timestamp: number;
      }>
    > = new Map();

    for (const msg of messages) {
      // Create consistent conversation key (lower ID first)
      const ids = [msg.senderId.toString(), msg.recipientId.toString()].sort();
      const key = ids.join("-");

      if (!conversations.has(key)) {
        conversations.set(key, []);
      }

      const sender = await ctx.db.get(msg.senderId);
      const recipient = await ctx.db.get(msg.recipientId);

      conversations.get(key)!.push({
        senderId: msg.senderId.toString(),
        senderName: sender?.name || "Unknown",
        recipientId: msg.recipientId.toString(),
        recipientName: recipient?.name || "Unknown",
        content: msg.content,
        tick: msg.tick,
        timestamp: msg.timestamp,
      });
    }

    // Get conversations with at least 2 messages (back and forth)
    const negotiations = Array.from(conversations.values())
      .filter((conv) => conv.length >= 2)
      .slice(0, limit)
      .map((conv) => ({
        participants: [conv[0].senderName, conv[0].recipientName],
        turnCount: conv.length,
        messages: conv.sort((a, b) => a.timestamp - b.timestamp),
      }));

    return {
      datasetName: "Negotiation Transcripts",
      description:
        "Multi-turn conversations between agents including bargaining, coordination, and social dynamics",
      recordCount: await ctx.db.query("messages").collect().then((m) => m.length),
      samples: negotiations,
    };
  },
});

/**
 * Get sample trust and betrayal events
 */
export const getSampleTrustEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    // Get events related to trust and betrayal
    const trustEventTypes = [
      "BETRAY_GANG",
      "FRIENDSHIP_ACCEPTED",
      "FRIENDSHIP_BLOCKED",
      "FRIENDSHIP_REMOVED",
      "GANG_MEMBER_KICKED",
      "GANG_MEMBER_LEFT",
      "ROB_AGENT",
      "COOP_CRIME_SUCCESS",
      "COOP_CRIME_FAILED",
    ];

    const events = await ctx.db.query("events").order("desc").take(200);

    const trustEvents = events.filter((e) => trustEventTypes.includes(e.type));

    const samples = [];
    for (const event of trustEvents.slice(0, limit)) {
      let agentName = null;
      let targetName = null;

      if (event.agentId) {
        const agent = await ctx.db.get(event.agentId);
        agentName = agent?.name;
      }

      // Try to get target agent from payload
      if (event.payload?.targetAgentId) {
        const target = await ctx.db.get(event.payload.targetAgentId as Id<"agents">);
        if (target && "name" in target) {
          targetName = target.name;
        }
      }

      samples.push({
        type: event.type,
        tick: event.tick,
        timestamp: event.timestamp,
        agentName,
        targetName,
        payload: event.payload,
      });
    }

    return {
      datasetName: "Trust & Betrayal Events",
      description:
        "Relationship dynamics including friendship formation, gang loyalty, betrayals, and cooperative outcomes",
      recordCount: trustEvents.length,
      samples,
    };
  },
});

/**
 * Get sample economic/wealth trajectory data
 */
export const getSampleEconomicData = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    // Get agents with interesting economic histories
    const agents = await ctx.db.query("agents").collect();

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
          agentName: agent.name,
          currentCash: agent.cash,
          lifetimeEarnings: agent.stats.lifetimeEarnings,
          jobsCompleted: agent.stats.jobsCompleted,
          totalCrimes: agent.stats.totalCrimes,
          skills: agent.skills,
          recentEconomicActivity: economicEvents.map((e) => ({
            type: e.type,
            tick: e.tick,
            payload: e.payload,
          })),
        };
      })
    );

    return {
      datasetName: "Economic Strategies",
      description:
        "Wealth trajectories, income sources, spending patterns, and economic decision-making",
      recordCount: agents.length,
      samples,
    };
  },
});

/**
 * Get sample reasoning chains (reflections from journals)
 */
export const getSampleReasoningChains = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 5 }) => {
    // Get journals with substantial reflections
    const journals = await ctx.db.query("journals").order("desc").take(50);

    // Filter for interesting reflections (longer ones with more detail)
    const interestingJournals = journals
      .filter((j) => j.reflection && j.reflection.length > 100)
      .slice(0, limit);

    const samples = await Promise.all(
      interestingJournals.map(async (journal) => {
        const agent = await ctx.db.get(journal.agentId);

        // Get agent's recent history for context
        const recentJournals = await ctx.db
          .query("journals")
          .withIndex("by_agentId", (q) => q.eq("agentId", journal.agentId))
          .order("desc")
          .take(3);

        return {
          agentName: agent?.name || "Unknown",
          action: journal.action,
          actionArgs: journal.actionArgs,
          reasoning: journal.reflection,
          mood: journal.mood,
          outcome: journal.result,
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
          recentActions: recentJournals.map((j) => ({
            action: j.action,
            reflection: j.reflection?.substring(0, 100) + "...",
          })),
        };
      })
    );

    return {
      datasetName: "Reasoning Chains",
      description:
        "Internal thought processes, decision rationale, emotional states, and strategic planning",
      recordCount: await ctx.db.query("journals").collect().then((j) => j.length),
      samples,
    };
  },
});

/**
 * Get all sample datasets for the preview page
 */
export const getAllSampleData = query({
  args: { samplesPerDataset: v.optional(v.number()) },
  handler: async (ctx, { samplesPerDataset: _samplesPerDataset = 3 }) => {
    // Get stats
    const agents = await ctx.db.query("agents").collect();
    const journals = await ctx.db.query("journals").collect();
    const messages = await ctx.db.query("messages").collect();
    const events = await ctx.db.query("events").collect();

    // LLM distribution
    const llmCounts: Record<string, number> = {};
    for (const agent of agents) {
      if (agent.llmInfo?.provider) {
        const key = agent.llmInfo.provider;
        llmCounts[key] = (llmCounts[key] || 0) + 1;
      }
    }

    return {
      stats: {
        totalAgents: agents.length,
        totalDecisions: journals.length,
        totalMessages: messages.length,
        totalEvents: events.length,
        uniqueLLMs: Object.keys(llmCounts).length,
      },
      llmDistribution: Object.entries(llmCounts)
        .map(([provider, count]) => ({
          provider,
          count,
          percentage: Math.round((count / agents.length) * 100),
        }))
        .sort((a, b) => b.count - a.count),
    };
  },
});
