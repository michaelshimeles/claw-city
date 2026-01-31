/**
 * ClawCity Game Configuration Constants
 * Central configuration file for all game-related constants and default values
 */

// ============================================================================
// ZONE CONSTANTS
// ============================================================================

/**
 * All available zone slugs in the game world
 */
export const ZONE_SLUGS = [
  "downtown",
  "industrial",
  "residential",
  "suburbs",
  "docks",
  "market",
  "hospital",
  "police_station",
] as const;

export type ZoneSlug = (typeof ZONE_SLUGS)[number];

/**
 * Zone types for categorization
 */
export const ZONE_TYPES = [
  "commercial",
  "residential",
  "industrial",
  "government",
] as const;

export type ZoneType = (typeof ZONE_TYPES)[number];

// ============================================================================
// ITEM CONSTANTS
// ============================================================================

/**
 * All available item categories
 */
export const ITEM_CATEGORIES = [
  "food",
  "tool",
  "weapon",
  "medical",
  "luxury",
  "contraband",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

// ============================================================================
// CRIME CONSTANTS
// ============================================================================

/**
 * All available crime types
 */
export const CRIME_TYPES = ["THEFT", "ROBBERY", "SMUGGLING"] as const;

export type CrimeType = (typeof CRIME_TYPES)[number];

// ============================================================================
// STATUS CONSTANTS
// ============================================================================

/**
 * Agent status types
 */
export const AGENT_STATUSES = [
  "idle",
  "busy",
  "jailed",
  "hospitalized",
] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];

/**
 * World status types
 */
export const WORLD_STATUSES = ["running", "paused"] as const;

export type WorldStatus = (typeof WORLD_STATUSES)[number];

/**
 * Business status types
 */
export const BUSINESS_STATUSES = ["open", "closed"] as const;

export type BusinessStatus = (typeof BUSINESS_STATUSES)[number];

// ============================================================================
// ACTION CONSTANTS
// ============================================================================

/**
 * All available agent actions
 */
export const ACTION_TYPES = [
  "MOVE",
  "TAKE_JOB",
  "BUY",
  "SELL",
  "HEAL",
  "REST",
  "COMMIT_CRIME",
  "START_BUSINESS",
  "SET_PRICES",
  "STOCK_BUSINESS",
  "USE_ITEM",
  // Social actions - Friendships
  "SEND_FRIEND_REQUEST",
  "RESPOND_FRIEND_REQUEST",
  "REMOVE_FRIEND",
  // Social actions - Gangs
  "CREATE_GANG",
  "INVITE_TO_GANG",
  "RESPOND_GANG_INVITE",
  "LEAVE_GANG",
  "KICK_FROM_GANG",
  "PROMOTE_MEMBER",
  "DEMOTE_MEMBER",
  "CONTRIBUTE_TO_GANG",
  // Social actions - Territories
  "CLAIM_TERRITORY",
  // Social actions - Cooperative crimes
  "INITIATE_COOP_CRIME",
  "JOIN_COOP_ACTION",
  // Social actions - Properties
  "BUY_PROPERTY",
  "SELL_PROPERTY",
  "RENT_PROPERTY",
  "INVITE_RESIDENT",
  "EVICT_RESIDENT",
  // Social actions - PvP & Social
  "GIFT_CASH",
  "GIFT_ITEM",
  "ROB_AGENT",
  "BETRAY_GANG",
  // Tax actions
  "PAY_TAX",
  // Messaging
  "SEND_MESSAGE",
  // GTA-like freedom actions
  "ATTEMPT_JAILBREAK",
  "BRIBE_COPS",
  "ATTACK_AGENT",
  "PLACE_BOUNTY",
  "CLAIM_BOUNTY",
  "GAMBLE",
  "BUY_DISGUISE",
  "STEAL_VEHICLE",
  "ACCEPT_CONTRACT",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

// ============================================================================
// EVENT CONSTANTS
// ============================================================================

/**
 * All event types for the event log
 */
export const EVENT_TYPES = [
  // World events
  "TICK",
  "WORLD_STARTED",
  "WORLD_PAUSED",
  "WORLD_RESUMED",
  // Agent lifecycle events
  "AGENT_REGISTERED",
  "AGENT_ARRESTED",
  "AGENT_RELEASED",
  "AGENT_HOSPITALIZED",
  "AGENT_RECOVERED",
  // Action events
  "MOVE_STARTED",
  "MOVE_COMPLETED",
  "JOB_STARTED",
  "JOB_COMPLETED",
  "BUY",
  "SELL",
  "HEAL_STARTED",
  "HEAL_COMPLETED",
  "REST_STARTED",
  "REST_COMPLETED",
  "CRIME_ATTEMPTED",
  "CRIME_SUCCESS",
  "CRIME_FAILED",
  "BUSINESS_STARTED",
  "PRICES_SET",
  "BUSINESS_STOCKED",
  "ITEM_USED",
  // Market events
  "MARKET_UPDATE",
  "PRICE_CHANGE",
  // Random events
  "MARKET_CRASH",
  "POLICE_CRACKDOWN",
  "JOB_DROUGHT",
  // Friendship events
  "FRIEND_REQUEST_SENT",
  "FRIEND_REQUEST_ACCEPTED",
  "FRIEND_REQUEST_DECLINED",
  "FRIEND_REMOVED",
  "FRIENDSHIP_DECAYED",
  // Gang events
  "GANG_CREATED",
  "GANG_INVITE_SENT",
  "GANG_JOINED",
  "GANG_INVITE_DECLINED",
  "GANG_LEFT",
  "GANG_MEMBER_KICKED",
  "GANG_MEMBER_PROMOTED",
  "GANG_MEMBER_DEMOTED",
  "GANG_CONTRIBUTION",
  "GANG_BETRAYED",
  "GANG_DISBANDED",
  // Territory events
  "TERRITORY_CLAIMED",
  "TERRITORY_INCOME",
  "TERRITORY_CONTROL_DECAYED",
  "TERRITORY_LOST",
  "TERRITORY_CONTESTED",
  // Cooperative crime events
  "COOP_CRIME_INITIATED",
  "COOP_CRIME_JOINED",
  "COOP_CRIME_EXECUTED",
  "COOP_CRIME_SUCCESS",
  "COOP_CRIME_FAILED",
  "COOP_CRIME_CANCELLED",
  // Property events
  "PROPERTY_PURCHASED",
  "PROPERTY_SOLD",
  "PROPERTY_RENTED",
  "RESIDENT_INVITED",
  "RESIDENT_EVICTED",
  "RENT_PAID",
  "RENT_OVERDUE",
  // PvP & Social events
  "CASH_GIFTED",
  "ITEM_GIFTED",
  "AGENT_ROBBED",
  "ROB_ATTEMPT_FAILED",
  // Tax events
  "TAX_DUE",
  "TAX_PAID",
  "TAX_EVADED",
  "ASSETS_SEIZED",
  // Messaging events
  "MESSAGE_SENT",
  // GTA-like freedom events
  "JAILBREAK_SUCCESS",
  "JAILBREAK_FAILED",
  "BRIBE_SUCCESS",
  "BRIBE_FAILED",
  "AGENT_ATTACKED",
  "AGENT_KILLED",
  "BOUNTY_PLACED",
  "BOUNTY_CLAIMED",
  "BOUNTY_EXPIRED",
  "GAMBLE_WON",
  "GAMBLE_LOST",
  "DISGUISE_PURCHASED",
  "DISGUISE_EXPIRED",
  "VEHICLE_STOLEN",
  "VEHICLE_STEAL_FAILED",
  "CONTRACT_ACCEPTED",
  "CONTRACT_COMPLETED",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

// ============================================================================
// LEDGER CONSTANTS
// ============================================================================

/**
 * Ledger entry types
 */
export const LEDGER_TYPES = ["credit", "debit"] as const;

export type LedgerType = (typeof LEDGER_TYPES)[number];

/**
 * Ledger reason codes
 */
export const LEDGER_REASONS = [
  "JOB_WAGE",
  "PURCHASE",
  "SALE",
  "FINE",
  "TRAVEL_COST",
  "HOSPITAL_COST",
  "CRIME_REWARD",
  "BUSINESS_STARTUP",
  "BUSINESS_REVENUE",
  "TAX_PAYMENT",
  "TAX_SEIZURE",
] as const;

export type LedgerReason = (typeof LEDGER_REASONS)[number];

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * API error codes with their descriptions
 */
export const ERROR_CODES = {
  INVALID_REQUEST_ID: "requestId missing or malformed",
  DUPLICATE_REQUEST: "requestId already processed",
  AGENT_BUSY: "Agent is busy until tick N",
  AGENT_JAILED: "Agent is in jail",
  AGENT_HOSPITALIZED: "Agent is hospitalized",
  WRONG_ZONE: "Action requires different zone",
  INSUFFICIENT_FUNDS: "Not enough cash",
  INSUFFICIENT_INVENTORY: "Not enough items",
  INVALID_ZONE: "Zone does not exist",
  INVALID_ITEM: "Item does not exist",
  INVALID_JOB: "Job does not exist",
  INVALID_BUSINESS: "Business does not exist",
  INVALID_ACTION: "Action type not recognized",
  INVALID_CRIME_TYPE: "Crime type not recognized",
  REQUIREMENTS_NOT_MET: "Job/action requirements not met",
  BUSINESS_CLOSED: "Business is closed",
  OUT_OF_STOCK: "Business doesn't have item",
  UNAUTHORIZED: "Invalid or missing API key",
  INTERNAL_ERROR: "An internal error occurred",
  // Social error codes
  INVALID_AGENT: "Target agent does not exist",
  AGENT_NOT_IN_ZONE: "Target agent not in same zone",
  ALREADY_FRIENDS: "Already friends with this agent",
  FRIEND_REQUEST_EXISTS: "Friend request already pending",
  FRIENDSHIP_NOT_FOUND: "Friendship not found",
  INVALID_FRIENDSHIP: "Invalid friendship ID",
  CANNOT_FRIEND_SELF: "Cannot send friend request to yourself",
  ALREADY_IN_GANG: "Already in a gang",
  NOT_IN_GANG: "Not in a gang",
  INVALID_GANG: "Gang does not exist",
  NOT_GANG_LEADER: "Must be gang leader for this action",
  NOT_GANG_OFFICER: "Must be leader or lieutenant for this action",
  GANG_INVITE_NOT_FOUND: "Gang invite not found or expired",
  ALREADY_INVITED: "Agent already has pending invite",
  TARGET_IN_GANG: "Target agent already in a gang",
  CANNOT_KICK_SELF: "Cannot kick yourself from gang",
  CANNOT_KICK_LEADER: "Cannot kick the gang leader",
  CANNOT_DEMOTE_LEADER: "Cannot demote the gang leader",
  CANNOT_PROMOTE_FURTHER: "Cannot promote beyond lieutenant",
  INVALID_ROLE: "Invalid gang role",
  TERRITORY_ALREADY_CLAIMED: "Territory already controlled by your gang",
  TERRITORY_NOT_CONTESTABLE: "Territory control too strong to contest",
  COOP_ACTION_NOT_FOUND: "Coop action not found",
  COOP_ACTION_FULL: "Coop action already at max participants",
  COOP_ACTION_NOT_RECRUITING: "Coop action not accepting participants",
  ALREADY_IN_COOP: "Already participating in this coop action",
  INVALID_PROPERTY: "Property does not exist",
  PROPERTY_OWNED: "Property already owned",
  NOT_PROPERTY_OWNER: "Not the owner of this property",
  PROPERTY_AT_CAPACITY: "Property at maximum capacity",
  ALREADY_RESIDENT: "Already a resident of this property",
  NOT_RESIDENT: "Not a resident of this property",
  GANG_BAN_ACTIVE: "Cannot join gang - betrayal ban in effect",
  CANNOT_ROB_SELF: "Cannot rob yourself",
  CANNOT_GIFT_SELF: "Cannot gift to yourself",
  // Tax error codes
  NO_TAX_DUE: "No tax currently owed",
  INSUFFICIENT_FUNDS_FOR_TAX: "Not enough cash to pay tax",
  // GTA-like freedom error codes
  NOT_JAILED: "Agent is not in jail",
  HEAT_TOO_LOW: "Heat level too low for this action",
  TARGET_NOT_IDLE: "Target agent is not idle",
  TARGET_NOT_IN_ZONE: "Target agent not in same zone",
  BOUNTY_TOO_LOW: "Bounty amount too low",
  BOUNTY_TOO_HIGH: "Bounty amount too high",
  NO_ACTIVE_BOUNTY: "No active bounty on target",
  CANNOT_ATTACK_SELF: "Cannot attack yourself",
  CANNOT_BOUNTY_SELF: "Cannot place bounty on yourself",
  NO_VEHICLE_AVAILABLE: "No vehicle available in this zone",
  ALREADY_HAS_VEHICLE: "Agent already has a vehicle",
  NOT_IN_MARKET: "Must be in market zone for this action",
  GAMBLE_TOO_LOW: "Bet amount too low",
  GAMBLE_TOO_HIGH: "Bet amount too high",
  INVALID_GAMBLE_TYPE: "Invalid gambling risk type",
  INVALID_DISGUISE_TYPE: "Invalid disguise type",
  NO_CONTRACT_AVAILABLE: "No contract available for this target",
  CONTRACT_ALREADY_ACCEPTED: "Contract already accepted",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

/**
 * Default game configuration values
 */
export const DEFAULTS = {
  // Tick settings
  tickMs: 60000, // 1 minute per tick

  // Starting values for new agents
  startingCashMin: 50,
  startingCashMax: 1000,
  startingHealth: 100,
  startingStamina: 100,
  startingZone: "residential" as ZoneSlug,
  startingReputation: 0,
  startingHeat: 0,

  // Starting skills for new agents
  startingSkills: {
    driving: 1,
    negotiation: 1,
    stealth: 1,
    combat: 1,
  },

  // Heat mechanics
  heatDecayIdle: 1, // Heat decay per tick when idle
  heatDecayBusy: 0.2, // Heat decay per tick when busy
  maxHeat: 100,

  // Arrest mechanics
  arrestThreshold: 60, // Heat level where arrest checks begin
  arrestChanceMultiplier: 0.02, // (heat - threshold) * this = arrest chance

  // Jail settings
  jailDurationMin: 60, // Minimum jail time in ticks
  jailDurationMax: 240, // Maximum jail time in ticks

  // Hospital settings
  hospitalCost: 200,
  hospitalDuration: 10, // Ticks to heal

  // Health thresholds
  lowHealthThreshold: 20, // Below this, agent is impaired
  criticalHealthThreshold: 0, // At this, forced hospitalization

  // Crime base success rates
  crimeBaseSuccess: {
    THEFT: 0.7,
    ROBBERY: 0.5,
    SMUGGLING: 0.4,
  } as Record<CrimeType, number>,

  // Crime heat gain on success
  crimeHeatGain: {
    THEFT: 15,
    ROBBERY: 30,
    SMUGGLING: 25,
  } as Record<CrimeType, number>,

  // Crime heat gain on failure (typically higher)
  crimeHeatGainFailure: {
    THEFT: 25,
    ROBBERY: 50,
    SMUGGLING: 45,
  } as Record<CrimeType, number>,

  // Crime cash rewards
  crimeReward: {
    THEFT: { min: 50, max: 150 },
    ROBBERY: { min: 200, max: 500 },
    SMUGGLING: { min: 300, max: 800 },
  } as Record<CrimeType, { min: number; max: number }>,

  // Crime damage on failure
  crimeDamage: {
    THEFT: { min: 5, max: 15 },
    ROBBERY: { min: 15, max: 35 },
    SMUGGLING: { min: 10, max: 25 },
  } as Record<CrimeType, { min: number; max: number }>,

  // Skill modifiers
  stealthSkillBonus: 0.05, // Per skill level for crime success
  policePresencePenalty: 0.1, // Per zone police presence level

  // Rest settings
  restStaminaGain: 30, // Stamina restored per rest action
  restDuration: 5, // Ticks to rest

  // Idempotency lock expiration
  actionLockExpirationMs: 300000, // 5 minutes

  // Event query limits
  maxEventsPerQuery: 100,
  defaultEventsLimit: 50,
} as const;

// ============================================================================
// SKILL CONSTANTS
// ============================================================================

/**
 * All available agent skills
 */
export const SKILL_TYPES = [
  "driving",
  "negotiation",
  "stealth",
  "combat",
] as const;

export type SkillType = (typeof SKILL_TYPES)[number];

// ============================================================================
// BUSINESS CONSTANTS
// ============================================================================

/**
 * Available business types
 */
export const BUSINESS_TYPES = [
  "restaurant",
  "pawnshop",
  "clinic",
  "warehouse",
  "bar",
  "garage",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

// ============================================================================
// JOB CONSTANTS
// ============================================================================

/**
 * Available job types
 */
export const JOB_TYPES = [
  "delivery",
  "security",
  "warehouse",
  "office",
  "labor",
  "service",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

// ============================================================================
// SOCIAL FEATURE CONSTANTS
// ============================================================================

/**
 * Gang member roles
 */
export const GANG_ROLES = [
  "leader",
  "lieutenant",
  "enforcer",
  "member",
] as const;

export type GangRole = (typeof GANG_ROLES)[number];

/**
 * Friendship statuses
 */
export const FRIENDSHIP_STATUSES = [
  "pending",
  "accepted",
  "blocked",
] as const;

export type FriendshipStatus = (typeof FRIENDSHIP_STATUSES)[number];

/**
 * Property types with their configurations
 */
export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "safehouse",
  "penthouse",
  "warehouse",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

/**
 * Coop action statuses
 */
export const COOP_ACTION_STATUSES = [
  "recruiting",
  "ready",
  "executing",
  "completed",
  "failed",
  "cancelled",
] as const;

export type CoopActionStatus = (typeof COOP_ACTION_STATUSES)[number];

/**
 * Cooperative crime types (mapped from regular crimes)
 */
export const COOP_CRIME_TYPES = ["COOP_THEFT", "COOP_ROBBERY", "COOP_SMUGGLING"] as const;

export type CoopCrimeType = (typeof COOP_CRIME_TYPES)[number];

/**
 * Property configurations by type
 */
export const PROPERTY_CONFIG: Record<PropertyType, {
  buyPrice: number;
  rentPrice: number;
  heatReduction: number; // Percentage
  staminaBoost: number; // Percentage
  capacity: number;
}> = {
  apartment: { buyPrice: 2000, rentPrice: 100, heatReduction: 10, staminaBoost: 10, capacity: 2 },
  house: { buyPrice: 5000, rentPrice: 250, heatReduction: 20, staminaBoost: 15, capacity: 4 },
  safehouse: { buyPrice: 10000, rentPrice: 500, heatReduction: 50, staminaBoost: 10, capacity: 6 },
  penthouse: { buyPrice: 25000, rentPrice: 1000, heatReduction: 30, staminaBoost: 25, capacity: 4 },
  warehouse: { buyPrice: 8000, rentPrice: 400, heatReduction: 10, staminaBoost: 0, capacity: 8 },
};

/**
 * Social feature defaults and configuration
 */
// ============================================================================
// TAX SYSTEM CONSTANTS
// ============================================================================

/**
 * Tax system configuration
 */
export const TAX_DEFAULTS = {
  // Timing
  taxIntervalTicks: 100, // Taxes assessed every 100 ticks
  taxGracePeriodTicks: 10, // 10 ticks to pay after assessment

  // Progressive tax brackets (based on total wealth)
  taxBrackets: [
    { threshold: 0, rate: 0.05 }, // $0-500: 5%
    { threshold: 500, rate: 0.10 }, // $500-1000: 10%
    { threshold: 1000, rate: 0.15 }, // $1000-2500: 15%
    { threshold: 2500, rate: 0.20 }, // $2500-5000: 20%
    { threshold: 5000, rate: 0.25 }, // $5000-10000: 25%
    { threshold: 10000, rate: 0.30 }, // $10000+: 30%
  ],

  // Penalties for tax evasion
  taxEvasionJailDurationMin: 50,
  taxEvasionJailDurationMax: 150,
  taxEvasionReputationPenalty: 10,
  assetSeizurePercentage: 0.50, // 50% of cash seized
} as const;

export const SOCIAL_DEFAULTS = {
  // Gang creation
  gangCreationCost: 5000,
  gangNameMinLength: 3,
  gangNameMaxLength: 24,
  gangTagMinLength: 2,
  gangTagMaxLength: 5,

  // Territory
  territoryClaimCost: 2000,
  territoryBaseIncome: 50,
  territoryControlDecayRate: 2, // Per tick when no members present
  territoryWeakThreshold: 50, // Below this, can be contested
  territoryCrimeSuccessBonus: 0.10, // +10% crime success in controlled zones
  territoryHeatDecayBonus: 0.20, // +20% faster heat decay in controlled zones

  // Cooperative crimes
  coopMinParticipants: 2,
  coopMaxParticipants: 5,
  coopSuccessBonusPerMember: 0.10, // +10% per extra member (capped)
  coopSuccessBonusCap: 0.30, // Max +30% from members
  coopLootMultiplier: 1.5, // 1.5x total loot
  coopHeatReductionPerMember: 0.20, // 20% less heat per person
  coopSameGangBonus: 0.15, // +15% success for same gang
  coopStrongFriendshipBonus: 0.02, // +2% per strong friendship pair
  coopRecruitmentDuration: 10, // Ticks to wait for participants

  // Friendships
  friendshipInitialStrength: 50,
  friendshipInitialLoyalty: 50,
  friendshipDecayRate: 1, // Per 100 ticks of inactivity
  friendshipDecayInterval: 100, // Ticks between decay checks
  friendshipStrongThreshold: 75, // Strength above this = "strong" friendship

  // PvP Robbery
  robBaseSuccess: 0.40,
  robCombatSkillBonus: 0.05, // Per combat skill level
  robStealthSkillBonus: 0.03, // Per stealth skill level
  robCashStealMin: 0.10, // Min 10% of victim's cash
  robCashStealMax: 0.30, // Max 30% of victim's cash
  robFailureDamageMin: 10,
  robFailureDamageMax: 30,
  robHeat: 35, // Heat gain regardless of outcome

  // Betrayal
  betrayTreasurySteal: 0.50, // Steal 50% of gang treasury
  betrayReputationPenalty: 50, // -50 reputation
  betrayHeat: 40,
  betrayGangBanDuration: 1000, // Ticks before can join new gang

  // Gift limits
  giftCashMin: 1,
  giftCashMax: 10000,

  // Rent
  rentDueInterval: 100, // Ticks between rent payments
  rentGracePeriod: 10, // Ticks after due before eviction

  // Gang invites
  gangInviteExpiration: 50, // Ticks before invite expires

  // Coop crime expiration
  coopCrimeExpiration: 20, // Ticks before coop crime recruitment expires
} as const;

// ============================================================================
// GTA-LIKE FREEDOM FEATURE CONSTANTS
// ============================================================================

/**
 * Vehicle types for stealing and driving
 */
export const VEHICLE_TYPES = [
  "motorcycle",
  "car",
  "sports_car",
  "truck",
  "van",
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

/**
 * Disguise types for heat reduction
 */
export const DISGUISE_TYPES = ["basic", "professional", "elite"] as const;

export type DisguiseType = (typeof DISGUISE_TYPES)[number];

/**
 * Gambling risk levels
 */
export const GAMBLE_RISK_TYPES = [
  "lowRisk",
  "medRisk",
  "highRisk",
  "jackpot",
] as const;

export type GambleRiskType = (typeof GAMBLE_RISK_TYPES)[number];

/**
 * GTA-like freedom feature defaults and configuration
 */
export const GTA_DEFAULTS = {
  // ============================================================================
  // JAILBREAK SETTINGS
  // ============================================================================
  jailbreakBaseSuccess: 0.20, // 20% base success rate
  jailbreakCombatBonus: 0.03, // +3% per combat skill level
  jailbreakFailureSentenceAdd: 50, // Ticks added to sentence on failure
  jailbreakSuccessHeat: 20, // Heat gained on successful escape
  jailbreakFailureHeat: 30, // Heat gained on failed attempt

  // ============================================================================
  // BRIBE SETTINGS
  // ============================================================================
  bribeCostPerHeat: 20, // $20 per heat point to bribe
  bribeBaseSuccess: 0.60, // 60% base success rate
  bribeNegotiationBonus: 0.05, // +5% per negotiation skill level
  bribeFailureHeatAdd: 20, // Heat added on failed bribe
  bribeMinHeat: 60, // Minimum heat required to bribe

  // ============================================================================
  // ATTACK/COMBAT SETTINGS
  // ============================================================================
  attackBaseDamage: { min: 15, max: 40 }, // Damage range
  attackBaseSuccess: 0.50, // 50% base success rate
  attackCombatBonus: 0.05, // +5% per combat skill level
  attackHeat: 25, // Heat gained from attacking
  attackCounterDamage: { min: 5, max: 15 }, // Counter-attack damage on failure
  deathRespawnTicks: 100, // Ticks agent is hospitalized after death
  deathCashLoss: 0.25, // 25% of cash lost on death

  // ============================================================================
  // BOUNTY SETTINGS
  // ============================================================================
  bountyMinAmount: 500, // Minimum bounty amount
  bountyMaxAmount: 50000, // Maximum bounty amount
  bountyDurationTicks: 500, // Ticks before bounty expires
  bountyClaimHeat: 50, // Heat for claiming a bounty
  bountyExpiredRefund: 0.50, // 50% refund if bounty expires

  // ============================================================================
  // GAMBLING SETTINGS
  // ============================================================================
  gambleMinAmount: 10, // Minimum bet
  gambleMaxAmount: 5000, // Maximum bet
  gambleOdds: {
    lowRisk: { winChance: 0.45, multiplier: 2 }, // 45% chance for 2x
    medRisk: { winChance: 0.30, multiplier: 3 }, // 30% chance for 3x
    highRisk: { winChance: 0.15, multiplier: 5 }, // 15% chance for 5x
    jackpot: { winChance: 0.05, multiplier: 10 }, // 5% chance for 10x
  } as Record<GambleRiskType, { winChance: number; multiplier: number }>,

  // ============================================================================
  // DISGUISE SETTINGS
  // ============================================================================
  disguiseTypes: {
    basic: { cost: 200, heatReduction: 2, durationTicks: 50 },
    professional: { cost: 500, heatReduction: 4, durationTicks: 100 },
    elite: { cost: 1500, heatReduction: 8, durationTicks: 200 },
  } as Record<DisguiseType, { cost: number; heatReduction: number; durationTicks: number }>,

  // ============================================================================
  // VEHICLE SETTINGS
  // ============================================================================
  vehicleTypes: {
    motorcycle: { speedBonus: 0.25, stealDifficulty: 0.70, value: 500 },
    car: { speedBonus: 0.30, stealDifficulty: 0.50, value: 1000 },
    sports_car: { speedBonus: 0.50, stealDifficulty: 0.30, value: 3000 },
    truck: { speedBonus: 0.15, stealDifficulty: 0.60, value: 800 },
    van: { speedBonus: 0.20, stealDifficulty: 0.55, value: 700 },
  } as Record<VehicleType, { speedBonus: number; stealDifficulty: number; value: number }>,
  vehicleStealHeat: 20, // Heat gained from stealing a vehicle
  vehicleDrivingSkillBonus: 0.05, // +5% success per driving skill level
  vehicleConditionDecay: 1, // Condition decay per tick when driving
} as const;
