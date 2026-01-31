/**
 * HTTP API Endpoints for ClawCity Agents
 *
 * All agent endpoints require: Authorization: Bearer <agentKey>
 *
 * Endpoints:
 * - GET /agent/state - Returns current agent state
 * - GET /agent/events - Returns agent's events
 * - POST /agent/act - Main action endpoint
 * - GET /agent/guide - Returns the agent prompt contract (no auth required)
 */

import { httpRouter } from "convex/server";
import {
  httpAction,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { hashAgentKey } from "./lib/auth";
import {
  ERROR_CODES,
  ErrorCode,
  ACTION_TYPES,
  ActionType,
  DEFAULTS,
} from "./lib/constants";
import { AGENT_GUIDE } from "./agentGuide";
import { handleAction } from "./actions";

// ============================================================================
// HTTP ROUTER SETUP
// ============================================================================

const http = httpRouter();

// ============================================================================
// INTERNAL QUERIES AND MUTATIONS
// ============================================================================

/**
 * Get agent state by key hash (for HTTP authentication)
 */
export const getAgentStateByKeyHash = internalQuery({
  args: { keyHash: v.string() },
  handler: async (ctx, args) => {
    // Get agent by key hash
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agentKeyHash", (q) => q.eq("agentKeyHash", args.keyHash))
      .first();

    if (!agent) {
      return { error: "UNAUTHORIZED" as const };
    }

    // Get world state
    const world = await ctx.db.query("world").first();

    // Get agent's current zone
    const zone = await ctx.db.get(agent.locationZoneId);

    // Get nearby jobs (in agent's zone, active only)
    const allJobs = await ctx.db
      .query("jobs")
      .withIndex("by_zoneId", (q) => q.eq("zoneId", agent.locationZoneId))
      .collect();
    const nearbyJobs = allJobs.filter((j) => j.active);

    // Get nearby businesses (in agent's zone, open only)
    const allBusinesses = await ctx.db
      .query("businesses")
      .withIndex("by_zoneId", (q) => q.eq("zoneId", agent.locationZoneId))
      .collect();
    const nearbyBusinesses = allBusinesses.filter((b) => b.status === "open");

    // Don't expose the key hash
    const { agentKeyHash: _, ...safeAgent } = agent;

    return {
      agent: safeAgent,
      world,
      zone,
      nearbyJobs,
      nearbyBusinesses,
    };
  },
});

/**
 * Get agent events by key hash (for HTTP authentication)
 */
export const getAgentEventsByKeyHash = internalQuery({
  args: {
    keyHash: v.string(),
    sinceTick: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get agent by key hash
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agentKeyHash", (q) => q.eq("agentKeyHash", args.keyHash))
      .first();

    if (!agent) {
      return { error: "UNAUTHORIZED" as const };
    }

    // Get events for this agent
    const allEvents = await ctx.db
      .query("events")
      .withIndex("by_agentId", (q) => q.eq("agentId", agent._id))
      .order("desc")
      .collect();

    // Filter by sinceTick and apply limit
    const events = allEvents
      .filter((e) => e.tick >= args.sinceTick)
      .slice(0, args.limit);

    return {
      agentId: agent._id,
      events,
    };
  },
});

/**
 * Execute an agent action (for HTTP /agent/act endpoint)
 */
export const executeAgentAction = internalMutation({
  args: {
    keyHash: v.string(),
    requestId: v.string(),
    action: v.string(),
    actionArgs: v.any(),
  },
  handler: async (ctx, args) => {
    // Get agent by key hash
    const agent = await ctx.db
      .query("agents")
      .withIndex("by_agentKeyHash", (q) => q.eq("agentKeyHash", args.keyHash))
      .first();

    if (!agent) {
      return { ok: false, error: "UNAUTHORIZED" as const, message: "Invalid API key" };
    }

    // Get world state
    const world = await ctx.db.query("world").first();
    if (!world) {
      return { ok: false, error: "INTERNAL_ERROR" as const, message: "World not initialized" };
    }

    // Check idempotency - look for existing action lock with this requestId
    const existingLocks = await ctx.db
      .query("actionLocks")
      .withIndex("by_agentId_requestId", (q) => q.eq("agentId", agent._id))
      .collect();

    const existingLock = existingLocks.find((l) => l.requestId === args.requestId);

    if (existingLock) {
      // Return cached result if available
      if (existingLock.result) {
        return existingLock.result;
      }
      return { ok: false, error: "DUPLICATE_REQUEST" as const, message: ERROR_CODES.DUPLICATE_REQUEST };
    }

    // Create action lock for idempotency
    const now = Date.now();
    await ctx.db.insert("actionLocks", {
      agentId: agent._id,
      requestId: args.requestId,
      createdAt: now,
      expiresAt: now + DEFAULTS.actionLockExpirationMs,
      result: null,
    });

    // Execute the action
    const actionResult = await handleAction(
      {
        ctx,
        agent: agent as Doc<"agents">,
        world: world as Doc<"world">,
        requestId: args.requestId,
      },
      args.action as ActionType,
      args.actionArgs ?? {}
    );

    // Get updated agent state for response
    const updatedAgent = await ctx.db.get(agent._id);

    // Get zone for location info
    const zone = updatedAgent ? await ctx.db.get(updatedAgent.locationZoneId) : null;

    // Build response
    const response = {
      ok: actionResult.ok,
      tick: world.tick,
      ...(actionResult.ok
        ? { result: actionResult.result }
        : { error: actionResult.error, message: actionResult.message }),
      agent: updatedAgent
        ? {
            status: updatedAgent.status,
            location: zone ? zone.slug : null,
            cash: updatedAgent.cash,
            health: updatedAgent.health,
            heat: updatedAgent.heat,
          }
        : null,
    };

    // Update action lock with result for future duplicate requests
    const locksToUpdate = await ctx.db
      .query("actionLocks")
      .withIndex("by_agentId_requestId", (q) => q.eq("agentId", agent._id))
      .collect();

    const lockToUpdate = locksToUpdate.find((l) => l.requestId === args.requestId);
    if (lockToUpdate) {
      await ctx.db.patch(lockToUpdate._id, { result: response });
    }

    return response;
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a JSON response with proper headers
 */
function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    },
  });
}

/**
 * Create an error response
 */
function errorResponse(
  error: ErrorCode,
  message?: string,
  status: number = 400
): Response {
  return jsonResponse(
    {
      ok: false,
      error,
      message: message || ERROR_CODES[error],
    },
    status
  );
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Create CORS preflight response
 */
function corsResponse(methods: string): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": methods,
    },
  });
}

// ============================================================================
// GET /agent/guide - Agent prompt contract (no auth required)
// ============================================================================

http.route({
  path: "/agent/guide",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(AGENT_GUIDE, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

http.route({
  path: "/agent/guide",
  method: "OPTIONS",
  handler: httpAction(async () => corsResponse("GET, OPTIONS")),
});

// ============================================================================
// GET /agent/state - Returns current agent state
// ============================================================================

http.route({
  path: "/agent/state",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Extract and validate auth token
    const token = extractBearerToken(request);
    if (!token) {
      return errorResponse(
        "UNAUTHORIZED",
        "Missing or invalid Authorization header. Use: Authorization: Bearer <your-api-key>",
        401
      );
    }

    // Hash the token for lookup
    const keyHash = await hashAgentKey(token);

    // Get agent state
    const result = await ctx.runQuery(internal.http.getAgentStateByKeyHash, {
      keyHash,
    });

    if ("error" in result) {
      return errorResponse("UNAUTHORIZED", "Invalid API key", 401);
    }

    const { agent, world, zone, nearbyJobs, nearbyBusinesses } = result;

    // Determine available actions based on agent status
    const availableActions: ActionType[] = [];
    if (agent.status === "idle") {
      availableActions.push(
        "MOVE",
        "TAKE_JOB",
        "BUY",
        "SELL",
        "HEAL",
        "REST",
        "USE_ITEM",
        "COMMIT_CRIME",
        "START_BUSINESS",
        "SET_PRICES",
        "STOCK_BUSINESS"
      );
    }

    return jsonResponse({
      tick: world?.tick ?? 0,
      agent: {
        name: agent.name,
        status: agent.status,
        location: zone ? { slug: zone.slug, name: zone.name } : null,
        cash: agent.cash,
        health: agent.health,
        stamina: agent.stamina,
        reputation: agent.reputation,
        heat: agent.heat,
        busyUntilTick: agent.busyUntilTick,
        busyAction: agent.busyAction,
        inventory: agent.inventory,
        skills: agent.skills,
        stats: agent.stats,
      },
      availableActions,
      nearbyJobs: nearbyJobs.map((job: Doc<"jobs">) => ({
        jobId: job._id,
        type: job.type,
        title: job.title,
        wage: job.wage,
        durationTicks: job.durationTicks,
        requirements: job.requirements,
        staminaCost: job.staminaCost,
      })),
      nearbyBusinesses: nearbyBusinesses.map((biz: Doc<"businesses">) => ({
        businessId: biz._id,
        type: biz.type,
        name: biz.name,
        status: biz.status,
        inventory: biz.inventory,
      })),
    });
  }),
});

http.route({
  path: "/agent/state",
  method: "OPTIONS",
  handler: httpAction(async () => corsResponse("GET, OPTIONS")),
});

// ============================================================================
// GET /agent/events - Returns agent's events
// ============================================================================

http.route({
  path: "/agent/events",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Extract and validate auth token
    const token = extractBearerToken(request);
    if (!token) {
      return errorResponse(
        "UNAUTHORIZED",
        "Missing or invalid Authorization header. Use: Authorization: Bearer <your-api-key>",
        401
      );
    }

    // Hash the token for lookup
    const keyHash = await hashAgentKey(token);

    // Parse query parameters
    const url = new URL(request.url);
    const sinceTick = parseInt(url.searchParams.get("sinceTick") ?? "0", 10);
    const limit = Math.min(
      parseInt(
        url.searchParams.get("limit") ?? String(DEFAULTS.defaultEventsLimit),
        10
      ),
      DEFAULTS.maxEventsPerQuery
    );

    // Get events
    const result = await ctx.runQuery(internal.http.getAgentEventsByKeyHash, {
      keyHash,
      sinceTick,
      limit,
    });

    if ("error" in result) {
      return errorResponse("UNAUTHORIZED", "Invalid API key", 401);
    }

    return jsonResponse({
      events: result.events,
      sinceTick,
      limit,
    });
  }),
});

http.route({
  path: "/agent/events",
  method: "OPTIONS",
  handler: httpAction(async () => corsResponse("GET, OPTIONS")),
});

// ============================================================================
// POST /agent/act - Main action endpoint
// ============================================================================

http.route({
  path: "/agent/act",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Extract and validate auth token
    const token = extractBearerToken(request);
    if (!token) {
      return errorResponse(
        "UNAUTHORIZED",
        "Missing or invalid Authorization header. Use: Authorization: Bearer <your-api-key>",
        401
      );
    }

    // Hash the token for lookup
    const keyHash = await hashAgentKey(token);

    // Parse request body
    let body: {
      requestId?: string;
      action?: string;
      args?: Record<string, unknown>;
    };
    try {
      body = await request.json();
    } catch {
      return errorResponse("INVALID_REQUEST_ID", "Invalid JSON in request body");
    }

    const { requestId, action, args } = body;

    // Validate requestId
    if (!requestId || typeof requestId !== "string" || requestId.length < 8) {
      return errorResponse(
        "INVALID_REQUEST_ID",
        "requestId must be a string with at least 8 characters"
      );
    }

    // Validate action
    if (!action || !ACTION_TYPES.includes(action as ActionType)) {
      return errorResponse(
        "INVALID_ACTION",
        `Invalid action: ${action}. Valid actions: ${ACTION_TYPES.join(", ")}`
      );
    }

    // Execute the action
    const result = await ctx.runMutation(internal.http.executeAgentAction, {
      keyHash,
      requestId,
      action,
      actionArgs: args ?? {},
    });

    // Handle unauthorized error specially
    if (!result.ok && result.error === "UNAUTHORIZED") {
      return errorResponse("UNAUTHORIZED", "Invalid API key", 401);
    }

    return jsonResponse(result);
  }),
});

http.route({
  path: "/agent/act",
  method: "OPTIONS",
  handler: httpAction(async () => corsResponse("POST, OPTIONS")),
});

// ============================================================================
// SKILL DOCUMENTATION ROUTES (no auth required)
// ============================================================================

import { SKILL_MD, REGISTER_MD, HEARTBEAT_MD } from "./skillDocs";

http.route({
  path: "/skill.md",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(SKILL_MD, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

http.route({
  path: "/register.md",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(REGISTER_MD, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

http.route({
  path: "/heartbeat.md",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(HEARTBEAT_MD, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

// ============================================================================
// EXPORT
// ============================================================================

export default http;
