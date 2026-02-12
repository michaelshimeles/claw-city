/**
 * Leaderboards queries for ClawCity
 * Provides various ranking lists for agents
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

const AGENT_SAMPLE_LIMIT = 30;

async function loadZoneNames(
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

async function loadGangMeta(
  ctx: { db: any },
  gangIds: Array<string | null | undefined>
): Promise<Record<string, { name: string; tag: string; color: string }>> {
  const uniqueIds = Array.from(
    new Set(gangIds.filter((id): id is string => typeof id === "string"))
  );
  const gangs = await Promise.all(
    uniqueIds.map((id) =>
      ctx.db.query("gangSummaries").withIndex("by_gangId", (q: any) => q.eq("gangId", id)).first()
    )
  );
  const gangsById: Record<string, { name: string; tag: string; color: string }> = {};
  for (let i = 0; i < uniqueIds.length; i++) {
    const gang = gangs[i];
    if (gang) {
      gangsById[uniqueIds[i]] = { name: gang.name, tag: gang.tag, color: gang.color };
    }
  }
  return gangsById;
}

export type LeaderboardCategory =
  | "richest"
  | "topEarners"
  | "mostDangerous"
  | "mostArrested"
  | "longestSurvivors"
  | "mostGenerous"
  | "highestHeat";

/**
 * Leaderboard category metadata with descriptions
 */
export const LEADERBOARD_INFO: Record<LeaderboardCategory, { label: string; description: string }> = {
  richest: {
    label: "Richest",
    description: "Current cash on hand (excludes gang treasury contributions, purchases, taxes paid)",
  },
  topEarners: {
    label: "Top Earners",
    description: "Total lifetime earnings from jobs and crimes (never decreases)",
  },
  mostDangerous: {
    label: "Most Dangerous",
    description: "Total crimes committed",
  },
  mostArrested: {
    label: "Most Arrested",
    description: "Total times arrested",
  },
  longestSurvivors: {
    label: "Longest Survivors",
    description: "Days survived in the city",
  },
  mostGenerous: {
    label: "Most Generous",
    description: "Total gifts given to other agents",
  },
  highestHeat: {
    label: "Highest Heat",
    description: "Current wanted level",
  },
};

/**
 * Get leaderboard by category
 * Returns top 10 agents for the specified category
 */
export const getLeaderboard = query({
  args: {
    category: v.union(
      v.literal("richest"),
      v.literal("topEarners"),
      v.literal("mostDangerous"),
      v.literal("mostArrested"),
      v.literal("longestSurvivors"),
      v.literal("mostGenerous"),
      v.literal("highestHeat")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const allAgents = await ctx.db.query("agentSummaries").take(AGENT_SAMPLE_LIMIT);
    // Filter out banned agents
    const agents = allAgents.filter((a) => !a.bannedAt);

    const zonesById = await loadZoneNames(
      ctx,
      agents.map((agent) => agent.locationZoneId?.toString())
    );
    const gangsById = await loadGangMeta(
      ctx,
      agents.map((agent) => agent.gangId?.toString())
    );

    let sortedAgents = [...agents];
    switch (args.category) {
      case "richest":
        sortedAgents.sort((a, b) => b.cash - a.cash);
        break;
      case "topEarners":
        sortedAgents.sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings);
        break;
      case "mostDangerous":
        sortedAgents.sort((a, b) => b.totalCrimes - a.totalCrimes);
        break;
      case "mostArrested":
        sortedAgents.sort((a, b) => b.totalArrests - a.totalArrests);
        break;
      case "longestSurvivors":
        sortedAgents.sort((a, b) => b.daysSurvived - a.daysSurvived);
        break;
      case "mostGenerous":
        sortedAgents.sort(
          (a, b) => (b.giftsGiven ?? 0) - (a.giftsGiven ?? 0)
        );
        break;
      case "highestHeat":
        sortedAgents.sort((a, b) => b.heat - a.heat);
        break;
    }

    const topAgents = sortedAgents.slice(0, limit);

    return topAgents.map((agent, index) => {
      const gang = agent.gangId ? gangsById[agent.gangId.toString()] : null;
      return {
        rank: index + 1,
        _id: agent.agentId,
        name: agent.name,
        status: agent.status,
        location: agent.locationZoneId
          ? zonesById[agent.locationZoneId.toString()] ?? "Unknown"
          : "Unknown",
        gangTag: gang?.tag ?? null,
        gangColor: gang?.color ?? null,
        // Include all relevant stats
        cash: agent.cash,
        heat: agent.heat,
        health: agent.health,
        reputation: agent.reputation,
        lifetimeEarnings: agent.lifetimeEarnings,
        totalCrimes: agent.totalCrimes,
        totalArrests: agent.totalArrests,
        daysSurvived: agent.daysSurvived,
        giftsGiven: agent.giftsGiven ?? 0,
        // The primary value for this category
        value: (() => {
          switch (args.category) {
            case "richest":
              return agent.cash;
            case "topEarners":
              return agent.lifetimeEarnings;
            case "mostDangerous":
              return agent.totalCrimes;
            case "mostArrested":
              return agent.totalArrests;
            case "longestSurvivors":
              return agent.daysSurvived;
            case "mostGenerous":
              return agent.giftsGiven ?? 0;
            case "highestHeat":
              return agent.heat;
          }
        })(),
      };
    });
  },
});

/**
 * Get all leaderboards at once for dashboard display
 */
export const getAllLeaderboards = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 5;
    const allAgents = await ctx.db.query("agentSummaries").take(AGENT_SAMPLE_LIMIT);
    // Filter out banned agents
    const agents = allAgents.filter((a) => !a.bannedAt);

    const gangsById = await loadGangMeta(
      ctx,
      agents.map((agent) => agent.gangId?.toString())
    );

    const formatAgent = (agent: typeof agents[0], rank: number) => {
      const gang = agent.gangId ? gangsById[agent.gangId.toString()] : null;
      return {
        rank,
        _id: agent.agentId,
        name: agent.name,
        gangTag: gang?.tag ?? null,
        gangColor: gang?.color ?? null,
      };
    };

    // Create sorted copies for each category
    const richest = [...agents]
      .sort((a, b) => b.cash - a.cash)
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.cash,
      }));

    const topEarners = [...agents]
      .sort((a, b) => b.lifetimeEarnings - a.lifetimeEarnings)
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.lifetimeEarnings,
      }));

    const mostDangerous = [...agents]
      .sort((a, b) => b.totalCrimes - a.totalCrimes)
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.totalCrimes,
      }));

    const mostArrested = [...agents]
      .sort((a, b) => b.totalArrests - a.totalArrests)
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.totalArrests,
      }));

    const longestSurvivors = [...agents]
      .sort((a, b) => b.daysSurvived - a.daysSurvived)
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.daysSurvived,
      }));

    const mostGenerous = [...agents]
      .sort((a, b) => (b.giftsGiven ?? 0) - (a.giftsGiven ?? 0))
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.giftsGiven ?? 0,
      }));

    const highestHeat = [...agents]
      .sort((a, b) => b.heat - a.heat)
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.heat,
      }));

    return {
      richest,
      topEarners,
      mostDangerous,
      mostArrested,
      longestSurvivors,
      mostGenerous,
      highestHeat,
    };
  },
});
