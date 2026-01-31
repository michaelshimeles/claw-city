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
      startingCash: v.optional(v.number()), // Deprecated - use startingCashMin/Max
      startingCashMin: v.optional(v.number()),
      startingCashMax: v.optional(v.number()),
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
    // Social features
    gangId: v.optional(v.id("gangs")),
    homePropertyId: v.optional(v.id("properties")),
    socialStats: v.optional(
      v.object({
        totalFriends: v.number(),
        betrayals: v.number(),
        coopCrimesCompleted: v.number(),
        giftsGiven: v.number(),
        giftsReceived: v.number(),
      })
    ),
    gangBanUntilTick: v.optional(v.number()), // Can't join gang until this tick (after betrayal)
    // Tax fields
    taxDueTick: v.optional(v.number()), // When next tax assessment happens
    taxOwed: v.optional(v.number()), // Amount currently owed
    taxGracePeriodEnd: v.optional(v.number()), // Deadline to pay
    // GTA-like freedom features
    vehicleId: v.optional(v.id("vehicles")), // Currently owned/stolen vehicle
    isNPC: v.optional(v.boolean()), // Whether this agent is an NPC bot
    combatStats: v.optional(
      v.object({
        kills: v.number(),
        deaths: v.number(),
        bountiesClaimed: v.number(),
        bountiesPlaced: v.number(),
      })
    ),
  })
    .index("by_agentKeyHash", ["agentKeyHash"])
    .index("by_status", ["status"])
    .index("by_locationZoneId", ["locationZoneId"])
    .index("by_gangId", ["gangId"])
    .index("by_name", ["name"]),

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
    // Map visualization coordinates
    mapCoords: v.optional(v.object({
      center: v.object({ lng: v.number(), lat: v.number() }),
      radius: v.number(),
    })),
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

  // ============================================================================
  // SOCIAL FEATURES TABLES
  // ============================================================================

  // Friendships - Agent-to-agent relationships
  friendships: defineTable({
    agent1Id: v.id("agents"), // Always the lower ID for consistency
    agent2Id: v.id("agents"), // Always the higher ID
    status: v.union(
      v.literal("pending"), // Request sent, awaiting response
      v.literal("accepted"), // Active friendship
      v.literal("blocked") // One agent blocked the other
    ),
    initiatorId: v.id("agents"), // Who sent the request
    strength: v.number(), // 0-100, increases with positive interactions
    loyalty: v.number(), // 0-100, affects coop bonuses
    lastInteractionTick: v.number(),
    createdAt: v.number(),
  })
    .index("by_agent1Id", ["agent1Id"])
    .index("by_agent2Id", ["agent2Id"])
    .index("by_status", ["status"]),

  // Gangs - Crews/factions
  gangs: defineTable({
    name: v.string(),
    tag: v.string(), // Short 3-5 char tag like [ABC]
    color: v.string(), // Hex color for territory display
    leaderId: v.id("agents"),
    treasury: v.number(),
    reputation: v.number(), // Gang reputation (affects territory control)
    homeZoneId: v.optional(v.id("zones")), // Primary base zone
    createdAt: v.number(),
    memberCount: v.number(),
  })
    .index("by_leaderId", ["leaderId"])
    .index("by_name", ["name"])
    .index("by_reputation", ["reputation"]),

  // Gang members - Membership records
  gangMembers: defineTable({
    gangId: v.id("gangs"),
    agentId: v.id("agents"),
    role: v.union(
      v.literal("leader"),
      v.literal("lieutenant"),
      v.literal("enforcer"),
      v.literal("member")
    ),
    joinedAt: v.number(),
    contributedTotal: v.number(), // Total $ contributed to treasury
  })
    .index("by_gangId", ["gangId"])
    .index("by_agentId", ["agentId"]),

  // Gang invites - Pending invitations
  gangInvites: defineTable({
    gangId: v.id("gangs"),
    inviterId: v.id("agents"),
    inviteeId: v.id("agents"),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_gangId", ["gangId"])
    .index("by_inviteeId", ["inviteeId"]),

  // Territories - Zone control by gangs
  territories: defineTable({
    zoneId: v.id("zones"),
    gangId: v.id("gangs"),
    controlStrength: v.number(), // 0-100, decays if undefended
    incomePerTick: v.number(),
    claimedAt: v.number(),
    lastDefendedTick: v.number(), // Last tick a gang member was present
  })
    .index("by_zoneId", ["zoneId"])
    .index("by_gangId", ["gangId"]),

  // Properties - Buyable/rentable locations
  properties: defineTable({
    zoneId: v.id("zones"),
    name: v.string(),
    type: v.union(
      v.literal("apartment"),
      v.literal("house"),
      v.literal("safehouse"),
      v.literal("penthouse"),
      v.literal("warehouse")
    ),
    ownerId: v.optional(v.id("agents")), // null = available for purchase
    buyPrice: v.number(),
    rentPrice: v.number(), // Per tick rent
    heatReduction: v.number(), // Percentage reduction to heat decay
    staminaBoost: v.number(), // Percentage bonus to stamina regen
    capacity: v.number(), // Max residents
    features: v.optional(v.array(v.string())), // Special features like "garage", "helipad"
  })
    .index("by_zoneId", ["zoneId"])
    .index("by_ownerId", ["ownerId"])
    .index("by_type", ["type"]),

  // Property residents - Who lives where
  propertyResidents: defineTable({
    propertyId: v.id("properties"),
    agentId: v.id("agents"),
    isOwner: v.boolean(),
    rentDueAt: v.optional(v.number()), // Tick when next rent is due (renters only)
    moveInAt: v.number(),
  })
    .index("by_propertyId", ["propertyId"])
    .index("by_agentId", ["agentId"]),

  // Government - Tracks tax revenue and seizures
  government: defineTable({
    totalTaxRevenue: v.number(),
    totalSeizedCash: v.number(),
    totalSeizedItems: v.number(),
  }),

  // ============================================================================
  // GTA-LIKE FREEDOM FEATURES TABLES
  // ============================================================================

  // Bounties - Player-placed bounties on other agents
  bounties: defineTable({
    targetAgentId: v.id("agents"),
    placedByAgentId: v.id("agents"),
    amount: v.number(),
    reason: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("claimed"), v.literal("expired")),
    claimedByAgentId: v.optional(v.id("agents")),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_targetAgentId", ["targetAgentId"])
    .index("by_status", ["status"])
    .index("by_placedByAgentId", ["placedByAgentId"]),

  // Vehicles - Stealable vehicles for travel speed bonus
  vehicles: defineTable({
    type: v.union(
      v.literal("motorcycle"),
      v.literal("car"),
      v.literal("sports_car"),
      v.literal("truck"),
      v.literal("van")
    ),
    name: v.string(),
    ownerId: v.optional(v.id("agents")),
    zoneId: v.id("zones"),
    isStolen: v.boolean(),
    condition: v.number(), // 0-100
    speedBonus: v.number(), // Percentage bonus to travel speed
    value: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_zoneId", ["zoneId"]),

  // Disguises - Temporary heat reduction effects
  disguises: defineTable({
    agentId: v.id("agents"),
    type: v.union(v.literal("basic"), v.literal("professional"), v.literal("elite")),
    heatReduction: v.number(),
    expiresAtTick: v.number(),
  }).index("by_agentId", ["agentId"]),

  // NPC Agents - Bot agents with personalities that auto-act
  npcAgents: defineTable({
    agentId: v.id("agents"),
    personality: v.object({
      aggression: v.number(), // 0-100
      greed: v.number(), // 0-100
      caution: v.number(), // 0-100
      loyalty: v.number(), // 0-100
      sociability: v.number(), // 0-100
    }),
    behaviorType: v.union(
      v.literal("criminal"),
      v.literal("worker"),
      v.literal("trader"),
      v.literal("social"),
      v.literal("chaotic")
    ),
    isActive: v.boolean(),
    lastActionTick: v.number(),
  })
    .index("by_agentId", ["agentId"])
    .index("by_isActive", ["isActive"]),

  // Contracts - Assassination contracts for agents
  contracts: defineTable({
    targetAgentId: v.id("agents"),
    reward: v.number(),
    acceptedByAgentId: v.optional(v.id("agents")),
    status: v.union(v.literal("available"), v.literal("accepted"), v.literal("completed"), v.literal("expired")),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_targetAgentId", ["targetAgentId"])
    .index("by_status", ["status"])
    .index("by_acceptedByAgentId", ["acceptedByAgentId"]),

  // Messages - Agent-to-agent direct messages
  messages: defineTable({
    senderId: v.id("agents"),
    recipientId: v.id("agents"),
    content: v.string(),
    read: v.boolean(),
    tick: v.number(),
    timestamp: v.number(),
  })
    .index("by_recipientId", ["recipientId"])
    .index("by_senderId", ["senderId"])
    .index("by_recipientId_read", ["recipientId", "read"]),

  // Cooperative actions - Multi-agent actions in progress
  coopActions: defineTable({
    initiatorId: v.id("agents"),
    type: v.string(), // "COOP_THEFT", "COOP_ROBBERY", "COOP_SMUGGLING"
    targetBusinessId: v.optional(v.id("businesses")),
    zoneId: v.id("zones"),
    status: v.union(
      v.literal("recruiting"), // Waiting for participants
      v.literal("ready"), // Enough participants, waiting to execute
      v.literal("executing"), // In progress
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    ),
    participantIds: v.array(v.id("agents")),
    minParticipants: v.number(),
    maxParticipants: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(), // Recruitment expires
    executeAt: v.optional(v.number()), // Tick when crime executes
    result: v.optional(
      v.object({
        success: v.boolean(),
        totalLoot: v.number(),
        heatPerAgent: v.number(),
        damagePerAgent: v.optional(v.number()),
      })
    ),
  })
    .index("by_initiatorId", ["initiatorId"])
    .index("by_zoneId", ["zoneId"])
    .index("by_status", ["status"]),
});
