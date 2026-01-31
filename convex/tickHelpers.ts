/**
 * Tick Helper Mutations for ClawCity
 * These are internal mutations called by the tick runner action
 * Separated to avoid circular type references
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { createTickRng } from "./lib/rng";
import { DEFAULTS, SOCIAL_DEFAULTS } from "./lib/constants";

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
    territoryIncome: v.optional(v.number()),
    rentPayments: v.optional(v.number()),
    coopActionsProcessed: v.optional(v.number()),
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
        territoryIncome: args.territoryIncome ?? 0,
        rentPayments: args.rentPayments ?? 0,
        coopActionsProcessed: args.coopActionsProcessed ?? 0,
      },
      requestId: null,
    });
  },
});

// ============================================================================
// SOCIAL FEATURE TICK PROCESSORS
// ============================================================================

/**
 * Process territory income - pay gang treasury and decay undefended control
 */
export const processTerritoryIncome = internalMutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      return { processed: 0, totalIncome: 0, decayed: 0 };
    }

    const territories = await ctx.db.query("territories").collect();
    let processed = 0;
    let totalIncome = 0;
    let decayed = 0;

    for (const territory of territories) {
      const gang = await ctx.db.get(territory.gangId);
      if (!gang) {
        // Gang no longer exists, delete territory
        await ctx.db.delete(territory._id);
        continue;
      }

      // Check if any gang members are in the zone
      const membersInZone = await ctx.db
        .query("agents")
        .withIndex("by_locationZoneId", (q) => q.eq("locationZoneId", territory.zoneId))
        .collect();

      const gangMembersPresent = membersInZone.some((a) => a.gangId === territory.gangId);

      if (gangMembersPresent) {
        // Pay income and refresh defense
        const income = territory.incomePerTick;
        await ctx.db.patch(gang._id, { treasury: gang.treasury + income });
        await ctx.db.patch(territory._id, {
          lastDefendedTick: world.tick,
          controlStrength: Math.min(100, territory.controlStrength + 1), // Slowly strengthen
        });
        totalIncome += income;

        // Log territory income event
        await ctx.db.insert("events", {
          tick: world.tick,
          timestamp: Date.now(),
          type: "TERRITORY_INCOME",
          agentId: null,
          zoneId: territory.zoneId,
          entityId: gang._id,
          payload: {
            gangName: gang.name,
            income,
            newTreasury: gang.treasury + income,
          },
          requestId: null,
        });
      } else {
        // Decay control
        const newControl = territory.controlStrength - SOCIAL_DEFAULTS.territoryControlDecayRate;
        if (newControl <= 0) {
          // Territory lost
          await ctx.db.delete(territory._id);
          decayed++;

          await ctx.db.insert("events", {
            tick: world.tick,
            timestamp: Date.now(),
            type: "TERRITORY_LOST",
            agentId: null,
            zoneId: territory.zoneId,
            entityId: gang._id,
            payload: { gangName: gang.name, reason: "undefended" },
            requestId: null,
          });
        } else {
          await ctx.db.patch(territory._id, { controlStrength: newControl });
          decayed++;

          if (newControl < SOCIAL_DEFAULTS.territoryWeakThreshold) {
            await ctx.db.insert("events", {
              tick: world.tick,
              timestamp: Date.now(),
              type: "TERRITORY_CONTROL_DECAYED",
              agentId: null,
              zoneId: territory.zoneId,
              entityId: gang._id,
              payload: {
                gangName: gang.name,
                controlStrength: newControl,
                contestable: newControl < SOCIAL_DEFAULTS.territoryWeakThreshold,
              },
              requestId: null,
            });
          }
        }
      }
      processed++;
    }

    return { processed, totalIncome, decayed };
  },
});

/**
 * Process rent payments - auto-pay or evict overdue renters
 */
export const processRentPayments = internalMutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      return { payments: 0, evictions: 0 };
    }

    // Find all residencies with rent due
    const allResidencies = await ctx.db.query("propertyResidents").collect();
    let payments = 0;
    let evictions = 0;

    for (const residency of allResidencies) {
      // Skip owners (they don't pay rent)
      if (residency.isOwner || !residency.rentDueAt) {
        continue;
      }

      // Check if rent is due
      if (residency.rentDueAt > world.tick) {
        continue;
      }

      const property = await ctx.db.get(residency.propertyId);
      if (!property) {
        await ctx.db.delete(residency._id);
        continue;
      }

      const tenant = await ctx.db.get(residency.agentId);
      if (!tenant) {
        await ctx.db.delete(residency._id);
        continue;
      }

      // Check if within grace period
      const overdue = world.tick - residency.rentDueAt;

      // Try to pay rent
      if (tenant.cash >= property.rentPrice) {
        // Pay rent
        await ctx.db.patch(tenant._id, { cash: tenant.cash - property.rentPrice });

        // Pay owner if exists
        if (property.ownerId) {
          const owner = await ctx.db.get(property.ownerId);
          if (owner) {
            await ctx.db.patch(owner._id, { cash: owner.cash + property.rentPrice });
          }
        }

        // Update next rent due
        await ctx.db.patch(residency._id, {
          rentDueAt: world.tick + SOCIAL_DEFAULTS.rentDueInterval,
        });

        // Log event
        await ctx.db.insert("events", {
          tick: world.tick,
          timestamp: Date.now(),
          type: "RENT_PAID",
          agentId: tenant._id,
          zoneId: property.zoneId,
          entityId: property._id,
          payload: {
            propertyName: property.name,
            amount: property.rentPrice,
            nextDue: world.tick + SOCIAL_DEFAULTS.rentDueInterval,
          },
          requestId: null,
        });

        // Ledger entry
        await ctx.db.insert("ledger", {
          tick: world.tick,
          agentId: tenant._id,
          type: "debit",
          amount: property.rentPrice,
          reason: "RENT_PAYMENT",
          balance: tenant.cash - property.rentPrice,
          refEventId: null,
        });

        payments++;
      } else if (overdue > SOCIAL_DEFAULTS.rentGracePeriod) {
        // Evict tenant
        await ctx.db.delete(residency._id);

        // Clear home if this was it
        if (tenant.homePropertyId === property._id) {
          await ctx.db.patch(tenant._id, { homePropertyId: undefined });
        }

        // Log event
        await ctx.db.insert("events", {
          tick: world.tick,
          timestamp: Date.now(),
          type: "RESIDENT_EVICTED",
          agentId: tenant._id,
          zoneId: property.zoneId,
          entityId: property._id,
          payload: {
            propertyName: property.name,
            reason: "rent_overdue",
            overdueBy: overdue,
          },
          requestId: null,
        });

        evictions++;
      } else {
        // Log overdue warning
        await ctx.db.insert("events", {
          tick: world.tick,
          timestamp: Date.now(),
          type: "RENT_OVERDUE",
          agentId: tenant._id,
          zoneId: property.zoneId,
          entityId: property._id,
          payload: {
            propertyName: property.name,
            amountDue: property.rentPrice,
            ticksUntilEviction: SOCIAL_DEFAULTS.rentGracePeriod - overdue,
          },
          requestId: null,
        });
      }
    }

    return { payments, evictions };
  },
});

/**
 * Process cooperative actions - execute ready coop crimes
 */
export const processCoopActions = internalMutation({
  args: {
    seed: v.string(),
    tick: v.number(),
  },
  handler: async (ctx, args) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      return { executed: 0, cancelled: 0 };
    }

    const rng = createTickRng(args.seed, args.tick);

    // Find all ready coop actions
    const readyActions = await ctx.db
      .query("coopActions")
      .withIndex("by_status", (q) => q.eq("status", "ready"))
      .collect();

    // Also find and cancel expired recruiting actions
    const recruitingActions = await ctx.db
      .query("coopActions")
      .withIndex("by_status", (q) => q.eq("status", "recruiting"))
      .collect();

    let executed = 0;
    let cancelled = 0;

    // Cancel expired recruiting
    for (const action of recruitingActions) {
      if (action.expiresAt < Date.now()) {
        await ctx.db.patch(action._id, { status: "cancelled" });

        await ctx.db.insert("events", {
          tick: world.tick,
          timestamp: Date.now(),
          type: "COOP_CRIME_CANCELLED",
          agentId: action.initiatorId,
          zoneId: action.zoneId,
          entityId: action._id,
          payload: {
            reason: "recruitment_expired",
            participantCount: action.participantIds.length,
          },
          requestId: null,
        });

        cancelled++;
      }
    }

    // Execute ready actions
    for (const action of readyActions) {
      // Get all participants
      const participants: Doc<"agents">[] = [];
      let allIdle = true;
      let allInZone = true;

      for (const participantId of action.participantIds) {
        const participant = await ctx.db.get(participantId);
        if (participant) {
          participants.push(participant);
          if (participant.status !== "idle") {
            allIdle = false;
          }
          if (participant.locationZoneId !== action.zoneId) {
            allInZone = false;
          }
        }
      }

      // All participants must be idle and in zone
      if (!allIdle || !allInZone || participants.length < action.minParticipants) {
        // Cancel if conditions not met
        await ctx.db.patch(action._id, { status: "cancelled" });

        await ctx.db.insert("events", {
          tick: world.tick,
          timestamp: Date.now(),
          type: "COOP_CRIME_CANCELLED",
          agentId: action.initiatorId,
          zoneId: action.zoneId,
          entityId: action._id,
          payload: {
            reason: !allIdle ? "participants_not_idle" : !allInZone ? "participants_not_in_zone" : "insufficient_participants",
          },
          requestId: null,
        });

        cancelled++;
        continue;
      }

      // Calculate success chance
      // Base from crime type
      const crimeType = action.type.replace("COOP_", "") as "THEFT" | "ROBBERY" | "SMUGGLING";
      let successChance = DEFAULTS.crimeBaseSuccess[crimeType];

      // Bonus per extra participant
      const extraParticipants = participants.length - 1;
      const participantBonus = Math.min(
        SOCIAL_DEFAULTS.coopSuccessBonusCap,
        extraParticipants * SOCIAL_DEFAULTS.coopSuccessBonusPerMember
      );
      successChance += participantBonus;

      // Same gang bonus
      const initiator = participants[0];
      if (initiator.gangId && participants.every((p) => p.gangId === initiator.gangId)) {
        successChance += SOCIAL_DEFAULTS.coopSameGangBonus;
      }

      // Average stealth bonus
      const avgStealth = participants.reduce((sum, p) => sum + p.skills.stealth, 0) / participants.length;
      successChance += avgStealth * DEFAULTS.stealthSkillBonus;

      // Cap at 95%
      successChance = Math.min(0.95, successChance);

      // Roll for success
      const succeeded = rng.randomChance(successChance);

      // Calculate outcomes
      let totalLoot = 0;
      let heatPerAgent = 0;
      let damagePerAgent = 0;

      if (succeeded) {
        // Calculate loot (1.5x normal * number of participants split)
        const baseReward = DEFAULTS.crimeReward[crimeType];
        const baseLoot = rng.randomInt(baseReward.min, baseReward.max);
        totalLoot = Math.floor(baseLoot * SOCIAL_DEFAULTS.coopLootMultiplier * participants.length);
        const lootPerAgent = Math.floor(totalLoot / participants.length);

        // Heat reduced per person
        const baseHeat = DEFAULTS.crimeHeatGain[crimeType];
        heatPerAgent = Math.floor(baseHeat * (1 - SOCIAL_DEFAULTS.coopHeatReductionPerMember * (participants.length - 1)));

        // Distribute rewards
        for (const participant of participants) {
          const newCash = participant.cash + lootPerAgent;
          const newHeat = Math.min(DEFAULTS.maxHeat, participant.heat + heatPerAgent);
          const socialStats = participant.socialStats ?? {
            totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
          };

          await ctx.db.patch(participant._id, {
            cash: newCash,
            heat: newHeat,
            stats: {
              ...participant.stats,
              totalCrimes: participant.stats.totalCrimes + 1,
            },
            socialStats: {
              ...socialStats,
              coopCrimesCompleted: socialStats.coopCrimesCompleted + 1,
            },
          });

          // Ledger entry
          await ctx.db.insert("ledger", {
            tick: world.tick,
            agentId: participant._id,
            type: "credit",
            amount: lootPerAgent,
            reason: "COOP_CRIME_REWARD",
            balance: newCash,
            refEventId: null,
          });
        }

        // Update coop action
        await ctx.db.patch(action._id, {
          status: "completed",
          result: {
            success: true,
            totalLoot,
            heatPerAgent,
          },
        });

        // Log success event
        await ctx.db.insert("events", {
          tick: world.tick,
          timestamp: Date.now(),
          type: "COOP_CRIME_SUCCESS",
          agentId: action.initiatorId,
          zoneId: action.zoneId,
          entityId: action._id,
          payload: {
            crimeType,
            participantCount: participants.length,
            totalLoot,
            lootPerAgent,
            heatPerAgent,
            successChance,
          },
          requestId: null,
        });
      } else {
        // Failure - everyone takes damage
        const baseDamage = DEFAULTS.crimeDamage[crimeType];
        damagePerAgent = rng.randomInt(baseDamage.min, baseDamage.max);

        const baseHeat = DEFAULTS.crimeHeatGainFailure[crimeType];
        heatPerAgent = Math.floor(baseHeat * (1 - SOCIAL_DEFAULTS.coopHeatReductionPerMember * (participants.length - 1)));

        for (const participant of participants) {
          const newHealth = Math.max(0, participant.health - damagePerAgent);
          const newHeat = Math.min(DEFAULTS.maxHeat, participant.heat + heatPerAgent);
          const hospitalized = newHealth === 0;

          await ctx.db.patch(participant._id, {
            health: newHealth,
            heat: newHeat,
            status: hospitalized ? "hospitalized" : participant.status,
          });

          if (hospitalized) {
            await ctx.db.insert("events", {
              tick: world.tick,
              timestamp: Date.now(),
              type: "AGENT_HOSPITALIZED",
              agentId: participant._id,
              zoneId: participant.locationZoneId,
              entityId: null,
              payload: { reason: "COOP_CRIME_INJURY" },
              requestId: null,
            });
          }
        }

        // Update coop action
        await ctx.db.patch(action._id, {
          status: "failed",
          result: {
            success: false,
            totalLoot: 0,
            heatPerAgent,
            damagePerAgent,
          },
        });

        // Log failure event
        await ctx.db.insert("events", {
          tick: world.tick,
          timestamp: Date.now(),
          type: "COOP_CRIME_FAILED",
          agentId: action.initiatorId,
          zoneId: action.zoneId,
          entityId: action._id,
          payload: {
            crimeType,
            participantCount: participants.length,
            damagePerAgent,
            heatPerAgent,
            successChance,
          },
          requestId: null,
        });
      }

      executed++;
    }

    return { executed, cancelled };
  },
});

/**
 * Process friendship decay - decay inactive friendships
 */
export const processFriendshipDecay = internalMutation({
  args: {},
  handler: async (ctx) => {
    const world = await ctx.db.query("world").first();
    if (!world) {
      return { decayed: 0, removed: 0 };
    }

    // Only run every N ticks
    if (world.tick % SOCIAL_DEFAULTS.friendshipDecayInterval !== 0) {
      return { decayed: 0, removed: 0 };
    }

    const friendships = await ctx.db
      .query("friendships")
      .withIndex("by_status", (q) => q.eq("status", "accepted"))
      .collect();

    let decayed = 0;
    let removed = 0;

    for (const friendship of friendships) {
      const ticksSinceInteraction = world.tick - friendship.lastInteractionTick;

      // Decay if inactive for too long
      if (ticksSinceInteraction > SOCIAL_DEFAULTS.friendshipDecayInterval) {
        const newStrength = friendship.strength - SOCIAL_DEFAULTS.friendshipDecayRate;

        if (newStrength <= 0) {
          // Friendship fades away
          await ctx.db.delete(friendship._id);

          // Update both agents' friend counts
          const agent1 = await ctx.db.get(friendship.agent1Id);
          const agent2 = await ctx.db.get(friendship.agent2Id);

          if (agent1) {
            const stats = agent1.socialStats ?? {
              totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
            };
            await ctx.db.patch(agent1._id, {
              socialStats: { ...stats, totalFriends: Math.max(0, stats.totalFriends - 1) },
            });
          }

          if (agent2) {
            const stats = agent2.socialStats ?? {
              totalFriends: 0, betrayals: 0, coopCrimesCompleted: 0, giftsGiven: 0, giftsReceived: 0
            };
            await ctx.db.patch(agent2._id, {
              socialStats: { ...stats, totalFriends: Math.max(0, stats.totalFriends - 1) },
            });
          }

          await ctx.db.insert("events", {
            tick: world.tick,
            timestamp: Date.now(),
            type: "FRIENDSHIP_DECAYED",
            agentId: friendship.agent1Id,
            zoneId: null,
            entityId: null,
            payload: {
              agent1Id: friendship.agent1Id,
              agent2Id: friendship.agent2Id,
              reason: "inactivity",
            },
            requestId: null,
          });

          removed++;
        } else {
          await ctx.db.patch(friendship._id, { strength: newStrength });
          decayed++;
        }
      }
    }

    return { decayed, removed };
  },
});
