"use client";

import { useMemo } from "react";
import { jitterPosition } from "./mapConstants";

type Agent = {
  _id: string;
  name: string;
  status: string;
  locationZoneId: string;
  zoneMapCoords: { center: { lng: number; lat: number }; radius: number } | null;
  gangId: string | null;
  gangTag: string | null;
  gangColor: string | null;
  heat: number;
  health: number;
  cash: number;
  reputation: number;
};

type AgentWithPosition = Agent & {
  position: { lng: number; lat: number };
};

/**
 * Hook to calculate jittered positions for agents within their zones
 * Spreads agents out within the zone radius for better visualization
 */
export function useAgentPositions(agents: Agent[] | undefined): AgentWithPosition[] {
  return useMemo(() => {
    if (!agents) return [];

    // Group agents by zone to calculate seeds
    const agentsByZone: Record<string, Agent[]> = {};
    for (const agent of agents) {
      const zoneId = agent.locationZoneId;
      if (!agentsByZone[zoneId]) {
        agentsByZone[zoneId] = [];
      }
      agentsByZone[zoneId].push(agent);
    }

    // Assign positions to each agent
    const result: AgentWithPosition[] = [];
    for (const zoneId in agentsByZone) {
      const zoneAgents = agentsByZone[zoneId];
      for (let i = 0; i < zoneAgents.length; i++) {
        const agent = zoneAgents[i];
        if (!agent.zoneMapCoords) {
          // Fallback position if zone has no coords
          result.push({
            ...agent,
            position: { lng: 0, lat: 0 },
          });
          continue;
        }

        const { center, radius } = agent.zoneMapCoords;
        // Use agent index + hash of ID for seed to ensure consistent positions
        const seed = i + hashString(agent._id);
        const position = jitterPosition(center.lng, center.lat, radius, seed);
        result.push({
          ...agent,
          position,
        });
      }
    }

    return result;
  }, [agents]);
}

// Simple string hash for deterministic randomness
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
