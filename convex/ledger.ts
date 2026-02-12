import { v } from "convex/values";
import {
  internalMutation,
  query,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";

// Helper to get current tick from world singleton
async function getCurrentTick(ctx: MutationCtx | QueryCtx): Promise<number> {
  const world = await ctx.db.query("world").first();
  if (!world) {
    throw new Error("World not initialized");
  }
  return world.tick;
}

/**
 * Record a transaction in the ledger
 * Creates a ledger entry and updates the agent's cash balance
 */
export const recordTransaction = internalMutation({
  args: {
    agentId: v.id("agents"),
    type: v.union(v.literal("credit"), v.literal("debit")),
    amount: v.number(),
    reason: v.string(),
    refEventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const { agentId, type, amount, reason, refEventId } = args;

    // Get the agent
    const agent = await ctx.db.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Get current tick
    const tick = await getCurrentTick(ctx);

    // Calculate new balance
    const currentCash = agent.cash;
    const newBalance =
      type === "credit" ? currentCash + amount : currentCash - amount;

    // Update agent's cash
    await ctx.db.patch(agentId, { cash: newBalance });

    // Create ledger entry
    const ledgerEntryId = await ctx.db.insert("ledger", {
      tick,
      agentId,
      type,
      amount,
      reason,
      balance: newBalance,
      refEventId: refEventId ?? null,
    });

    // Return the ledger entry
    return {
      _id: ledgerEntryId,
      tick,
      agentId,
      type,
      amount,
      reason,
      balance: newBalance,
      refEventId: refEventId ?? null,
    };
  },
});

/**
 * Credit (add) money to an agent's account
 */
export const credit = internalMutation({
  args: {
    agentId: v.id("agents"),
    amount: v.number(),
    reason: v.string(),
    refEventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const { agentId, amount, reason, refEventId } = args;

    // Get the agent
    const agent = await ctx.db.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Get current tick
    const tick = await getCurrentTick(ctx);

    // Calculate new balance
    const newBalance = agent.cash + amount;

    // Update agent's cash
    await ctx.db.patch(agentId, { cash: newBalance });

    // Create ledger entry
    const ledgerEntryId = await ctx.db.insert("ledger", {
      tick,
      agentId,
      type: "credit",
      amount,
      reason,
      balance: newBalance,
      refEventId: refEventId ?? null,
    });

    return {
      _id: ledgerEntryId,
      tick,
      agentId,
      type: "credit" as const,
      amount,
      reason,
      balance: newBalance,
      refEventId: refEventId ?? null,
    };
  },
});

/**
 * Debit (remove) money from an agent's account
 * Throws if the agent has insufficient funds
 */
export const debit = internalMutation({
  args: {
    agentId: v.id("agents"),
    amount: v.number(),
    reason: v.string(),
    refEventId: v.optional(v.id("events")),
  },
  handler: async (ctx, args) => {
    const { agentId, amount, reason, refEventId } = args;

    // Get the agent
    const agent = await ctx.db.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Validate sufficient funds
    if (agent.cash < amount) {
      throw new Error(
        `Insufficient funds: agent has ${agent.cash}, needs ${amount}`
      );
    }

    // Get current tick
    const tick = await getCurrentTick(ctx);

    // Calculate new balance
    const newBalance = agent.cash - amount;

    // Update agent's cash
    await ctx.db.patch(agentId, { cash: newBalance });

    // Create ledger entry
    const ledgerEntryId = await ctx.db.insert("ledger", {
      tick,
      agentId,
      type: "debit",
      amount,
      reason,
      balance: newBalance,
      refEventId: refEventId ?? null,
    });

    return {
      _id: ledgerEntryId,
      tick,
      agentId,
      type: "debit" as const,
      amount,
      reason,
      balance: newBalance,
      refEventId: refEventId ?? null,
    };
  },
});

/**
 * Get transaction history for an agent
 * Returns entries sorted by tick descending (most recent first)
 */
export const getAgentLedger = query({
  args: {
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { agentId, limit = 50 } = args;

    const entries = await ctx.db
      .query("ledger")
      .withIndex("by_agentId", (q) => q.eq("agentId", agentId))
      .order("desc")
      .take(limit);

    return entries;
  },
});

/**
 * Get the current balance for an agent
 * Simply reads the agent's cash field
 */
export const getAgentBalance = query({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const { agentId } = args;

    const agent = await ctx.db.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    return agent.cash;
  },
});
