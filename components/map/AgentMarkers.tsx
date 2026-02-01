"use client";

import {
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  MapClusterLayer,
} from "@/components/ui/map";
import { getAgentColor, AGENT_STATUS_COLORS } from "./mapConstants";
import { cn } from "@/lib/utils";

type AgentWithPosition = {
  _id: string;
  name: string;
  status: string;
  locationZoneId: string;
  position: { lng: number; lat: number };
  gangId: string | null;
  gangTag: string | null;
  gangColor: string | null;
  heat: number;
  health: number;
  cash: number;
  reputation: number;
  busyAction?: string | null;
};

// Status-based ring colors
const STATUS_RING_COLORS = {
  idle: "#22c55e", // green
  busy: "#eab308", // yellow
  jailed: "#ef4444", // red
  hospitalized: "#f97316", // orange
  crime: "#dc2626", // darker red for crime
  traveling: "#3b82f6", // blue
};

// Get the appropriate ring color based on agent status and action
function getStatusRingColor(status: string, busyAction?: string | null): string {
  if (status === "busy" && busyAction) {
    if (busyAction.toLowerCase().includes("crime") || busyAction.toLowerCase().includes("rob")) {
      return STATUS_RING_COLORS.crime;
    }
    if (busyAction.toLowerCase().includes("travel") || busyAction.toLowerCase().includes("move")) {
      return STATUS_RING_COLORS.traveling;
    }
  }
  return STATUS_RING_COLORS[status as keyof typeof STATUS_RING_COLORS] || STATUS_RING_COLORS.idle;
}

// Check if agent is in a crime action
function isInCrime(status: string, busyAction?: string | null): boolean {
  if (status !== "busy") return false;
  if (!busyAction) return false;
  const action = busyAction.toLowerCase();
  return action.includes("crime") || action.includes("rob") || action.includes("attack");
}

type AgentMarkersProps = {
  agents: AgentWithPosition[];
  onAgentClick?: (agent: AgentWithPosition) => void;
  clusterThreshold?: number;
};

/**
 * Renders agent markers on the map
 * Uses clustering when there are many agents
 */
export function AgentMarkers({
  agents,
  onAgentClick,
  clusterThreshold = 15,
}: AgentMarkersProps) {
  // If there are many agents, use clustering
  if (agents.length > clusterThreshold) {
    return (
      <ClusteredAgentMarkers
        agents={agents}
        onAgentClick={onAgentClick}
      />
    );
  }

  // Otherwise, render individual markers
  return (
    <>
      {agents.map((agent) => (
        <AgentMarker
          key={agent._id}
          agent={agent}
          onClick={() => onAgentClick?.(agent)}
        />
      ))}
    </>
  );
}

function AgentMarker({
  agent,
  onClick,
}: {
  agent: AgentWithPosition;
  onClick?: () => void;
}) {
  const color = getAgentColor(
    agent.gangColor,
    agent.status as keyof typeof AGENT_STATUS_COLORS
  );
  const ringColor = getStatusRingColor(agent.status, agent.busyAction);
  const inCrime = isInCrime(agent.status, agent.busyAction);

  return (
    <MapMarker
      longitude={agent.position.lng}
      latitude={agent.position.lat}
      onClick={onClick}
    >
      <MarkerContent>
        {/* Outer animated ring */}
        <div
          className={cn(
            "absolute -inset-1 rounded-full opacity-50",
            agent.status === "busy" && "animate-agent-pulse",
            inCrime && "animate-agent-shake",
            agent.status === "jailed" && "animate-pulse"
          )}
          style={{ backgroundColor: ringColor }}
        />
        {/* Inner dot */}
        <div
          className={cn(
            "relative w-3 h-3 rounded-full border-2 border-white/80 shadow-md transition-transform hover:scale-125 z-10"
          )}
          style={{ backgroundColor: color }}
        />
        {agent.gangTag && (
          <div
            className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1 rounded z-20"
            style={{
              backgroundColor: agent.gangColor || "#666",
              color: "#fff",
            }}
          >
            {agent.gangTag}
          </div>
        )}

        {/* Inline styles for animations */}
        <style jsx>{`
          @keyframes agent-pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.3); opacity: 0.2; }
          }
          @keyframes agent-shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-2px); }
            75% { transform: translateX(2px); }
          }
          .animate-agent-pulse {
            animation: agent-pulse 1.5s ease-in-out infinite;
          }
          .animate-agent-shake {
            animation: agent-shake 0.3s ease-in-out infinite;
          }
        `}</style>
      </MarkerContent>
      <MarkerTooltip>
        <div className="space-y-1 min-w-[120px]">
          <div className="font-medium">{agent.name}</div>
          {agent.gangTag && (
            <div className="text-[10px]" style={{ color: agent.gangColor || undefined }}>
              [{agent.gangTag}]
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px]">
            <span
              className={cn(
                "capitalize",
                agent.status === "idle" && "text-green-400",
                agent.status === "busy" && "text-yellow-400",
                agent.status === "jailed" && "text-red-400",
                agent.status === "hospitalized" && "text-orange-400"
              )}
            >
              {agent.status}
            </span>
            {agent.busyAction && (
              <span className="text-muted-foreground truncate max-w-[80px]">
                ({agent.busyAction})
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 text-[10px] text-muted-foreground">
            <span>Cash: ${agent.cash}</span>
            <span>HP: {agent.health}</span>
            <span>Heat: {agent.heat}</span>
            <span>Rep: {agent.reputation}</span>
          </div>
        </div>
      </MarkerTooltip>
    </MapMarker>
  );
}

function ClusteredAgentMarkers({
  agents,
  onAgentClick,
}: {
  agents: AgentWithPosition[];
  onAgentClick?: (agent: AgentWithPosition) => void;
}) {
  // Convert agents to GeoJSON for clustering
  const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
    type: "FeatureCollection",
    features: agents.map((agent) => ({
      type: "Feature",
      properties: {
        id: agent._id,
        name: agent.name,
        status: agent.status,
        gangTag: agent.gangTag,
        gangColor: agent.gangColor,
        heat: agent.heat,
        health: agent.health,
        cash: agent.cash,
        reputation: agent.reputation,
        busyAction: agent.busyAction,
      },
      geometry: {
        type: "Point",
        coordinates: [agent.position.lng, agent.position.lat],
      },
    })),
  };

  return (
    <MapClusterLayer
      data={geojson}
      clusterMaxZoom={8}
      clusterRadius={40}
      clusterColors={["#51bbd6", "#f1f075", "#f28cb1"]}
      clusterThresholds={[5, 15]}
      pointColor="#22c55e"
      onPointClick={(feature) => {
        const agentId = feature.properties?.id;
        const agent = agents.find((a) => a._id === agentId);
        if (agent && onAgentClick) {
          onAgentClick(agent);
        }
      }}
    />
  );
}
