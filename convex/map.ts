/**
 * Map queries for ClawCity real-time city map visualization
 * Provides combined data for zones, agents, gangs, territories, and events
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// Visual event types that should appear as pings on the map
const VISUAL_EVENT_TYPES = [
  "CRIME_SUCCESS",
  "CRIME_FAILED",
  "AGENT_ARRESTED",
  "MOVE_COMPLETED",
  "TERRITORY_CLAIMED",
  "COOP_CRIME_SUCCESS",
  "COOP_CRIME_FAILED",
  "AGENT_ROBBED",
  "ROB_ATTEMPT_FAILED",
] as const;

/**
 * Get all map data in a single query for efficient rendering
 * Returns zones, agents, gangs, and territories
 */
export const getMapData = query({
  args: {},
  handler: async (ctx) => {
    // Fetch all data in parallel (limit agents for performance)
    const [zones, allAgents, allGangs, territories] = await Promise.all([
      ctx.db.query("zones").collect(),
      ctx.db.query("agents").take(500), // Limit to 500 agents for map display
      ctx.db.query("gangs").collect(),
      ctx.db.query("territories").collect(),
    ]);

    // Filter out banned agents and disbanded gangs
    const agents = allAgents.filter((a) => !a.bannedAt);
    const gangs = allGangs.filter((g) => !g.disbandedAt);

    // Build gang lookup
    const gangsById: Record<string, {
      _id: string;
      name: string;
      tag: string;
      color: string;
    }> = {};
    for (const gang of gangs) {
      gangsById[gang._id.toString()] = {
        _id: gang._id.toString(),
        name: gang.name,
        tag: gang.tag,
        color: gang.color,
      };
    }

    // Build zone lookup
    const zonesById: Record<string, typeof zones[0]> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = zone;
    }

    // Build territories by zone
    const territoriesByZone: Record<string, {
      gangId: string;
      gangName: string;
      gangTag: string;
      gangColor: string;
      controlStrength: number;
    }> = {};
    for (const territory of territories) {
      const gang = gangsById[territory.gangId.toString()];
      if (gang) {
        territoriesByZone[territory.zoneId.toString()] = {
          gangId: gang._id,
          gangName: gang.name,
          gangTag: gang.tag,
          gangColor: gang.color,
          controlStrength: territory.controlStrength,
        };
      }
    }

    // Count agents per zone
    const agentCountByZone: Record<string, number> = {};
    for (const agent of agents) {
      const zoneId = agent.locationZoneId.toString();
      agentCountByZone[zoneId] = (agentCountByZone[zoneId] || 0) + 1;
    }

    // Format zones with map data
    const formattedZones = zones.map((zone) => ({
      _id: zone._id.toString(),
      slug: zone.slug,
      name: zone.name,
      type: zone.type,
      description: zone.description,
      mapCoords: zone.mapCoords,
      agentCount: agentCountByZone[zone._id.toString()] || 0,
      territory: territoriesByZone[zone._id.toString()] || null,
    }));

    // Format agents for map (exclude sensitive data)
    const formattedAgents = agents.map((agent) => {
      const zone = zonesById[agent.locationZoneId.toString()];
      const gang = agent.gangId ? gangsById[agent.gangId.toString()] : null;
      return {
        _id: agent._id,
        name: agent.name,
        status: agent.status,
        locationZoneId: agent.locationZoneId,
        zoneMapCoords: zone?.mapCoords || null,
        gangId: agent.gangId || null,
        gangTag: gang?.tag || null,
        gangColor: gang?.color || null,
        heat: agent.heat,
        health: agent.health,
        cash: agent.cash,
        reputation: agent.reputation,
      };
    });

    return {
      zones: formattedZones,
      agents: formattedAgents,
      gangs: Object.values(gangsById),
    };
  },
});

/**
 * Get recent map events for ping animations
 * Returns events from the last N ticks filtered to visual event types
 */
export const getRecentMapEvents = query({
  args: {
    ticksBack: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const ticksBack = args.ticksBack ?? 10;
    const limit = args.limit ?? 50;

    // Get current world tick
    const world = await ctx.db.query("world").first();
    if (!world) {
      return [];
    }

    const minTick = Math.max(0, world.tick - ticksBack);

    // Query each visual event type separately using composite index for efficiency
    const perTypeLimit = Math.ceil(limit / VISUAL_EVENT_TYPES.length) + 5;
    const eventQueries = VISUAL_EVENT_TYPES.map((type) =>
      ctx.db
        .query("events")
        .withIndex("by_type_tick", (q) => q.eq("type", type).gte("tick", minTick))
        .order("desc")
        .take(perTypeLimit)
    );

    const eventArrays = await Promise.all(eventQueries);

    // Merge and sort by tick descending, then take limit
    const events = eventArrays
      .flat()
      .sort((a, b) => b.tick - a.tick || b.timestamp - a.timestamp)
      .slice(0, limit);

    // Get zones for location data
    const zones = await ctx.db.query("zones").collect();
    const zonesById: Record<string, { slug: string; name: string; mapCoords?: { center: { lng: number; lat: number }; radius: number } }> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = {
        slug: zone.slug,
        name: zone.name,
        mapCoords: zone.mapCoords,
      };
    }

    // Get only the agents referenced in events (not all agents)
    const agentIds = [...new Set(events.filter((e) => e.agentId).map((e) => e.agentId!))];
    const agentDocs = await Promise.all(agentIds.slice(0, 50).map((id) => ctx.db.get(id)));
    const agentsById: Record<string, string> = {};
    for (const agent of agentDocs) {
      if (agent) {
        agentsById[agent._id.toString()] = agent.name;
      }
    }

    return events.map((event) => {
      const zone = event.zoneId ? zonesById[event.zoneId.toString()] : null;
      return {
        _id: event._id,
        tick: event.tick,
        timestamp: event.timestamp,
        type: event.type,
        agentId: event.agentId,
        agentName: event.agentId ? agentsById[event.agentId.toString()] ?? "Unknown" : null,
        zoneId: event.zoneId,
        zoneName: zone?.name || null,
        zoneMapCoords: zone?.mapCoords || null,
        payload: event.payload,
      };
    });
  },
});

/**
 * Get zone heat statistics for heat map overlay
 */
export const getZoneHeatStats = query({
  args: {},
  handler: async (ctx) => {
    const [zones, allAgents] = await Promise.all([
      ctx.db.query("zones").collect(),
      ctx.db.query("agents").take(1000), // Limit for performance
    ]);

    // Filter out banned agents
    const agents = allAgents.filter((a) => !a.bannedAt);

    // Calculate heat per zone
    const heatByZone: Record<
      string,
      {
        total: number;
        count: number;
        max: number;
        agentIds: string[];
      }
    > = {};

    for (const zone of zones) {
      heatByZone[zone._id.toString()] = {
        total: 0,
        count: 0,
        max: 0,
        agentIds: [],
      };
    }

    for (const agent of agents) {
      const zoneId = agent.locationZoneId.toString();
      if (heatByZone[zoneId]) {
        heatByZone[zoneId].total += agent.heat;
        heatByZone[zoneId].count++;
        heatByZone[zoneId].max = Math.max(heatByZone[zoneId].max, agent.heat);
        heatByZone[zoneId].agentIds.push(agent._id.toString());
      }
    }

    // Format result with zone info
    return zones.map((zone) => {
      const stats = heatByZone[zone._id.toString()];
      const avgHeat = stats.count > 0 ? stats.total / stats.count : 0;

      // Determine heat level for coloring (0-100 scale normalized)
      let heatLevel: "cold" | "warm" | "hot" | "dangerous" = "cold";
      if (avgHeat >= 60) heatLevel = "dangerous";
      else if (avgHeat >= 40) heatLevel = "hot";
      else if (avgHeat >= 20) heatLevel = "warm";

      return {
        zoneId: zone._id,
        slug: zone.slug,
        name: zone.name,
        mapCoords: zone.mapCoords,
        heat: {
          total: stats.total,
          average: Math.round(avgHeat),
          max: stats.max,
          agentCount: stats.count,
          level: heatLevel,
        },
      };
    });
  },
});

/**
 * Get hottest agents by zone
 */
export const getHotAgentsByZone = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3;

    const [zones, allAgents, allGangs] = await Promise.all([
      ctx.db.query("zones").collect(),
      ctx.db.query("agents").collect(),
      ctx.db.query("gangs").collect(),
    ]);

    // Filter out banned agents and disbanded gangs
    const agents = allAgents.filter((a) => !a.bannedAt);
    const gangs = allGangs.filter((g) => !g.disbandedAt);

    // Build gang lookup
    const gangsById: Record<string, { name: string; tag: string; color: string }> = {};
    for (const gang of gangs) {
      gangsById[gang._id.toString()] = {
        name: gang.name,
        tag: gang.tag,
        color: gang.color,
      };
    }

    // Group agents by zone
    const agentsByZone: Record<string, typeof agents> = {};
    for (const zone of zones) {
      agentsByZone[zone._id.toString()] = [];
    }
    for (const agent of agents) {
      const zoneId = agent.locationZoneId.toString();
      if (agentsByZone[zoneId]) {
        agentsByZone[zoneId].push(agent);
      }
    }

    // Get top N hottest agents per zone
    return zones.map((zone) => {
      const zoneAgents = agentsByZone[zone._id.toString()] || [];
      const hottestAgents = [...zoneAgents]
        .sort((a, b) => b.heat - a.heat)
        .slice(0, limit)
        .map((a) => ({
          _id: a._id,
          name: a.name,
          heat: a.heat,
          status: a.status,
          gangTag: a.gangId ? gangsById[a.gangId.toString()]?.tag ?? null : null,
          gangColor: a.gangId ? gangsById[a.gangId.toString()]?.color ?? null : null,
        }));

      return {
        zoneId: zone._id,
        slug: zone.slug,
        name: zone.name,
        mapCoords: zone.mapCoords,
        hottestAgents,
        totalAgents: zoneAgents.length,
        avgHeat:
          zoneAgents.length > 0
            ? Math.round(
                zoneAgents.reduce((sum, a) => sum + a.heat, 0) / zoneAgents.length
              )
            : 0,
      };
    });
  },
});

/**
 * Get zone edges for drawing connections on the map
 */
export const getZoneConnections = query({
  args: {},
  handler: async (ctx) => {
    const [zoneEdges, zones] = await Promise.all([
      ctx.db.query("zoneEdges").collect(),
      ctx.db.query("zones").collect(),
    ]);

    // Build zone lookup
    const zonesById: Record<string, { slug: string; mapCoords?: { center: { lng: number; lat: number }; radius: number } }> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = {
        slug: zone.slug,
        mapCoords: zone.mapCoords,
      };
    }

    // Create unique edges (avoid duplicates for bidirectional connections)
    const seenEdges = new Set<string>();
    const connections: Array<{
      from: { lng: number; lat: number };
      to: { lng: number; lat: number };
      fromSlug: string;
      toSlug: string;
    }> = [];

    for (const edge of zoneEdges) {
      const fromZone = zonesById[edge.fromZoneId.toString()];
      const toZone = zonesById[edge.toZoneId.toString()];

      if (!fromZone?.mapCoords || !toZone?.mapCoords) continue;

      // Create a unique key for the edge pair
      const edgeKey = [fromZone.slug, toZone.slug].sort().join("-");
      if (seenEdges.has(edgeKey)) continue;
      seenEdges.add(edgeKey);

      connections.push({
        from: fromZone.mapCoords.center,
        to: toZone.mapCoords.center,
        fromSlug: fromZone.slug,
        toSlug: toZone.slug,
      });
    }

    return connections;
  },
});
