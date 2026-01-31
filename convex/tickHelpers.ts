/**
 * Tick Helper Mutations for ClawCity
 * These are internal mutations called by the tick runner action
 * Separated to avoid circular type references
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { createTickRng } from "./lib/rng";
import { DEFAULTS } from "./lib/constants";

/**
 * Query to get world status for the tick runner
 */
export const getWorldStatus = internalQuery({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      return null;
    }
    return {
      status: world.status,
      tick: world.tick,
      seed: world.seed,
      config: world.config,
    };
  },
});

/**
 * Resolve busy agents whose busyUntilTick has been reached
 */
export const resolveBusyAgents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      return { resolved: 0 };
    }

    const currentTick = world.tick;

    // Find all busy agents whose busy period has ended
    const busyAgents = await ctx.db
      .query("agents")
      .withIndex("by_status", (q) => q.eq("status", "busy"))
      .collect();

    let resolvedCount = 0;

    for (const agent of busyAgents) {
      if (agent.busyUntilTick !== null && agent.busyUntilTick <= currentTick) {
        // Check what action they were doing
        const busyAction = agent.busyAction;
        let newCash = agent.cash;
        let newStats = { ...agent.stats };

        // Handle job completion - pay wages
        if (busyAction && busyAction.startsWith("JOB:")) {
          const jobId = busyAction.replace("JOB:", "") as Id<"jobs">;
          try {
            const job = await ctx.db.get(jobId) as Doc<"jobs"> | null;
            if (job) {
              // Pay wages
              newCash = agent.cash + job.wage;
              newStats.lifetimeEarnings = (agent.stats.lifetimeEarnings || 0) + job.wage;
              newStats.jobsCompleted = (agent.stats.jobsCompleted || 0) + 1;

              // Log JOB_COMPLETED event
              await ctx.db.insert("events", {
                tick: currentTick,
                timestamp: Date.now(),
                type: "JOB_COMPLETED",
                agentId: agent._id,
                zoneId: job.zoneId,
                entityId: job._id,
                payload: {
                  jobId: job._id,
                  jobTitle: job.title,
                  wage: job.wage,
                  newCash,
                },
                requestId: null,
              });

              // Log in ledger
              await ctx.db.insert("ledger", {
                tick: currentTick,
                agentId: agent._id,
                type: "credit",
                amount: job.wage,
                reason: "JOB_WAGE",
                balance: newCash,
                refEventId: null,
              });
            }
          } catch (e) {
            // Job may have been deleted, just continue
          }
        }

        // Handle MOVE completion - update agent location
        if (busyAction && busyAction.startsWith("MOVE:")) {
          const toZoneSlug = busyAction.replace("MOVE:", "");
          try {
            const zone = await ctx.db
              .query("zones")
              .withIndex("by_slug", (q) => q.eq("slug", toZoneSlug))
              .first();
            if (zone) {
              // Update agent location
              await ctx.db.patch(agent._id, {
                locationZoneId: zone._id,
              });

              // Log MOVE_COMPLETED event
              await ctx.db.insert("events", {
                tick: currentTick,
                timestamp: Date.now(),
                type: "MOVE_COMPLETED",
                agentId: agent._id,
                zoneId: zone._id,
                entityId: null,
                payload: {
                  arrivedAt: zone.slug,
                  zoneName: zone.name,
                },
                requestId: null,
              });
            }
          } catch (e) {
            // Zone may have been deleted, just continue
          }
        }

        // Transition agent to idle with updated stats
        await ctx.db.patch(agent._id, {
          status: "idle",
          busyUntilTick: null,
          busyAction: null,
          cash: newCash,
          stats: newStats,
        });

        resolvedCount++;
      }
    }

    return { resolved: resolvedCount };
  },
});

/**
 * Process heat decay for all agents
 */
export const processHeatDecay = internalMutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      return { processed: 0 };
    }

    const { heatDecayIdle, heatDecayBusy } = world.config;

    // Get all agents
    const agents = await ctx.db.query("agents").collect();

    let processedCount = 0;

    for (const agent of agents) {
      if (agent.heat > 0) {
        // Determine decay rate based on status
        const decayRate =
          agent.status === "idle" || agent.status === "jailed" || agent.status === "hospitalized"
            ? heatDecayIdle
            : heatDecayBusy;

        // Apply decay (minimum 0)
        const newHeat = Math.max(0, agent.heat - decayRate);

        if (newHeat !== agent.heat) {
          await ctx.db.patch(agent._id, {
            heat: newHeat,
          });
          processedCount++;
        }
      }
    }

    return { processed: processedCount };
  },
});

/**
 * Run arrest checks for agents with high heat
 */
export const runArrestChecks = internalMutation({
  args: {
    seed: v.string(),
    tick: v.number(),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      return { arrests: 0, checks: 0 };
    }

    const { arrestThreshold } = world.config;
    const rng = createTickRng(args.seed, args.tick);

    // Get all idle agents (can't arrest busy/jailed/hospitalized agents)
    const idleAgents = await ctx.db
      .query("agents")
      .withIndex("by_status", (q) => q.eq("status", "idle"))
      .collect();

    let arrestCount = 0;
    let checkCount = 0;

    // Get police station zone for jail location
    const policeStation = await ctx.db
      .query("zones")
      .withIndex("by_slug", (q) => q.eq("slug", "police_station"))
      .first();

    for (const agent of idleAgents) {
      if (agent.heat > arrestThreshold) {
        checkCount++;

        // Calculate arrest chance
        const arrestChance = (agent.heat - arrestThreshold) * DEFAULTS.arrestChanceMultiplier;
        const roll = rng.random();

        if (roll < arrestChance) {
          // Arrested!
          const jailDuration = rng.randomInt(DEFAULTS.jailDurationMin, DEFAULTS.jailDurationMax);
          const fine = Math.floor(agent.heat * 5);
          const actualFine = Math.min(fine, agent.cash);

          await ctx.db.patch(agent._id, {
            status: "jailed",
            busyUntilTick: world.tick + jailDuration,
            busyAction: "JAILED",
            cash: agent.cash - actualFine,
            heat: Math.floor(agent.heat * 0.5),
            locationZoneId: policeStation?._id ?? agent.locationZoneId,
            stats: {
              ...agent.stats,
              totalArrests: agent.stats.totalArrests + 1,
            },
          });

          // Log the arrest event
          await ctx.db.insert("events", {
            tick: world.tick,
            timestamp: Date.now(),
            type: "AGENT_ARRESTED",
            agentId: agent._id,
            zoneId: policeStation?._id ?? null,
            entityId: null,
            payload: {
              roll,
              arrestChance,
              heat: agent.heat,
              fine: actualFine,
              jailDuration,
              releaseAtTick: world.tick + jailDuration,
            },
            requestId: null,
          });

          // Log fine in ledger if applicable
          if (actualFine > 0) {
            await ctx.db.insert("ledger", {
              tick: world.tick,
              agentId: agent._id,
              type: "debit",
              amount: actualFine,
              reason: "FINE",
              balance: agent.cash - actualFine,
              refEventId: null,
            });
          }

          arrestCount++;
        }
      }
    }

    return { arrests: arrestCount, checks: checkCount };
  },
});

/**
 * Log the tick event
 */
export const logTickEvent = internalMutation({
  args: {
    tick: v.number(),
    resolvedAgents: v.number(),
    heatDecayProcessed: v.number(),
    arrestsCount: v.number(),
    arrestChecks: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("events", {
      tick: args.tick,
      timestamp: Date.now(),
      type: "TICK",
      agentId: null,
      zoneId: null,
      entityId: null,
      payload: {
        resolvedAgents: args.resolvedAgents,
        heatDecayProcessed: args.heatDecayProcessed,
        arrests: args.arrestsCount,
        arrestChecks: args.arrestChecks,
      },
      requestId: null,
    });
  },
});
