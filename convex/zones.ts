/**
 * Zone queries for ClawCity Admin UI
 * Provides zone data with aggregated counts and details
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all zones (basic query)
 */
export const listZones = query({
  args: {},
  handler: async (ctx) => {
    const zones = await ctx.db.query("zones").collect();
    return zones;
  },
});

/**
 * Get all zones with counts of agents, jobs, and businesses
 */
export const getZones = query({
  args: {},
  handler: async (ctx) => {
    const zones = await ctx.db.query("zones").collect();

    // Get all agents, jobs, and businesses for counting
    const allAgents = await ctx.db.query("agents").collect();
    // Filter out banned agents
    const agents = allAgents.filter((a) => !a.bannedAt);
    const jobs = await ctx.db
      .query("jobs")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();
    const businesses = await ctx.db.query("businesses").collect();

    // Build counts per zone
    const agentCountByZone: Record<string, number> = {};
    const jobCountByZone: Record<string, number> = {};
    const businessCountByZone: Record<string, number> = {};

    for (const agent of agents) {
      const zoneId = agent.locationZoneId.toString();
      agentCountByZone[zoneId] = (agentCountByZone[zoneId] || 0) + 1;
    }

    for (const job of jobs) {
      const zoneId = job.zoneId.toString();
      jobCountByZone[zoneId] = (jobCountByZone[zoneId] || 0) + 1;
    }

    for (const business of businesses) {
      const zoneId = business.zoneId.toString();
      businessCountByZone[zoneId] = (businessCountByZone[zoneId] || 0) + 1;
    }

    return zones.map((zone) => ({
      _id: zone._id,
      slug: zone.slug,
      name: zone.name,
      type: zone.type,
      description: zone.description,
      agentCount: agentCountByZone[zone._id.toString()] || 0,
      jobCount: jobCountByZone[zone._id.toString()] || 0,
      businessCount: businessCountByZone[zone._id.toString()] || 0,
    }));
  },
});

/**
 * Get detailed zone information including agents, jobs, and businesses
 */
export const getZoneDetail = query({
  args: { zoneId: v.id("zones") },
  handler: async (ctx, args) => {
    const zone = await ctx.db.get(args.zoneId);
    if (!zone) {
      return null;
    }

    // Get agents in this zone (excluding banned)
    const allAgents = await ctx.db
      .query("agents")
      .withIndex("by_locationZoneId", (q) => q.eq("locationZoneId", args.zoneId))
      .collect();
    const agents = allAgents.filter((a) => !a.bannedAt);

    // Get active jobs in this zone
    const jobs = await ctx.db
      .query("jobs")
      .withIndex("by_zoneId", (q) => q.eq("zoneId", args.zoneId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    // Get businesses in this zone
    const businesses = await ctx.db
      .query("businesses")
      .withIndex("by_zoneId", (q) => q.eq("zoneId", args.zoneId))
      .collect();

    // Get all items for resolving business inventory
    const items = await ctx.db.query("items").collect();
    const itemsById: Record<string, { slug: string; name: string; category: string }> = {};
    for (const item of items) {
      itemsById[item._id.toString()] = {
        slug: item.slug,
        name: item.name,
        category: item.category,
      };
    }

    // Resolve business inventory with item details
    const businessesWithItems = businesses.map((biz) => ({
      _id: biz._id,
      type: biz.type,
      name: biz.name,
      status: biz.status,
      cashOnHand: biz.cashOnHand,
      reputation: biz.reputation,
      inventory: biz.inventory.map((inv) => {
        const item = itemsById[inv.itemId.toString()];
        return {
          itemId: inv.itemId,
          itemSlug: item?.slug ?? "unknown",
          itemName: item?.name ?? "Unknown Item",
          category: item?.category ?? "unknown",
          qty: inv.qty,
          price: inv.price,
        };
      }),
    }));

    // Format agents (hide key hash)
    const safeAgents = agents.map(({ agentKeyHash, ...agent }) => agent);

    return {
      zone: {
        _id: zone._id,
        slug: zone.slug,
        name: zone.name,
        type: zone.type,
        description: zone.description,
      },
      agents: safeAgents,
      jobs: jobs.map((job) => ({
        _id: job._id,
        type: job.type,
        title: job.title,
        wage: job.wage,
        durationTicks: job.durationTicks,
        staminaCost: job.staminaCost,
        requirements: job.requirements,
      })),
      businesses: businessesWithItems,
    };
  },
});

/**
 * Get zone context with detailed information about what's happening in a zone
 */
export const getZoneContext = query({
  args: { zoneId: v.id("zones") },
  handler: async (ctx, args) => {
    const zone = await ctx.db.get(args.zoneId);
    if (!zone) {
      return null;
    }

    // Get all data for this zone
    const [allAgents, businesses, jobs, coopActions, territories, allGangs] =
      await Promise.all([
        ctx.db
          .query("agents")
          .withIndex("by_locationZoneId", (q) =>
            q.eq("locationZoneId", args.zoneId)
          )
          .collect(),
        ctx.db
          .query("businesses")
          .withIndex("by_zoneId", (q) => q.eq("zoneId", args.zoneId))
          .collect(),
        ctx.db
          .query("jobs")
          .withIndex("by_zoneId", (q) => q.eq("zoneId", args.zoneId))
          .filter((q) => q.eq(q.field("active"), true))
          .collect(),
        ctx.db
          .query("coopActions")
          .withIndex("by_zoneId", (q) => q.eq("zoneId", args.zoneId))
          .filter((q) => q.eq(q.field("status"), "recruiting"))
          .collect(),
        ctx.db
          .query("territories")
          .withIndex("by_zoneId", (q) => q.eq("zoneId", args.zoneId))
          .collect(),
        ctx.db.query("gangs").collect(),
      ]);

    // Filter out banned agents and disbanded gangs
    const agents = allAgents.filter((a) => !a.bannedAt);
    const gangs = allGangs.filter((g) => !g.disbandedAt);

    // Build gang lookup
    const gangsById: Record<
      string,
      { name: string; tag: string; color: string }
    > = {};
    for (const gang of gangs) {
      gangsById[gang._id.toString()] = {
        name: gang.name,
        tag: gang.tag,
        color: gang.color,
      };
    }

    // Calculate zone heat
    const totalHeat = agents.reduce((sum, a) => sum + a.heat, 0);
    const avgHeat = agents.length > 0 ? Math.round(totalHeat / agents.length) : 0;
    const maxHeat = agents.length > 0 ? Math.max(...agents.map((a) => a.heat)) : 0;

    // Get hottest agents in zone
    const hottestAgents = [...agents]
      .sort((a, b) => b.heat - a.heat)
      .slice(0, 5)
      .map((a) => ({
        _id: a._id,
        name: a.name,
        heat: a.heat,
        status: a.status,
        gangTag: a.gangId ? gangsById[a.gangId.toString()]?.tag ?? null : null,
      }));

    // Format agents in zone (hide key hash)
    const agentsInZone = agents.map((a) => ({
      _id: a._id,
      name: a.name,
      status: a.status,
      cash: a.cash,
      health: a.health,
      heat: a.heat,
      reputation: a.reputation,
      gangId: a.gangId,
      gangTag: a.gangId ? gangsById[a.gangId.toString()]?.tag ?? null : null,
      gangColor: a.gangId ? gangsById[a.gangId.toString()]?.color ?? null : null,
    }));

    // Territory info
    const territory = territories[0];
    let territoryInfo = null;
    if (territory) {
      const gang = gangsById[territory.gangId.toString()];
      territoryInfo = {
        gangId: territory.gangId,
        gangName: gang?.name ?? "Unknown",
        gangTag: gang?.tag ?? "???",
        gangColor: gang?.color ?? "#888888",
        controlStrength: territory.controlStrength,
        incomePerTick: territory.incomePerTick,
        isContestable: territory.controlStrength < 50,
      };
    }

    // Get items for business inventory
    const items = await ctx.db.query("items").collect();
    const itemsById: Record<string, { slug: string; name: string }> = {};
    for (const item of items) {
      itemsById[item._id.toString()] = { slug: item.slug, name: item.name };
    }

    // Format businesses
    const formattedBusinesses = businesses.map((biz) => ({
      _id: biz._id,
      name: biz.name,
      type: biz.type,
      status: biz.status,
      reputation: biz.reputation,
      inventory: biz.inventory.slice(0, 5).map((inv) => ({
        itemName: itemsById[inv.itemId.toString()]?.name ?? "Unknown",
        qty: inv.qty,
        price: inv.price,
      })),
    }));

    // Format coop crimes
    const formattedCoopCrimes = await Promise.all(
      coopActions.map(async (action) => {
        const initiator = await ctx.db.get(action.initiatorId);
        return {
          _id: action._id,
          type: action.type,
          initiatorName: initiator?.name ?? "Unknown",
          participantCount: action.participantIds.length,
          minParticipants: action.minParticipants,
          maxParticipants: action.maxParticipants,
          expiresAt: action.expiresAt,
        };
      })
    );

    // Detect potential conflicts (multiple gangs with members present)
    const gangPresence: Record<string, number> = {};
    for (const agent of agents) {
      if (agent.gangId) {
        const gangId = agent.gangId.toString();
        gangPresence[gangId] = (gangPresence[gangId] || 0) + 1;
      }
    }
    const gangsPresent = Object.keys(gangPresence).length;
    const hasConflictPotential = gangsPresent >= 2;

    return {
      zone: {
        _id: zone._id,
        slug: zone.slug,
        name: zone.name,
        type: zone.type,
        description: zone.description,
      },
      // Heat stats
      heat: {
        total: totalHeat,
        average: avgHeat,
        max: maxHeat,
        hottestAgents,
      },
      // Agents present
      agents: {
        count: agents.length,
        list: agentsInZone,
        byStatus: {
          idle: agents.filter((a) => a.status === "idle").length,
          busy: agents.filter((a) => a.status === "busy").length,
          jailed: agents.filter((a) => a.status === "jailed").length,
          hospitalized: agents.filter((a) => a.status === "hospitalized").length,
        },
      },
      // Businesses
      businesses: formattedBusinesses,
      // Jobs available
      jobs: jobs.map((j) => ({
        _id: j._id,
        title: j.title,
        type: j.type,
        wage: j.wage,
        durationTicks: j.durationTicks,
        staminaCost: j.staminaCost,
      })),
      // Territory control
      territory: territoryInfo,
      // Active coop crimes recruiting
      coopCrimes: formattedCoopCrimes,
      // Conflict indicators
      conflicts: {
        gangsPresent,
        hasConflictPotential,
        gangPresence: Object.entries(gangPresence).map(([gangId, count]) => ({
          gangId,
          gangName: gangsById[gangId]?.name ?? "Unknown",
          gangTag: gangsById[gangId]?.tag ?? "???",
          count,
        })),
      },
    };
  },
});

/**
 * Get market prices by zone
 * Returns market state entries with zone and item details
 */
export const getMarketPrices = query({
  args: {},
  handler: async (ctx) => {
    const marketState = await ctx.db.query("marketState").collect();

    if (marketState.length === 0) {
      return [];
    }

    // Get all zones and items for resolving names
    const zones = await ctx.db.query("zones").collect();
    const items = await ctx.db.query("items").collect();

    const zonesById: Record<string, { slug: string; name: string }> = {};
    const itemsById: Record<string, { slug: string; name: string; basePrice: number }> = {};

    for (const zone of zones) {
      zonesById[zone._id.toString()] = { slug: zone.slug, name: zone.name };
    }

    for (const item of items) {
      itemsById[item._id.toString()] = {
        slug: item.slug,
        name: item.name,
        basePrice: item.basePrice,
      };
    }

    return marketState.map((entry) => {
      const zone = zonesById[entry.zoneId.toString()];
      const item = itemsById[entry.itemId.toString()];
      return {
        _id: entry._id,
        zoneId: entry.zoneId,
        zoneName: zone?.name ?? "Unknown Zone",
        zoneSlug: zone?.slug ?? "unknown",
        itemId: entry.itemId,
        itemName: item?.name ?? "Unknown Item",
        itemSlug: item?.slug ?? "unknown",
        basePrice: item?.basePrice ?? 0,
        price: entry.price,
        supply: entry.supply,
        demand: entry.demand,
        lastUpdatedTick: entry.lastUpdatedTick,
        priceDelta: item ? entry.price - item.basePrice : 0,
        priceChangePercent: item && item.basePrice > 0
          ? Math.round(((entry.price - item.basePrice) / item.basePrice) * 100)
          : 0,
      };
    });
  },
});
