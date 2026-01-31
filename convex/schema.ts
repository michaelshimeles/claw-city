import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // World singleton - holds global game state
  world: defineTable({
    tick: v.number(),
    tickMs: v.number(),
    status: v.union(v.literal("running"), v.literal("paused")),
    seed: v.string(),
    lastTickAt: v.number(),
    config: v.object({
      startingCash: v.number(),
      startingZone: v.string(),
      heatDecayIdle: v.number(),
      heatDecayBusy: v.number(),
      arrestThreshold: v.number(),
      maxHeat: v.number(),
    }),
  }),

  // Agents - player-controlled entities
  agents: defineTable({
    agentKeyHash: v.string(),
    name: v.string(),
    createdAt: v.number(),
    locationZoneId: v.id("zones"),
    cash: v.number(),
    health: v.number(),
    stamina: v.number(),
    reputation: v.number(),
    heat: v.number(),
    status: v.union(
      v.literal("idle"),
      v.literal("busy"),
      v.literal("jailed"),
      v.literal("hospitalized")
    ),
    busyUntilTick: v.union(v.number(), v.null()),
    busyAction: v.union(v.string(), v.null()),
    inventory: v.array(
      v.object({
        itemId: v.id("items"),
        qty: v.number(),
      })
    ),
    skills: v.object({
      driving: v.number(),
      negotiation: v.number(),
      stealth: v.number(),
      combat: v.number(),
    }),
    stats: v.object({
      lifetimeEarnings: v.number(),
      totalCrimes: v.number(),
      totalArrests: v.number(),
      jobsCompleted: v.number(),
      daysSurvived: v.number(),
    }),
  })
    .index("by_agentKeyHash", ["agentKeyHash"])
    .index("by_status", ["status"])
    .index("by_locationZoneId", ["locationZoneId"]),

  // Zones - locations in the world
  zones: defineTable({
    slug: v.string(),
    name: v.string(),
    type: v.union(
      v.literal("commercial"),
      v.literal("residential"),
      v.literal("industrial"),
      v.literal("government")
    ),
    description: v.string(),
  }).index("by_slug", ["slug"]),

  // Zone edges - connections between zones with travel costs
  zoneEdges: defineTable({
    fromZoneId: v.id("zones"),
    toZoneId: v.id("zones"),
    timeCostTicks: v.number(),
    cashCost: v.number(),
    heatRisk: v.number(),
  }).index("by_fromZoneId", ["fromZoneId"]),

  // Items - things agents can own, trade, and use
  items: defineTable({
    slug: v.string(),
    name: v.string(),
    category: v.union(
      v.literal("food"),
      v.literal("tool"),
      v.literal("weapon"),
      v.literal("medical"),
      v.literal("luxury"),
      v.literal("contraband")
    ),
    basePrice: v.number(),
    legal: v.boolean(),
    effects: v.object({
      healthDelta: v.optional(v.number()),
      staminaDelta: v.optional(v.number()),
      heatDelta: v.optional(v.number()),
    }),
  })
    .index("by_slug", ["slug"])
    .index("by_category", ["category"]),

  // Jobs - work opportunities available in zones
  jobs: defineTable({
    zoneId: v.id("zones"),
    type: v.string(),
    title: v.string(),
    wage: v.number(),
    durationTicks: v.number(),
    requirements: v.object({
      minReputation: v.optional(v.number()),
      minSkill: v.optional(
        v.object({
          skill: v.string(),
          level: v.number(),
        })
      ),
    }),
    staminaCost: v.number(),
    active: v.boolean(),
  })
    .index("by_zoneId", ["zoneId"])
    .index("by_active", ["active"]),

  // Businesses - shops and services in zones
  businesses: defineTable({
    ownerAgentId: v.union(v.id("agents"), v.null()),
    zoneId: v.id("zones"),
    type: v.string(),
    name: v.string(),
    cashOnHand: v.number(),
    inventory: v.array(
      v.object({
        itemId: v.id("items"),
        qty: v.number(),
        price: v.number(),
      })
    ),
    reputation: v.number(),
    status: v.union(v.literal("open"), v.literal("closed")),
    metrics: v.object({
      totalRevenue: v.number(),
      totalCustomers: v.number(),
    }),
  })
    .index("by_ownerAgentId", ["ownerAgentId"])
    .index("by_zoneId", ["zoneId"])
    .index("by_type", ["type"]),

  // Market state - current prices per zone/item
  marketState: defineTable({
    zoneId: v.id("zones"),
    itemId: v.id("items"),
    price: v.number(),
    supply: v.number(),
    demand: v.number(),
    lastUpdatedTick: v.number(),
  })
    .index("by_zoneId", ["zoneId"])
    .index("by_itemId", ["itemId"])
    .index("by_zoneId_itemId", ["zoneId", "itemId"]),

  // Events - append-only log of all world events
  events: defineTable({
    tick: v.number(),
    timestamp: v.number(),
    type: v.string(),
    agentId: v.union(v.id("agents"), v.null()),
    zoneId: v.union(v.id("zones"), v.null()),
    entityId: v.union(v.string(), v.null()),
    payload: v.any(),
    requestId: v.union(v.string(), v.null()),
  })
    .index("by_tick", ["tick"])
    .index("by_agentId", ["agentId"])
    .index("by_type", ["type"])
    .index("by_requestId", ["requestId"]),

  // Ledger - financial transaction history
  ledger: defineTable({
    tick: v.number(),
    agentId: v.id("agents"),
    type: v.union(v.literal("credit"), v.literal("debit")),
    amount: v.number(),
    reason: v.string(),
    balance: v.number(),
    refEventId: v.union(v.id("events"), v.null()),
  })
    .index("by_agentId", ["agentId"])
    .index("by_tick", ["tick"]),

  // Action locks - idempotency tracking for agent requests
  actionLocks: defineTable({
    agentId: v.id("agents"),
    requestId: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    result: v.union(v.any(), v.null()),
  }).index("by_agentId_requestId", ["agentId", "requestId"]),
});
