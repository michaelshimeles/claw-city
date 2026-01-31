/**
 * Tax System Utilities for ClawCity
 * Calculates agent wealth and tax owed using progressive brackets
 */

import { QueryCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { TAX_DEFAULTS } from "./constants";

/**
 * Calculate an agent's total wealth
 * Sum of: cash + inventory value + property value + business value
 */
export async function calculateAgentWealth(
  ctx: QueryCtx,
  agent: Doc<"agents">
): Promise<number> {
  let totalWealth = agent.cash;

  // Add inventory value (based on base item prices)
  for (const inv of agent.inventory) {
    const item = await ctx.db.get(inv.itemId);
    if (item) {
      totalWealth += item.basePrice * inv.qty;
    }
  }

  // Add owned property value
  if (agent.homePropertyId) {
    const property = await ctx.db.get(agent.homePropertyId);
    if (property && property.ownerId === agent._id) {
      totalWealth += property.buyPrice;
    }
  }

  // Also check for any other properties owned by this agent
  const ownedProperties = await ctx.db
    .query("properties")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", agent._id))
    .collect();

  for (const property of ownedProperties) {
    // Don't double-count homePropertyId
    if (property._id !== agent.homePropertyId) {
      totalWealth += property.buyPrice;
    }
  }

  // Add business value (cash on hand + inventory value)
  const ownedBusinesses = await ctx.db
    .query("businesses")
    .withIndex("by_ownerAgentId", (q) => q.eq("ownerAgentId", agent._id))
    .collect();

  for (const business of ownedBusinesses) {
    totalWealth += business.cashOnHand;
    for (const inv of business.inventory) {
      const item = await ctx.db.get(inv.itemId);
      if (item) {
        totalWealth += item.basePrice * inv.qty;
      }
    }
  }

  return totalWealth;
}

/**
 * Calculate tax owed using progressive brackets
 * Each bracket applies only to the portion of wealth within that bracket
 */
export function calculateTaxOwed(wealth: number): number {
  const brackets = TAX_DEFAULTS.taxBrackets;
  let tax = 0;
  let previousThreshold = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const nextThreshold = brackets[i + 1]?.threshold ?? Infinity;

    if (wealth <= bracket.threshold) {
      break;
    }

    // Calculate the taxable amount in this bracket
    const taxableInBracket = Math.min(wealth, nextThreshold) - Math.max(bracket.threshold, previousThreshold);

    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate;
    }

    previousThreshold = bracket.threshold;
  }

  return Math.floor(tax);
}

/**
 * Get effective tax rate for a given wealth level
 */
export function getEffectiveTaxRate(wealth: number): number {
  if (wealth <= 0) return 0;
  const tax = calculateTaxOwed(wealth);
  return tax / wealth;
}

/**
 * Get marginal tax rate for a given wealth level
 */
export function getMarginalTaxRate(wealth: number): number {
  const brackets = TAX_DEFAULTS.taxBrackets;

  // Find the bracket this wealth falls into
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (wealth >= brackets[i].threshold) {
      return brackets[i].rate;
    }
  }

  return brackets[0].rate;
}
