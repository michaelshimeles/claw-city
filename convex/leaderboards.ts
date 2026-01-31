/**
 * Leaderboards queries for ClawCity
 * Provides various ranking lists for agents
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

export type LeaderboardCategory =
  | "richest"
  | "mostDangerous"
  | "mostArrested"
  | "longestSurvivors"
  | "mostGenerous"
  | "highestHeat";

/**
 * Get leaderboard by category
 * Returns top 10 agents for the specified category
 */
export const getLeaderboard = query({
  args: {
    category: v.union(
      v.literal("richest"),
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
    const agents = await ctx.db.query("agents").collect();

    // Get zones for location names
    const zones = await ctx.db.query("zones").collect();
    const zonesById: Record<string, string> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = zone.name;
    }

    // Get gangs for gang names
    const gangs = await ctx.db.query("gangs").collect();
    const gangsById: Record<string, { name: string; tag: string; color: string }> = {};
    for (const gang of gangs) {
      gangsById[gang._id.toString()] = { name: gang.name, tag: gang.tag, color: gang.color };
    }

    // Sort and slice based on category
    let sortedAgents = [...agents];
    switch (args.category) {
      case "richest":
        sortedAgents.sort((a, b) => b.stats.lifetimeEarnings - a.stats.lifetimeEarnings);
        break;
      case "mostDangerous":
        sortedAgents.sort((a, b) => b.stats.totalCrimes - a.stats.totalCrimes);
        break;
      case "mostArrested":
        sortedAgents.sort((a, b) => b.stats.totalArrests - a.stats.totalArrests);
        break;
      case "longestSurvivors":
        sortedAgents.sort((a, b) => b.stats.daysSurvived - a.stats.daysSurvived);
        break;
      case "mostGenerous":
        sortedAgents.sort(
          (a, b) =>
            (b.socialStats?.giftsGiven ?? 0) - (a.socialStats?.giftsGiven ?? 0)
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
        _id: agent._id,
        name: agent.name,
        status: agent.status,
        location: zonesById[agent.locationZoneId.toString()] ?? "Unknown",
        gangTag: gang?.tag ?? null,
        gangColor: gang?.color ?? null,
        // Include all relevant stats
        cash: agent.cash,
        heat: agent.heat,
        health: agent.health,
        reputation: agent.reputation,
        lifetimeEarnings: agent.stats.lifetimeEarnings,
        totalCrimes: agent.stats.totalCrimes,
        totalArrests: agent.stats.totalArrests,
        daysSurvived: agent.stats.daysSurvived,
        giftsGiven: agent.socialStats?.giftsGiven ?? 0,
        // The primary value for this category
        value: (() => {
          switch (args.category) {
            case "richest":
              return agent.stats.lifetimeEarnings;
            case "mostDangerous":
              return agent.stats.totalCrimes;
            case "mostArrested":
              return agent.stats.totalArrests;
            case "longestSurvivors":
              return agent.stats.daysSurvived;
            case "mostGenerous":
              return agent.socialStats?.giftsGiven ?? 0;
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
    const agents = await ctx.db.query("agents").collect();

    // Get zones and gangs for lookups
    const zones = await ctx.db.query("zones").collect();
    const zonesById: Record<string, string> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = zone.name;
    }

    const gangs = await ctx.db.query("gangs").collect();
    const gangsById: Record<string, { name: string; tag: string; color: string }> = {};
    for (const gang of gangs) {
      gangsById[gang._id.toString()] = { name: gang.name, tag: gang.tag, color: gang.color };
    }

    const formatAgent = (agent: typeof agents[0], rank: number) => {
      const gang = agent.gangId ? gangsById[agent.gangId.toString()] : null;
      return {
        rank,
        _id: agent._id,
        name: agent.name,
        gangTag: gang?.tag ?? null,
        gangColor: gang?.color ?? null,
      };
    };

    // Create sorted copies for each category
    const richest = [...agents]
      .sort((a, b) => b.stats.lifetimeEarnings - a.stats.lifetimeEarnings)
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.stats.lifetimeEarnings,
      }));

    const mostDangerous = [...agents]
      .sort((a, b) => b.stats.totalCrimes - a.stats.totalCrimes)
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.stats.totalCrimes,
      }));

    const mostArrested = [...agents]
      .sort((a, b) => b.stats.totalArrests - a.stats.totalArrests)
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.stats.totalArrests,
      }));

    const longestSurvivors = [...agents]
      .sort((a, b) => b.stats.daysSurvived - a.stats.daysSurvived)
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.stats.daysSurvived,
      }));

    const mostGenerous = [...agents]
      .sort((a, b) => (b.socialStats?.giftsGiven ?? 0) - (a.socialStats?.giftsGiven ?? 0))
      .slice(0, limit)
      .map((a, i) => ({
        ...formatAgent(a, i + 1),
        value: a.socialStats?.giftsGiven ?? 0,
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
      mostDangerous,
      mostArrested,
      longestSurvivors,
      mostGenerous,
      highestHeat,
    };
  },
});
