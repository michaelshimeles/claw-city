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
};

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

  return (
    <MapMarker
      longitude={agent.position.lng}
      latitude={agent.position.lat}
      onClick={onClick}
    >
      <MarkerContent>
        <div
          className={cn(
            "w-3 h-3 rounded-full border-2 border-white/80 shadow-md transition-transform hover:scale-125",
            agent.status === "jailed" && "animate-pulse"
          )}
          style={{ backgroundColor: color }}
        />
        {agent.gangTag && (
          <div
            className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1 rounded"
            style={{
              backgroundColor: agent.gangColor || "#666",
              color: "#fff",
            }}
          >
            {agent.gangTag}
          </div>
        )}
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
