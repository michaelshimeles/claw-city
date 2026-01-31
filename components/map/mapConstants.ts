/**
 * Map constants for ClawCity visualization
 * Contains colors, styles, and configuration for the map
 */

// Zone type colors (matching world page styles)
export const ZONE_TYPE_COLORS = {
  commercial: {
    fill: "rgba(59, 130, 246, 0.15)", // blue
    stroke: "rgba(59, 130, 246, 0.6)",
    text: "#3b82f6",
  },
  residential: {
    fill: "rgba(34, 197, 94, 0.15)", // green
    stroke: "rgba(34, 197, 94, 0.6)",
    text: "#22c55e",
  },
  industrial: {
    fill: "rgba(249, 115, 22, 0.15)", // orange
    stroke: "rgba(249, 115, 22, 0.6)",
    text: "#f97316",
  },
  government: {
    fill: "rgba(239, 68, 68, 0.15)", // red
    stroke: "rgba(239, 68, 68, 0.6)",
    text: "#ef4444",
  },
} as const;

// Agent status colors
export const AGENT_STATUS_COLORS = {
  idle: "#22c55e", // green
  busy: "#eab308", // yellow
  jailed: "#ef4444", // red
  hospitalized: "#f97316", // orange
} as const;

// Event ping colors
export const EVENT_PING_COLORS = {
  CRIME_SUCCESS: "#ef4444", // red
  CRIME_FAILED: "#991b1b", // dark red
  AGENT_ARRESTED: "#3b82f6", // blue
  MOVE_COMPLETED: "#22c55e", // green
  TERRITORY_CLAIMED: "#a855f7", // purple
  COOP_CRIME_SUCCESS: "#f97316", // orange
  COOP_CRIME_FAILED: "#7c2d12", // dark orange
  AGENT_ROBBED: "#dc2626", // bright red
  ROB_ATTEMPT_FAILED: "#6b7280", // gray
} as const;

// Map configuration
export const MAP_CONFIG = {
  // Map bounds (fictional city area)
  bounds: {
    minLng: -4,
    maxLng: 5,
    minLat: -4,
    maxLat: 4,
  },
  // Default view
  defaultCenter: { lng: 0.5, lat: -0.25 } as const,
  defaultZoom: 6,
  minZoom: 5,
  maxZoom: 10,
  // Zone rendering
  zoneCircleSegments: 32,
} as const;

// Custom map styles for dark/light themes (no real tiles - just background)
export const MAP_STYLES = {
  dark: {
    version: 8 as 8,
    name: "ClawCity Dark",
    sources: {} as Record<string, never>,
    layers: [
      {
        id: "background",
        type: "background" as "background",
        paint: {
          "background-color": "#0a0a0a",
        },
      },
    ],
  },
  light: {
    version: 8 as 8,
    name: "ClawCity Light",
    sources: {} as Record<string, never>,
    layers: [
      {
        id: "background",
        type: "background" as "background",
        paint: {
          "background-color": "#f5f5f5",
        },
      },
    ],
  },
};

// Generate polygon coordinates for a circle (zone boundary)
export function generateCirclePolygon(
  centerLng: number,
  centerLat: number,
  radius: number,
  segments: number = MAP_CONFIG.zoneCircleSegments
): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const lng = centerLng + radius * Math.cos(angle);
    const lat = centerLat + radius * Math.sin(angle);
    coords.push([lng, lat]);
  }
  return coords;
}

// Jitter agent position within zone radius
export function jitterPosition(
  centerLng: number,
  centerLat: number,
  radius: number,
  seed: number
): { lng: number; lat: number } {
  // Use seed to generate deterministic but varied positions
  const angle = (seed * 137.508) % (2 * Math.PI); // Golden angle for good distribution
  const distance = (radius * 0.7) * Math.sqrt((seed * 0.618) % 1); // Uniform distribution within circle
  return {
    lng: centerLng + distance * Math.cos(angle),
    lat: centerLat + distance * Math.sin(angle),
  };
}

// Get color based on agent state (gang takes priority, then status)
export function getAgentColor(
  gangColor: string | null,
  status: keyof typeof AGENT_STATUS_COLORS
): string {
  if (gangColor) return gangColor;
  return AGENT_STATUS_COLORS[status] || AGENT_STATUS_COLORS.idle;
}
