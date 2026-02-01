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
import { generateAgentKey, hashAgentKey, validateAdminKey } from "./lib/auth";
import { DEFAULTS, TAX_DEFAULTS } from "./lib/constants";

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
      // Tax action - available when taxes are owed
      if (agent.taxOwed && agent.taxOwed > 0) {
        availableActions.push("PAY_TAX");
      }
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
    // Validate name
    const name = args.name.trim();
    if (name.length < 2) {
      throw new Error("Agent name must be at least 2 characters long.");
    }
    if (name.length > 20) {
      throw new Error("Agent name must be 20 characters or less.");
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new Error("Agent name can only contain letters, numbers, underscores, and hyphens.");
    }

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

    // Check if name is already taken
    const existingAgent = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existingAgent) {
      throw new Error(`Agent name "${args.name}" is already taken. Please choose a different name.`);
    }

    // Generate the API key
    const apiKey = generateAgentKey();
    const keyHash = await hashAgentKey(apiKey);

    // Get current world tick for tax scheduling
    const world = await ctx.db.query("world").first();
    const currentTick = world?.tick ?? 0;

    // Generate random starting cash
    const startingCash = Math.floor(
      Math.random() * (DEFAULTS.startingCashMax - DEFAULTS.startingCashMin + 1)
    ) + DEFAULTS.startingCashMin;

    // Create the agent with default values
    const agentId = await ctx.db.insert("agents", {
      agentKeyHash: keyHash,
      name: name,
      createdAt: Date.now(),
      locationZoneId: startingZone._id,
      cash: startingCash,
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
      // Tax fields - first assessment after taxIntervalTicks
      taxDueTick: currentTick + TAX_DEFAULTS.taxIntervalTicks,
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
 * Requires admin authentication.
 */
export const rotateAgentKey = mutation({
  args: {
    agentId: v.id("agents"),
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get world config for admin key hash
    const world = await ctx.db.query("world").first();
    const adminKeyHash = world?.config?.adminKeyHash;

    // Validate admin key
    const isAdmin = await validateAdminKey(args.adminKey, adminKeyHash);
    if (!isAdmin) {
      throw new Error("Unauthorized: Invalid admin key");
    }

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

/**
 * Clean up duplicate agent names
 * Keeps the oldest agent for each name, deletes the rest
 * Requires admin authentication.
 */
export const cleanupDuplicateNames = mutation({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get world config for admin key hash
    const world = await ctx.db.query("world").first();
    const adminKeyHash = world?.config?.adminKeyHash;

    // Validate admin key
    const isAdmin = await validateAdminKey(args.adminKey, adminKeyHash);
    if (!isAdmin) {
      throw new Error("Unauthorized: Invalid admin key");
    }

    const agents = await ctx.db.query("agents").collect();

    // Group agents by name
    const byName: Record<string, typeof agents> = {};
    for (const agent of agents) {
      if (!byName[agent.name]) {
        byName[agent.name] = [];
      }
      byName[agent.name].push(agent);
    }

    // Find duplicates and delete all but the oldest
    let deleted = 0;
    const deletedNames: string[] = [];

    for (const [name, agentsWithName] of Object.entries(byName)) {
      if (agentsWithName.length > 1) {
        // Sort by createdAt ascending (oldest first)
        agentsWithName.sort((a, b) => a.createdAt - b.createdAt);

        // Keep the first (oldest), delete the rest
        for (let i = 1; i < agentsWithName.length; i++) {
          await ctx.db.delete(agentsWithName[i]._id);
          deleted++;
        }
        deletedNames.push(`${name} (kept oldest, deleted ${agentsWithName.length - 1})`);
      }
    }

    return {
      deleted,
      details: deletedNames,
    };
  },
});

/**
 * Remove all NPC agents from the database
 * Used to clean up after removing NPC system
 * Requires admin authentication.
 */
export const removeNPCAgents = mutation({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get world config for admin key hash
    const world = await ctx.db.query("world").first();
    const adminKeyHash = world?.config?.adminKeyHash;

    // Validate admin key
    const isAdmin = await validateAdminKey(args.adminKey, adminKeyHash);
    if (!isAdmin) {
      throw new Error("Unauthorized: Invalid admin key");
    }

    const agents = await ctx.db.query("agents").collect();

    let deleted = 0;
    const deletedNames: string[] = [];

    for (const agent of agents) {
      // Check if agent has isNPC field (legacy NPC agents)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((agent as any).isNPC === true) {
        await ctx.db.delete(agent._id);
        deleted++;
        deletedNames.push(agent.name);
      }
    }

    return {
      deleted,
      deletedNames,
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
 * Requires admin authentication.
 */
export const cleanupDuplicates = mutation({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Get world config for admin key hash
    const world = await ctx.db.query("world").first();
    const adminKeyHash = world?.config?.adminKeyHash;

    // Validate admin key
    const isAdmin = await validateAdminKey(args.adminKey, adminKeyHash);
    if (!isAdmin) {
      throw new Error("Unauthorized: Invalid admin key");
    }

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

// ============================================================================
// AGENT PROFILE QUERY
// ============================================================================

import { computeAgentTitle, TitleContext } from "./lib/nicknames";

/**
 * Get comprehensive agent profile with all details
 * Returns full stats, skills, inventory, gang info, property, and computed title
 */
export const getAgentProfile = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return null;
    }

    // Get world for current tick
    const world = await ctx.db.query("world").first();
    const currentTick = world?.tick ?? 0;

    // Get location zone details
    const zone = await ctx.db.get(agent.locationZoneId);

    // Get inventory with item details
    const inventoryWithDetails = await Promise.all(
      agent.inventory.map(async (inv) => {
        const item = await ctx.db.get(inv.itemId);
        return {
          itemId: inv.itemId,
          slug: item?.slug ?? "",
          name: item?.name ?? "",
          category: item?.category ?? "unknown",
          qty: inv.qty,
          effects: item?.effects ?? {},
        };
      })
    );

    // Get gang membership and details
    let gangInfo = null;
    let isGangLeader = false;
    let gangMembership = null;

    if (agent.gangId) {
      const gang = await ctx.db.get(agent.gangId);
      if (gang) {
        isGangLeader = gang.leaderId === args.agentId;

        // Get membership details
        const memberships = await ctx.db
          .query("gangMembers")
          .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
          .collect();
        gangMembership = memberships.find((m) => m.gangId === agent.gangId);

        gangInfo = {
          _id: gang._id,
          name: gang.name,
          tag: gang.tag,
          color: gang.color,
          role: gangMembership?.role ?? "member",
          isLeader: isGangLeader,
          treasury: gang.treasury,
          reputation: gang.reputation,
          memberCount: gang.memberCount,
          contributedTotal: gangMembership?.contributedTotal ?? 0,
        };
      }
    }

    // Get gang territories count
    let territoryCount = 0;
    if (agent.gangId) {
      const territories = await ctx.db
        .query("territories")
        .withIndex("by_gangId", (q) => q.eq("gangId", agent.gangId!))
        .collect();
      territoryCount = territories.length;
    }

    // Get property details
    let propertyInfo = null;
    if (agent.homePropertyId) {
      const property = await ctx.db.get(agent.homePropertyId);
      if (property) {
        const propertyZone = await ctx.db.get(property.zoneId);
        propertyInfo = {
          _id: property._id,
          name: property.name,
          type: property.type,
          zoneName: propertyZone?.name ?? "Unknown",
          isOwner: property.ownerId === args.agentId,
          heatReduction: property.heatReduction,
          staminaBoost: property.staminaBoost,
        };
      }
    }

    // Check if agent owns any businesses
    const ownedBusinesses = await ctx.db
      .query("businesses")
      .withIndex("by_ownerAgentId", (q) => q.eq("ownerAgentId", args.agentId))
      .collect();

    // Compute agent title
    const titleContext: TitleContext = {
      isGangLeader,
      territoryCount,
      ownsBusiness: ownedBusinesses.length > 0,
    };
    const agentTitle = computeAgentTitle(agent, titleContext);

    // Get recent events for this agent (last 20)
    const recentEvents = await ctx.db
      .query("events")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(20);

    // Get friendship count
    const friendships1 = await ctx.db
      .query("friendships")
      .withIndex("by_agent1Id", (q) => q.eq("agent1Id", args.agentId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();
    const friendships2 = await ctx.db
      .query("friendships")
      .withIndex("by_agent2Id", (q) => q.eq("agent2Id", args.agentId))
      .filter((q) => q.eq(q.field("status"), "accepted"))
      .collect();
    const friendCount = friendships1.length + friendships2.length;

    // Format businesses
    const businesses = await Promise.all(
      ownedBusinesses.map(async (biz) => {
        const bizZone = await ctx.db.get(biz.zoneId);
        return {
          _id: biz._id,
          name: biz.name,
          type: biz.type,
          zoneName: bizZone?.name ?? "Unknown",
          status: biz.status,
          cashOnHand: biz.cashOnHand,
          reputation: biz.reputation,
        };
      })
    );

    return {
      // Basic info
      _id: agent._id,
      name: agent.name,
      createdAt: agent.createdAt,
      title: agentTitle,

      // Current state
      status: agent.status,
      busyUntilTick: agent.busyUntilTick,
      busyAction: agent.busyAction,

      // Location
      location: zone
        ? {
            zoneId: zone._id,
            slug: zone.slug,
            name: zone.name,
            type: zone.type,
          }
        : null,

      // Stats
      stats: {
        cash: agent.cash,
        health: agent.health,
        stamina: agent.stamina,
        heat: agent.heat,
        reputation: agent.reputation,
      },

      // Skills
      skills: agent.skills,

      // Lifetime stats
      lifetimeStats: {
        lifetimeEarnings: agent.stats.lifetimeEarnings,
        totalCrimes: agent.stats.totalCrimes,
        totalArrests: agent.stats.totalArrests,
        jobsCompleted: agent.stats.jobsCompleted,
        daysSurvived: agent.stats.daysSurvived,
      },

      // Social stats
      socialStats: {
        totalFriends: friendCount,
        betrayals: agent.socialStats?.betrayals ?? 0,
        coopCrimesCompleted: agent.socialStats?.coopCrimesCompleted ?? 0,
        giftsGiven: agent.socialStats?.giftsGiven ?? 0,
        giftsReceived: agent.socialStats?.giftsReceived ?? 0,
      },

      // Inventory
      inventory: inventoryWithDetails,

      // Gang
      gang: gangInfo,
      gangBanUntilTick: agent.gangBanUntilTick,

      // Tax
      tax: {
        taxOwed: agent.taxOwed ?? null,
        taxDueTick: agent.taxDueTick ?? null,
        taxGracePeriodEnd: agent.taxGracePeriodEnd ?? null,
      },

      // Property
      property: propertyInfo,

      // Businesses
      businesses,

      // Recent activity
      recentEvents: recentEvents.map((e) => ({
        _id: e._id,
        type: e.type,
        tick: e.tick,
        timestamp: e.timestamp,
        payload: e.payload,
      })),

      // Meta
      currentTick,
    };
  },
});

/**
 * Get agent history/timeline
 */
export const getAgentHistory = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return null;
    }

    // Get events for this agent
    const events = await ctx.db
      .query("events")
      .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(limit);

    // Get zones for location names
    const zones = await ctx.db.query("zones").collect();
    const zonesById: Record<string, string> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = zone.name;
    }

    // Get world for current tick
    const world = await ctx.db.query("world").first();
    const currentTick = world?.tick ?? 0;

    // Calculate last 24 hours worth of ticks (assuming 1 tick = 1 minute, 24h = 1440 ticks)
    const ticksIn24Hours = 1440;
    const cutoffTick = Math.max(0, currentTick - ticksIn24Hours);

    const last24HoursEvents = events.filter((e) => e.tick >= cutoffTick);

    // Summarize last 24 hours
    const summary = {
      crimes: last24HoursEvents.filter(
        (e) =>
          e.type === "CRIME_SUCCESS" ||
          e.type === "CRIME_FAILED" ||
          e.type === "CRIME_ATTEMPTED"
      ).length,
      jobs: last24HoursEvents.filter((e) => e.type === "JOB_COMPLETED").length,
      arrests: last24HoursEvents.filter((e) => e.type === "AGENT_ARRESTED")
        .length,
      moves: last24HoursEvents.filter((e) => e.type === "MOVE_COMPLETED")
        .length,
      trades: last24HoursEvents.filter(
        (e) => e.type === "BUY" || e.type === "SELL"
      ).length,
    };

    return {
      agentName: agent.name,
      events: events.map((e) => ({
        _id: e._id,
        type: e.type,
        tick: e.tick,
        timestamp: e.timestamp,
        zoneName: e.zoneId ? zonesById[e.zoneId.toString()] ?? null : null,
        payload: e.payload,
      })),
      summary,
      currentTick,
    };
  },
});
