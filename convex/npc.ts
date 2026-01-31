/**
 * NPC Agent System for ClawCity
 * Handles NPC spawning, behavior logic, and automated actions
 */

import { mutation, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id, Doc } from "./_generated/dataModel";
import { createTickRng } from "./lib/rng";
import {
  DEFAULTS,
  GTA_DEFAULTS,
  NPCBehaviorType,
  NPC_BEHAVIOR_TYPES,
} from "./lib/constants";
import { handleAction, ActionContext } from "./actions";

// ============================================================================
// NPC SPAWNING
// ============================================================================

/**
 * Spawn a new NPC agent with a given behavior type
 */
export const spawnNPC = mutation({
  args: {
    name: v.string(),
    behaviorType: v.union(
      v.literal("criminal"),
      v.literal("worker"),
      v.literal("trader"),
      v.literal("social"),
      v.literal("chaotic")
    ),
  },
  handler: async (ctx, args) => {
    const { name, behaviorType } = args;

    // Get world for tick and seed
    const world = await ctx.db.query("world").first();
    if (!world) {
      throw new Error("World not initialized");
    }

    // Check NPC limit
    const existingNPCs = await ctx.db
      .query("npcAgents")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    if (existingNPCs.length >= GTA_DEFAULTS.npcMaxPerWorld) {
      throw new Error(`NPC limit reached (${GTA_DEFAULTS.npcMaxPerWorld})`);
    }

    // Get starting zone
    const startingZone = await ctx.db
      .query("zones")
      .withIndex("by_slug", (q) => q.eq("slug", world.config.startingZone))
      .first();

    if (!startingZone) {
      throw new Error("Starting zone not found");
    }

    // Generate random starting cash
    const rng = createTickRng(world.seed, world.tick);
    const startingCash = rng.randomInt(
      world.config.startingCashMin ?? DEFAULTS.startingCashMin,
      world.config.startingCashMax ?? DEFAULTS.startingCashMax
    );

    // Generate random personality based on behavior type
    const basePersonality = GTA_DEFAULTS.npcPersonalityDefaults[behaviorType];
    const personality = {
      aggression: Math.max(0, Math.min(100, basePersonality.aggression + rng.randomInt(-15, 15))),
      greed: Math.max(0, Math.min(100, basePersonality.greed + rng.randomInt(-15, 15))),
      caution: Math.max(0, Math.min(100, basePersonality.caution + rng.randomInt(-15, 15))),
      loyalty: Math.max(0, Math.min(100, basePersonality.loyalty + rng.randomInt(-15, 15))),
      sociability: Math.max(0, Math.min(100, basePersonality.sociability + rng.randomInt(-15, 15))),
    };

    // Generate random skills
    const skills = {
      driving: rng.randomInt(1, 5),
      negotiation: rng.randomInt(1, 5),
      stealth: rng.randomInt(1, 5),
      combat: rng.randomInt(1, 5),
    };

    // Create agent with isNPC flag
    const agentId = await ctx.db.insert("agents", {
      agentKeyHash: `npc_${Date.now()}_${rng.randomInt(0, 999999)}`,
      name,
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
      skills,
      stats: {
        lifetimeEarnings: 0,
        totalCrimes: 0,
        totalArrests: 0,
        jobsCompleted: 0,
        daysSurvived: 0,
      },
      isNPC: true,
      combatStats: {
        kills: 0,
        deaths: 0,
        bountiesClaimed: 0,
        bountiesPlaced: 0,
      },
    });

    // Create NPC agent record
    const npcAgentId = await ctx.db.insert("npcAgents", {
      agentId,
      personality,
      behaviorType,
      isActive: true,
      lastActionTick: world.tick,
    });

    // Log NPC spawned event
    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp: Date.now(),
      type: "NPC_SPAWNED",
      agentId,
      zoneId: startingZone._id,
      entityId: npcAgentId,
      payload: {
        name,
        behaviorType,
        personality,
        startingCash,
      },
      requestId: null,
    });

    return {
      agentId,
      npcAgentId,
      name,
      behaviorType,
      personality,
    };
  },
});

/**
 * Spawn multiple NPCs at once
 */
export const spawnNPCBatch = mutation({
  args: {
    count: v.number(),
    behaviorType: v.optional(
      v.union(
        v.literal("criminal"),
        v.literal("worker"),
        v.literal("trader"),
        v.literal("social"),
        v.literal("chaotic")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { count, behaviorType } = args;

    const world = await ctx.db.query("world").first();
    if (!world) {
      throw new Error("World not initialized");
    }

    const rng = createTickRng(world.seed, world.tick);

    // NPC names pool
    const firstNames = [
      "Shadow", "Blade", "Viper", "Ghost", "Razor", "Spike", "Ace", "Duke",
      "Rex", "Max", "Rocco", "Tony", "Vinnie", "Marco", "Bruno", "Carlos",
      "Johnny", "Lucky", "Slim", "Big", "Fast", "Sneaky", "Crafty", "Slick",
    ];
    const lastNames = [
      "Jones", "Smith", "Brown", "Martinez", "Gambino", "Corleone", "Montana",
      "Vito", "DeMarco", "Romano", "Falcone", "Marcone", "Luciano", "Capone",
    ];

    const spawnedNPCs = [];

    for (let i = 0; i < count; i++) {
      // Generate random name
      const firstName = firstNames[rng.randomInt(0, firstNames.length - 1)];
      const lastName = lastNames[rng.randomInt(0, lastNames.length - 1)];
      const name = `${firstName} ${lastName}`;

      // Pick random or specified behavior type
      const selectedBehaviorType =
        behaviorType ?? NPC_BEHAVIOR_TYPES[rng.randomInt(0, NPC_BEHAVIOR_TYPES.length - 1)];

      // Get starting zone
      const startingZone = await ctx.db
        .query("zones")
        .withIndex("by_slug", (q) => q.eq("slug", world.config.startingZone))
        .first();

      if (!startingZone) continue;

      // Generate random starting cash
      const startingCash = rng.randomInt(
        world.config.startingCashMin ?? DEFAULTS.startingCashMin,
        world.config.startingCashMax ?? DEFAULTS.startingCashMax
      );

      // Generate personality
      const basePersonality = GTA_DEFAULTS.npcPersonalityDefaults[selectedBehaviorType];
      const personality = {
        aggression: Math.max(0, Math.min(100, basePersonality.aggression + rng.randomInt(-15, 15))),
        greed: Math.max(0, Math.min(100, basePersonality.greed + rng.randomInt(-15, 15))),
        caution: Math.max(0, Math.min(100, basePersonality.caution + rng.randomInt(-15, 15))),
        loyalty: Math.max(0, Math.min(100, basePersonality.loyalty + rng.randomInt(-15, 15))),
        sociability: Math.max(0, Math.min(100, basePersonality.sociability + rng.randomInt(-15, 15))),
      };

      // Generate random skills
      const skills = {
        driving: rng.randomInt(1, 5),
        negotiation: rng.randomInt(1, 5),
        stealth: rng.randomInt(1, 5),
        combat: rng.randomInt(1, 5),
      };

      // Create agent
      const agentId = await ctx.db.insert("agents", {
        agentKeyHash: `npc_${Date.now()}_${i}_${rng.randomInt(0, 999999)}`,
        name,
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
        skills,
        stats: {
          lifetimeEarnings: 0,
          totalCrimes: 0,
          totalArrests: 0,
          jobsCompleted: 0,
          daysSurvived: 0,
        },
        isNPC: true,
        combatStats: {
          kills: 0,
          deaths: 0,
          bountiesClaimed: 0,
          bountiesPlaced: 0,
        },
      });

      // Create NPC record
      const npcAgentId = await ctx.db.insert("npcAgents", {
        agentId,
        personality,
        behaviorType: selectedBehaviorType,
        isActive: true,
        lastActionTick: world.tick,
      });

      spawnedNPCs.push({ agentId, npcAgentId, name, behaviorType: selectedBehaviorType });
    }

    return { spawned: spawnedNPCs.length, npcs: spawnedNPCs };
  },
});

// ============================================================================
// NPC BEHAVIOR ENGINE
// ============================================================================

/**
 * Process NPC actions each tick
 * Called by the tick runner
 */
export const processNPCActions = internalMutation({
  args: {
    seed: v.string(),
    tick: v.number(),
  },
  handler: async (ctx, args) => {
    const { seed, tick } = args;

    const world = await ctx.db.query("world").first();
    if (!world) {
      return { processed: 0, actions: [] };
    }

    // Get all active NPCs that are ready to act
    const activeNPCs = await ctx.db
      .query("npcAgents")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const rng = createTickRng(seed, tick);
    const actionsPerformed: Array<{ agentId: Id<"agents">; action: string; success: boolean }> = [];

    for (const npcRecord of activeNPCs) {
      // Check cooldown
      if (tick - npcRecord.lastActionTick < GTA_DEFAULTS.npcActionInterval) {
        continue;
      }

      // Get the agent
      const agent = await ctx.db.get(npcRecord.agentId);
      if (!agent) {
        // Agent deleted, deactivate NPC
        await ctx.db.patch(npcRecord._id, { isActive: false });
        continue;
      }

      // Skip if not idle
      if (agent.status !== "idle") {
        continue;
      }

      // Select an action based on behavior type and personality
      const selectedAction = selectNPCAction(rng, npcRecord, agent);

      if (!selectedAction) {
        continue;
      }

      // Generate action arguments
      const actionArgs = await generateActionArgs(ctx, rng, selectedAction, agent, world);

      if (!actionArgs) {
        continue;
      }

      // Execute the action
      try {
        const actionContext: ActionContext = {
          ctx,
          agent,
          world,
          requestId: `npc_${agent._id}_${tick}`,
        };

        const result = await handleAction(actionContext, selectedAction as any, actionArgs);

        // Update last action tick
        await ctx.db.patch(npcRecord._id, { lastActionTick: tick });

        // Log NPC action event
        await ctx.db.insert("events", {
          tick,
          timestamp: Date.now(),
          type: "NPC_ACTION",
          agentId: agent._id,
          zoneId: agent.locationZoneId,
          entityId: null,
          payload: {
            action: selectedAction,
            success: result.ok,
            result: result.result,
            behaviorType: npcRecord.behaviorType,
          },
          requestId: null,
        });

        actionsPerformed.push({
          agentId: agent._id,
          action: selectedAction,
          success: result.ok,
        });
      } catch (error) {
        // Action failed, continue to next NPC
        console.error(`NPC action failed: ${error}`);
      }
    }

    return { processed: actionsPerformed.length, actions: actionsPerformed };
  },
});

/**
 * Select an action for an NPC based on behavior type and state
 */
function selectNPCAction(
  rng: ReturnType<typeof createTickRng>,
  npcRecord: Doc<"npcAgents">,
  agent: Doc<"agents">
): string | null {
  const { behaviorType, personality } = npcRecord;

  // Get action weights for this behavior type
  const weights = GTA_DEFAULTS.npcActionWeights[behaviorType];

  // Adjust weights based on agent state
  const adjustedWeights: Record<string, number> = { ...weights };

  // If low health, prefer REST
  if (agent.health < 30) {
    adjustedWeights["REST"] = (adjustedWeights["REST"] ?? 0) + 50;
    adjustedWeights["HEAL"] = (adjustedWeights["HEAL"] ?? 0) + 30;
  }

  // If low stamina, prefer REST
  if (agent.stamina < 20) {
    adjustedWeights["REST"] = (adjustedWeights["REST"] ?? 0) + 40;
  }

  // If high heat and cautious, prefer MOVE or REST
  if (agent.heat > 50 && personality.caution > 60) {
    adjustedWeights["MOVE"] = (adjustedWeights["MOVE"] ?? 0) + 30;
    adjustedWeights["REST"] = (adjustedWeights["REST"] ?? 0) + 20;
    // Reduce crime tendency
    adjustedWeights["COMMIT_CRIME"] = Math.max(0, (adjustedWeights["COMMIT_CRIME"] ?? 0) - 20);
    adjustedWeights["ATTACK_AGENT"] = Math.max(0, (adjustedWeights["ATTACK_AGENT"] ?? 0) - 20);
  }

  // If very aggressive, boost combat actions
  if (personality.aggression > 80) {
    adjustedWeights["ATTACK_AGENT"] = (adjustedWeights["ATTACK_AGENT"] ?? 0) + 15;
    adjustedWeights["ROB_AGENT"] = (adjustedWeights["ROB_AGENT"] ?? 0) + 10;
  }

  // If greedy and has cash, might gamble
  if (personality.greed > 70 && agent.cash > 500) {
    adjustedWeights["GAMBLE"] = (adjustedWeights["GAMBLE"] ?? 0) + 15;
  }

  // Weighted random selection
  const totalWeight = Object.values(adjustedWeights).reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    return null;
  }

  let roll = rng.random() * totalWeight;
  for (const [action, weight] of Object.entries(adjustedWeights)) {
    roll -= weight;
    if (roll <= 0) {
      return action;
    }
  }

  return null;
}

/**
 * Generate arguments for the selected action
 */
async function generateActionArgs(
  ctx: any,
  rng: ReturnType<typeof createTickRng>,
  action: string,
  agent: Doc<"agents">,
  world: Doc<"world">
): Promise<Record<string, unknown> | null> {
  switch (action) {
    case "MOVE": {
      // Find a connected zone to move to
      const edges = await ctx.db
        .query("zoneEdges")
        .withIndex("by_fromZoneId", (q: any) => q.eq("fromZoneId", agent.locationZoneId))
        .collect();

      if (edges.length === 0) return null;

      const edge = edges[rng.randomInt(0, edges.length - 1)];
      const targetZone = await ctx.db.get(edge.toZoneId);

      if (!targetZone || agent.cash < edge.cashCost) return null;

      return { toZone: targetZone.slug };
    }

    case "TAKE_JOB": {
      // Find available jobs in current zone
      const jobs = await ctx.db
        .query("jobs")
        .withIndex("by_zoneId", (q: any) => q.eq("zoneId", agent.locationZoneId))
        .collect();

      const availableJobs = jobs.filter(
        (j: any) =>
          j.active &&
          agent.stamina >= j.staminaCost &&
          (!j.requirements.minReputation || agent.reputation >= j.requirements.minReputation)
      );

      if (availableJobs.length === 0) return null;

      const job = availableJobs[rng.randomInt(0, availableJobs.length - 1)];
      return { jobId: job._id };
    }

    case "COMMIT_CRIME": {
      const crimeTypes = ["THEFT", "ROBBERY", "SMUGGLING"];
      return { crimeType: crimeTypes[rng.randomInt(0, crimeTypes.length - 1)] };
    }

    case "REST":
    case "HEAL": {
      return {};
    }

    case "ATTACK_AGENT":
    case "ROB_AGENT": {
      // Find other agents in the same zone
      const agentsInZone = await ctx.db
        .query("agents")
        .withIndex("by_locationZoneId", (q: any) => q.eq("locationZoneId", agent.locationZoneId))
        .collect();

      const targets = agentsInZone.filter(
        (a: Doc<"agents">) => a._id !== agent._id && a.status === "idle"
      );

      if (targets.length === 0) return null;

      const target = targets[rng.randomInt(0, targets.length - 1)];
      return { targetAgentId: target._id };
    }

    case "GAMBLE": {
      // Check if in market zone
      const zone = await ctx.db.get(agent.locationZoneId);
      if (!zone || zone.slug !== "market") return null;

      const amount = Math.min(agent.cash, rng.randomInt(50, 500));
      const riskTypes = ["lowRisk", "medRisk", "highRisk"];
      return {
        amount,
        riskType: riskTypes[rng.randomInt(0, riskTypes.length - 1)],
      };
    }

    case "BUY": {
      // Find businesses in zone
      const businesses = await ctx.db
        .query("businesses")
        .withIndex("by_zoneId", (q: any) => q.eq("zoneId", agent.locationZoneId))
        .collect();

      const openBusinesses = businesses.filter((b: any) => b.status === "open" && b.inventory.length > 0);
      if (openBusinesses.length === 0) return null;

      const business = openBusinesses[rng.randomInt(0, openBusinesses.length - 1)];
      const item = business.inventory[rng.randomInt(0, business.inventory.length - 1)];

      if (item.price > agent.cash) return null;

      const itemDoc = await ctx.db.get(item.itemId);
      if (!itemDoc) return null;

      return { businessId: business._id, itemSlug: itemDoc.slug, qty: 1 };
    }

    case "SELL": {
      if (agent.inventory.length === 0) return null;

      // Find businesses in zone
      const businesses = await ctx.db
        .query("businesses")
        .withIndex("by_zoneId", (q: any) => q.eq("zoneId", agent.locationZoneId))
        .collect();

      const openBusinesses = businesses.filter((b: any) => b.status === "open" && b.cashOnHand > 0);
      if (openBusinesses.length === 0) return null;

      const business = openBusinesses[rng.randomInt(0, openBusinesses.length - 1)];
      const invItem = agent.inventory[rng.randomInt(0, agent.inventory.length - 1)];

      const itemDoc = await ctx.db.get(invItem.itemId);
      if (!itemDoc) return null;

      return { businessId: business._id, itemSlug: itemDoc.slug, qty: 1 };
    }

    case "SEND_FRIEND_REQUEST": {
      // Find other agents in the same zone who aren't friends
      const agentsInZone = await ctx.db
        .query("agents")
        .withIndex("by_locationZoneId", (q: any) => q.eq("locationZoneId", agent.locationZoneId))
        .collect();

      const nonFriends = agentsInZone.filter((a: Doc<"agents">) => a._id !== agent._id);
      if (nonFriends.length === 0) return null;

      const target = nonFriends[rng.randomInt(0, nonFriends.length - 1)];
      return { targetAgentId: target._id };
    }

    case "GIFT_CASH": {
      if (agent.cash < 100) return null;

      const agentsInZone = await ctx.db
        .query("agents")
        .withIndex("by_locationZoneId", (q: any) => q.eq("locationZoneId", agent.locationZoneId))
        .collect();

      const others = agentsInZone.filter((a: Doc<"agents">) => a._id !== agent._id);
      if (others.length === 0) return null;

      const target = others[rng.randomInt(0, others.length - 1)];
      const amount = rng.randomInt(10, Math.min(100, agent.cash));

      return { targetAgentId: target._id, amount };
    }

    case "STEAL_VEHICLE": {
      // Check if agent already has vehicle
      if (agent.vehicleId) return null;
      return {};
    }

    case "PLACE_BOUNTY": {
      if (agent.cash < 500) return null;

      // Find other agents
      const allAgents = await ctx.db.query("agents").collect();
      const targets = allAgents.filter((a: Doc<"agents">) => a._id !== agent._id);

      if (targets.length === 0) return null;

      const target = targets[rng.randomInt(0, targets.length - 1)];
      const amount = rng.randomInt(500, Math.min(5000, agent.cash));

      return { targetAgentId: target._id, amount };
    }

    default:
      return null;
  }
}

// ============================================================================
// NPC QUERIES
// ============================================================================

/**
 * Get all active NPCs
 */
export const getActiveNPCs = query({
  args: {},
  handler: async (ctx) => {
    const npcRecords = await ctx.db
      .query("npcAgents")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const npcs = await Promise.all(
      npcRecords.map(async (npc) => {
        const agent = await ctx.db.get(npc.agentId);
        return {
          npcId: npc._id,
          agentId: npc.agentId,
          agentName: agent?.name ?? "Unknown",
          behaviorType: npc.behaviorType,
          personality: npc.personality,
          lastActionTick: npc.lastActionTick,
          agent,
        };
      })
    );

    return npcs;
  },
});

/**
 * Deactivate an NPC
 */
export const deactivateNPC = mutation({
  args: {
    npcAgentId: v.id("npcAgents"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.npcAgentId, { isActive: false });
    return { success: true };
  },
});

/**
 * Activate an NPC
 */
export const activateNPC = mutation({
  args: {
    npcAgentId: v.id("npcAgents"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.npcAgentId, { isActive: true });
    return { success: true };
  },
});
