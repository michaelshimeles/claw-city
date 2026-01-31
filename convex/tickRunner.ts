/**
 * Tick Runner Action for ClawCity
 * Separated from crons.ts to avoid circular type references
 */

import { internal } from "./_generated/api";
import { ActionCtx, internalAction } from "./_generated/server";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type WorldStatus = {
  status: "running" | "paused";
  tick: number;
  seed: string;
  config: {
    startingCash: number;
    startingZone: string;
    heatDecayIdle: number;
    heatDecayBusy: number;
    arrestThreshold: number;
    maxHeat: number;
  };
} | null;

type TickResult = {
  tick: number;
  seed: string;
  config: {
    startingCash: number;
    startingZone: string;
    heatDecayIdle: number;
    heatDecayBusy: number;
    arrestThreshold: number;
    maxHeat: number;
  };
  previousTick: number;
};

type BusyResult = { resolved: number };
type HeatResult = { processed: number };
type ArrestResult = { arrests: number; checks: number };
type TerritoryResult = { processed: number; totalIncome: number; decayed: number };
type RentResult = { payments: number; evictions: number };
type CoopResult = { executed: number; cancelled: number };
type FriendshipResult = { decayed: number; removed: number };

type TickRunResult =
  | { skipped: true; reason: string }
  | {
      skipped: false;
      tick: number;
      resolved: number;
      heatDecayProcessed: number;
      arrests: number;
      arrestChecks: number;
      territoryIncome: number;
      rentPayments: number;
      coopActionsProcessed: number;
    };

// ============================================================================
// TICK RUNNER ACTION
// ============================================================================

async function runTickHandler(ctx: ActionCtx): Promise<TickRunResult> {
  // 1. Check if world is running
  const world: WorldStatus = await ctx.runQuery(internal.tickHelpers.getWorldStatus);
  if (!world || world.status !== "running") {
    return {
      skipped: true,
      reason: world ? "World is paused" : "World not initialized",
    };
  }

  // 2. Increment tick
  const tickResult: TickResult = await ctx.runMutation(internal.world.incrementTick);

  // 3. Resolve busy agents
  const busyResult: BusyResult = await ctx.runMutation(internal.tickHelpers.resolveBusyAgents);

  // 4. Process heat decay
  const heatResult: HeatResult = await ctx.runMutation(internal.tickHelpers.processHeatDecay);

  // 5. Run arrest checks
  const arrestResult: ArrestResult = await ctx.runMutation(internal.tickHelpers.runArrestChecks, {
    seed: tickResult.seed,
    tick: tickResult.tick,
  });

  // 6. Process territory income
  const territoryResult: TerritoryResult = await ctx.runMutation(internal.tickHelpers.processTerritoryIncome);

  // 7. Process rent payments
  const rentResult: RentResult = await ctx.runMutation(internal.tickHelpers.processRentPayments);

  // 8. Process cooperative actions
  const coopResult: CoopResult = await ctx.runMutation(internal.tickHelpers.processCoopActions, {
    seed: tickResult.seed,
    tick: tickResult.tick,
  });

  // 9. Process friendship decay
  const _friendshipResult: FriendshipResult = await ctx.runMutation(internal.tickHelpers.processFriendshipDecay);

  // 10. Log tick event
  await ctx.runMutation(internal.tickHelpers.logTickEvent, {
    tick: tickResult.tick,
    resolvedAgents: busyResult.resolved,
    heatDecayProcessed: heatResult.processed,
    arrestsCount: arrestResult.arrests,
    arrestChecks: arrestResult.checks,
    territoryIncome: territoryResult.totalIncome,
    rentPayments: rentResult.payments,
    coopActionsProcessed: coopResult.executed,
  });

  return {
    skipped: false,
    tick: tickResult.tick,
    resolved: busyResult.resolved,
    heatDecayProcessed: heatResult.processed,
    arrests: arrestResult.arrests,
    arrestChecks: arrestResult.checks,
    territoryIncome: territoryResult.totalIncome,
    rentPayments: rentResult.payments,
    coopActionsProcessed: coopResult.executed,
  };
}

/**
 * Main tick runner action
 * This is called by the cron job every minute
 */
export const runTick = internalAction({
  args: {},
  handler: runTickHandler,
});
