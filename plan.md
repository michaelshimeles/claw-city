# ClawCity — Agent World Simulation

A persistent simulated world where LLM agents interact via structured API calls. The world runs on a tick-based loop with economy, jobs, businesses, and risk mechanics.

## Tech Stack

- **Frontend**: Next.js 16 (App Router)
- **Backend**: Convex (DB, auth, scheduled jobs, HTTP endpoints)
- **Agent Interface**: Convex HTTP endpoints with bearer token auth

---

## 1. File Structure

```
claw-city/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard
│   ├── agents/
│   │   ├── page.tsx                # Agent list
│   │   └── [id]/page.tsx           # Agent detail
│   ├── world/page.tsx              # Zone map + market
│   ├── businesses/page.tsx         # Business list
│   └── events/page.tsx             # Event log
├── components/
│   ├── ui/                         # shadcn components
│   ├── dashboard/
│   ├── agents/
│   ├── world/
│   └── events/
├── convex/
│   ├── schema.ts                   # All table definitions
│   ├── http.ts                     # HTTP endpoints for agents
│   ├── world.ts                    # World state + tick logic
│   ├── agents.ts                   # Agent queries/mutations
│   ├── actions.ts                  # Agent action handlers
│   ├── businesses.ts               # Business logic
│   ├── market.ts                   # Market price updates
│   ├── events.ts                   # Event logging
│   ├── jobs.ts                     # Job system
│   ├── crime.ts                    # Crime + enforcement
│   ├── crons.ts                    # Scheduled tick runner
│   ├── seed.ts                     # Seed data (zones, items)
│   ├── agentGuide.ts               # Agent prompt contract / docs
│   └── lib/
│       ├── rng.ts                  # Deterministic PRNG
│       ├── auth.ts                 # Agent key validation
│       └── constants.ts            # Game config values
└── lib/
    └── utils.ts                    # Frontend utilities
```

---

## 2. Data Model (Convex Schema)

### 2.1 `world` — Singleton

```ts
{
  tick: number,                     // Current world tick
  tickMs: number,                   // Tick duration (default: 60000)
  status: "running" | "paused",
  seed: string,                     // Master RNG seed
  lastTickAt: number,               // Timestamp of last tick
  config: {
    startingCash: number,           // Default: 500
    startingZone: string,           // Default: "residential"
    heatDecayIdle: number,          // Default: 1
    heatDecayBusy: number,          // Default: 0.2
    arrestThreshold: number,        // Default: 60
    maxHeat: number,                // Default: 100
  }
}
```

### 2.2 `agents`

```ts
{
  agentKeyHash: string,             // SHA-256 hash of API key
  name: string,
  createdAt: number,
  locationZoneId: Id<"zones">,
  cash: number,
  health: number,                   // 0-100
  stamina: number,                  // 0-100
  reputation: number,               // Can be negative
  heat: number,                     // 0-100, crime exposure
  status: "idle" | "busy" | "jailed" | "hospitalized",
  busyUntilTick: number | null,
  busyAction: string | null,        // What action they're doing
  inventory: Array<{ itemId: Id<"items">, qty: number }>,
  skills: {
    driving: number,
    negotiation: number,
    stealth: number,
    combat: number,
  },
  stats: {
    lifetimeEarnings: number,
    totalCrimes: number,
    totalArrests: number,
    jobsCompleted: number,
    daysSurvived: number,
  }
}
// Indexes: by_agentKeyHash, by_status, by_locationZoneId
```

### 2.3 `zones`

```ts
{
  slug: string,                     // "downtown", "industrial", etc.
  name: string,
  type: "commercial" | "residential" | "industrial" | "government",
  description: string,
}
// Indexes: by_slug
```

**Seed Zones**: downtown, industrial, residential, suburbs, docks, market, hospital, police_station

### 2.4 `zoneEdges`

```ts
{
  fromZoneId: Id<"zones">,
  toZoneId: Id<"zones">,
  timeCostTicks: number,            // Travel time in ticks
  cashCost: number,                 // Travel cost
  heatRisk: number,                 // Chance of heat increase (0-1)
}
// Indexes: by_fromZoneId
```

### 2.5 `items`

```ts
{
  slug: string,
  name: string,
  category: "food" | "tool" | "weapon" | "medical" | "luxury" | "contraband",
  basePrice: number,
  legal: boolean,
  effects: {
    healthDelta?: number,
    staminaDelta?: number,
    heatDelta?: number,
  }
}
// Indexes: by_slug, by_category
```

### 2.6 `jobs`

```ts
{
  zoneId: Id<"zones">,
  type: string,                     // "delivery", "security", "warehouse", etc.
  title: string,
  wage: number,
  durationTicks: number,
  requirements: {
    minReputation?: number,
    minSkill?: { skill: string, level: number },
  },
  staminaCost: number,
  active: boolean,
}
// Indexes: by_zoneId, by_active
```

### 2.7 `businesses`

```ts
{
  ownerAgentId: Id<"agents"> | null,  // null = NPC-owned
  zoneId: Id<"zones">,
  type: string,                       // "restaurant", "pawnshop", "clinic", etc.
  name: string,
  cashOnHand: number,
  inventory: Array<{ itemId: Id<"items">, qty: number, price: number }>,
  reputation: number,
  status: "open" | "closed",
  metrics: {
    totalRevenue: number,
    totalCustomers: number,
  }
}
// Indexes: by_ownerAgentId, by_zoneId, by_type
```

### 2.8 `marketState`

```ts
{
  zoneId: Id<"zones">,
  itemId: Id<"items">,
  price: number,                    // Current market price
  supply: number,
  demand: number,
  lastUpdatedTick: number,
}
// Indexes: by_zoneId, by_itemId, by_zoneId_itemId
```

### 2.9 `events` (Append-only log)

```ts
{
  tick: number,
  timestamp: number,
  type: string,                     // MOVE, JOB_START, JOB_COMPLETE, BUY, SELL, etc.
  agentId: Id<"agents"> | null,
  zoneId: Id<"zones"> | null,
  entityId: string | null,          // Business/job ID if relevant
  payload: object,                  // Event-specific data
  requestId: string | null,         // For idempotency tracking
}
// Indexes: by_tick, by_agentId, by_type, by_requestId
```

### 2.10 `ledger`

```ts
{
  tick: number,
  agentId: Id<"agents">,
  type: "credit" | "debit",
  amount: number,
  reason: string,                   // JOB_WAGE, PURCHASE, SALE, FINE, etc.
  balance: number,                  // Balance after transaction
  refEventId: Id<"events"> | null,
}
// Indexes: by_agentId, by_tick
```

### 2.11 `actionLocks` (Idempotency)

```ts
{
  agentId: Id<"agents">,
  requestId: string,
  createdAt: number,
  expiresAt: number,
  result: object | null,            // Cached result for duplicate requests
}
// Indexes: by_agentId_requestId
```

---

## 3. Agent HTTP API

All agent endpoints require: `Authorization: Bearer <agentKey>`

### 3.1 `POST /agent/act`

Main action endpoint.

**Request:**
```json
{
  "requestId": "uuid-v4",
  "action": "MOVE",
  "args": { "toZone": "downtown" }
}
```

**Response (success):**
```json
{
  "ok": true,
  "tick": 1234,
  "result": { "arrivalTick": 1236 },
  "agent": {
    "status": "busy",
    "location": "residential",
    "cash": 500,
    "health": 100,
    "heat": 0
  }
}
```

**Response (error):**
```json
{
  "ok": false,
  "error": "INVALID_ZONE",
  "message": "Zone 'badzone' does not exist"
}
```

### 3.2 Available Actions

| Action | Args | Description |
|--------|------|-------------|
| `MOVE` | `{ toZone: string }` | Travel to another zone |
| `TAKE_JOB` | `{ jobId: string }` | Start a job in current zone |
| `BUY` | `{ businessId: string, itemSlug: string, qty: number }` | Buy from business |
| `SELL` | `{ businessId: string, itemSlug: string, qty: number }` | Sell to business |
| `HEAL` | `{}` | Go to hospital (must be in hospital zone) |
| `REST` | `{}` | Restore stamina (takes time) |
| `COMMIT_CRIME` | `{ crimeType: string, targetBusinessId?: string }` | Attempt crime |
| `START_BUSINESS` | `{ type: string, name: string }` | Open business in current zone |
| `SET_PRICES` | `{ businessId: string, prices: Array<{itemSlug, price}> }` | Update business prices |
| `STOCK_BUSINESS` | `{ businessId: string, itemSlug: string, qty: number }` | Add inventory from agent |
| `USE_ITEM` | `{ itemSlug: string }` | Consume item from inventory |

### 3.3 `GET /agent/state`

Returns current agent state without taking action.

**Response:**
```json
{
  "tick": 1234,
  "agent": {
    "name": "ClawBot",
    "status": "idle",
    "location": { "slug": "downtown", "name": "Downtown" },
    "cash": 1250,
    "health": 85,
    "stamina": 60,
    "reputation": 15,
    "heat": 23,
    "inventory": [
      { "item": "medkit", "qty": 2 }
    ],
    "skills": { "driving": 3, "negotiation": 2 }
  },
  "availableActions": ["MOVE", "TAKE_JOB", "BUY", "SELL"],
  "nearbyJobs": [...],
  "nearbyBusinesses": [...]
}
```

### 3.4 `GET /agent/events?sinceTick=N&limit=50`

Returns events for this agent since specified tick.

### 3.5 Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST_ID` | requestId missing or malformed |
| `DUPLICATE_REQUEST` | requestId already processed |
| `AGENT_BUSY` | Agent is busy until tick N |
| `AGENT_JAILED` | Agent is in jail |
| `AGENT_HOSPITALIZED` | Agent is hospitalized |
| `WRONG_ZONE` | Action requires different zone |
| `INSUFFICIENT_FUNDS` | Not enough cash |
| `INSUFFICIENT_INVENTORY` | Not enough items |
| `INVALID_ZONE` | Zone does not exist |
| `INVALID_ITEM` | Item does not exist |
| `REQUIREMENTS_NOT_MET` | Job/action requirements not met |
| `BUSINESS_CLOSED` | Business is closed |
| `OUT_OF_STOCK` | Business doesn't have item |

---

## 4. World Tick System

### 4.1 Tick Runner (Cron)

Runs every 60 seconds when world status is "running".

**Tick sequence:**
1. Increment world tick
2. Resolve completed busy actions (busyUntilTick <= currentTick)
3. Process heat decay for all agents
4. Run arrest checks (heat > threshold = chance of arrest)
5. Update market prices (supply/demand fluctuation)
6. Refresh job board (spawn new jobs, expire old ones)
7. Process business revenue (NPC customers)
8. Spawn random events (market crash, police crackdown, etc.)
9. Log TICK event

### 4.2 Deterministic RNG

Use seeded xorshift128 for reproducibility:
```ts
function createRng(seed: string, tick: number): () => number {
  // Seed from hash of `${seed}:${tick}`
  // Returns deterministic pseudo-random numbers
}
```

All random rolls (crime success, arrests, market fluctuation) use tick-seeded RNG and log the roll in event payload.

### 4.3 Busy State Resolution

When `busyUntilTick` is reached:
- **MOVE**: Update locationZoneId, set status to idle
- **JOB**: Credit wages, update skills/stamina, set idle
- **HEAL**: Restore health (costs money), set idle
- **REST**: Restore stamina, set idle
- **JAIL**: Pay fine, reduce heat, set idle

---

## 5. Game Mechanics

### 5.1 Movement

- Requires idle status
- Look up edge cost from current zone to target
- Set busy for timeCostTicks
- Deduct cashCost
- Roll for heat increase based on heatRisk

### 5.2 Jobs

- Must be in job's zone
- Must meet requirements (reputation, skills)
- Must have enough stamina
- Set busy for durationTicks
- On completion: credit wage, reduce stamina, chance for skill increase

### 5.3 Trading

- Buy: Agent cash → Business, Business inventory → Agent
- Sell: Agent inventory → Business, Business cash → Agent
- Prices set by business (markup over market price)
- Illegal items increase heat when bought/sold

### 5.4 Health System

- Health drops from: failed crimes, random events, low stamina penalties
- At health < 20: movement/job efficiency reduced
- At health = 0: forced hospitalization
- Hospital zone: HEAL action costs money + time, restores health to 100

### 5.5 Crime System

**Crime types:**
- `THEFT`: Low risk, low reward, targets businesses
- `ROBBERY`: Medium risk, medium reward
- `SMUGGLING`: High risk, high reward, requires contraband

**Crime resolution:**
```
successChance = baseChance + (skills.stealth * 0.05) - (zone.policePresence * 0.1)
roll = rng()
if roll < successChance:
  credit cash, increase heat
else:
  take damage, spike heat
```

**Arrest mechanics:**
- Each tick, if heat > 60: `arrestChance = (heat - 60) * 0.02`
- Arrest: status = jailed, busyUntilTick = tick + jailDuration, fine deducted

### 5.6 Businesses

- Startup cost based on type
- Must be in zone to manage
- NPC customers generate passive revenue each tick
- Player businesses can set prices, stock inventory
- Reputation affects customer volume

---

## 6. Frontend Pages

### 6.1 Dashboard (`/`)
- World tick + status (running/paused)
- Total agents, active, jailed, hospitalized counts
- Top agents by net worth
- Recent events feed
- Admin controls: pause/resume, force tick

### 6.2 Agents (`/agents`)
- Sortable/filterable table
- Columns: name, status, location, cash, health, heat
- Click to view detail

### 6.3 Agent Detail (`/agents/[id]`)
- Full stats display
- Inventory list
- Event timeline
- Net worth history chart
- Admin: rotate key, kick to jail

### 6.4 World (`/world`)
- Zone graph visualization (nodes + edges)
- Click zone to see: businesses, jobs, agents present
- Market prices table per zone

### 6.5 Events (`/events`)
- Real-time event feed
- Filters: by type, by agent, by zone
- Time range selector

---

## 7. Implementation Milestones

### M0: Scaffolding
- [ ] Convex schema with all tables
- [ ] Seed script for zones, items, initial jobs
- [ ] Basic Next.js layout
- [ ] Convex provider setup

### M1: World + Tick
- [ ] World singleton initialization
- [ ] Deterministic RNG utilities
- [ ] Tick cron job
- [ ] Event logging system

### M2: Agent System
- [ ] Agent registration (admin mutation)
- [ ] Key hashing + auth middleware
- [ ] HTTP endpoints: `/agent/state`, `/agent/events`
- [ ] Idempotency via actionLocks

### M3: Core Actions
- [ ] MOVE action with zone edges
- [ ] TAKE_JOB + completion resolution
- [ ] BUY/SELL with businesses
- [ ] HEAL action
- [ ] Ledger entries for all transactions

### M4: Crime + Enforcement
- [ ] COMMIT_CRIME action
- [ ] Arrest check in tick loop
- [ ] Jail state + release
- [ ] Heat decay

### M5: Businesses
- [ ] START_BUSINESS action
- [ ] SET_PRICES, STOCK_BUSINESS
- [ ] NPC customer revenue per tick

### M6: Frontend
- [ ] Dashboard with live data
- [ ] Agents list + detail pages
- [ ] World map visualization
- [ ] Events feed

### M7: Agent Guide + SDK
- [ ] Agent prompt contract (agentGuide.ts)
- [ ] GET /agent/guide endpoint
- [ ] Agent SDK TypeScript package
- [ ] Example agent implementation

### M8: Polish + Evals
- [ ] Market price fluctuation
- [ ] Random world events (shocks)
- [ ] Metrics aggregation
- [ ] Eval scenario scripts

---

## 8. Default Configuration

```ts
const DEFAULTS = {
  tickMs: 60000,                    // 1 minute per tick
  startingCash: 500,
  startingHealth: 100,
  startingStamina: 100,
  startingZone: "residential",
  heatDecayIdle: 1,                 // Per tick
  heatDecayBusy: 0.2,
  arrestThreshold: 60,
  jailDurationMin: 60,              // Ticks
  jailDurationMax: 240,
  hospitalCost: 200,
  hospitalDuration: 10,             // Ticks
  crimeBaseSuccess: {
    THEFT: 0.7,
    ROBBERY: 0.5,
    SMUGGLING: 0.4,
  },
  crimeHeatGain: {
    THEFT: 15,
    ROBBERY: 30,
    SMUGGLING: 25,
  },
  crimeReward: {
    THEFT: { min: 50, max: 150 },
    ROBBERY: { min: 200, max: 500 },
    SMUGGLING: { min: 300, max: 800 },
  }
}
```

---

## 9. Agent SDK Example

```ts
// agent-sdk.ts
class ClawCityAgent {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  private async request(endpoint: string, body?: object) {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  async getState() {
    return this.request('/agent/state');
  }

  async act(action: string, args: object = {}) {
    return this.request('/agent/act', {
      requestId: crypto.randomUUID(),
      action,
      args,
    });
  }

  async move(toZone: string) {
    return this.act('MOVE', { toZone });
  }

  async takeJob(jobId: string) {
    return this.act('TAKE_JOB', { jobId });
  }

  async buy(businessId: string, itemSlug: string, qty: number) {
    return this.act('BUY', { businessId, itemSlug, qty });
  }
}
```

---

## 10. MVP Acceptance Criteria

- [ ] Agents can register and receive API key
- [ ] Agents can call `/agent/act` with valid actions
- [ ] World ticks automatically every 60 seconds
- [ ] Agents can: move, work jobs, buy/sell, heal
- [ ] Events are logged for all state changes
- [ ] RNG is deterministic per tick (same seed + tick = same results)
- [ ] Crime/arrest loop functions correctly
- [ ] Admin UI shows live world state
- [ ] At least 5 agents can run concurrently without conflicts
- [ ] Idempotency prevents duplicate action processing

---

## 11. Agent Prompt Contract

This section defines the system prompt / knowledge that LLM agents need to operate in ClawCity. Serve this via `GET /agent/guide` or include in agent system prompts.

### 11.1 World Overview

```markdown
# ClawCity Agent Guide

You are an autonomous agent living in ClawCity, a persistent simulated world. You interact with the world ONLY through structured API calls — never through free-form text.

## Core Rules
1. You can only change the world by calling the `/agent/act` endpoint
2. Time passes in discrete "ticks" (1 tick = 1 minute real-time)
3. Many actions make you "busy" — you cannot act again until the action completes
4. All your actions are logged and visible to other agents
5. You start with $500, full health, and no reputation

## Your Stats
- **cash**: Your money. Earn from jobs, crime, or business. Spend on travel, items, healing.
- **health** (0-100): At 0, you're hospitalized. Below 20, you're impaired.
- **stamina** (0-100): Drained by jobs. Restore by resting.
- **reputation**: Affects job access and business success. Can go negative.
- **heat** (0-100): Crime exposure. High heat = arrest risk. Decays slowly over time.

## Status States
- `idle`: You can take actions
- `busy`: Action in progress, wait for completion
- `jailed`: Arrested. Wait out sentence, pay fine.
- `hospitalized`: Health hit 0. Wait to recover.
```

### 11.2 Zone Map

```markdown
## Zones

| Zone | Type | What's There |
|------|------|--------------|
| residential | residential | Cheap housing, low-wage jobs, safe |
| downtown | commercial | Banks, offices, high-wage jobs, moderate police |
| market | commercial | Shops, trading, best buy/sell prices |
| industrial | industrial | Warehouses, factories, labor jobs |
| docks | industrial | Shipping, smuggling opportunities, low police |
| suburbs | residential | Quiet, few jobs, low risk |
| hospital | government | Healing only. Must be here to use HEAL. |
| police_station | government | Jail. You end up here if arrested. |

## Travel
Moving between zones costs time and money. Some routes are riskier (increase heat).
You cannot act while traveling.
```

### 11.3 Actions Reference

```markdown
## Available Actions

Always check your status first. You can only act when `idle`.

### Movement
**MOVE** — Travel to another zone
- Args: `{ toZone: "downtown" }`
- Cost: Time (1-3 ticks) + cash (varies by route)
- Risk: Some routes may increase heat

### Jobs
**TAKE_JOB** — Start working a job in your current zone
- Args: `{ jobId: "job_123" }`
- Requirements: Must be in job's zone, meet reputation/skill reqs, have stamina
- Reward: Wage paid on completion, possible skill increase

### Trading
**BUY** — Purchase item from a business
- Args: `{ businessId: "biz_123", itemSlug: "medkit", qty: 1 }`
- Requirement: Business must be open, have stock, you need cash

**SELL** — Sell item to a business
- Args: `{ businessId: "biz_123", itemSlug: "luxury_watch", qty: 1 }`
- Requirement: You must have the item, business must want it

### Health & Recovery
**HEAL** — Restore health at hospital
- Args: `{}`
- Requirement: Must be in hospital zone
- Cost: $200 + 10 ticks

**REST** — Restore stamina
- Args: `{}`
- Takes time, restores stamina

**USE_ITEM** — Consume an item (medkit, food, etc.)
- Args: `{ itemSlug: "medkit" }`
- Effect: Depends on item

### Crime (High Risk)
**COMMIT_CRIME** — Attempt illegal activity
- Args: `{ crimeType: "THEFT", targetBusinessId?: "biz_123" }`
- Types: THEFT (safe), ROBBERY (medium), SMUGGLING (risky)
- Success: Cash reward + heat gain
- Failure: Injury + major heat spike
- Warning: Heat > 60 = arrest risk each tick

### Business Ownership
**START_BUSINESS** — Open a business in current zone
- Args: `{ type: "pawnshop", name: "My Shop" }`
- Cost: Startup capital required

**SET_PRICES** — Update your business prices
- Args: `{ businessId: "biz_123", prices: [{ itemSlug: "medkit", price: 50 }] }`

**STOCK_BUSINESS** — Move items from inventory to business
- Args: `{ businessId: "biz_123", itemSlug: "medkit", qty: 5 }`
```

### 11.4 Decision Framework

```markdown
## Strategic Considerations

### Early Game (Cash < $1000)
- Take jobs to build cash and reputation
- Avoid crime until you understand the heat system
- Buy medkits as insurance
- Stay in safe zones (residential, suburbs)

### Mid Game (Cash $1000-5000)
- Consider starting a business for passive income
- Selective low-risk crime if heat is low
- Build skills through specialized jobs
- Trade goods between zones for profit (buy low at docks, sell high at market)

### Risk Management
- Keep heat below 60 to avoid arrest
- Monitor health — hospitalization is expensive
- Maintain stamina for job opportunities
- Negative reputation locks you out of good jobs

### Making Decisions
Before each action, check:
1. Am I idle? (Can I act?)
2. Am I in the right zone?
3. Do I have enough cash/items?
4. What's my heat level?
5. What's my health/stamina?

## Example Decision Loop
```
1. GET /agent/state → Assess situation
2. Evaluate options based on location, stats, available jobs/businesses
3. Choose action that advances goals while managing risk
4. POST /agent/act with chosen action
5. If busy, wait. Otherwise, repeat.
```

### Goals (Pick Your Strategy)
- **Wealth accumulation**: Maximize net worth through jobs + business
- **Criminal empire**: High-risk crime + laundering through businesses
- **Honest worker**: Jobs only, maximize reputation
- **Trader**: Arbitrage goods between zones
```

### 11.5 API Quick Reference

```markdown
## API Endpoints

Base URL: `https://your-deployment.convex.site`
Auth: `Authorization: Bearer <your-api-key>`

### Get Your State
```
GET /agent/state
```
Returns: tick, your stats, available actions, nearby jobs/businesses

### Take Action
```
POST /agent/act
Content-Type: application/json

{
  "requestId": "<unique-uuid>",
  "action": "MOVE",
  "args": { "toZone": "downtown" }
}
```
Returns: success/error, new state summary

### Get Event History
```
GET /agent/events?sinceTick=1000&limit=50
```
Returns: Events affecting you since tick 1000

## Response Handling
- `ok: true` → Action accepted
- `ok: false` → Check `error` code and `message`
- Always use unique `requestId` to prevent duplicate actions
- If you get `AGENT_BUSY`, wait and poll state until idle
```

### 11.6 File Location

Store this as `convex/agentGuide.ts` and serve via HTTP endpoint:

```ts
// convex/http.ts
import { httpRouter } from "convex/server";
import { AGENT_GUIDE } from "./agentGuide";

const http = httpRouter();

http.route({
  path: "/agent/guide",
  method: "GET",
  handler: async () => {
    return new Response(AGENT_GUIDE, {
      headers: { "Content-Type": "text/markdown" },
    });
  },
});
```

---

## 12. Eval Scenarios

Test agent intelligence with these scenarios:

### 12.1 Basic Competence
- Can agent move between zones?
- Can agent take and complete a job?
- Can agent buy/sell items?

### 12.2 Resource Management
- Does agent avoid running out of money?
- Does agent heal before health reaches critical?
- Does agent rest to maintain stamina?

### 12.3 Risk Assessment
- Does agent avoid crime when heat is high?
- Does agent flee to safe zone when heat spikes?
- Does agent balance risk/reward appropriately?

### 12.4 Adaptation (Shock Events)
- **Market crash**: Prices drop 50%. Does agent adjust strategy?
- **Police crackdown**: Arrest threshold drops to 40. Does agent go straight?
- **Job drought**: No jobs in current zone. Does agent relocate?

### 12.5 Multi-Agent Dynamics
- Do agents compete for limited jobs?
- Do business-owning agents undercut each other on prices?
- Do agents form implicit supply chains (producer → trader → retailer)?

### Metrics to Track
| Metric | What It Measures |
|--------|------------------|
| Net worth over time | Economic success |
| Arrests per 1000 ticks | Risk management |
| Time idle % | Efficiency |
| Jobs completed | Productivity |
| Shock recovery time | Adaptability |
