/**
 * Gang queries for ClawCity Admin UI
 * Provides gang data, leaderboards, and territory information
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all gangs with basic info
 */
export const listGangs = query({
  args: {
    includeDisbanded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let gangs = await ctx.db.query("gangs").collect();
    // Filter out disbanded gangs by default
    if (!args.includeDisbanded) {
      gangs = gangs.filter((g) => !g.disbandedAt);
    }
    return gangs;
  },
});

/**
 * Get gang leaderboard - sorted by reputation, wealth, or territories
 */
export const getGangLeaderboard = query({
  args: {
    sortBy: v.optional(v.union(v.literal("reputation"), v.literal("wealth"), v.literal("territories"), v.literal("members"))),
    includeDisbanded: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let gangs = await ctx.db.query("gangs").collect();
    // Filter out disbanded gangs by default
    if (!args.includeDisbanded) {
      gangs = gangs.filter((g) => !g.disbandedAt);
    }
    const territories = await ctx.db.query("territories").collect();
    const zones = await ctx.db.query("zones").collect();

    // Build zone lookup
    const zonesById: Record<string, { slug: string; name: string }> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = { slug: zone.slug, name: zone.name };
    }

    // Build territory counts per gang
    const territoriesByGang: Record<string, Array<{ zoneId: string; zoneName: string; controlStrength: number }>> = {};
    for (const territory of territories) {
      const gangId = territory.gangId.toString();
      if (!territoriesByGang[gangId]) {
        territoriesByGang[gangId] = [];
      }
      const zone = zonesById[territory.zoneId.toString()];
      territoriesByGang[gangId].push({
        zoneId: territory.zoneId.toString(),
        zoneName: zone?.name ?? "Unknown",
        controlStrength: territory.controlStrength,
      });
    }

    // Get leader info for each gang
    const leaderIds = gangs.map((g) => g.leaderId);
    const leaders = await Promise.all(
      leaderIds.map((id) => ctx.db.get(id))
    );
    const leadersById: Record<string, string> = {};
    for (let i = 0; i < gangs.length; i++) {
      const leader = leaders[i];
      if (leader) {
        leadersById[gangs[i]._id.toString()] = leader.name;
      }
    }

    // Build leaderboard data
    const leaderboard = gangs.map((gang) => ({
      _id: gang._id,
      name: gang.name,
      tag: gang.tag,
      color: gang.color,
      leaderName: leadersById[gang._id.toString()] ?? "Unknown",
      leaderId: gang.leaderId,
      treasury: gang.treasury,
      reputation: gang.reputation,
      memberCount: gang.memberCount,
      territoryCount: territoriesByGang[gang._id.toString()]?.length ?? 0,
      territories: territoriesByGang[gang._id.toString()] ?? [],
      createdAt: gang.createdAt,
    }));

    // Sort by the requested field
    const sortBy = args.sortBy ?? "reputation";
    switch (sortBy) {
      case "reputation":
        leaderboard.sort((a, b) => b.reputation - a.reputation);
        break;
      case "wealth":
        leaderboard.sort((a, b) => b.treasury - a.treasury);
        break;
      case "territories":
        leaderboard.sort((a, b) => b.territoryCount - a.territoryCount);
        break;
      case "members":
        leaderboard.sort((a, b) => b.memberCount - a.memberCount);
        break;
    }

    return leaderboard;
  },
});

/**
 * Get detailed gang information
 */
export const getGangDetail = query({
  args: { gangId: v.id("gangs") },
  handler: async (ctx, args) => {
    const gang = await ctx.db.get(args.gangId);
    if (!gang) {
      return null;
    }

    // Get all members
    const memberships = await ctx.db
      .query("gangMembers")
      .withIndex("by_gangId", (q) => q.eq("gangId", args.gangId))
      .collect();

    // Get agent details for each member
    const memberDetails = await Promise.all(
      memberships.map(async (membership) => {
        const agent = await ctx.db.get(membership.agentId);
        if (!agent) return null;
        return {
          _id: membership._id,
          agentId: membership.agentId,
          agentName: agent.name,
          role: membership.role,
          joinedAt: membership.joinedAt,
          contributedTotal: membership.contributedTotal,
          status: agent.status,
          cash: agent.cash,
          reputation: agent.reputation,
        };
      })
    );

    const members = memberDetails.filter((m) => m !== null);

    // Get territories
    const territories = await ctx.db
      .query("territories")
      .withIndex("by_gangId", (q) => q.eq("gangId", args.gangId))
      .collect();

    // Get zone details for territories
    const territoryDetails = await Promise.all(
      territories.map(async (territory) => {
        const zone = await ctx.db.get(territory.zoneId);
        return {
          _id: territory._id,
          zoneId: territory.zoneId,
          zoneName: zone?.name ?? "Unknown",
          zoneSlug: zone?.slug ?? "unknown",
          controlStrength: territory.controlStrength,
          incomePerTick: territory.incomePerTick,
          claimedAt: territory.claimedAt,
        };
      })
    );

    // Get leader info
    const leader = await ctx.db.get(gang.leaderId);

    // Get home zone info
    let homeZone = null;
    if (gang.homeZoneId) {
      const zone = await ctx.db.get(gang.homeZoneId);
      if (zone) {
        homeZone = { _id: zone._id, name: zone.name, slug: zone.slug };
      }
    }

    return {
      gang: {
        _id: gang._id,
        name: gang.name,
        tag: gang.tag,
        color: gang.color,
        leaderId: gang.leaderId,
        leaderName: leader?.name ?? "Unknown",
        treasury: gang.treasury,
        reputation: gang.reputation,
        memberCount: gang.memberCount,
        homeZone,
        createdAt: gang.createdAt,
      },
      members,
      territories: territoryDetails,
      stats: {
        totalIncome: territoryDetails.reduce((sum, t) => sum + t.incomePerTick, 0),
        avgControlStrength: territoryDetails.length > 0
          ? Math.round(territoryDetails.reduce((sum, t) => sum + t.controlStrength, 0) / territoryDetails.length)
          : 0,
        totalContributed: members.reduce((sum, m) => sum + (m?.contributedTotal ?? 0), 0),
      },
    };
  },
});

/**
 * Get all territories with gang info
 */
export const getTerritories = query({
  args: {},
  handler: async (ctx) => {
    const territories = await ctx.db.query("territories").collect();
    const zones = await ctx.db.query("zones").collect();
    const gangs = await ctx.db.query("gangs").collect();

    // Build lookups
    const zonesById: Record<string, { slug: string; name: string; type: string }> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = { slug: zone.slug, name: zone.name, type: zone.type };
    }

    const gangsById: Record<string, { name: string; tag: string; color: string }> = {};
    for (const gang of gangs) {
      gangsById[gang._id.toString()] = { name: gang.name, tag: gang.tag, color: gang.color };
    }

    return territories.map((territory) => {
      const zone = zonesById[territory.zoneId.toString()];
      const gang = gangsById[territory.gangId.toString()];
      return {
        _id: territory._id,
        zoneId: territory.zoneId,
        zoneName: zone?.name ?? "Unknown",
        zoneSlug: zone?.slug ?? "unknown",
        zoneType: zone?.type ?? "unknown",
        gangId: territory.gangId,
        gangName: gang?.name ?? "Unknown",
        gangTag: gang?.tag ?? "???",
        gangColor: gang?.color ?? "#888888",
        controlStrength: territory.controlStrength,
        incomePerTick: territory.incomePerTick,
        claimedAt: territory.claimedAt,
        isContestable: territory.controlStrength < 50,
      };
    });
  },
});

/**
 * Get territories mapped by zone for the world view
 */
export const getTerritoriesByZone = query({
  args: {},
  handler: async (ctx) => {
    const territories = await ctx.db.query("territories").collect();
    const gangs = await ctx.db.query("gangs").collect();

    // Build gang lookup
    const gangsById: Record<string, { name: string; tag: string; color: string }> = {};
    for (const gang of gangs) {
      gangsById[gang._id.toString()] = { name: gang.name, tag: gang.tag, color: gang.color };
    }

    // Build map by zone ID
    const territoriesByZone: Record<string, {
      gangId: string;
      gangName: string;
      gangTag: string;
      gangColor: string;
      controlStrength: number;
      incomePerTick: number;
      isContestable: boolean;
    }> = {};

    for (const territory of territories) {
      const gang = gangsById[territory.gangId.toString()];
      territoriesByZone[territory.zoneId.toString()] = {
        gangId: territory.gangId.toString(),
        gangName: gang?.name ?? "Unknown",
        gangTag: gang?.tag ?? "???",
        gangColor: gang?.color ?? "#888888",
        controlStrength: territory.controlStrength,
        incomePerTick: territory.incomePerTick,
        isContestable: territory.controlStrength < 50,
      };
    }

    return territoriesByZone;
  },
});
