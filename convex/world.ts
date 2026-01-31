/**
 * World state management for ClawCity
 * Handles the world singleton, tick advancement, and world status control
 */

import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULTS } from "./lib/constants";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the current world state
 * Returns the world singleton with all configuration and state
 */
export const getWorld = query({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      return null;
    }
    return world;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Initialize the world singleton if it doesn't exist
 * This is idempotent - calling it multiple times is safe
 */
export const initializeWorld = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if world already exists
    const existingWorld = await ctx.db.query("world").first();
    if (existingWorld) {
      return {
        initialized: false,
        message: "World already exists",
        world: existingWorld,
      };
    }

    // Create the world singleton with default configuration
    const worldId = await ctx.db.insert("world", {
      tick: 0,
      tickMs: DEFAULTS.tickMs,
      status: "paused",
      seed: `clawcity-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      lastTickAt: Date.now(),
      config: {
        startingCashMin: DEFAULTS.startingCashMin,
        startingCashMax: DEFAULTS.startingCashMax,
        startingZone: DEFAULTS.startingZone,
        heatDecayIdle: DEFAULTS.heatDecayIdle,
        heatDecayBusy: DEFAULTS.heatDecayBusy,
        arrestThreshold: DEFAULTS.arrestThreshold,
        maxHeat: DEFAULTS.maxHeat,
      },
    });

    const world = await ctx.db.get(worldId);

    return {
      initialized: true,
      message: "World initialized successfully",
      world,
    };
  },
});

/**
 * Pause the world - stops tick processing
 */
export const pauseWorld = mutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      throw new Error("World not initialized. Call initializeWorld first.");
    }

    if (world.status === "paused") {
      return {
        success: false,
        message: "World is already paused",
        status: world.status,
      };
    }

    await ctx.db.patch(world._id, {
      status: "paused",
    });

    // Log the pause event
    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp: Date.now(),
      type: "WORLD_PAUSED",
      agentId: null,
      zoneId: null,
      entityId: null,
      payload: {},
      requestId: null,
    });

    return {
      success: true,
      message: "World paused",
      status: "paused" as const,
    };
  },
});

/**
 * Resume the world - allows tick processing to continue
 */
export const resumeWorld = mutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      throw new Error("World not initialized. Call initializeWorld first.");
    }

    if (world.status === "running") {
      return {
        success: false,
        message: "World is already running",
        status: world.status,
      };
    }

    await ctx.db.patch(world._id, {
      status: "running",
      lastTickAt: Date.now(),
    });

    // Log the resume event
    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp: Date.now(),
      type: "WORLD_RESUMED",
      agentId: null,
      zoneId: null,
      entityId: null,
      payload: {},
      requestId: null,
    });

    return {
      success: true,
      message: "World resumed",
      status: "running" as const,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Increment the world tick counter
 * This is an internal mutation called by the tick runner
 * Returns the new tick number and world seed for RNG
 */
export const incrementTick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      throw new Error("World not initialized");
    }

    const newTick = world.tick + 1;
    const now = Date.now();

    await ctx.db.patch(world._id, {
      tick: newTick,
      lastTickAt: now,
    });

    return {
      tick: newTick,
      seed: world.seed,
      config: world.config,
      previousTick: world.tick,
    };
  },
});
