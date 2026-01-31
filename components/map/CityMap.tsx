"use client";

import { useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Map, MapControls } from "@/components/ui/map";
import { ZoneLayer } from "./ZoneLayer";
import { ZoneLabels } from "./ZoneLabels";
import { AgentMarkers } from "./AgentMarkers";
import { EventPings } from "./EventPings";
import { ZonePopup } from "./ZonePopup";
import { MapLegend } from "./MapLegend";
import { MapFilters } from "./MapFilters";
import { ZoneConnections } from "./ZoneConnections";
import { useAgentPositions } from "./useAgentPositions";
import { useMapEvents } from "./useMapEvents";
import { MAP_CONFIG, MAP_STYLES } from "./mapConstants";
import { cn } from "@/lib/utils";

type Zone = {
  _id: string;
  slug: string;
  name: string;
  type: string;
  description: string;
  mapCoords?: { center: { lng: number; lat: number }; radius: number };
  agentCount: number;
  territory: {
    gangId: string;
    gangName: string;
    gangTag: string;
    gangColor: string;
    controlStrength: number;
  } | null;
};

type CityMapProps = {
  className?: string;
  compact?: boolean;
};

/**
 * Main city map component combining all map layers and controls
 */
export function CityMap({ className, compact = false }: CityMapProps) {
  // Fetch map data
  const mapData = useQuery(api.map.getMapData);
  const recentEvents = useQuery(api.map.getRecentMapEvents, { ticksBack: 10, limit: 20 });
  const connections = useQuery(api.map.getZoneConnections);

  // State
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [showAgents, setShowAgents] = useState(true);
  const [showTerritories, setShowTerritories] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showConnections, setShowConnections] = useState(false);

  // Process agents with positions
  const agentsWithPositions = useAgentPositions(mapData?.agents);

  // Process event pings
  const eventPings = useMapEvents(recentEvents, showEvents);

  // Handlers
  const handleZoneClick = useCallback((zone: Zone) => {
    setSelectedZone((prev) => (prev?._id === zone._id ? null : zone));
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedZone(null);
  }, []);

  if (!mapData) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/50", className)}>
        <div className="text-muted-foreground text-sm">Loading map...</div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      <Map
        center={[MAP_CONFIG.defaultCenter.lng, MAP_CONFIG.defaultCenter.lat]}
        zoom={MAP_CONFIG.defaultZoom}
        minZoom={MAP_CONFIG.minZoom}
        maxZoom={MAP_CONFIG.maxZoom}
        maxBounds={[
          [MAP_CONFIG.bounds.minLng, MAP_CONFIG.bounds.minLat],
          [MAP_CONFIG.bounds.maxLng, MAP_CONFIG.bounds.maxLat],
        ]}
        styles={{
          dark: MAP_STYLES.dark,
          light: MAP_STYLES.light,
        }}
        dragRotate={false}
        pitchWithRotate={false}
      >
        {/* Zone connections (routes) */}
        {connections && (
          <ZoneConnections
            connections={connections}
            visible={showConnections}
          />
        )}

        {/* Zone polygons */}
        <ZoneLayer
          zones={mapData.zones}
          selectedZoneId={selectedZone?._id}
          onZoneClick={handleZoneClick}
          showTerritories={showTerritories}
        />

        {/* Zone labels */}
        <ZoneLabels zones={mapData.zones} />

        {/* Agent markers */}
        {showAgents && (
          <AgentMarkers
            agents={agentsWithPositions}
            clusterThreshold={compact ? 5 : 15}
          />
        )}

        {/* Event pings */}
        {showEvents && <EventPings pings={eventPings} />}

        {/* Zone popup */}
        {selectedZone && (
          <ZonePopup zone={selectedZone} onClose={handleClosePopup} />
        )}

        {/* Map controls */}
        <MapControls
          position="bottom-right"
          showZoom={true}
          showCompass={false}
          showLocate={false}
          showFullscreen={!compact}
        />
      </Map>

      {/* Filters */}
      {!compact && (
        <div className="absolute top-3 left-3 z-10">
          <MapFilters
            showAgents={showAgents}
            showTerritories={showTerritories}
            showEvents={showEvents}
            showConnections={showConnections}
            onToggleAgents={() => setShowAgents(!showAgents)}
            onToggleTerritories={() => setShowTerritories(!showTerritories)}
            onToggleEvents={() => setShowEvents(!showEvents)}
            onToggleConnections={() => setShowConnections(!showConnections)}
          />
        </div>
      )}

      {/* Legend */}
      {!compact && (
        <div className="absolute top-14 left-3 z-10">
          <MapLegend
            gangs={mapData.gangs}
            showZoneTypes={true}
            showAgentStatus={true}
            showEventTypes={showEvents}
            showGangs={mapData.gangs.length > 0}
          />
        </div>
      )}

      {/* Compact mode info */}
      {compact && (
        <div className="absolute bottom-2 left-2 z-10 text-[10px] text-muted-foreground bg-background/80 px-2 py-1 rounded">
          {mapData.agents.length} agents in {mapData.zones.length} zones
        </div>
      )}
    </div>
  );
}
