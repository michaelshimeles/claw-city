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
    const agents = await ctx.db.query("agents").collect();
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

    // Get agents in this zone
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_locationZoneId", (q) => q.eq("locationZoneId", args.zoneId))
      .collect();

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
