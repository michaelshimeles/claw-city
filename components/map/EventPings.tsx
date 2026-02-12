"use client";

import { MapMarker, MarkerContent } from "@/components/ui/map";
import { EVENT_PING_COLORS, jitterPosition } from "./mapConstants";

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

type EventPing = {
  id: string;
  type: string;
  agentName: string | null;
  zoneName: string | null;
  zoneMapCoords: { center: { lng: number; lat: number }; radius: number } | null;
  expiresAt: number;
};

type EventPingsProps = {
  pings: EventPing[];
};

/**
 * Renders animated event pings on the map
 * Shows crime, arrest, movement, and territory events as expanding circles
 */
export function EventPings({ pings }: EventPingsProps) {
  return (
    <>
      {pings.map((ping, index) => (
        <EventPingMarker key={ping.id} ping={ping} index={index} />
      ))}
    </>
  );
}

function EventPingMarker({ ping, index }: { ping: EventPing; index: number }) {
  if (!ping.zoneMapCoords) return null;

  // Jitter position within zone for variety (use ping id hash for determinism)
  const seed = hashString(ping.id) + index;
  const position = jitterPosition(
    ping.zoneMapCoords.center.lng,
    ping.zoneMapCoords.center.lat,
    ping.zoneMapCoords.radius * 0.5,
    seed
  );

  const color = EVENT_PING_COLORS[ping.type as keyof typeof EVENT_PING_COLORS] || "#888";

  return (
    <MapMarker longitude={position.lng} latitude={position.lat}>
      <MarkerContent>
        <div className="relative">
          {/* Animated ping ring */}
          <div
            className="absolute inset-0 rounded-full animate-ping-fade"
            style={{
              backgroundColor: color,
              width: 24,
              height: 24,
              marginLeft: -12,
              marginTop: -12,
            }}
          />
          {/* Center dot */}
          <div
            className="absolute rounded-full"
            style={{
              backgroundColor: color,
              width: 8,
              height: 8,
              marginLeft: -4,
              marginTop: -4,
            }}
          />
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

// Event type to readable label
export function getEventLabel(type: string): string {
  const labels: Record<string, string> = {
    CRIME_SUCCESS: "Crime",
    CRIME_FAILED: "Crime Failed",
    AGENT_ARRESTED: "Arrest",
    MOVE_COMPLETED: "Movement",
    TERRITORY_CLAIMED: "Territory",
    COOP_CRIME_SUCCESS: "Heist",
    COOP_CRIME_FAILED: "Heist Failed",
    AGENT_ROBBED: "Robbery",
    ROB_ATTEMPT_FAILED: "Rob Failed",
  };
  return labels[type] || type;
}
