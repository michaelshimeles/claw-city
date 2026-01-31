/**
 * Agent Action Handlers for ClawCity
 * Routes and processes all agent actions (MOVE, TAKE_JOB, BUY, SELL, etc.)
 */

import { MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { ActionType, BUSINESS_TYPES, BusinessType, CRIME_TYPES, CrimeType, DEFAULTS, ERROR_CODES, ErrorCode } from "./lib/constants";
import { createTickRng } from "./lib/rng";

// ============================================================================
// BUSINESS STARTUP COSTS
// ============================================================================

/**
 * Startup costs for each business type
 */
const BUSINESS_STARTUP_COSTS: Record<BusinessType, number> = {
  restaurant: 1000,
  pawnshop: 500,
  clinic: 2000,
  warehouse: 800,
  bar: 1500,
  garage: 1200,
};

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result of an action handler
 */
export interface ActionResult {
  ok: boolean;
  error?: ErrorCode;
  message?: string;
  result?: Record<string, unknown>;
}

/**
 * Context passed to action handlers
 */
export interface ActionContext {
  ctx: MutationCtx;
  agent: Doc<"agents">;
  world: Doc<"world">;
  requestId: string;
}

/**
 * Arguments for each action type
 */
export type ActionArgs = {
  MOVE: { toZone: string };
  TAKE_JOB: { jobId: string };
  BUY: { businessId: string; itemSlug: string; qty: number };
  SELL: { businessId: string; itemSlug: string; qty: number };
  HEAL: Record<string, never>;
  REST: Record<string, never>;
  COMMIT_CRIME: { crimeType: string; targetBusinessId?: string };
  START_BUSINESS: { type: string; name: string };
  SET_PRICES: { businessId: string; prices: Array<{ itemSlug: string; price: number }> };
  STOCK_BUSINESS: { businessId: string; itemSlug: string; qty: number };
  USE_ITEM: { itemSlug: string };
};

// ============================================================================
// MAIN ACTION HANDLER
// ============================================================================

/**
 * Main action router - dispatches to specific action handlers
 * This is a stub that will be implemented with actual action logic
 */
export async function handleAction(
  actionCtx: ActionContext,
  action: ActionType,
  args: Record<string, unknown>
): Promise<ActionResult> {
  const { agent } = actionCtx;

  // Check agent status - must be idle to perform most actions
  if (agent.status === "jailed") {
    return {
      ok: false,
      error: "AGENT_JAILED",
      message: ERROR_CODES.AGENT_JAILED,
    };
  }

  if (agent.status === "hospitalized") {
    return {
      ok: false,
      error: "AGENT_HOSPITALIZED",
      message: ERROR_CODES.AGENT_HOSPITALIZED,
    };
  }

  if (agent.status === "busy") {
    return {
      ok: false,
      error: "AGENT_BUSY",
      message: `${ERROR_CODES.AGENT_BUSY.replace("N", String(agent.busyUntilTick))}`,
    };
  }

  // Route to specific action handler
  switch (action) {
    case "MOVE":
      return handleMove(actionCtx, args as ActionArgs["MOVE"]);
    case "TAKE_JOB":
      return handleTakeJob(actionCtx, args as ActionArgs["TAKE_JOB"]);
    case "BUY":
      return handleBuy(actionCtx, args as ActionArgs["BUY"]);
    case "SELL":
      return handleSell(actionCtx, args as ActionArgs["SELL"]);
    case "HEAL":
      return handleHeal(actionCtx, args as ActionArgs["HEAL"]);
    case "REST":
      return handleRest(actionCtx, args as ActionArgs["REST"]);
    case "COMMIT_CRIME":
      return handleCommitCrime(actionCtx, args as ActionArgs["COMMIT_CRIME"]);
    case "START_BUSINESS":
      return handleStartBusiness(actionCtx, args as ActionArgs["START_BUSINESS"]);
    case "SET_PRICES":
      return handleSetPrices(actionCtx, args as ActionArgs["SET_PRICES"]);
    case "STOCK_BUSINESS":
      return handleStockBusiness(actionCtx, args as ActionArgs["STOCK_BUSINESS"]);
    case "USE_ITEM":
      return handleUseItem(actionCtx, args as ActionArgs["USE_ITEM"]);
    default:
      return {
        ok: false,
        error: "INVALID_ACTION",
        message: `${ERROR_CODES.INVALID_ACTION}: ${action}`,
      };
  }
}

// ============================================================================
// ACTION HANDLERS (STUBS)
// These will be implemented with actual game logic
// ============================================================================

async function handleMove(
  actionCtx: ActionContext,
  args: ActionArgs["MOVE"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { toZone } = args;

  // 1. Validate target zone exists (query by slug)
  const targetZone = await ctx.db
    .query("zones")
    .withIndex("by_slug", (q) => q.eq("slug", toZone))
    .unique();

  if (!targetZone) {
    return {
      ok: false,
      error: "INVALID_ZONE",
      message: `${ERROR_CODES.INVALID_ZONE}: ${toZone}`,
    };
  }

  // Check if agent is already in the target zone
  if (agent.locationZoneId === targetZone._id) {
    return {
      ok: false,
      error: "WRONG_ZONE",
      message: "Agent is already in this zone",
    };
  }

  // 2. Find zone edge from current location to target
  const edges = await ctx.db
    .query("zoneEdges")
    .withIndex("by_fromZoneId", (q) => q.eq("fromZoneId", agent.locationZoneId))
    .collect();

  const edge = edges.find((e) => e.toZoneId === targetZone._id);

  if (!edge) {
    return {
      ok: false,
      error: "INVALID_ZONE",
      message: `No path from current zone to ${toZone}`,
    };
  }

  // 3. Check agent has enough cash for travel cost
  if (agent.cash < edge.cashCost) {
    return {
      ok: false,
      error: "INSUFFICIENT_FUNDS",
      message: `${ERROR_CODES.INSUFFICIENT_FUNDS}. Need ${edge.cashCost}, have ${agent.cash}`,
    };
  }

  // Calculate arrival tick
  const arrivalTick = world.tick + edge.timeCostTicks;

  // 4. Deduct travel cost from agent cash
  // 5. Set agent to busy state (status="busy", busyUntilTick, busyAction="MOVE:slug")
  await ctx.db.patch(agent._id, {
    cash: agent.cash - edge.cashCost,
    status: "busy",
    busyUntilTick: arrivalTick,
    busyAction: `MOVE:${toZone}`,
  });

  // 6. Log MOVE_STARTED event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "MOVE_STARTED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: targetZone._id,
    payload: {
      fromZoneId: agent.locationZoneId,
      toZoneId: targetZone._id,
      toZoneSlug: toZone,
      travelCost: edge.cashCost,
      travelTime: edge.timeCostTicks,
      arrivalTick,
    },
    requestId,
  });

  // 7. Return success with arrivalTick
  return {
    ok: true,
    message: `Travel to ${toZone} started. Arrival at tick ${arrivalTick}`,
    result: {
      arrivalTick,
      travelCost: edge.cashCost,
      travelTime: edge.timeCostTicks,
      fromZone: agent.locationZoneId,
      toZone: targetZone._id,
      toZoneSlug: toZone,
    },
  };
}

async function handleTakeJob(
  actionCtx: ActionContext,
  args: ActionArgs["TAKE_JOB"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { jobId } = args;

  // 1. Validate job exists and is active
  let job;
  try {
    job = await ctx.db.get(jobId as Id<"jobs">);
  } catch {
    return {
      ok: false,
      error: "INVALID_JOB",
      message: ERROR_CODES.INVALID_JOB,
    };
  }

  if (!job) {
    return {
      ok: false,
      error: "INVALID_JOB",
      message: ERROR_CODES.INVALID_JOB,
    };
  }

  if (!job.active) {
    return {
      ok: false,
      error: "INVALID_JOB",
      message: `${ERROR_CODES.INVALID_JOB}: job is not active`,
    };
  }

  // 2. Check agent is in the correct zone
  if (job.zoneId !== agent.locationZoneId) {
    return {
      ok: false,
      error: "WRONG_ZONE",
      message: ERROR_CODES.WRONG_ZONE,
    };
  }

  // 3. Check requirements
  // 3a. Check minReputation if set
  if (
    job.requirements.minReputation !== undefined &&
    agent.reputation < job.requirements.minReputation
  ) {
    return {
      ok: false,
      error: "REQUIREMENTS_NOT_MET",
      message: `${ERROR_CODES.REQUIREMENTS_NOT_MET}: requires ${job.requirements.minReputation} reputation`,
    };
  }

  // 3b. Check minSkill if set
  if (job.requirements.minSkill) {
    const { skill, level } = job.requirements.minSkill;
    const agentSkillLevel =
      agent.skills[skill as keyof typeof agent.skills] ?? 0;
    if (agentSkillLevel < level) {
      return {
        ok: false,
        error: "REQUIREMENTS_NOT_MET",
        message: `${ERROR_CODES.REQUIREMENTS_NOT_MET}: requires ${skill} level ${level}`,
      };
    }
  }

  // 4. Check agent has enough stamina
  if (agent.stamina < job.staminaCost) {
    return {
      ok: false,
      error: "REQUIREMENTS_NOT_MET",
      message: `${ERROR_CODES.REQUIREMENTS_NOT_MET}: insufficient stamina (need ${job.staminaCost}, have ${agent.stamina})`,
    };
  }

  // 5. Set agent to busy state
  const completionTick = world.tick + job.durationTicks;
  await ctx.db.patch(agent._id, {
    status: "busy",
    busyUntilTick: completionTick,
    busyAction: `JOB:${job._id}`,
    stamina: agent.stamina - job.staminaCost,
  });

  // 6. Log JOB_STARTED event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "JOB_STARTED",
    agentId: agent._id,
    zoneId: job.zoneId,
    entityId: job._id,
    payload: {
      jobId: job._id,
      jobType: job.type,
      jobTitle: job.title,
      wage: job.wage,
      durationTicks: job.durationTicks,
      completionTick,
    },
    requestId,
  });

  // 7. Return success with completionTick and jobDetails
  return {
    ok: true,
    result: {
      completionTick,
      jobDetails: {
        jobId: job._id,
        title: job.title,
        type: job.type,
        wage: job.wage,
        durationTicks: job.durationTicks,
        staminaCost: job.staminaCost,
      },
    },
  };
}

async function handleBuy(
  actionCtx: ActionContext,
  args: ActionArgs["BUY"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { businessId, itemSlug, qty } = args;

  // 1. Validate business exists and status is "open"
  const business = await ctx.db.get(businessId as Id<"businesses">);
  if (!business) {
    return {
      ok: false,
      error: "INVALID_BUSINESS",
      message: ERROR_CODES.INVALID_BUSINESS,
    };
  }
  if (business.status !== "open") {
    return {
      ok: false,
      error: "BUSINESS_CLOSED",
      message: ERROR_CODES.BUSINESS_CLOSED,
    };
  }

  // 2. Check agent is in correct zone (business.zoneId must match agent.locationZoneId)
  if (business.zoneId !== agent.locationZoneId) {
    return {
      ok: false,
      error: "WRONG_ZONE",
      message: ERROR_CODES.WRONG_ZONE,
    };
  }

  // 3. Find item in business inventory (by itemSlug)
  const item = await ctx.db
    .query("items")
    .withIndex("by_slug", (q) => q.eq("slug", itemSlug))
    .first();
  if (!item) {
    return {
      ok: false,
      error: "INVALID_ITEM",
      message: ERROR_CODES.INVALID_ITEM,
    };
  }

  const businessInventoryIdx = business.inventory.findIndex(
    (inv) => inv.itemId === item._id
  );
  if (businessInventoryIdx === -1) {
    return {
      ok: false,
      error: "OUT_OF_STOCK",
      message: ERROR_CODES.OUT_OF_STOCK,
    };
  }

  const businessInventoryItem = business.inventory[businessInventoryIdx];

  // 4. Check business has enough stock (qty available)
  if (businessInventoryItem.qty < qty) {
    return {
      ok: false,
      error: "OUT_OF_STOCK",
      message: `${ERROR_CODES.OUT_OF_STOCK}: only ${businessInventoryItem.qty} available`,
    };
  }

  // 5. Calculate total price (item price * qty)
  const totalPrice = businessInventoryItem.price * qty;

  // 6. Check agent has enough cash
  if (agent.cash < totalPrice) {
    return {
      ok: false,
      error: "INSUFFICIENT_FUNDS",
      message: `${ERROR_CODES.INSUFFICIENT_FUNDS}: need $${totalPrice}, have $${agent.cash}`,
    };
  }

  // 7. Transfer: deduct agent cash, add item to agent inventory, remove from business inventory
  const newAgentCash = agent.cash - totalPrice;

  // Update agent inventory
  const agentInventory = [...agent.inventory];
  const agentInvIdx = agentInventory.findIndex((inv) => inv.itemId === item._id);
  if (agentInvIdx === -1) {
    agentInventory.push({ itemId: item._id, qty });
  } else {
    agentInventory[agentInvIdx] = {
      ...agentInventory[agentInvIdx],
      qty: agentInventory[agentInvIdx].qty + qty,
    };
  }

  // Update business inventory
  const businessInventory = [...business.inventory];
  const newBusinessQty = businessInventoryItem.qty - qty;
  if (newBusinessQty === 0) {
    businessInventory.splice(businessInventoryIdx, 1);
  } else {
    businessInventory[businessInventoryIdx] = {
      ...businessInventoryItem,
      qty: newBusinessQty,
    };
  }

  // 8. Update business cashOnHand
  const newBusinessCash = business.cashOnHand + totalPrice;

  // Persist changes
  await ctx.db.patch(agent._id, {
    cash: newAgentCash,
    inventory: agentInventory,
  });

  await ctx.db.patch(business._id, {
    cashOnHand: newBusinessCash,
    inventory: businessInventory,
    metrics: {
      ...business.metrics,
      totalRevenue: business.metrics.totalRevenue + totalPrice,
      totalCustomers: business.metrics.totalCustomers + 1,
    },
  });

  // 9. Log BUY event
  const eventId = await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "BUY",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: business._id,
    payload: {
      businessId: business._id,
      businessName: business.name,
      itemId: item._id,
      itemSlug: item.slug,
      itemName: item.name,
      qty,
      unitPrice: businessInventoryItem.price,
      totalPrice,
    },
    requestId,
  });

  // 10. Record ledger entry (debit)
  await ctx.db.insert("ledger", {
    tick: world.tick,
    agentId: agent._id,
    type: "debit",
    amount: totalPrice,
    reason: "PURCHASE",
    balance: newAgentCash,
    refEventId: eventId,
  });

  // 11. Return success with purchase details
  return {
    ok: true,
    message: `Purchased ${qty}x ${item.name} from ${business.name} for $${totalPrice}`,
    result: {
      itemSlug: item.slug,
      itemName: item.name,
      qty,
      unitPrice: businessInventoryItem.price,
      totalPrice,
      newCash: newAgentCash,
      businessId: business._id,
      businessName: business.name,
    },
  };
}

async function handleSell(
  actionCtx: ActionContext,
  args: ActionArgs["SELL"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { businessId, itemSlug, qty } = args;

  // 1. Validate business exists and status is "open"
  const business = await ctx.db.get(businessId as Id<"businesses">);
  if (!business) {
    return {
      ok: false,
      error: "INVALID_BUSINESS",
      message: ERROR_CODES.INVALID_BUSINESS,
    };
  }
  if (business.status !== "open") {
    return {
      ok: false,
      error: "BUSINESS_CLOSED",
      message: ERROR_CODES.BUSINESS_CLOSED,
    };
  }

  // 2. Check agent is in correct zone
  if (business.zoneId !== agent.locationZoneId) {
    return {
      ok: false,
      error: "WRONG_ZONE",
      message: ERROR_CODES.WRONG_ZONE,
    };
  }

  // 3. Find item in agent's inventory
  const item = await ctx.db
    .query("items")
    .withIndex("by_slug", (q) => q.eq("slug", itemSlug))
    .first();
  if (!item) {
    return {
      ok: false,
      error: "INVALID_ITEM",
      message: ERROR_CODES.INVALID_ITEM,
    };
  }

  const agentInventoryIdx = agent.inventory.findIndex(
    (inv) => inv.itemId === item._id
  );
  if (agentInventoryIdx === -1) {
    return {
      ok: false,
      error: "INSUFFICIENT_INVENTORY",
      message: `${ERROR_CODES.INSUFFICIENT_INVENTORY}: Agent does not have ${itemSlug}`,
    };
  }

  const agentInventoryItem = agent.inventory[agentInventoryIdx];

  // 4. Check agent has enough quantity
  if (agentInventoryItem.qty < qty) {
    return {
      ok: false,
      error: "INSUFFICIENT_INVENTORY",
      message: `${ERROR_CODES.INSUFFICIENT_INVENTORY}: have ${agentInventoryItem.qty}, want to sell ${qty}`,
    };
  }

  // 5. Find what price business pays (80% of the item's price in business inventory, or base price from items table)
  const businessInventoryIdx = business.inventory.findIndex(
    (inv) => inv.itemId === item._id
  );
  let buyPrice: number;
  if (businessInventoryIdx !== -1) {
    // Business has this item, pay 80% of their listed price
    buyPrice = Math.floor(business.inventory[businessInventoryIdx].price * 0.8);
  } else {
    // Business doesn't have this item, pay 80% of base price
    buyPrice = Math.floor(item.basePrice * 0.8);
  }

  const totalPayment = buyPrice * qty;

  // 6. Check business has enough cash
  if (business.cashOnHand < totalPayment) {
    return {
      ok: false,
      error: "INSUFFICIENT_FUNDS",
      message: `Business doesn't have enough cash: need $${totalPayment}, has $${business.cashOnHand}`,
    };
  }

  // 7. Transfer: add agent cash, remove item from agent inventory, add to business inventory
  const newAgentCash = agent.cash + totalPayment;

  // Update agent inventory
  const agentInventory = [...agent.inventory];
  const newAgentQty = agentInventoryItem.qty - qty;
  if (newAgentQty === 0) {
    agentInventory.splice(agentInventoryIdx, 1);
  } else {
    agentInventory[agentInventoryIdx] = {
      ...agentInventoryItem,
      qty: newAgentQty,
    };
  }

  // Update business inventory
  const businessInventory = [...business.inventory];
  if (businessInventoryIdx !== -1) {
    // Business already has this item, add to qty
    businessInventory[businessInventoryIdx] = {
      ...businessInventory[businessInventoryIdx],
      qty: businessInventory[businessInventoryIdx].qty + qty,
    };
  } else {
    // Business doesn't have this item, add new entry with base price
    businessInventory.push({
      itemId: item._id,
      qty,
      price: item.basePrice,
    });
  }

  // 8. Update business cashOnHand
  const newBusinessCash = business.cashOnHand - totalPayment;

  // Persist changes
  await ctx.db.patch(agent._id, {
    cash: newAgentCash,
    inventory: agentInventory,
  });

  await ctx.db.patch(business._id, {
    cashOnHand: newBusinessCash,
    inventory: businessInventory,
  });

  // 9. Log SELL event
  const eventId = await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "SELL",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: business._id,
    payload: {
      businessId: business._id,
      businessName: business.name,
      itemId: item._id,
      itemSlug: item.slug,
      itemName: item.name,
      qty,
      unitPrice: buyPrice,
      totalPayment,
    },
    requestId,
  });

  // 10. Record ledger entry (credit)
  await ctx.db.insert("ledger", {
    tick: world.tick,
    agentId: agent._id,
    type: "credit",
    amount: totalPayment,
    reason: "SALE",
    balance: newAgentCash,
    refEventId: eventId,
  });

  // 11. Return success with sale details
  return {
    ok: true,
    message: `Sold ${qty}x ${item.name} to ${business.name} for $${totalPayment}`,
    result: {
      itemSlug: item.slug,
      itemName: item.name,
      qty,
      unitPrice: buyPrice,
      totalPayment,
      newCash: newAgentCash,
      businessId: business._id,
      businessName: business.name,
    },
  };
}

async function handleHeal(
  actionCtx: ActionContext,
  _args: ActionArgs["HEAL"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;

  // 1. Check agent is in hospital zone (query zones for "hospital" slug, compare to agent.locationZoneId)
  const hospitalZone = await ctx.db
    .query("zones")
    .withIndex("by_slug", (q) => q.eq("slug", "hospital"))
    .unique();

  if (!hospitalZone || agent.locationZoneId !== hospitalZone._id) {
    return {
      ok: false,
      error: "WRONG_ZONE",
      message: `${ERROR_CODES.WRONG_ZONE}. Must be in hospital zone to heal.`,
    };
  }

  // 2. Check agent has enough cash (DEFAULTS.hospitalCost)
  if (agent.cash < DEFAULTS.hospitalCost) {
    return {
      ok: false,
      error: "INSUFFICIENT_FUNDS",
      message: `${ERROR_CODES.INSUFFICIENT_FUNDS}. Need ${DEFAULTS.hospitalCost}, have ${agent.cash}`,
    };
  }

  // Calculate completion tick
  const completionTick = world.tick + DEFAULTS.hospitalDuration;
  const newBalance = agent.cash - DEFAULTS.hospitalCost;

  // 3. Deduct hospital cost from agent
  // 4. Set agent to busy state (status="busy", busyUntilTick=world.tick+DEFAULTS.hospitalDuration, busyAction="HEAL")
  await ctx.db.patch(agent._id, {
    cash: newBalance,
    status: "busy",
    busyUntilTick: completionTick,
    busyAction: "HEAL",
  });

  // 5. Log HEAL_STARTED event
  const eventId = await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "HEAL_STARTED",
    agentId: agent._id,
    zoneId: hospitalZone._id,
    entityId: null,
    payload: {
      hospitalCost: DEFAULTS.hospitalCost,
      duration: DEFAULTS.hospitalDuration,
      completionTick,
      healthBefore: agent.health,
    },
    requestId,
  });

  // 6. Record ledger entry (debit for hospital cost)
  await ctx.db.insert("ledger", {
    tick: world.tick,
    agentId: agent._id,
    type: "debit",
    amount: DEFAULTS.hospitalCost,
    reason: "HOSPITAL_COST",
    balance: newBalance,
    refEventId: eventId,
  });

  // 7. Return success with completionTick
  return {
    ok: true,
    message: `Healing started. Will complete at tick ${completionTick}`,
    result: {
      completionTick,
      hospitalCost: DEFAULTS.hospitalCost,
      duration: DEFAULTS.hospitalDuration,
    },
  };
}

async function handleRest(
  actionCtx: ActionContext,
  _args: ActionArgs["REST"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;

  // Calculate completion tick
  const completionTick = world.tick + DEFAULTS.restDuration;

  // 1. Set agent to busy state (status="busy", busyUntilTick=world.tick+DEFAULTS.restDuration, busyAction="REST")
  await ctx.db.patch(agent._id, {
    status: "busy",
    busyUntilTick: completionTick,
    busyAction: "REST",
  });

  // 2. Log REST_STARTED event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "REST_STARTED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: null,
    payload: {
      duration: DEFAULTS.restDuration,
      completionTick,
      staminaBefore: agent.stamina,
      staminaGain: DEFAULTS.restStaminaGain,
    },
    requestId,
  });

  // 3. Return success with completionTick
  return {
    ok: true,
    message: `Resting started. Will complete at tick ${completionTick}`,
    result: {
      completionTick,
      duration: DEFAULTS.restDuration,
      expectedStaminaGain: DEFAULTS.restStaminaGain,
    },
  };
}

async function handleCommitCrime(
  actionCtx: ActionContext,
  args: ActionArgs["COMMIT_CRIME"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { crimeType, targetBusinessId } = args;

  // 1. Validate crimeType is valid (THEFT, ROBBERY, or SMUGGLING)
  if (!CRIME_TYPES.includes(crimeType as CrimeType)) {
    return {
      ok: false,
      error: "INVALID_CRIME_TYPE",
      message: `${ERROR_CODES.INVALID_CRIME_TYPE}: ${crimeType}`,
    };
  }

  const validCrimeType = crimeType as CrimeType;

  // 2. If targetBusinessId provided, validate business exists and is in agent's zone
  let targetBusiness: Doc<"businesses"> | null = null;
  if (targetBusinessId) {
    targetBusiness = await ctx.db.get(targetBusinessId as Id<"businesses">);
    if (!targetBusiness) {
      return {
        ok: false,
        error: "INVALID_BUSINESS",
        message: `${ERROR_CODES.INVALID_BUSINESS}: ${targetBusinessId}`,
      };
    }
    if (targetBusiness.zoneId !== agent.locationZoneId) {
      return {
        ok: false,
        error: "WRONG_ZONE",
        message: `${ERROR_CODES.WRONG_ZONE}: Business is not in agent's current zone`,
      };
    }
  }

  // 3. Calculate success chance
  // Base: DEFAULTS.crimeBaseSuccess[crimeType]
  // Add: agent.skills.stealth * DEFAULTS.stealthSkillBonus
  // Result is capped at 0.95 (never guaranteed)
  const baseSuccess = DEFAULTS.crimeBaseSuccess[validCrimeType];
  const stealthBonus = agent.skills.stealth * DEFAULTS.stealthSkillBonus;
  const successChance = Math.min(baseSuccess + stealthBonus, 0.95);

  // 4. Create RNG from world seed + tick
  const rng = createTickRng(world.seed, world.tick);

  // 5. Roll for success
  const succeeded = rng.randomChance(successChance);

  // Get current timestamp
  const timestamp = Date.now();

  // Prepare outcome details
  let reward = 0;
  let damage = 0;
  let newHealth = agent.health;
  let newHeat = agent.heat;
  let newCash = agent.cash;
  let hospitalized = false;

  if (succeeded) {
    // 6. If SUCCESS:
    // Calculate reward using rng.randomInt(crimeReward.min, crimeReward.max)
    const rewardRange = DEFAULTS.crimeReward[validCrimeType];
    reward = rng.randomInt(rewardRange.min, rewardRange.max);

    // Add reward to agent cash
    newCash = agent.cash + reward;

    // Increase heat by DEFAULTS.crimeHeatGain[crimeType]
    newHeat = Math.min(agent.heat + DEFAULTS.crimeHeatGain[validCrimeType], DEFAULTS.maxHeat);

    // Update agent stats (totalCrimes++)
    await ctx.db.patch(agent._id, {
      cash: newCash,
      heat: newHeat,
      stats: {
        ...agent.stats,
        totalCrimes: agent.stats.totalCrimes + 1,
      },
    });

    // Log CRIME_SUCCESS event
    const successEventId = await ctx.db.insert("events", {
      tick: world.tick,
      timestamp,
      type: "CRIME_SUCCESS",
      agentId: agent._id,
      zoneId: agent.locationZoneId,
      entityId: targetBusinessId ?? null,
      payload: {
        crimeType: validCrimeType,
        reward,
        heatGain: DEFAULTS.crimeHeatGain[validCrimeType],
        newHeat,
        targetBusinessId: targetBusinessId ?? null,
      },
      requestId,
    });

    // Record ledger entry (credit for crime reward)
    await ctx.db.insert("ledger", {
      tick: world.tick,
      agentId: agent._id,
      type: "credit",
      amount: reward,
      reason: "CRIME_REWARD",
      balance: newCash,
      refEventId: successEventId,
    });
  } else {
    // 7. If FAILURE:
    // Calculate damage using rng.randomInt(crimeDamage.min, crimeDamage.max)
    const damageRange = DEFAULTS.crimeDamage[validCrimeType];
    damage = rng.randomInt(damageRange.min, damageRange.max);

    // Reduce agent health (minimum 0)
    newHealth = Math.max(agent.health - damage, 0);

    // Increase heat by DEFAULTS.crimeHeatGainFailure[crimeType]
    newHeat = Math.min(agent.heat + DEFAULTS.crimeHeatGainFailure[validCrimeType], DEFAULTS.maxHeat);

    // Check if health hit 0 -> if so, set hospitalized
    hospitalized = newHealth === 0;

    // Update agent
    await ctx.db.patch(agent._id, {
      health: newHealth,
      heat: newHeat,
      status: hospitalized ? "hospitalized" : agent.status,
    });

    // Log CRIME_FAILED event
    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp,
      type: "CRIME_FAILED",
      agentId: agent._id,
      zoneId: agent.locationZoneId,
      entityId: targetBusinessId ?? null,
      payload: {
        crimeType: validCrimeType,
        damage,
        heatGain: DEFAULTS.crimeHeatGainFailure[validCrimeType],
        newHealth,
        newHeat,
        hospitalized,
        targetBusinessId: targetBusinessId ?? null,
      },
      requestId,
    });

    // If hospitalized, log additional event
    if (hospitalized) {
      await ctx.db.insert("events", {
        tick: world.tick,
        timestamp,
        type: "AGENT_HOSPITALIZED",
        agentId: agent._id,
        zoneId: agent.locationZoneId,
        entityId: null,
        payload: {
          reason: "CRIME_INJURY",
          crimeType: validCrimeType,
        },
        requestId,
      });
    }
  }

  // 8. Log CRIME_ATTEMPTED event with all details (for audit trail)
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp,
    type: "CRIME_ATTEMPTED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: targetBusinessId ?? null,
    payload: {
      crimeType: validCrimeType,
      targetBusinessId: targetBusinessId ?? null,
      successChance,
      succeeded,
      reward,
      damage,
      heatGain: succeeded
        ? DEFAULTS.crimeHeatGain[validCrimeType]
        : DEFAULTS.crimeHeatGainFailure[validCrimeType],
      hospitalized,
    },
    requestId,
  });

  // 9. Return success with outcome details
  return {
    ok: true,
    message: succeeded
      ? `${validCrimeType} succeeded! Earned $${reward}`
      : `${validCrimeType} failed! Took ${damage} damage`,
    result: {
      succeeded,
      crimeType: validCrimeType,
      targetBusinessId: targetBusinessId ?? null,
      successChance,
      reward,
      damage,
      newCash,
      newHealth,
      newHeat,
      hospitalized,
    },
  };
}

async function handleStartBusiness(
  actionCtx: ActionContext,
  args: ActionArgs["START_BUSINESS"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { type, name } = args;

  // 1. Validate business type
  if (!BUSINESS_TYPES.includes(type as BusinessType)) {
    return {
      ok: false,
      error: "INVALID_ACTION",
      message: `Invalid business type: ${type}. Valid types are: ${BUSINESS_TYPES.join(", ")}`,
    };
  }

  const businessType = type as BusinessType;
  const startupCost = BUSINESS_STARTUP_COSTS[businessType];

  // 2. Check agent has enough cash
  if (agent.cash < startupCost) {
    return {
      ok: false,
      error: "INSUFFICIENT_FUNDS",
      message: `${ERROR_CODES.INSUFFICIENT_FUNDS}. Need ${startupCost}, have ${agent.cash}`,
    };
  }

  // 3. Deduct startup cost from agent
  const newCash = agent.cash - startupCost;
  await ctx.db.patch(agent._id, {
    cash: newCash,
  });

  // 4. Create new business document
  const businessId = await ctx.db.insert("businesses", {
    ownerAgentId: agent._id,
    zoneId: agent.locationZoneId,
    type: businessType,
    name,
    cashOnHand: 0,
    inventory: [],
    reputation: 0,
    status: "open",
    metrics: {
      totalRevenue: 0,
      totalCustomers: 0,
    },
  });

  // 5. Log BUSINESS_STARTED event
  const eventId = await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "BUSINESS_STARTED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: businessId,
    payload: {
      businessId,
      businessType,
      businessName: name,
      startupCost,
    },
    requestId,
  });

  // 6. Record ledger entry (debit for startup cost)
  await ctx.db.insert("ledger", {
    tick: world.tick,
    agentId: agent._id,
    type: "debit",
    amount: startupCost,
    reason: "BUSINESS_STARTUP",
    balance: newCash,
    refEventId: eventId,
  });

  // 7. Return success with businessId
  return {
    ok: true,
    message: `Business "${name}" (${businessType}) started successfully`,
    result: {
      businessId,
      businessType,
      businessName: name,
      startupCost,
      remainingCash: newCash,
    },
  };
}

async function handleSetPrices(
  actionCtx: ActionContext,
  args: ActionArgs["SET_PRICES"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { businessId, prices } = args;

  // 1. Validate business exists
  const business = await ctx.db.get(businessId as Id<"businesses">);
  if (!business) {
    return {
      ok: false,
      error: "INVALID_BUSINESS",
      message: ERROR_CODES.INVALID_BUSINESS,
    };
  }

  // 2. Check agent owns the business
  if (business.ownerAgentId !== agent._id) {
    return {
      ok: false,
      error: "UNAUTHORIZED",
      message: "Agent does not own this business",
    };
  }

  // 3. Check agent is in correct zone
  if (business.zoneId !== agent.locationZoneId) {
    return {
      ok: false,
      error: "WRONG_ZONE",
      message: ERROR_CODES.WRONG_ZONE,
    };
  }

  // 4. Update prices in business inventory for each item in args.prices
  const updatedInventory = [...business.inventory];
  const priceUpdates: Array<{ itemSlug: string; oldPrice: number; newPrice: number }> = [];

  for (const priceUpdate of prices) {
    // Find the item by slug to get its ID
    const item = await ctx.db
      .query("items")
      .withIndex("by_slug", (q) => q.eq("slug", priceUpdate.itemSlug))
      .unique();

    if (!item) {
      return {
        ok: false,
        error: "INVALID_ITEM",
        message: `${ERROR_CODES.INVALID_ITEM}: ${priceUpdate.itemSlug}`,
      };
    }

    // Find the item in business inventory
    const inventoryIndex = updatedInventory.findIndex((inv) => inv.itemId === item._id);
    if (inventoryIndex !== -1) {
      const oldPrice = updatedInventory[inventoryIndex].price;
      updatedInventory[inventoryIndex] = {
        ...updatedInventory[inventoryIndex],
        price: priceUpdate.price,
      };
      priceUpdates.push({
        itemSlug: priceUpdate.itemSlug,
        oldPrice,
        newPrice: priceUpdate.price,
      });
    }
    // If item not in inventory, we skip it (can't set price for item not in stock)
  }

  // Update business with new inventory (prices)
  await ctx.db.patch(business._id, {
    inventory: updatedInventory,
  });

  // 5. Log PRICES_SET event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "PRICES_SET",
    agentId: agent._id,
    zoneId: business.zoneId,
    entityId: business._id,
    payload: {
      businessId: business._id,
      priceUpdates,
    },
    requestId,
  });

  // 6. Return success
  return {
    ok: true,
    message: `Prices updated for ${priceUpdates.length} item(s)`,
    result: {
      businessId: business._id,
      priceUpdates,
    },
  };
}

async function handleStockBusiness(
  actionCtx: ActionContext,
  args: ActionArgs["STOCK_BUSINESS"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { businessId, itemSlug, qty } = args;

  // 1. Validate business exists
  const business = await ctx.db.get(businessId as Id<"businesses">);
  if (!business) {
    return {
      ok: false,
      error: "INVALID_BUSINESS",
      message: ERROR_CODES.INVALID_BUSINESS,
    };
  }

  // 2. Check agent owns the business
  if (business.ownerAgentId !== agent._id) {
    return {
      ok: false,
      error: "UNAUTHORIZED",
      message: "Agent does not own this business",
    };
  }

  // 3. Check agent is in correct zone
  if (business.zoneId !== agent.locationZoneId) {
    return {
      ok: false,
      error: "WRONG_ZONE",
      message: ERROR_CODES.WRONG_ZONE,
    };
  }

  // 4. Find the item by slug
  const item = await ctx.db
    .query("items")
    .withIndex("by_slug", (q) => q.eq("slug", itemSlug))
    .unique();

  if (!item) {
    return {
      ok: false,
      error: "INVALID_ITEM",
      message: `${ERROR_CODES.INVALID_ITEM}: ${itemSlug}`,
    };
  }

  // 5. Check agent has item in inventory with sufficient qty
  const agentInventoryIndex = agent.inventory.findIndex((inv) => inv.itemId === item._id);
  if (agentInventoryIndex === -1) {
    return {
      ok: false,
      error: "INSUFFICIENT_INVENTORY",
      message: `${ERROR_CODES.INSUFFICIENT_INVENTORY}: Agent does not have ${itemSlug}`,
    };
  }

  const agentItemQty = agent.inventory[agentInventoryIndex].qty;
  if (agentItemQty < qty) {
    return {
      ok: false,
      error: "INSUFFICIENT_INVENTORY",
      message: `${ERROR_CODES.INSUFFICIENT_INVENTORY}: Agent has ${agentItemQty} ${itemSlug}, need ${qty}`,
    };
  }

  // 6. Remove items from agent inventory
  const updatedAgentInventory = [...agent.inventory];
  if (agentItemQty === qty) {
    // Remove the item entirely
    updatedAgentInventory.splice(agentInventoryIndex, 1);
  } else {
    // Decrease quantity
    updatedAgentInventory[agentInventoryIndex] = {
      ...updatedAgentInventory[agentInventoryIndex],
      qty: agentItemQty - qty,
    };
  }

  await ctx.db.patch(agent._id, {
    inventory: updatedAgentInventory,
  });

  // 7. Add items to business inventory
  const updatedBusinessInventory = [...business.inventory];
  const businessInventoryIndex = updatedBusinessInventory.findIndex((inv) => inv.itemId === item._id);

  if (businessInventoryIndex !== -1) {
    // Item exists in business inventory, increase qty
    updatedBusinessInventory[businessInventoryIndex] = {
      ...updatedBusinessInventory[businessInventoryIndex],
      qty: updatedBusinessInventory[businessInventoryIndex].qty + qty,
    };
  } else {
    // Item doesn't exist, add new entry with default price from items table
    updatedBusinessInventory.push({
      itemId: item._id,
      qty,
      price: item.basePrice,
    });
  }

  await ctx.db.patch(business._id, {
    inventory: updatedBusinessInventory,
  });

  // 8. Log BUSINESS_STOCKED event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "BUSINESS_STOCKED",
    agentId: agent._id,
    zoneId: business.zoneId,
    entityId: business._id,
    payload: {
      businessId: business._id,
      itemId: item._id,
      itemSlug,
      qty,
      priceSet: businessInventoryIndex === -1 ? item.basePrice : updatedBusinessInventory[businessInventoryIndex].price,
    },
    requestId,
  });

  // 9. Return success
  return {
    ok: true,
    message: `Stocked ${qty} ${itemSlug} to business`,
    result: {
      businessId: business._id,
      itemId: item._id,
      itemSlug,
      qtyAdded: qty,
      businessInventoryQty: businessInventoryIndex !== -1
        ? updatedBusinessInventory[businessInventoryIndex].qty
        : qty,
    },
  };
}

async function handleUseItem(
  actionCtx: ActionContext,
  args: ActionArgs["USE_ITEM"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { itemSlug } = args;

  // 1. Validate item exists (query items table by slug)
  const item = await ctx.db
    .query("items")
    .withIndex("by_slug", (q) => q.eq("slug", itemSlug))
    .unique();

  if (!item) {
    return {
      ok: false,
      error: "INVALID_ITEM",
      message: `${ERROR_CODES.INVALID_ITEM}: ${itemSlug}`,
    };
  }

  // 2. Check agent has item in inventory
  const inventoryIndex = agent.inventory.findIndex((inv) => inv.itemId === item._id);
  if (inventoryIndex === -1 || agent.inventory[inventoryIndex].qty < 1) {
    return {
      ok: false,
      error: "INSUFFICIENT_INVENTORY",
      message: `${ERROR_CODES.INSUFFICIENT_INVENTORY}: Agent does not have ${itemSlug}`,
    };
  }

  // 3. Apply item effects immediately:
  const effects = item.effects;
  const effectsApplied: Record<string, { before: number; after: number; delta: number }> = {};

  // Calculate new values with caps
  let newHealth = agent.health;
  let newStamina = agent.stamina;
  let newHeat = agent.heat;

  // healthDelta: add to health (cap at 100)
  if (effects.healthDelta !== undefined) {
    const healthBefore = agent.health;
    newHealth = Math.min(100, Math.max(0, agent.health + effects.healthDelta));
    effectsApplied.health = {
      before: healthBefore,
      after: newHealth,
      delta: effects.healthDelta,
    };
  }

  // staminaDelta: add to stamina (cap at 100)
  if (effects.staminaDelta !== undefined) {
    const staminaBefore = agent.stamina;
    newStamina = Math.min(100, Math.max(0, agent.stamina + effects.staminaDelta));
    effectsApplied.stamina = {
      before: staminaBefore,
      after: newStamina,
      delta: effects.staminaDelta,
    };
  }

  // heatDelta: add to heat (cap at DEFAULTS.maxHeat)
  if (effects.heatDelta !== undefined) {
    const heatBefore = agent.heat;
    newHeat = Math.min(DEFAULTS.maxHeat, Math.max(0, agent.heat + effects.heatDelta));
    effectsApplied.heat = {
      before: heatBefore,
      after: newHeat,
      delta: effects.heatDelta,
    };
  }

  // 4. Remove 1 item from agent inventory
  const updatedInventory = [...agent.inventory];
  if (updatedInventory[inventoryIndex].qty === 1) {
    // Remove the item entirely
    updatedInventory.splice(inventoryIndex, 1);
  } else {
    // Decrease quantity by 1
    updatedInventory[inventoryIndex] = {
      ...updatedInventory[inventoryIndex],
      qty: updatedInventory[inventoryIndex].qty - 1,
    };
  }

  // Update agent with new stats and inventory
  await ctx.db.patch(agent._id, {
    health: newHealth,
    stamina: newStamina,
    heat: newHeat,
    inventory: updatedInventory,
  });

  // 5. Log ITEM_USED event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "ITEM_USED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: item._id,
    payload: {
      itemId: item._id,
      itemSlug,
      itemName: item.name,
      effectsApplied,
    },
    requestId,
  });

  // 6. Return success with effects applied
  return {
    ok: true,
    message: `Used ${item.name}`,
    result: {
      itemSlug,
      itemName: item.name,
      effectsApplied,
    },
  };
}
