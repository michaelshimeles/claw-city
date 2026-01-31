/**
 * ClawCity Simulation Script
 *
 * This script seeds the database, creates test agents, and simulates activity.
 * Run with: npx tsx scripts/simulate.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://exciting-wildebeest-782.convex.cloud";
const SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "https://exciting-wildebeest-782.convex.site";
const NUM_AGENTS = 5;

const client = new ConvexHttpClient(CONVEX_URL);

// Agent names for simulation
const AGENT_NAMES = [
  "Agent Alpha",
  "Shadow Runner",
  "Street Hustler",
  "Market Maven",
  "Dock Worker Dan",
  "Corporate Claire",
  "Sneaky Steve",
  "Lucky Lucy",
];

interface AgentCredentials {
  name: string;
  agentId: string;
  apiKey: string;
}

// Helper to make API calls
async function apiCall(endpoint: string, method: string, apiKey?: string, body?: object) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${SITE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return response.json();
}

// Generate unique request ID
function generateRequestId(): string {
  return `sim-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=".repeat(60));
  console.log("ClawCity Simulation");
  console.log("=".repeat(60));
  console.log(`Convex URL: ${CONVEX_URL}`);
  console.log(`Site URL: ${SITE_URL}`);
  console.log("");

  // Step 1: Check world state
  console.log("Step 1: Checking world state...");
  const world = await client.query(api.world.getWorld);

  if (!world) {
    console.log("  World not initialized. Please run seed first via Convex Dashboard.");
    console.log("  Go to: https://dashboard.convex.dev");
    console.log("  Navigate to Functions > seed > seedAll and run it.");
    console.log("");
    console.log("  Or use the Convex CLI:");
    console.log("  npx convex run seed:seedAll");
    return;
  }

  console.log(`  World status: ${world.status}`);
  console.log(`  Current tick: ${world.tick}`);
  console.log("");

  // Step 2: Register test agents
  console.log(`Step 2: Registering ${NUM_AGENTS} test agents...`);
  const agents: AgentCredentials[] = [];

  for (let i = 0; i < NUM_AGENTS; i++) {
    const name = AGENT_NAMES[i] || `Test Agent ${i + 1}`;
    try {
      const result = await client.mutation(api.agents.registerAgent, { name });
      agents.push({
        name,
        agentId: result.agentId,
        apiKey: result.apiKey,
      });
      console.log(`  Registered: ${name} (${result.agentId.substring(0, 8)}...)`);
    } catch (error: any) {
      if (error.message?.includes("already registered")) {
        console.log(`  Skipped: ${name} (already exists)`);
      } else {
        console.log(`  Failed: ${name} - ${error.message}`);
      }
    }
  }
  console.log("");

  if (agents.length === 0) {
    console.log("No new agents registered. Checking existing agents...");
    const existingAgents = await client.query(api.agents.listAgents, {});
    console.log(`Found ${existingAgents.length} existing agents.`);

    if (existingAgents.length === 0) {
      console.log("No agents found. Cannot simulate.");
      return;
    }

    console.log("");
    console.log("Since we can't retrieve API keys for existing agents,");
    console.log("you can test via the HTTP API with a new agent.");
    console.log("");
  }

  // Step 3: Resume world if paused
  if (world.status === "paused") {
    console.log("Step 3: Resuming world...");
    await client.mutation(api.world.resumeWorld);
    console.log("  World resumed!");
    console.log("");
  } else {
    console.log("Step 3: World already running.");
    console.log("");
  }

  // Step 4: Simulate agent actions
  if (agents.length > 0) {
    console.log("Step 4: Simulating agent actions...");
    console.log("");

    for (const agent of agents) {
      console.log(`  --- ${agent.name} ---`);

      // Get agent state
      const state = await apiCall("/agent/state", "GET", agent.apiKey);
      if (!state.agent) {
        console.log(`    Failed to get state: ${JSON.stringify(state)}`);
        continue;
      }

      console.log(`    Location: ${state.agent.location?.slug || "unknown"}`);
      console.log(`    Cash: $${state.agent.cash}`);
      console.log(`    Status: ${state.agent.status}`);

      if (state.agent.status !== "idle") {
        console.log(`    Agent is ${state.agent.status}, skipping actions.`);
        continue;
      }

      // Try to take a random action
      const actions = state.availableActions || [];
      const nearbyJobs = state.nearbyJobs || [];

      // If there are jobs, try to take one
      if (nearbyJobs.length > 0 && actions.includes("TAKE_JOB")) {
        const job = nearbyJobs[Math.floor(Math.random() * nearbyJobs.length)];
        console.log(`    Taking job: ${job.title} ($${job.wage})`);

        const result = await apiCall("/agent/act", "POST", agent.apiKey, {
          requestId: generateRequestId(),
          action: "TAKE_JOB",
          args: { jobId: job.jobId },
        });

        if (result.ok) {
          console.log(`    Success! Agent is now busy.`);
        } else {
          console.log(`    Failed: ${result.message || result.error}`);
        }
      }
      // Otherwise try to move to a different zone
      else if (actions.includes("MOVE")) {
        const zones = ["market", "downtown", "industrial", "docks"];
        const currentZone = state.agent.location?.slug;
        const targetZones = zones.filter((z) => z !== currentZone);
        const targetZone = targetZones[Math.floor(Math.random() * targetZones.length)];

        console.log(`    Moving to: ${targetZone}`);

        const result = await apiCall("/agent/act", "POST", agent.apiKey, {
          requestId: generateRequestId(),
          action: "MOVE",
          args: { toZone: targetZone },
        });

        if (result.ok) {
          console.log(`    Success! Agent is traveling.`);
        } else {
          console.log(`    Failed: ${result.message || result.error}`);
        }
      }

      console.log("");
      await sleep(100); // Small delay between agents
    }
  }

  // Step 5: Show current state
  console.log("Step 5: Current world state...");
  const updatedWorld = await client.query(api.world.getWorld);
  const allAgents = await client.query(api.agents.listAgents, {});
  const stats = await client.query(api.dashboard.getAgentStats);

  console.log(`  World tick: ${updatedWorld?.tick}`);
  console.log(`  World status: ${updatedWorld?.status}`);
  console.log(`  Total agents: ${stats?.total || 0}`);
  console.log(`  - Idle: ${stats?.idle || 0}`);
  console.log(`  - Busy: ${stats?.busy || 0}`);
  console.log(`  - Jailed: ${stats?.jailed || 0}`);
  console.log(`  - Hospitalized: ${stats?.hospitalized || 0}`);
  console.log("");

  if (allAgents.length > 0) {
    console.log("  Agent Summary:");
    for (const a of allAgents.slice(0, 10)) {
      console.log(`    - ${a.name}: $${a.cash} | HP: ${a.health} | Status: ${a.status}`);
    }
    if (allAgents.length > 10) {
      console.log(`    ... and ${allAgents.length - 10} more`);
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log("Simulation complete!");
  console.log("");
  console.log("Next steps:");
  console.log("1. Open http://localhost:3000 to see the dashboard");
  console.log("2. The world tick advances every 60 seconds");
  console.log("3. Watch agents complete their actions and earn money");
  console.log("");
  console.log("To add more agents or test the API:");
  console.log(`  curl -X POST ${SITE_URL}/agent/register -H "Content-Type: application/json" -d '{"name": "My Agent"}'`);
  console.log("=".repeat(60));
}

main().catch(console.error);
