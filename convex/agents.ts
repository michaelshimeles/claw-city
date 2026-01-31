/**
 * Agent Management System for ClawCity
 * Handles agent registration, queries, and state mutations.
 */

import { v } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { generateAgentKey, hashAgentKey } from "./lib/auth";
import { DEFAULTS, AgentStatus } from "./lib/constants";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get an agent by their ID
 */
export const getAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return null;
    }

    // Don't expose the key hash
    const { agentKeyHash, ...safeAgent } = agent;
    return safeAgent;
  },
});

/**
 * Internal query to find an agent by their API key hash (for authentication)
 */
export const getAgentByKeyHash = internalQuery({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agentKeyHash", (q) => q.eq("agentKeyHash", args.keyHash))
      .unique();

    return agent;
  },
});

/**
 * List all agents with optional filters
 */
export const listAgents = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("busy"),
        v.literal("jailed"),
        v.literal("hospitalized")
      )
    ),
    zoneId: v.optional(v.id("zones")),
  },
  handler: async (ctx, args) => {
    let agents;

    if (args.status) {
      agents = await ctx.db
        .query("agents")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else if (args.zoneId) {
      agents = await ctx.db
        .query("agents")
        .withIndex("by_locationZoneId", (q) =>
          q.eq("locationZoneId", args.zoneId!)
        )
        .collect();
    } else {
      agents = await ctx.db.query("agents").collect();
    }

    // Filter by zoneId if both filters provided
    if (args.status && args.zoneId) {
      agents = agents.filter((a) => a.locationZoneId === args.zoneId);
    }

    // Don't expose key hashes
    return agents.map(({ agentKeyHash, ...safeAgent }) => safeAgent);
  },
});

/**
 * Get full agent state including location details, available actions, nearby jobs/businesses
 */
export const getAgentState = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return null;
    }

    // Get the world state for current tick
    const world = await ctx.db.query("world").first();
    const currentTick = world?.tick ?? 0;

    // Get location zone details
    const zone = await ctx.db.get(agent.locationZoneId);

    // Get available zone edges for movement
    const zoneEdges = await ctx.db
      .query("zoneEdges")
      .withIndex("by_fromZoneId", (q) =>
        q.eq("fromZoneId", agent.locationZoneId)
      )
      .collect();

    // Resolve destination zone names
    const connectedZones = await Promise.all(
      zoneEdges.map(async (edge) => {
        const toZone = await ctx.db.get(edge.toZoneId);
        return {
          zoneId: edge.toZoneId,
          slug: toZone?.slug ?? "",
          name: toZone?.name ?? "",
          timeCostTicks: edge.timeCostTicks,
          cashCost: edge.cashCost,
          heatRisk: edge.heatRisk,
        };
      })
    );

    // Get nearby jobs in the same zone
    const nearbyJobs = await ctx.db
      .query("jobs")
      .withIndex("by_zoneId", (q) => q.eq("zoneId", agent.locationZoneId))
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    // Get nearby businesses in the same zone
    const nearbyBusinesses = await ctx.db
      .query("businesses")
      .withIndex("by_zoneId", (q) => q.eq("zoneId", agent.locationZoneId))
      .collect();

    // Resolve item details for agent inventory
    const inventoryWithDetails = await Promise.all(
      agent.inventory.map(async (inv) => {
        const item = await ctx.db.get(inv.itemId);
        return {
          itemId: inv.itemId,
          slug: item?.slug ?? "",
          name: item?.name ?? "",
          qty: inv.qty,
        };
      })
    );

    // Determine available actions based on agent state
    const availableActions: string[] = [];

    if (agent.status === "idle") {
      availableActions.push("MOVE");
      if (nearbyJobs.length > 0) {
        availableActions.push("TAKE_JOB");
      }
      if (nearbyBusinesses.length > 0) {
        availableActions.push("BUY", "SELL");
      }
      if (zone?.slug === "hospital") {
        availableActions.push("HEAL");
      }
      availableActions.push("REST");
      if (agent.inventory.length > 0) {
        availableActions.push("USE_ITEM");
      }
      availableActions.push("COMMIT_CRIME");
      availableActions.push("START_BUSINESS");
    }

    // Don't expose key hash
    const { agentKeyHash, ...safeAgent } = agent;

    return {
      tick: currentTick,
      agent: {
        ...safeAgent,
        inventory: inventoryWithDetails,
      },
      location: zone
        ? {
            zoneId: zone._id,
            slug: zone.slug,
            name: zone.name,
            type: zone.type,
            description: zone.description,
          }
        : null,
      connectedZones,
      availableActions,
      nearbyJobs: nearbyJobs.map((job) => ({
        jobId: job._id,
        type: job.type,
        title: job.title,
        wage: job.wage,
        durationTicks: job.durationTicks,
        requirements: job.requirements,
        staminaCost: job.staminaCost,
      })),
      nearbyBusinesses: nearbyBusinesses.map((biz) => ({
        businessId: biz._id,
        type: biz.type,
        name: biz.name,
        status: biz.status,
        inventory: biz.inventory,
      })),
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Register a new agent
 * Returns the agent ID and the plain API key (only returned once!)
 */
export const registerAgent = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // Get the starting zone
    const startingZone = await ctx.db
      .query("zones")
      .withIndex("by_slug", (q) => q.eq("slug", DEFAULTS.startingZone))
      .unique();

    if (!startingZone) {
      throw new Error(
        `Starting zone "${DEFAULTS.startingZone}" not found. Please seed the database first.`
      );
    }

    // Generate the API key
    const apiKey = generateAgentKey();
    const keyHash = await hashAgentKey(apiKey);

    // Create the agent with default values
    const agentId = await ctx.db.insert("agents", {
      agentKeyHash: keyHash,
      name: args.name,
      createdAt: Date.now(),
      locationZoneId: startingZone._id,
      cash: DEFAULTS.startingCash,
      health: DEFAULTS.startingHealth,
      stamina: DEFAULTS.startingStamina,
      reputation: DEFAULTS.startingReputation,
      heat: DEFAULTS.startingHeat,
      status: "idle",
      busyUntilTick: null,
      busyAction: null,
      inventory: [],
      skills: { ...DEFAULTS.startingSkills },
      stats: {
        lifetimeEarnings: 0,
        totalCrimes: 0,
        totalArrests: 0,
        jobsCompleted: 0,
        daysSurvived: 0,
      },
    });

    // Return the agent ID and the plain API key (only time it's returned!)
    return {
      agentId,
      apiKey,
    };
  },
});

/**
 * Rotate an agent's API key (admin function)
 * Generates a new key and returns it (only time it's returned!)
 */
export const rotateAgentKey = mutation({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Generate new API key
    const newApiKey = generateAgentKey();
    const newKeyHash = await hashAgentKey(newApiKey);

    // Update the agent with the new key hash
    await ctx.db.patch(args.agentId, {
      agentKeyHash: newKeyHash,
    });

    // Return the new API key (only time it's returned!)
    return {
      agentId: args.agentId,
      apiKey: newApiKey,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Update agent status (idle, busy, jailed, hospitalized)
 */
export const updateAgentStatus = internalMutation({
  args: {
    agentId: v.id("agents"),
    status: v.union(
      v.literal("idle"),
      v.literal("busy"),
      v.literal("jailed"),
      v.literal("hospitalized")
    ),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(args.agentId, {
      status: args.status,
    });
  },
});

/**
 * Update agent stats (cash, health, stamina, heat, reputation)
 */
export const updateAgentStats = internalMutation({
  args: {
    agentId: v.id("agents"),
    cashDelta: v.optional(v.number()),
    healthDelta: v.optional(v.number()),
    staminaDelta: v.optional(v.number()),
    heatDelta: v.optional(v.number()),
    reputationDelta: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const updates: Partial<{
      cash: number;
      health: number;
      stamina: number;
      heat: number;
      reputation: number;
    }> = {};

    if (args.cashDelta !== undefined) {
      updates.cash = agent.cash + args.cashDelta;
    }

    if (args.healthDelta !== undefined) {
      updates.health = Math.max(0, Math.min(100, agent.health + args.healthDelta));
    }

    if (args.staminaDelta !== undefined) {
      updates.stamina = Math.max(0, Math.min(100, agent.stamina + args.staminaDelta));
    }

    if (args.heatDelta !== undefined) {
      updates.heat = Math.max(0, Math.min(DEFAULTS.maxHeat, agent.heat + args.heatDelta));
    }

    if (args.reputationDelta !== undefined) {
      updates.reputation = agent.reputation + args.reputationDelta;
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.agentId, updates);
    }
  },
});

/**
 * Add items to agent inventory
 */
export const addToInventory = internalMutation({
  args: {
    agentId: v.id("agents"),
    itemId: v.id("items"),
    qty: v.number(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    if (args.qty <= 0) {
      throw new Error("Quantity must be positive");
    }

    const inventory = [...agent.inventory];
    const existingIndex = inventory.findIndex(
      (inv) => inv.itemId === args.itemId
    );

    if (existingIndex >= 0) {
      // Update existing inventory slot
      inventory[existingIndex] = {
        itemId: args.itemId,
        qty: inventory[existingIndex].qty + args.qty,
      };
    } else {
      // Add new inventory slot
      inventory.push({
        itemId: args.itemId,
        qty: args.qty,
      });
    }

    await ctx.db.patch(args.agentId, { inventory });
  },
});

/**
 * Remove items from agent inventory
 */
export const removeFromInventory = internalMutation({
  args: {
    agentId: v.id("agents"),
    itemId: v.id("items"),
    qty: v.number(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    if (args.qty <= 0) {
      throw new Error("Quantity must be positive");
    }

    const inventory = [...agent.inventory];
    const existingIndex = inventory.findIndex(
      (inv) => inv.itemId === args.itemId
    );

    if (existingIndex < 0) {
      throw new Error("Item not in inventory");
    }

    const currentQty = inventory[existingIndex].qty;
    if (currentQty < args.qty) {
      throw new Error("Insufficient quantity in inventory");
    }

    if (currentQty === args.qty) {
      // Remove the inventory slot entirely
      inventory.splice(existingIndex, 1);
    } else {
      // Reduce the quantity
      inventory[existingIndex] = {
        itemId: args.itemId,
        qty: currentQty - args.qty,
      };
    }

    await ctx.db.patch(args.agentId, { inventory });
  },
});

/**
 * Set agent to busy state with completion tick and action description
 */
export const setBusy = internalMutation({
  args: {
    agentId: v.id("agents"),
    busyUntilTick: v.number(),
    busyAction: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    await ctx.db.patch(args.agentId, {
      status: "busy",
      busyUntilTick: args.busyUntilTick,
      busyAction: args.busyAction,
    });
  },
});

/**
 * Clean up duplicate agents - keeps the one with highest cash for each name
 */
export const cleanupDuplicates = mutation({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();

    // Group by name
    const byName: Record<string, typeof agents> = {};
    for (const agent of agents) {
      if (!byName[agent.name]) byName[agent.name] = [];
      byName[agent.name].push(agent);
    }

    let deleted = 0;
    const kept: string[] = [];

    // For duplicates, keep the one with higher cash
    for (const [name, dupes] of Object.entries(byName)) {
      if (dupes.length > 1) {
        // Sort by cash descending, keep highest
        dupes.sort((a, b) => b.cash - a.cash);
        kept.push(`${name}: $${dupes[0].cash}`);

        // Delete the rest
        for (let i = 1; i < dupes.length; i++) {
          await ctx.db.delete(dupes[i]._id);
          deleted++;
        }
      }
    }

    return { deleted, kept };
  },
});
