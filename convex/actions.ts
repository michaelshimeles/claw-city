/**
 * Agent Action Handlers for ClawCity
 * Routes and processes all agent actions (MOVE, TAKE_JOB, BUY, SELL, etc.)
 */

import { MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  ActionType,
  BUSINESS_TYPES,
  BusinessType,
  CRIME_TYPES,
  CrimeType,
  DEFAULTS,
  ERROR_CODES,
  ErrorCode,
  SOCIAL_DEFAULTS,
  COOP_CRIME_TYPES,
  CoopCrimeType,
  PROPERTY_CONFIG,
  PropertyType,
  GangRole,
} from "./lib/constants";
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
  // Social action args
  SEND_FRIEND_REQUEST: { targetAgentId: string };
  RESPOND_FRIEND_REQUEST: { friendshipId: string; accept: boolean };
  REMOVE_FRIEND: { targetAgentId: string };
  CREATE_GANG: { name: string; tag: string; color: string };
  INVITE_TO_GANG: { targetAgentId: string };
  RESPOND_GANG_INVITE: { inviteId: string; accept: boolean };
  LEAVE_GANG: Record<string, never>;
  KICK_FROM_GANG: { targetAgentId: string };
  PROMOTE_MEMBER: { targetAgentId: string };
  DEMOTE_MEMBER: { targetAgentId: string };
  CONTRIBUTE_TO_GANG: { amount: number };
  CLAIM_TERRITORY: { zoneId: string };
  INITIATE_COOP_CRIME: { crimeType: string; targetBusinessId?: string };
  JOIN_COOP_ACTION: { coopActionId: string };
  BUY_PROPERTY: { propertyId: string };
  SELL_PROPERTY: { propertyId: string };
  RENT_PROPERTY: { propertyId: string };
  INVITE_RESIDENT: { propertyId: string; targetAgentId: string };
  EVICT_RESIDENT: { propertyId: string; targetAgentId: string };
  GIFT_CASH: { targetAgentId: string; amount: number };
  GIFT_ITEM: { targetAgentId: string; itemSlug: string; qty: number };
  ROB_AGENT: { targetAgentId: string };
  BETRAY_GANG: Record<string, never>;
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
    // Social actions - Friendships
    case "SEND_FRIEND_REQUEST":
      return handleSendFriendRequest(actionCtx, args as ActionArgs["SEND_FRIEND_REQUEST"]);
    case "RESPOND_FRIEND_REQUEST":
      return handleRespondFriendRequest(actionCtx, args as ActionArgs["RESPOND_FRIEND_REQUEST"]);
    case "REMOVE_FRIEND":
      return handleRemoveFriend(actionCtx, args as ActionArgs["REMOVE_FRIEND"]);
    // Social actions - Gangs
    case "CREATE_GANG":
      return handleCreateGang(actionCtx, args as ActionArgs["CREATE_GANG"]);
    case "INVITE_TO_GANG":
      return handleInviteToGang(actionCtx, args as ActionArgs["INVITE_TO_GANG"]);
    case "RESPOND_GANG_INVITE":
      return handleRespondGangInvite(actionCtx, args as ActionArgs["RESPOND_GANG_INVITE"]);
    case "LEAVE_GANG":
      return handleLeaveGang(actionCtx, args as ActionArgs["LEAVE_GANG"]);
    case "KICK_FROM_GANG":
      return handleKickFromGang(actionCtx, args as ActionArgs["KICK_FROM_GANG"]);
    case "PROMOTE_MEMBER":
      return handlePromoteMember(actionCtx, args as ActionArgs["PROMOTE_MEMBER"]);
    case "DEMOTE_MEMBER":
      return handleDemoteMember(actionCtx, args as ActionArgs["DEMOTE_MEMBER"]);
    case "CONTRIBUTE_TO_GANG":
      return handleContributeToGang(actionCtx, args as ActionArgs["CONTRIBUTE_TO_GANG"]);
    // Social actions - Territories
    case "CLAIM_TERRITORY":
      return handleClaimTerritory(actionCtx, args as ActionArgs["CLAIM_TERRITORY"]);
    // Social actions - Cooperative crimes
    case "INITIATE_COOP_CRIME":
      return handleInitiateCoopCrime(actionCtx, args as ActionArgs["INITIATE_COOP_CRIME"]);
    case "JOIN_COOP_ACTION":
      return handleJoinCoopAction(actionCtx, args as ActionArgs["JOIN_COOP_ACTION"]);
    // Social actions - Properties
    case "BUY_PROPERTY":
      return handleBuyProperty(actionCtx, args as ActionArgs["BUY_PROPERTY"]);
    case "SELL_PROPERTY":
      return handleSellProperty(actionCtx, args as ActionArgs["SELL_PROPERTY"]);
    case "RENT_PROPERTY":
      return handleRentProperty(actionCtx, args as ActionArgs["RENT_PROPERTY"]);
    case "INVITE_RESIDENT":
      return handleInviteResident(actionCtx, args as ActionArgs["INVITE_RESIDENT"]);
    case "EVICT_RESIDENT":
      return handleEvictResident(actionCtx, args as ActionArgs["EVICT_RESIDENT"]);
    // Social actions - PvP & Social
    case "GIFT_CASH":
      return handleGiftCash(actionCtx, args as ActionArgs["GIFT_CASH"]);
    case "GIFT_ITEM":
      return handleGiftItem(actionCtx, args as ActionArgs["GIFT_ITEM"]);
    case "ROB_AGENT":
      return handleRobAgent(actionCtx, args as ActionArgs["ROB_AGENT"]);
    case "BETRAY_GANG":
      return handleBetrayGang(actionCtx, args as ActionArgs["BETRAY_GANG"]);
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

// ============================================================================
// SOCIAL ACTION HANDLERS - FRIENDSHIPS
// ============================================================================

/**
 * Helper to get ordered agent IDs for friendship (lower ID always first)
 */
function getOrderedAgentIds(
  id1: Id<"agents">,
  id2: Id<"agents">
): [Id<"agents">, Id<"agents">] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

/**
 * Helper to find an existing friendship between two agents
 */
async function findFriendship(
  ctx: MutationCtx,
  agent1Id: Id<"agents">,
  agent2Id: Id<"agents">
): Promise<Doc<"friendships"> | null> {
  const [orderedId1, orderedId2] = getOrderedAgentIds(agent1Id, agent2Id);
  const friendships = await ctx.db
    .query("friendships")
    .withIndex("by_agent1Id", (q) => q.eq("agent1Id", orderedId1))
    .collect();
  return friendships.find((f) => f.agent2Id === orderedId2) ?? null;
}

async function handleSendFriendRequest(
  actionCtx: ActionContext,
  args: ActionArgs["SEND_FRIEND_REQUEST"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { targetAgentId } = args;

  // 1. Validate target agent exists
  let targetAgent: Doc<"agents"> | null = null;
  try {
    targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);
  } catch {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  if (!targetAgent) {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  // 2. Cannot friend yourself
  if (targetAgent._id === agent._id) {
    return { ok: false, error: "CANNOT_FRIEND_SELF", message: ERROR_CODES.CANNOT_FRIEND_SELF };
  }

  // 3. Must be in same zone
  if (targetAgent.locationZoneId !== agent.locationZoneId) {
    return { ok: false, error: "AGENT_NOT_IN_ZONE", message: ERROR_CODES.AGENT_NOT_IN_ZONE };
  }

  // 4. Check for existing friendship
  const existingFriendship = await findFriendship(ctx, agent._id, targetAgent._id);
  if (existingFriendship) {
    if (existingFriendship.status === "accepted") {
      return { ok: false, error: "ALREADY_FRIENDS", message: ERROR_CODES.ALREADY_FRIENDS };
    }
    if (existingFriendship.status === "pending") {
      return { ok: false, error: "FRIEND_REQUEST_EXISTS", message: ERROR_CODES.FRIEND_REQUEST_EXISTS };
    }
    // blocked - can't send request
    return { ok: false, error: "FRIENDSHIP_NOT_FOUND", message: "Cannot send request - blocked" };
  }

  // 5. Create friendship record
  const [agent1Id, agent2Id] = getOrderedAgentIds(agent._id, targetAgent._id);
  const friendshipId = await ctx.db.insert("friendships", {
    agent1Id,
    agent2Id,
    status: "pending",
    initiatorId: agent._id,
    strength: 0,
    loyalty: 0,
    lastInteractionTick: world.tick,
    createdAt: Date.now(),
  });

  // 6. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "FRIEND_REQUEST_SENT",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: friendshipId,
    payload: {
      targetAgentId: targetAgent._id,
      targetAgentName: targetAgent.name,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Friend request sent to ${targetAgent.name}`,
    result: { friendshipId, targetAgentId: targetAgent._id, targetAgentName: targetAgent.name },
  };
}

async function handleRespondFriendRequest(
  actionCtx: ActionContext,
  args: ActionArgs["RESPOND_FRIEND_REQUEST"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { friendshipId, accept } = args;

  // 1. Get friendship
  let friendship: Doc<"friendships"> | null = null;
  try {
    friendship = await ctx.db.get(friendshipId as Id<"friendships">);
  } catch {
    return { ok: false, error: "INVALID_FRIENDSHIP", message: ERROR_CODES.INVALID_FRIENDSHIP };
  }

  if (!friendship) {
    return { ok: false, error: "FRIENDSHIP_NOT_FOUND", message: ERROR_CODES.FRIENDSHIP_NOT_FOUND };
  }

  // 2. Verify agent is the recipient (not the initiator)
  const isRecipient =
    (friendship.agent1Id === agent._id || friendship.agent2Id === agent._id) &&
    friendship.initiatorId !== agent._id;

  if (!isRecipient) {
    return { ok: false, error: "UNAUTHORIZED", message: "You are not the recipient of this request" };
  }

  // 3. Must be pending
  if (friendship.status !== "pending") {
    return { ok: false, error: "FRIENDSHIP_NOT_FOUND", message: "Request already handled" };
  }

  // 4. Get initiator info for response
  const initiator = await ctx.db.get(friendship.initiatorId);

  if (accept) {
    // Accept - update friendship status and set initial strength/loyalty
    await ctx.db.patch(friendship._id, {
      status: "accepted",
      strength: SOCIAL_DEFAULTS.friendshipInitialStrength,
      loyalty: SOCIAL_DEFAULTS.friendshipInitialLoyalty,
      lastInteractionTick: world.tick,
    });

    // Update both agents' socialStats
    const agentSocialStats = agent.socialStats ?? {
      totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
    };
    await ctx.db.patch(agent._id, {
      socialStats: { ...agentSocialStats, totalFriends: agentSocialStats.totalFriends + 1 },
    });

    if (initiator) {
      const initiatorSocialStats = initiator.socialStats ?? {
        totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
      };
      await ctx.db.patch(initiator._id, {
        socialStats: { ...initiatorSocialStats, totalFriends: initiatorSocialStats.totalFriends + 1 },
      });
    }

    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp: Date.now(),
      type: "FRIEND_REQUEST_ACCEPTED",
      agentId: agent._id,
      zoneId: agent.locationZoneId,
      entityId: friendship._id,
      payload: { initiatorId: friendship.initiatorId, initiatorName: initiator?.name },
      requestId,
    });

    return {
      ok: true,
      message: `You are now friends with ${initiator?.name ?? "unknown"}`,
      result: { friendshipId: friendship._id, initiatorName: initiator?.name },
    };
  } else {
    // Decline - delete the friendship
    await ctx.db.delete(friendship._id);

    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp: Date.now(),
      type: "FRIEND_REQUEST_DECLINED",
      agentId: agent._id,
      zoneId: agent.locationZoneId,
      entityId: null,
      payload: { initiatorId: friendship.initiatorId, initiatorName: initiator?.name },
      requestId,
    });

    return {
      ok: true,
      message: `Friend request from ${initiator?.name ?? "unknown"} declined`,
      result: { initiatorName: initiator?.name },
    };
  }
}

async function handleRemoveFriend(
  actionCtx: ActionContext,
  args: ActionArgs["REMOVE_FRIEND"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { targetAgentId } = args;

  // 1. Find friendship
  const friendship = await findFriendship(ctx, agent._id, targetAgentId as Id<"agents">);
  if (!friendship || friendship.status !== "accepted") {
    return { ok: false, error: "FRIENDSHIP_NOT_FOUND", message: ERROR_CODES.FRIENDSHIP_NOT_FOUND };
  }

  // 2. Get target agent info
  const targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);

  // 3. Delete friendship
  await ctx.db.delete(friendship._id);

  // 4. Update both agents' socialStats
  const agentSocialStats = agent.socialStats ?? {
    totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
  };
  await ctx.db.patch(agent._id, {
    socialStats: { ...agentSocialStats, totalFriends: Math.max(0, agentSocialStats.totalFriends - 1) },
  });

  if (targetAgent) {
    const targetSocialStats = targetAgent.socialStats ?? {
      totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
    };
    await ctx.db.patch(targetAgent._id, {
      socialStats: { ...targetSocialStats, totalFriends: Math.max(0, targetSocialStats.totalFriends - 1) },
    });
  }

  // 5. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "FRIEND_REMOVED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: null,
    payload: { targetAgentId, targetAgentName: targetAgent?.name },
    requestId,
  });

  return {
    ok: true,
    message: `Friendship with ${targetAgent?.name ?? "unknown"} ended`,
    result: { targetAgentId, targetAgentName: targetAgent?.name },
  };
}

// ============================================================================
// SOCIAL ACTION HANDLERS - GANGS
// ============================================================================

async function handleCreateGang(
  actionCtx: ActionContext,
  args: ActionArgs["CREATE_GANG"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { name, tag, color } = args;

  // 1. Check agent not already in a gang
  if (agent.gangId) {
    return { ok: false, error: "ALREADY_IN_GANG", message: ERROR_CODES.ALREADY_IN_GANG };
  }

  // 2. Check gang ban
  if (agent.gangBanUntilTick && agent.gangBanUntilTick > world.tick) {
    return { ok: false, error: "GANG_BAN_ACTIVE", message: `${ERROR_CODES.GANG_BAN_ACTIVE} until tick ${agent.gangBanUntilTick}` };
  }

  // 3. Validate name and tag
  if (name.length < SOCIAL_DEFAULTS.gangNameMinLength || name.length > SOCIAL_DEFAULTS.gangNameMaxLength) {
    return { ok: false, error: "INVALID_ACTION", message: `Gang name must be ${SOCIAL_DEFAULTS.gangNameMinLength}-${SOCIAL_DEFAULTS.gangNameMaxLength} characters` };
  }
  if (tag.length < SOCIAL_DEFAULTS.gangTagMinLength || tag.length > SOCIAL_DEFAULTS.gangTagMaxLength) {
    return { ok: false, error: "INVALID_ACTION", message: `Gang tag must be ${SOCIAL_DEFAULTS.gangTagMinLength}-${SOCIAL_DEFAULTS.gangTagMaxLength} characters` };
  }

  // 4. Check sufficient funds
  if (agent.cash < SOCIAL_DEFAULTS.gangCreationCost) {
    return { ok: false, error: "INSUFFICIENT_FUNDS", message: `${ERROR_CODES.INSUFFICIENT_FUNDS}. Need $${SOCIAL_DEFAULTS.gangCreationCost}` };
  }

  // 5. Create gang
  const gangId = await ctx.db.insert("gangs", {
    name,
    tag: tag.toUpperCase(),
    color,
    leaderId: agent._id,
    treasury: 0,
    reputation: 0,
    homeZoneId: agent.locationZoneId,
    createdAt: Date.now(),
    memberCount: 1,
  });

  // 6. Create gang member record
  await ctx.db.insert("gangMembers", {
    gangId,
    agentId: agent._id,
    role: "leader",
    joinedAt: Date.now(),
    contributedTotal: 0,
  });

  // 7. Update agent
  const newCash = agent.cash - SOCIAL_DEFAULTS.gangCreationCost;
  await ctx.db.patch(agent._id, {
    gangId,
    cash: newCash,
  });

  // 8. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "GANG_CREATED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: gangId,
    payload: { gangName: name, gangTag: tag, cost: SOCIAL_DEFAULTS.gangCreationCost },
    requestId,
  });

  // 9. Ledger entry
  await ctx.db.insert("ledger", {
    tick: world.tick,
    agentId: agent._id,
    type: "debit",
    amount: SOCIAL_DEFAULTS.gangCreationCost,
    reason: "GANG_CREATION",
    balance: newCash,
    refEventId: null,
  });

  return {
    ok: true,
    message: `Gang "${name}" [${tag}] created`,
    result: { gangId, gangName: name, gangTag: tag, cost: SOCIAL_DEFAULTS.gangCreationCost },
  };
}

async function handleInviteToGang(
  actionCtx: ActionContext,
  args: ActionArgs["INVITE_TO_GANG"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { targetAgentId } = args;

  // 1. Check agent is in a gang
  if (!agent.gangId) {
    return { ok: false, error: "NOT_IN_GANG", message: ERROR_CODES.NOT_IN_GANG };
  }

  // 2. Get membership and check if officer
  const membership = await ctx.db
    .query("gangMembers")
    .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
    .first();

  if (!membership || (membership.role !== "leader" && membership.role !== "lieutenant")) {
    return { ok: false, error: "NOT_GANG_OFFICER", message: ERROR_CODES.NOT_GANG_OFFICER };
  }

  // 3. Validate target agent
  let targetAgent: Doc<"agents"> | null = null;
  try {
    targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);
  } catch {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  if (!targetAgent) {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  // 4. Target must be in same zone
  if (targetAgent.locationZoneId !== agent.locationZoneId) {
    return { ok: false, error: "AGENT_NOT_IN_ZONE", message: ERROR_CODES.AGENT_NOT_IN_ZONE };
  }

  // 5. Target cannot already be in a gang
  if (targetAgent.gangId) {
    return { ok: false, error: "TARGET_IN_GANG", message: ERROR_CODES.TARGET_IN_GANG };
  }

  // 6. Check for existing invite
  const existingInvite = await ctx.db
    .query("gangInvites")
    .withIndex("by_inviteeId", (q) => q.eq("inviteeId", targetAgent._id))
    .first();

  if (existingInvite && existingInvite.gangId === agent.gangId) {
    return { ok: false, error: "ALREADY_INVITED", message: ERROR_CODES.ALREADY_INVITED };
  }

  // 7. Create invite
  const inviteId = await ctx.db.insert("gangInvites", {
    gangId: agent.gangId,
    inviterId: agent._id,
    inviteeId: targetAgent._id,
    createdAt: Date.now(),
    expiresAt: Date.now() + (SOCIAL_DEFAULTS.gangInviteExpiration * world.tickMs),
  });

  // 8. Get gang info for response
  const gang = await ctx.db.get(agent.gangId);

  // 9. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "GANG_INVITE_SENT",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: inviteId,
    payload: {
      gangId: agent.gangId,
      gangName: gang?.name,
      targetAgentId: targetAgent._id,
      targetAgentName: targetAgent.name,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Invited ${targetAgent.name} to ${gang?.name ?? "the gang"}`,
    result: { inviteId, targetAgentId: targetAgent._id, targetAgentName: targetAgent.name },
  };
}

async function handleRespondGangInvite(
  actionCtx: ActionContext,
  args: ActionArgs["RESPOND_GANG_INVITE"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { inviteId, accept } = args;

  // 1. Get invite
  let invite: Doc<"gangInvites"> | null = null;
  try {
    invite = await ctx.db.get(inviteId as Id<"gangInvites">);
  } catch {
    return { ok: false, error: "GANG_INVITE_NOT_FOUND", message: ERROR_CODES.GANG_INVITE_NOT_FOUND };
  }

  if (!invite) {
    return { ok: false, error: "GANG_INVITE_NOT_FOUND", message: ERROR_CODES.GANG_INVITE_NOT_FOUND };
  }

  // 2. Verify agent is invitee
  if (invite.inviteeId !== agent._id) {
    return { ok: false, error: "UNAUTHORIZED", message: "You are not the invitee" };
  }

  // 3. Check not expired
  if (invite.expiresAt < Date.now()) {
    await ctx.db.delete(invite._id);
    return { ok: false, error: "GANG_INVITE_NOT_FOUND", message: "Invite expired" };
  }

  // 4. Check agent not already in gang
  if (agent.gangId) {
    return { ok: false, error: "ALREADY_IN_GANG", message: ERROR_CODES.ALREADY_IN_GANG };
  }

  // 5. Check gang ban
  if (agent.gangBanUntilTick && agent.gangBanUntilTick > world.tick) {
    return { ok: false, error: "GANG_BAN_ACTIVE", message: `${ERROR_CODES.GANG_BAN_ACTIVE} until tick ${agent.gangBanUntilTick}` };
  }

  // Get gang info
  const gang = await ctx.db.get(invite.gangId);
  if (!gang) {
    await ctx.db.delete(invite._id);
    return { ok: false, error: "INVALID_GANG", message: ERROR_CODES.INVALID_GANG };
  }

  // Delete the invite regardless of response
  await ctx.db.delete(invite._id);

  if (accept) {
    // Create membership
    await ctx.db.insert("gangMembers", {
      gangId: gang._id,
      agentId: agent._id,
      role: "member",
      joinedAt: Date.now(),
      contributedTotal: 0,
    });

    // Update agent
    await ctx.db.patch(agent._id, { gangId: gang._id });

    // Update gang member count
    await ctx.db.patch(gang._id, { memberCount: gang.memberCount + 1 });

    // Log event
    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp: Date.now(),
      type: "GANG_JOINED",
      agentId: agent._id,
      zoneId: agent.locationZoneId,
      entityId: gang._id,
      payload: { gangId: gang._id, gangName: gang.name },
      requestId,
    });

    return {
      ok: true,
      message: `Joined ${gang.name}`,
      result: { gangId: gang._id, gangName: gang.name, role: "member" },
    };
  } else {
    // Log decline event
    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp: Date.now(),
      type: "GANG_INVITE_DECLINED",
      agentId: agent._id,
      zoneId: agent.locationZoneId,
      entityId: null,
      payload: { gangId: gang._id, gangName: gang.name },
      requestId,
    });

    return {
      ok: true,
      message: `Declined invite to ${gang.name}`,
      result: { gangName: gang.name },
    };
  }
}

async function handleLeaveGang(
  actionCtx: ActionContext,
  _args: ActionArgs["LEAVE_GANG"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;

  // 1. Check in gang
  if (!agent.gangId) {
    return { ok: false, error: "NOT_IN_GANG", message: ERROR_CODES.NOT_IN_GANG };
  }

  // 2. Get gang and membership
  const gang = await ctx.db.get(agent.gangId);
  if (!gang) {
    // Gang doesn't exist, just clear agent's gangId
    await ctx.db.patch(agent._id, { gangId: undefined });
    return { ok: true, message: "Left gang (gang no longer exists)", result: {} };
  }

  const membership = await ctx.db
    .query("gangMembers")
    .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
    .first();

  // 3. If leader, disband gang or transfer leadership
  if (gang.leaderId === agent._id) {
    // Find another member to promote
    const otherMembers = await ctx.db
      .query("gangMembers")
      .withIndex("by_gangId", (q) => q.eq("gangId", gang._id))
      .collect();

    const otherMember = otherMembers.find((m) => m.agentId !== agent._id);

    if (otherMember) {
      // Transfer leadership
      await ctx.db.patch(gang._id, { leaderId: otherMember.agentId });
      await ctx.db.patch(otherMember._id, { role: "leader" });
    } else {
      // Disband gang - delete all related data
      // Delete territories
      const territories = await ctx.db.query("territories").withIndex("by_gangId", (q) => q.eq("gangId", gang._id)).collect();
      for (const t of territories) {
        await ctx.db.delete(t._id);
      }
      // Delete invites
      const invites = await ctx.db.query("gangInvites").withIndex("by_gangId", (q) => q.eq("gangId", gang._id)).collect();
      for (const i of invites) {
        await ctx.db.delete(i._id);
      }
      // Delete gang
      await ctx.db.delete(gang._id);

      await ctx.db.insert("events", {
        tick: world.tick,
        timestamp: Date.now(),
        type: "GANG_DISBANDED",
        agentId: agent._id,
        zoneId: agent.locationZoneId,
        entityId: null,
        payload: { gangName: gang.name },
        requestId,
      });
    }
  }

  // 4. Delete membership
  if (membership) {
    await ctx.db.delete(membership._id);
  }

  // 5. Update gang member count (if gang still exists)
  if (gang && gang.leaderId !== agent._id) {
    await ctx.db.patch(gang._id, { memberCount: Math.max(0, gang.memberCount - 1) });
  }

  // 6. Update agent
  await ctx.db.patch(agent._id, { gangId: undefined });

  // 7. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "GANG_LEFT",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: gang._id,
    payload: { gangId: gang._id, gangName: gang.name },
    requestId,
  });

  return {
    ok: true,
    message: `Left ${gang.name}`,
    result: { gangName: gang.name },
  };
}

async function handleKickFromGang(
  actionCtx: ActionContext,
  args: ActionArgs["KICK_FROM_GANG"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { targetAgentId } = args;

  // 1. Check in gang
  if (!agent.gangId) {
    return { ok: false, error: "NOT_IN_GANG", message: ERROR_CODES.NOT_IN_GANG };
  }

  // 2. Get membership and check if officer
  const membership = await ctx.db
    .query("gangMembers")
    .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
    .first();

  if (!membership || (membership.role !== "leader" && membership.role !== "lieutenant")) {
    return { ok: false, error: "NOT_GANG_OFFICER", message: ERROR_CODES.NOT_GANG_OFFICER };
  }

  // 3. Cannot kick self
  if (targetAgentId === agent._id.toString()) {
    return { ok: false, error: "CANNOT_KICK_SELF", message: ERROR_CODES.CANNOT_KICK_SELF };
  }

  // 4. Get target membership
  const targetMembership = await ctx.db
    .query("gangMembers")
    .withIndex("by_agentId", (q) => q.eq("agentId", targetAgentId as Id<"agents">))
    .first();

  if (!targetMembership || targetMembership.gangId !== agent.gangId) {
    return { ok: false, error: "INVALID_AGENT", message: "Target not in your gang" };
  }

  // 5. Cannot kick leader
  if (targetMembership.role === "leader") {
    return { ok: false, error: "CANNOT_KICK_LEADER", message: ERROR_CODES.CANNOT_KICK_LEADER };
  }

  // 6. Lieutenant can only kick members/enforcers (not other lieutenants)
  if (membership.role === "lieutenant" && targetMembership.role === "lieutenant") {
    return { ok: false, error: "NOT_GANG_LEADER", message: "Only leader can kick lieutenants" };
  }

  // 7. Get target agent and gang info
  const targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);
  const gang = await ctx.db.get(agent.gangId);

  // 8. Delete target membership
  await ctx.db.delete(targetMembership._id);

  // 9. Update target agent
  if (targetAgent) {
    await ctx.db.patch(targetAgent._id, { gangId: undefined });
  }

  // 10. Update gang member count
  if (gang) {
    await ctx.db.patch(gang._id, { memberCount: Math.max(0, gang.memberCount - 1) });
  }

  // 11. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "GANG_MEMBER_KICKED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: gang?._id ?? null,
    payload: {
      gangName: gang?.name,
      targetAgentId,
      targetAgentName: targetAgent?.name,
      kickedBy: agent.name,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Kicked ${targetAgent?.name ?? "member"} from ${gang?.name ?? "gang"}`,
    result: { targetAgentId, targetAgentName: targetAgent?.name },
  };
}

async function handlePromoteMember(
  actionCtx: ActionContext,
  args: ActionArgs["PROMOTE_MEMBER"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { targetAgentId } = args;

  // 1. Check in gang and is leader
  if (!agent.gangId) {
    return { ok: false, error: "NOT_IN_GANG", message: ERROR_CODES.NOT_IN_GANG };
  }

  const gang = await ctx.db.get(agent.gangId);
  if (!gang || gang.leaderId !== agent._id) {
    return { ok: false, error: "NOT_GANG_LEADER", message: ERROR_CODES.NOT_GANG_LEADER };
  }

  // 2. Get target membership
  const targetMembership = await ctx.db
    .query("gangMembers")
    .withIndex("by_agentId", (q) => q.eq("agentId", targetAgentId as Id<"agents">))
    .first();

  if (!targetMembership || targetMembership.gangId !== agent.gangId) {
    return { ok: false, error: "INVALID_AGENT", message: "Target not in your gang" };
  }

  // 3. Determine new role
  const roleOrder: GangRole[] = ["member", "enforcer", "lieutenant"];
  const currentIndex = roleOrder.indexOf(targetMembership.role as GangRole);

  if (currentIndex === -1 || targetMembership.role === "leader") {
    return { ok: false, error: "CANNOT_PROMOTE_FURTHER", message: ERROR_CODES.CANNOT_PROMOTE_FURTHER };
  }

  if (currentIndex >= roleOrder.length - 1) {
    return { ok: false, error: "CANNOT_PROMOTE_FURTHER", message: ERROR_CODES.CANNOT_PROMOTE_FURTHER };
  }

  const newRole = roleOrder[currentIndex + 1];

  // 4. Update membership
  await ctx.db.patch(targetMembership._id, { role: newRole });

  // 5. Get target agent info
  const targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);

  // 6. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "GANG_MEMBER_PROMOTED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: gang._id,
    payload: {
      gangName: gang.name,
      targetAgentId,
      targetAgentName: targetAgent?.name,
      oldRole: targetMembership.role,
      newRole,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Promoted ${targetAgent?.name ?? "member"} to ${newRole}`,
    result: { targetAgentId, targetAgentName: targetAgent?.name, newRole },
  };
}

async function handleDemoteMember(
  actionCtx: ActionContext,
  args: ActionArgs["DEMOTE_MEMBER"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { targetAgentId } = args;

  // 1. Check in gang and is leader
  if (!agent.gangId) {
    return { ok: false, error: "NOT_IN_GANG", message: ERROR_CODES.NOT_IN_GANG };
  }

  const gang = await ctx.db.get(agent.gangId);
  if (!gang || gang.leaderId !== agent._id) {
    return { ok: false, error: "NOT_GANG_LEADER", message: ERROR_CODES.NOT_GANG_LEADER };
  }

  // 2. Get target membership
  const targetMembership = await ctx.db
    .query("gangMembers")
    .withIndex("by_agentId", (q) => q.eq("agentId", targetAgentId as Id<"agents">))
    .first();

  if (!targetMembership || targetMembership.gangId !== agent.gangId) {
    return { ok: false, error: "INVALID_AGENT", message: "Target not in your gang" };
  }

  // 3. Cannot demote leader
  if (targetMembership.role === "leader") {
    return { ok: false, error: "CANNOT_DEMOTE_LEADER", message: ERROR_CODES.CANNOT_DEMOTE_LEADER };
  }

  // 4. Determine new role
  const roleOrder: GangRole[] = ["member", "enforcer", "lieutenant"];
  const currentIndex = roleOrder.indexOf(targetMembership.role as GangRole);

  if (currentIndex <= 0) {
    return { ok: false, error: "INVALID_ROLE", message: "Cannot demote further" };
  }

  const newRole = roleOrder[currentIndex - 1];

  // 5. Update membership
  await ctx.db.patch(targetMembership._id, { role: newRole });

  // 6. Get target agent info
  const targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);

  // 7. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "GANG_MEMBER_DEMOTED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: gang._id,
    payload: {
      gangName: gang.name,
      targetAgentId,
      targetAgentName: targetAgent?.name,
      oldRole: targetMembership.role,
      newRole,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Demoted ${targetAgent?.name ?? "member"} to ${newRole}`,
    result: { targetAgentId, targetAgentName: targetAgent?.name, newRole },
  };
}

async function handleContributeToGang(
  actionCtx: ActionContext,
  args: ActionArgs["CONTRIBUTE_TO_GANG"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { amount } = args;

  // 1. Check in gang
  if (!agent.gangId) {
    return { ok: false, error: "NOT_IN_GANG", message: ERROR_CODES.NOT_IN_GANG };
  }

  // 2. Validate amount
  if (amount <= 0) {
    return { ok: false, error: "INVALID_ACTION", message: "Amount must be positive" };
  }

  if (agent.cash < amount) {
    return { ok: false, error: "INSUFFICIENT_FUNDS", message: ERROR_CODES.INSUFFICIENT_FUNDS };
  }

  // 3. Get gang and membership
  const gang = await ctx.db.get(agent.gangId);
  if (!gang) {
    return { ok: false, error: "INVALID_GANG", message: ERROR_CODES.INVALID_GANG };
  }

  const membership = await ctx.db
    .query("gangMembers")
    .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
    .first();

  // 4. Transfer funds
  const newCash = agent.cash - amount;
  await ctx.db.patch(agent._id, { cash: newCash });
  await ctx.db.patch(gang._id, { treasury: gang.treasury + amount });

  // 5. Update membership contribution total
  if (membership) {
    await ctx.db.patch(membership._id, {
      contributedTotal: membership.contributedTotal + amount,
    });
  }

  // 6. Log event
  const eventId = await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "GANG_CONTRIBUTION",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: gang._id,
    payload: {
      gangName: gang.name,
      amount,
      newTreasury: gang.treasury + amount,
    },
    requestId,
  });

  // 7. Ledger entry
  await ctx.db.insert("ledger", {
    tick: world.tick,
    agentId: agent._id,
    type: "debit",
    amount,
    reason: "GANG_CONTRIBUTION",
    balance: newCash,
    refEventId: eventId,
  });

  return {
    ok: true,
    message: `Contributed $${amount} to ${gang.name}`,
    result: { amount, newTreasury: gang.treasury + amount, gangName: gang.name },
  };
}

// ============================================================================
// SOCIAL ACTION HANDLERS - TERRITORIES
// ============================================================================

async function handleClaimTerritory(
  actionCtx: ActionContext,
  args: ActionArgs["CLAIM_TERRITORY"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { zoneId } = args;

  // 1. Check in gang and is officer
  if (!agent.gangId) {
    return { ok: false, error: "NOT_IN_GANG", message: ERROR_CODES.NOT_IN_GANG };
  }

  const membership = await ctx.db
    .query("gangMembers")
    .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
    .first();

  if (!membership || (membership.role !== "leader" && membership.role !== "lieutenant")) {
    return { ok: false, error: "NOT_GANG_OFFICER", message: ERROR_CODES.NOT_GANG_OFFICER };
  }

  // 2. Validate zone
  let zone: Doc<"zones"> | null = null;
  try {
    zone = await ctx.db.get(zoneId as Id<"zones">);
  } catch {
    return { ok: false, error: "INVALID_ZONE", message: ERROR_CODES.INVALID_ZONE };
  }

  if (!zone) {
    return { ok: false, error: "INVALID_ZONE", message: ERROR_CODES.INVALID_ZONE };
  }

  // 3. Agent must be in zone
  if (agent.locationZoneId !== zone._id) {
    return { ok: false, error: "WRONG_ZONE", message: ERROR_CODES.WRONG_ZONE };
  }

  // 4. Check existing territory
  const existingTerritory = await ctx.db
    .query("territories")
    .withIndex("by_zoneId", (q) => q.eq("zoneId", zone._id))
    .first();

  if (existingTerritory) {
    if (existingTerritory.gangId === agent.gangId) {
      return { ok: false, error: "TERRITORY_ALREADY_CLAIMED", message: ERROR_CODES.TERRITORY_ALREADY_CLAIMED };
    }
    // Check if contestable (control < 50%)
    if (existingTerritory.controlStrength >= SOCIAL_DEFAULTS.territoryWeakThreshold) {
      return { ok: false, error: "TERRITORY_NOT_CONTESTABLE", message: `${ERROR_CODES.TERRITORY_NOT_CONTESTABLE}. Control at ${existingTerritory.controlStrength}%` };
    }
    // Contest - take over
    await ctx.db.patch(existingTerritory._id, {
      gangId: agent.gangId,
      controlStrength: 50,
      claimedAt: Date.now(),
      lastDefendedTick: world.tick,
    });
  }

  // 5. Check gang treasury
  const gang = await ctx.db.get(agent.gangId);
  if (!gang) {
    return { ok: false, error: "INVALID_GANG", message: ERROR_CODES.INVALID_GANG };
  }

  if (gang.treasury < SOCIAL_DEFAULTS.territoryClaimCost) {
    return { ok: false, error: "INSUFFICIENT_FUNDS", message: `Gang treasury needs $${SOCIAL_DEFAULTS.territoryClaimCost}` };
  }

  // 6. Deduct from treasury
  await ctx.db.patch(gang._id, {
    treasury: gang.treasury - SOCIAL_DEFAULTS.territoryClaimCost,
  });

  // 7. Create or update territory
  if (!existingTerritory) {
    await ctx.db.insert("territories", {
      zoneId: zone._id,
      gangId: agent.gangId,
      controlStrength: 50,
      incomePerTick: SOCIAL_DEFAULTS.territoryBaseIncome,
      claimedAt: Date.now(),
      lastDefendedTick: world.tick,
    });
  }

  // 8. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: existingTerritory ? "TERRITORY_CONTESTED" : "TERRITORY_CLAIMED",
    agentId: agent._id,
    zoneId: zone._id,
    entityId: gang._id,
    payload: {
      gangName: gang.name,
      zoneName: zone.name,
      cost: SOCIAL_DEFAULTS.territoryClaimCost,
      previousGangId: existingTerritory?.gangId,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Claimed territory in ${zone.name} for ${gang.name}`,
    result: {
      zoneId: zone._id,
      zoneName: zone.name,
      gangName: gang.name,
      cost: SOCIAL_DEFAULTS.territoryClaimCost,
    },
  };
}

// ============================================================================
// SOCIAL ACTION HANDLERS - COOPERATIVE CRIMES
// ============================================================================

async function handleInitiateCoopCrime(
  actionCtx: ActionContext,
  args: ActionArgs["INITIATE_COOP_CRIME"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { crimeType, targetBusinessId } = args;

  // 1. Validate crime type
  const validCoopTypes = ["THEFT", "ROBBERY", "SMUGGLING"];
  if (!validCoopTypes.includes(crimeType)) {
    return { ok: false, error: "INVALID_CRIME_TYPE", message: `${ERROR_CODES.INVALID_CRIME_TYPE}: ${crimeType}` };
  }

  // 2. Validate target business if provided
  if (targetBusinessId) {
    const targetBusiness = await ctx.db.get(targetBusinessId as Id<"businesses">);
    if (!targetBusiness) {
      return { ok: false, error: "INVALID_BUSINESS", message: ERROR_CODES.INVALID_BUSINESS };
    }
    if (targetBusiness.zoneId !== agent.locationZoneId) {
      return { ok: false, error: "WRONG_ZONE", message: "Target business not in your zone" };
    }
  }

  // 3. Create coop action
  const coopActionId = await ctx.db.insert("coopActions", {
    initiatorId: agent._id,
    type: `COOP_${crimeType}` as CoopCrimeType,
    targetBusinessId: targetBusinessId ? (targetBusinessId as Id<"businesses">) : undefined,
    zoneId: agent.locationZoneId,
    status: "recruiting",
    participantIds: [agent._id],
    minParticipants: SOCIAL_DEFAULTS.coopMinParticipants,
    maxParticipants: SOCIAL_DEFAULTS.coopMaxParticipants,
    createdAt: Date.now(),
    expiresAt: Date.now() + (SOCIAL_DEFAULTS.coopCrimeExpiration * world.tickMs),
  });

  // 4. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "COOP_CRIME_INITIATED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: coopActionId,
    payload: {
      crimeType,
      targetBusinessId,
      minParticipants: SOCIAL_DEFAULTS.coopMinParticipants,
      maxParticipants: SOCIAL_DEFAULTS.coopMaxParticipants,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Initiated cooperative ${crimeType}. Recruiting ${SOCIAL_DEFAULTS.coopMinParticipants}-${SOCIAL_DEFAULTS.coopMaxParticipants} participants.`,
    result: {
      coopActionId,
      crimeType,
      status: "recruiting",
      participantCount: 1,
      minParticipants: SOCIAL_DEFAULTS.coopMinParticipants,
      maxParticipants: SOCIAL_DEFAULTS.coopMaxParticipants,
    },
  };
}

async function handleJoinCoopAction(
  actionCtx: ActionContext,
  args: ActionArgs["JOIN_COOP_ACTION"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { coopActionId } = args;

  // 1. Get coop action
  let coopAction: Doc<"coopActions"> | null = null;
  try {
    coopAction = await ctx.db.get(coopActionId as Id<"coopActions">);
  } catch {
    return { ok: false, error: "COOP_ACTION_NOT_FOUND", message: ERROR_CODES.COOP_ACTION_NOT_FOUND };
  }

  if (!coopAction) {
    return { ok: false, error: "COOP_ACTION_NOT_FOUND", message: ERROR_CODES.COOP_ACTION_NOT_FOUND };
  }

  // 2. Check status
  if (coopAction.status !== "recruiting") {
    return { ok: false, error: "COOP_ACTION_NOT_RECRUITING", message: ERROR_CODES.COOP_ACTION_NOT_RECRUITING };
  }

  // 3. Check not expired
  if (coopAction.expiresAt < Date.now()) {
    await ctx.db.patch(coopAction._id, { status: "cancelled" });
    return { ok: false, error: "COOP_ACTION_NOT_FOUND", message: "Coop action expired" };
  }

  // 4. Check not already participant
  if (coopAction.participantIds.includes(agent._id)) {
    return { ok: false, error: "ALREADY_IN_COOP", message: ERROR_CODES.ALREADY_IN_COOP };
  }

  // 5. Check zone
  if (coopAction.zoneId !== agent.locationZoneId) {
    return { ok: false, error: "WRONG_ZONE", message: ERROR_CODES.WRONG_ZONE };
  }

  // 6. Check capacity
  if (coopAction.participantIds.length >= coopAction.maxParticipants) {
    return { ok: false, error: "COOP_ACTION_FULL", message: ERROR_CODES.COOP_ACTION_FULL };
  }

  // 7. Add participant
  const newParticipantIds = [...coopAction.participantIds, agent._id];
  const newStatus =
    newParticipantIds.length >= coopAction.minParticipants ? "ready" : "recruiting";

  await ctx.db.patch(coopAction._id, {
    participantIds: newParticipantIds,
    status: newStatus,
  });

  // 8. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "COOP_CRIME_JOINED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: coopAction._id,
    payload: {
      coopActionId: coopAction._id,
      crimeType: coopAction.type,
      participantCount: newParticipantIds.length,
      status: newStatus,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Joined cooperative crime. ${newParticipantIds.length}/${coopAction.minParticipants} participants.`,
    result: {
      coopActionId: coopAction._id,
      participantCount: newParticipantIds.length,
      status: newStatus,
    },
  };
}

// ============================================================================
// SOCIAL ACTION HANDLERS - PROPERTIES
// ============================================================================

async function handleBuyProperty(
  actionCtx: ActionContext,
  args: ActionArgs["BUY_PROPERTY"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { propertyId } = args;

  // 1. Get property
  let property: Doc<"properties"> | null = null;
  try {
    property = await ctx.db.get(propertyId as Id<"properties">);
  } catch {
    return { ok: false, error: "INVALID_PROPERTY", message: ERROR_CODES.INVALID_PROPERTY };
  }

  if (!property) {
    return { ok: false, error: "INVALID_PROPERTY", message: ERROR_CODES.INVALID_PROPERTY };
  }

  // 2. Check property is in agent's zone
  if (property.zoneId !== agent.locationZoneId) {
    return { ok: false, error: "WRONG_ZONE", message: ERROR_CODES.WRONG_ZONE };
  }

  // 3. Check property is not owned
  if (property.ownerId) {
    return { ok: false, error: "PROPERTY_OWNED", message: ERROR_CODES.PROPERTY_OWNED };
  }

  // 4. Check funds
  if (agent.cash < property.buyPrice) {
    return { ok: false, error: "INSUFFICIENT_FUNDS", message: `${ERROR_CODES.INSUFFICIENT_FUNDS}. Need $${property.buyPrice}` };
  }

  // 5. Transfer ownership
  const newCash = agent.cash - property.buyPrice;
  await ctx.db.patch(property._id, { ownerId: agent._id });
  await ctx.db.patch(agent._id, {
    cash: newCash,
    homePropertyId: agent.homePropertyId ?? property._id, // Set as home if no home
  });

  // 6. Create resident record
  await ctx.db.insert("propertyResidents", {
    propertyId: property._id,
    agentId: agent._id,
    isOwner: true,
    moveInAt: Date.now(),
  });

  // 7. Log event
  const eventId = await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "PROPERTY_PURCHASED",
    agentId: agent._id,
    zoneId: property.zoneId,
    entityId: property._id,
    payload: {
      propertyName: property.name,
      propertyType: property.type,
      price: property.buyPrice,
    },
    requestId,
  });

  // 8. Ledger entry
  await ctx.db.insert("ledger", {
    tick: world.tick,
    agentId: agent._id,
    type: "debit",
    amount: property.buyPrice,
    reason: "PROPERTY_PURCHASE",
    balance: newCash,
    refEventId: eventId,
  });

  return {
    ok: true,
    message: `Purchased ${property.name} for $${property.buyPrice}`,
    result: {
      propertyId: property._id,
      propertyName: property.name,
      propertyType: property.type,
      price: property.buyPrice,
    },
  };
}

async function handleSellProperty(
  actionCtx: ActionContext,
  args: ActionArgs["SELL_PROPERTY"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { propertyId } = args;

  // 1. Get property
  let property: Doc<"properties"> | null = null;
  try {
    property = await ctx.db.get(propertyId as Id<"properties">);
  } catch {
    return { ok: false, error: "INVALID_PROPERTY", message: ERROR_CODES.INVALID_PROPERTY };
  }

  if (!property) {
    return { ok: false, error: "INVALID_PROPERTY", message: ERROR_CODES.INVALID_PROPERTY };
  }

  // 2. Check ownership
  if (property.ownerId !== agent._id) {
    return { ok: false, error: "NOT_PROPERTY_OWNER", message: ERROR_CODES.NOT_PROPERTY_OWNER };
  }

  // 3. Sell for 80% of buy price
  const salePrice = Math.floor(property.buyPrice * 0.8);
  const newCash = agent.cash + salePrice;

  // 4. Remove all residents
  const residents = await ctx.db
    .query("propertyResidents")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", property._id))
    .collect();

  for (const resident of residents) {
    await ctx.db.delete(resident._id);
    // If this was their home, clear it
    const residentAgent = await ctx.db.get(resident.agentId);
    if (residentAgent && residentAgent.homePropertyId === property._id) {
      await ctx.db.patch(residentAgent._id, { homePropertyId: undefined });
    }
  }

  // 5. Clear ownership
  await ctx.db.patch(property._id, { ownerId: undefined });

  // 6. Update agent cash and clear home if this was it
  const updates: Partial<Doc<"agents">> = { cash: newCash };
  if (agent.homePropertyId === property._id) {
    updates.homePropertyId = undefined;
  }
  await ctx.db.patch(agent._id, updates);

  // 7. Log event
  const eventId = await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "PROPERTY_SOLD",
    agentId: agent._id,
    zoneId: property.zoneId,
    entityId: property._id,
    payload: {
      propertyName: property.name,
      propertyType: property.type,
      salePrice,
    },
    requestId,
  });

  // 8. Ledger entry
  await ctx.db.insert("ledger", {
    tick: world.tick,
    agentId: agent._id,
    type: "credit",
    amount: salePrice,
    reason: "PROPERTY_SALE",
    balance: newCash,
    refEventId: eventId,
  });

  return {
    ok: true,
    message: `Sold ${property.name} for $${salePrice}`,
    result: {
      propertyId: property._id,
      propertyName: property.name,
      salePrice,
    },
  };
}

async function handleRentProperty(
  actionCtx: ActionContext,
  args: ActionArgs["RENT_PROPERTY"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { propertyId } = args;

  // 1. Get property
  let property: Doc<"properties"> | null = null;
  try {
    property = await ctx.db.get(propertyId as Id<"properties">);
  } catch {
    return { ok: false, error: "INVALID_PROPERTY", message: ERROR_CODES.INVALID_PROPERTY };
  }

  if (!property) {
    return { ok: false, error: "INVALID_PROPERTY", message: ERROR_CODES.INVALID_PROPERTY };
  }

  // 2. Check property is in agent's zone
  if (property.zoneId !== agent.locationZoneId) {
    return { ok: false, error: "WRONG_ZONE", message: ERROR_CODES.WRONG_ZONE };
  }

  // 3. Check not already resident
  const existingResidency = await ctx.db
    .query("propertyResidents")
    .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
    .first();

  if (existingResidency && existingResidency.propertyId === property._id) {
    return { ok: false, error: "ALREADY_RESIDENT", message: ERROR_CODES.ALREADY_RESIDENT };
  }

  // 4. Check capacity
  const currentResidents = await ctx.db
    .query("propertyResidents")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", property._id))
    .collect();

  if (currentResidents.length >= property.capacity) {
    return { ok: false, error: "PROPERTY_AT_CAPACITY", message: ERROR_CODES.PROPERTY_AT_CAPACITY };
  }

  // 5. Pay first rent
  if (agent.cash < property.rentPrice) {
    return { ok: false, error: "INSUFFICIENT_FUNDS", message: `${ERROR_CODES.INSUFFICIENT_FUNDS}. Need $${property.rentPrice}` };
  }

  const newCash = agent.cash - property.rentPrice;
  await ctx.db.patch(agent._id, {
    cash: newCash,
    homePropertyId: agent.homePropertyId ?? property._id,
  });

  // 6. Create residency record
  const rentDueAt = world.tick + SOCIAL_DEFAULTS.rentDueInterval;
  await ctx.db.insert("propertyResidents", {
    propertyId: property._id,
    agentId: agent._id,
    isOwner: false,
    rentDueAt,
    moveInAt: Date.now(),
  });

  // 7. Pay owner if there is one
  if (property.ownerId) {
    const owner = await ctx.db.get(property.ownerId);
    if (owner) {
      await ctx.db.patch(owner._id, { cash: owner.cash + property.rentPrice });
    }
  }

  // 8. Log event
  const eventId = await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "PROPERTY_RENTED",
    agentId: agent._id,
    zoneId: property.zoneId,
    entityId: property._id,
    payload: {
      propertyName: property.name,
      propertyType: property.type,
      rentPrice: property.rentPrice,
      nextRentDue: rentDueAt,
    },
    requestId,
  });

  // 9. Ledger entry
  await ctx.db.insert("ledger", {
    tick: world.tick,
    agentId: agent._id,
    type: "debit",
    amount: property.rentPrice,
    reason: "RENT_PAYMENT",
    balance: newCash,
    refEventId: eventId,
  });

  return {
    ok: true,
    message: `Rented ${property.name} for $${property.rentPrice}/interval`,
    result: {
      propertyId: property._id,
      propertyName: property.name,
      rentPrice: property.rentPrice,
      nextRentDue: rentDueAt,
    },
  };
}

async function handleInviteResident(
  actionCtx: ActionContext,
  args: ActionArgs["INVITE_RESIDENT"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { propertyId, targetAgentId } = args;

  // 1. Get property
  let property: Doc<"properties"> | null = null;
  try {
    property = await ctx.db.get(propertyId as Id<"properties">);
  } catch {
    return { ok: false, error: "INVALID_PROPERTY", message: ERROR_CODES.INVALID_PROPERTY };
  }

  if (!property) {
    return { ok: false, error: "INVALID_PROPERTY", message: ERROR_CODES.INVALID_PROPERTY };
  }

  // 2. Check ownership
  if (property.ownerId !== agent._id) {
    return { ok: false, error: "NOT_PROPERTY_OWNER", message: ERROR_CODES.NOT_PROPERTY_OWNER };
  }

  // 3. Get target agent
  let targetAgent: Doc<"agents"> | null = null;
  try {
    targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);
  } catch {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  if (!targetAgent) {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  // 4. Check target in same zone
  if (targetAgent.locationZoneId !== property.zoneId) {
    return { ok: false, error: "AGENT_NOT_IN_ZONE", message: ERROR_CODES.AGENT_NOT_IN_ZONE };
  }

  // 5. Check capacity
  const currentResidents = await ctx.db
    .query("propertyResidents")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", property._id))
    .collect();

  if (currentResidents.length >= property.capacity) {
    return { ok: false, error: "PROPERTY_AT_CAPACITY", message: ERROR_CODES.PROPERTY_AT_CAPACITY };
  }

  // 6. Check not already resident
  const existingResidency = currentResidents.find((r) => r.agentId === targetAgent._id);
  if (existingResidency) {
    return { ok: false, error: "ALREADY_RESIDENT", message: ERROR_CODES.ALREADY_RESIDENT };
  }

  // 7. Add as resident (rent-free guest)
  await ctx.db.insert("propertyResidents", {
    propertyId: property._id,
    agentId: targetAgent._id,
    isOwner: false,
    moveInAt: Date.now(),
  });

  // 8. Update target's home if they don't have one
  if (!targetAgent.homePropertyId) {
    await ctx.db.patch(targetAgent._id, { homePropertyId: property._id });
  }

  // 9. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "RESIDENT_INVITED",
    agentId: agent._id,
    zoneId: property.zoneId,
    entityId: property._id,
    payload: {
      propertyName: property.name,
      targetAgentId: targetAgent._id,
      targetAgentName: targetAgent.name,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Invited ${targetAgent.name} to live at ${property.name}`,
    result: {
      propertyId: property._id,
      propertyName: property.name,
      targetAgentId: targetAgent._id,
      targetAgentName: targetAgent.name,
    },
  };
}

async function handleEvictResident(
  actionCtx: ActionContext,
  args: ActionArgs["EVICT_RESIDENT"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { propertyId, targetAgentId } = args;

  // 1. Get property
  let property: Doc<"properties"> | null = null;
  try {
    property = await ctx.db.get(propertyId as Id<"properties">);
  } catch {
    return { ok: false, error: "INVALID_PROPERTY", message: ERROR_CODES.INVALID_PROPERTY };
  }

  if (!property) {
    return { ok: false, error: "INVALID_PROPERTY", message: ERROR_CODES.INVALID_PROPERTY };
  }

  // 2. Check ownership
  if (property.ownerId !== agent._id) {
    return { ok: false, error: "NOT_PROPERTY_OWNER", message: ERROR_CODES.NOT_PROPERTY_OWNER };
  }

  // 3. Find residency
  const residency = await ctx.db
    .query("propertyResidents")
    .withIndex("by_propertyId", (q) => q.eq("propertyId", property._id))
    .collect();

  const targetResidency = residency.find((r) => r.agentId === (targetAgentId as Id<"agents">));
  if (!targetResidency) {
    return { ok: false, error: "NOT_RESIDENT", message: ERROR_CODES.NOT_RESIDENT };
  }

  // 4. Cannot evict self (owner)
  if (targetResidency.agentId === agent._id) {
    return { ok: false, error: "INVALID_ACTION", message: "Cannot evict yourself" };
  }

  // 5. Delete residency
  await ctx.db.delete(targetResidency._id);

  // 6. Update target's home if this was it
  const targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);
  if (targetAgent && targetAgent.homePropertyId === property._id) {
    await ctx.db.patch(targetAgent._id, { homePropertyId: undefined });
  }

  // 7. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "RESIDENT_EVICTED",
    agentId: agent._id,
    zoneId: property.zoneId,
    entityId: property._id,
    payload: {
      propertyName: property.name,
      targetAgentId,
      targetAgentName: targetAgent?.name,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Evicted ${targetAgent?.name ?? "resident"} from ${property.name}`,
    result: {
      propertyId: property._id,
      propertyName: property.name,
      targetAgentId,
      targetAgentName: targetAgent?.name,
    },
  };
}

// ============================================================================
// SOCIAL ACTION HANDLERS - PVP & SOCIAL
// ============================================================================

async function handleGiftCash(
  actionCtx: ActionContext,
  args: ActionArgs["GIFT_CASH"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { targetAgentId, amount } = args;

  // 1. Cannot gift to self
  if (targetAgentId === agent._id.toString()) {
    return { ok: false, error: "CANNOT_GIFT_SELF", message: ERROR_CODES.CANNOT_GIFT_SELF };
  }

  // 2. Validate amount
  if (amount < SOCIAL_DEFAULTS.giftCashMin || amount > SOCIAL_DEFAULTS.giftCashMax) {
    return { ok: false, error: "INVALID_ACTION", message: `Amount must be $${SOCIAL_DEFAULTS.giftCashMin}-$${SOCIAL_DEFAULTS.giftCashMax}` };
  }

  if (agent.cash < amount) {
    return { ok: false, error: "INSUFFICIENT_FUNDS", message: ERROR_CODES.INSUFFICIENT_FUNDS };
  }

  // 3. Get target agent
  let targetAgent: Doc<"agents"> | null = null;
  try {
    targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);
  } catch {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  if (!targetAgent) {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  // 4. Target must be in same zone
  if (targetAgent.locationZoneId !== agent.locationZoneId) {
    return { ok: false, error: "AGENT_NOT_IN_ZONE", message: ERROR_CODES.AGENT_NOT_IN_ZONE };
  }

  // 5. Transfer cash
  const newCash = agent.cash - amount;
  await ctx.db.patch(agent._id, { cash: newCash });
  await ctx.db.patch(targetAgent._id, { cash: targetAgent.cash + amount });

  // 6. Update social stats
  const agentSocialStats = agent.socialStats ?? {
    totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
  };
  await ctx.db.patch(agent._id, {
    socialStats: { ...agentSocialStats, giftsGiven: agentSocialStats.giftsGiven + 1 },
  });

  const targetSocialStats = targetAgent.socialStats ?? {
    totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
  };
  await ctx.db.patch(targetAgent._id, {
    socialStats: { ...targetSocialStats, giftsReceived: targetSocialStats.giftsReceived + 1 },
  });

  // 7. Strengthen friendship if exists
  const friendship = await findFriendship(ctx, agent._id, targetAgent._id);
  if (friendship && friendship.status === "accepted") {
    const newStrength = Math.min(100, friendship.strength + 5);
    await ctx.db.patch(friendship._id, {
      strength: newStrength,
      lastInteractionTick: world.tick,
    });
  }

  // 8. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "CASH_GIFTED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: null,
    payload: {
      targetAgentId: targetAgent._id,
      targetAgentName: targetAgent.name,
      amount,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Gifted $${amount} to ${targetAgent.name}`,
    result: {
      targetAgentId: targetAgent._id,
      targetAgentName: targetAgent.name,
      amount,
      newCash,
    },
  };
}

async function handleGiftItem(
  actionCtx: ActionContext,
  args: ActionArgs["GIFT_ITEM"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { targetAgentId, itemSlug, qty } = args;

  // 1. Cannot gift to self
  if (targetAgentId === agent._id.toString()) {
    return { ok: false, error: "CANNOT_GIFT_SELF", message: ERROR_CODES.CANNOT_GIFT_SELF };
  }

  // 2. Get item
  const item = await ctx.db
    .query("items")
    .withIndex("by_slug", (q) => q.eq("slug", itemSlug))
    .first();

  if (!item) {
    return { ok: false, error: "INVALID_ITEM", message: ERROR_CODES.INVALID_ITEM };
  }

  // 3. Check agent has item
  const inventoryIndex = agent.inventory.findIndex((inv) => inv.itemId === item._id);
  if (inventoryIndex === -1 || agent.inventory[inventoryIndex].qty < qty) {
    return { ok: false, error: "INSUFFICIENT_INVENTORY", message: ERROR_CODES.INSUFFICIENT_INVENTORY };
  }

  // 4. Get target agent
  let targetAgent: Doc<"agents"> | null = null;
  try {
    targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);
  } catch {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  if (!targetAgent) {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  // 5. Target must be in same zone
  if (targetAgent.locationZoneId !== agent.locationZoneId) {
    return { ok: false, error: "AGENT_NOT_IN_ZONE", message: ERROR_CODES.AGENT_NOT_IN_ZONE };
  }

  // 6. Transfer item
  // Remove from agent
  const agentInventory = [...agent.inventory];
  if (agentInventory[inventoryIndex].qty === qty) {
    agentInventory.splice(inventoryIndex, 1);
  } else {
    agentInventory[inventoryIndex] = {
      ...agentInventory[inventoryIndex],
      qty: agentInventory[inventoryIndex].qty - qty,
    };
  }
  await ctx.db.patch(agent._id, { inventory: agentInventory });

  // Add to target
  const targetInventory = [...targetAgent.inventory];
  const targetIndex = targetInventory.findIndex((inv) => inv.itemId === item._id);
  if (targetIndex === -1) {
    targetInventory.push({ itemId: item._id, qty });
  } else {
    targetInventory[targetIndex] = {
      ...targetInventory[targetIndex],
      qty: targetInventory[targetIndex].qty + qty,
    };
  }
  await ctx.db.patch(targetAgent._id, { inventory: targetInventory });

  // 7. Update social stats
  const agentSocialStats = agent.socialStats ?? {
    totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
  };
  await ctx.db.patch(agent._id, {
    socialStats: { ...agentSocialStats, giftsGiven: agentSocialStats.giftsGiven + 1 },
  });

  const targetSocialStats = targetAgent.socialStats ?? {
    totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
  };
  await ctx.db.patch(targetAgent._id, {
    socialStats: { ...targetSocialStats, giftsReceived: targetSocialStats.giftsReceived + 1 },
  });

  // 8. Strengthen friendship if exists
  const friendship = await findFriendship(ctx, agent._id, targetAgent._id);
  if (friendship && friendship.status === "accepted") {
    const newStrength = Math.min(100, friendship.strength + 5);
    await ctx.db.patch(friendship._id, {
      strength: newStrength,
      lastInteractionTick: world.tick,
    });
  }

  // 9. Log event
  await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "ITEM_GIFTED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: item._id,
    payload: {
      targetAgentId: targetAgent._id,
      targetAgentName: targetAgent.name,
      itemSlug,
      itemName: item.name,
      qty,
    },
    requestId,
  });

  return {
    ok: true,
    message: `Gifted ${qty}x ${item.name} to ${targetAgent.name}`,
    result: {
      targetAgentId: targetAgent._id,
      targetAgentName: targetAgent.name,
      itemSlug,
      itemName: item.name,
      qty,
    },
  };
}

async function handleRobAgent(
  actionCtx: ActionContext,
  args: ActionArgs["ROB_AGENT"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;
  const { targetAgentId } = args;

  // 1. Cannot rob self
  if (targetAgentId === agent._id.toString()) {
    return { ok: false, error: "CANNOT_ROB_SELF", message: ERROR_CODES.CANNOT_ROB_SELF };
  }

  // 2. Get target agent
  let targetAgent: Doc<"agents"> | null = null;
  try {
    targetAgent = await ctx.db.get(targetAgentId as Id<"agents">);
  } catch {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  if (!targetAgent) {
    return { ok: false, error: "INVALID_AGENT", message: ERROR_CODES.INVALID_AGENT };
  }

  // 3. Target must be in same zone
  if (targetAgent.locationZoneId !== agent.locationZoneId) {
    return { ok: false, error: "AGENT_NOT_IN_ZONE", message: ERROR_CODES.AGENT_NOT_IN_ZONE };
  }

  // 4. Target must be idle (can't rob busy/jailed/hospitalized)
  if (targetAgent.status !== "idle") {
    return { ok: false, error: "INVALID_AGENT", message: "Target is not vulnerable (not idle)" };
  }

  // 5. Calculate success chance
  const baseSuccess = SOCIAL_DEFAULTS.robBaseSuccess;
  const combatBonus = agent.skills.combat * SOCIAL_DEFAULTS.robCombatSkillBonus;
  const stealthBonus = agent.skills.stealth * SOCIAL_DEFAULTS.robStealthSkillBonus;
  const successChance = Math.min(0.95, baseSuccess + combatBonus + stealthBonus);

  // 6. Roll for success
  const rng = createTickRng(world.seed, world.tick);
  const succeeded = rng.randomChance(successChance);

  // 7. Apply heat regardless of outcome
  const newHeat = Math.min(DEFAULTS.maxHeat, agent.heat + SOCIAL_DEFAULTS.robHeat);
  await ctx.db.patch(agent._id, { heat: newHeat });

  const timestamp = Date.now();

  if (succeeded) {
    // Calculate stolen amount
    const stealPercent = SOCIAL_DEFAULTS.robCashStealMin +
      rng.random() * (SOCIAL_DEFAULTS.robCashStealMax - SOCIAL_DEFAULTS.robCashStealMin);
    const stolenAmount = Math.floor(targetAgent.cash * stealPercent);

    // Transfer cash
    const newCash = agent.cash + stolenAmount;
    await ctx.db.patch(agent._id, { cash: newCash });
    await ctx.db.patch(targetAgent._id, { cash: targetAgent.cash - stolenAmount });

    // Log event
    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp,
      type: "AGENT_ROBBED",
      agentId: agent._id,
      zoneId: agent.locationZoneId,
      entityId: null,
      payload: {
        targetAgentId: targetAgent._id,
        targetAgentName: targetAgent.name,
        stolenAmount,
        successChance,
      },
      requestId,
    });

    // Also log event for victim
    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp,
      type: "AGENT_ROBBED",
      agentId: targetAgent._id,
      zoneId: targetAgent.locationZoneId,
      entityId: null,
      payload: {
        robberId: agent._id,
        robberName: agent.name,
        stolenAmount,
        isVictim: true,
      },
      requestId: null,
    });

    return {
      ok: true,
      message: `Robbed $${stolenAmount} from ${targetAgent.name}!`,
      result: {
        success: true,
        targetAgentId: targetAgent._id,
        targetAgentName: targetAgent.name,
        stolenAmount,
        newCash,
        newHeat,
        successChance,
      },
    };
  } else {
    // Failed - take damage
    const damage = rng.randomInt(SOCIAL_DEFAULTS.robFailureDamageMin, SOCIAL_DEFAULTS.robFailureDamageMax);
    const newHealth = Math.max(0, agent.health - damage);
    const hospitalized = newHealth === 0;

    await ctx.db.patch(agent._id, {
      health: newHealth,
      status: hospitalized ? "hospitalized" : agent.status,
    });

    // Log event
    await ctx.db.insert("events", {
      tick: world.tick,
      timestamp,
      type: "ROB_ATTEMPT_FAILED",
      agentId: agent._id,
      zoneId: agent.locationZoneId,
      entityId: null,
      payload: {
        targetAgentId: targetAgent._id,
        targetAgentName: targetAgent.name,
        damage,
        hospitalized,
        successChance,
      },
      requestId,
    });

    return {
      ok: true,
      message: `Rob attempt failed! Took ${damage} damage.`,
      result: {
        success: false,
        targetAgentId: targetAgent._id,
        targetAgentName: targetAgent.name,
        damage,
        newHealth,
        hospitalized,
        newHeat,
        successChance,
      },
    };
  }
}

async function handleBetrayGang(
  actionCtx: ActionContext,
  _args: ActionArgs["BETRAY_GANG"]
): Promise<ActionResult> {
  const { ctx, agent, world, requestId } = actionCtx;

  // 1. Check in gang
  if (!agent.gangId) {
    return { ok: false, error: "NOT_IN_GANG", message: ERROR_CODES.NOT_IN_GANG };
  }

  // 2. Get gang
  const gang = await ctx.db.get(agent.gangId);
  if (!gang) {
    await ctx.db.patch(agent._id, { gangId: undefined });
    return { ok: false, error: "INVALID_GANG", message: ERROR_CODES.INVALID_GANG };
  }

  // 3. Calculate stolen amount
  const stolenAmount = Math.floor(gang.treasury * SOCIAL_DEFAULTS.betrayTreasurySteal);

  // 4. Get membership
  const membership = await ctx.db
    .query("gangMembers")
    .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
    .first();

  // 5. Delete membership
  if (membership) {
    await ctx.db.delete(membership._id);
  }

  // 6. Update gang
  await ctx.db.patch(gang._id, {
    treasury: gang.treasury - stolenAmount,
    memberCount: Math.max(0, gang.memberCount - 1),
  });

  // 7. If was leader, transfer or disband
  if (gang.leaderId === agent._id) {
    const otherMembers = await ctx.db
      .query("gangMembers")
      .withIndex("by_gangId", (q) => q.eq("gangId", gang._id))
      .collect();

    const otherMember = otherMembers.find((m) => m.agentId !== agent._id);
    if (otherMember) {
      await ctx.db.patch(gang._id, { leaderId: otherMember.agentId });
      await ctx.db.patch(otherMember._id, { role: "leader" });
    } else {
      // Disband
      const territories = await ctx.db.query("territories").withIndex("by_gangId", (q) => q.eq("gangId", gang._id)).collect();
      for (const t of territories) {
        await ctx.db.delete(t._id);
      }
      const invites = await ctx.db.query("gangInvites").withIndex("by_gangId", (q) => q.eq("gangId", gang._id)).collect();
      for (const i of invites) {
        await ctx.db.delete(i._id);
      }
      await ctx.db.delete(gang._id);
    }
  }

  // 8. Update agent
  const newCash = agent.cash + stolenAmount;
  const newReputation = agent.reputation - SOCIAL_DEFAULTS.betrayReputationPenalty;
  const newHeat = Math.min(DEFAULTS.maxHeat, agent.heat + SOCIAL_DEFAULTS.betrayHeat);
  const gangBanUntilTick = world.tick + SOCIAL_DEFAULTS.betrayGangBanDuration;

  const agentSocialStats = agent.socialStats ?? {
    totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
  };

  await ctx.db.patch(agent._id, {
    gangId: undefined,
    cash: newCash,
    reputation: newReputation,
    heat: newHeat,
    gangBanUntilTick,
    socialStats: { ...agentSocialStats, betrayals: agentSocialStats.betrayals + 1 },
  });

  // 9. Log event (public!)
  const eventId = await ctx.db.insert("events", {
    tick: world.tick,
    timestamp: Date.now(),
    type: "GANG_BETRAYED",
    agentId: agent._id,
    zoneId: agent.locationZoneId,
    entityId: gang._id,
    payload: {
      gangName: gang.name,
      stolenAmount,
      reputationPenalty: SOCIAL_DEFAULTS.betrayReputationPenalty,
      banDuration: SOCIAL_DEFAULTS.betrayGangBanDuration,
    },
    requestId,
  });

  // 10. Ledger entry
  await ctx.db.insert("ledger", {
    tick: world.tick,
    agentId: agent._id,
    type: "credit",
    amount: stolenAmount,
    reason: "GANG_BETRAYAL",
    balance: newCash,
    refEventId: eventId,
  });

  return {
    ok: true,
    message: `Betrayed ${gang.name}! Stole $${stolenAmount} but lost ${SOCIAL_DEFAULTS.betrayReputationPenalty} reputation.`,
    result: {
      gangName: gang.name,
      stolenAmount,
      reputationPenalty: SOCIAL_DEFAULTS.betrayReputationPenalty,
      newReputation,
      newHeat,
      gangBanUntilTick,
    },
  };
}
