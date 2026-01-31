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
  startingCash: 500,
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
