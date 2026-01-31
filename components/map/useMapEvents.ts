"use client";

import { useEffect, useState } from "react";

type MapEvent = {
  _id: string;
  tick: number;
  timestamp: number;
  type: string;
  agentId: string | null;
  agentName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  zoneMapCoords: { center: { lng: number; lat: number }; radius: number } | null;
  payload: unknown;
};

type EventPing = MapEvent & {
  id: string;
  expiresAt: number;
};

const PING_DURATION_MS = 3000; // How long pings stay visible

/**
 * Hook to manage event pings on the map
 * Tracks new events and expires old ones
 */
export function useMapEvents(
  events: MapEvent[] | undefined,
  enabled: boolean = true
): EventPing[] {
  const [pings, setPings] = useState<EventPing[]>([]);

  useEffect(() => {
    if (!enabled || !events) {
      setPings([]);
      return;
    }

    const now = Date.now();
    const newPings: EventPing[] = [];

    for (const event of events) {
      // Only show events that have a zone location
      if (!event.zoneMapCoords) continue;

      // Create a unique ping ID
      const pingId = `${event._id}-${event.timestamp}`;

      newPings.push({
        ...event,
        id: pingId,
        expiresAt: now + PING_DURATION_MS,
      });
    }

    setPings(newPings);
  }, [events, enabled]);

  // Clean up expired pings
  useEffect(() => {
    if (pings.length === 0) return;

    const now = Date.now();
    const earliestExpiry = Math.min(...pings.map((p) => p.expiresAt));
    const timeUntilExpiry = earliestExpiry - now;

    if (timeUntilExpiry <= 0) {
      // Remove expired pings immediately
      setPings((current) => current.filter((p) => p.expiresAt > now));
      return;
    }

    // Schedule cleanup
    const timeout = setTimeout(() => {
      setPings((current) => current.filter((p) => p.expiresAt > Date.now()));
    }, timeUntilExpiry);

    return () => clearTimeout(timeout);
  }, [pings]);

  return pings;
}
