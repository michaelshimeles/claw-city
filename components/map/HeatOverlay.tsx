"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { FlameIcon } from "lucide-react";

type HeatOverlayProps = {
  onZoneClick?: (zoneId: string) => void;
  showLabels?: boolean;
};

const HEAT_COLORS = {
  cold: { bg: "rgba(34, 197, 94, 0.3)", border: "#22c55e", text: "text-green-400" },
  warm: { bg: "rgba(234, 179, 8, 0.3)", border: "#eab308", text: "text-yellow-400" },
  hot: { bg: "rgba(249, 115, 22, 0.3)", border: "#f97316", text: "text-orange-400" },
  dangerous: { bg: "rgba(239, 68, 68, 0.4)", border: "#ef4444", text: "text-red-400" },
};

export function HeatOverlay({ onZoneClick, showLabels = true }: HeatOverlayProps) {
  const heatStats = useQuery(api.map.getZoneHeatStats);
  const hotAgents = useQuery(api.map.getHotAgentsByZone, { limit: 3 });

  if (!heatStats || !hotAgents) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Loading heat data...
      </div>
    );
  }

  // Create a map for quick hot agent lookup
  const hotAgentsByZone: Record<string, typeof hotAgents[0]> = {};
  hotAgents.forEach((zone) => {
    hotAgentsByZone[zone.zoneId.toString()] = zone;
  });

  return (
    <div className="space-y-4">
      {/* Heat Legend */}
      <div className="flex items-center gap-4 text-xs">
        <span className="text-muted-foreground">Heat Level:</span>
        <div className="flex items-center gap-1">
          <div className="size-3 rounded bg-green-500/50" />
          <span className="text-green-400">Cold</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-3 rounded bg-yellow-500/50" />
          <span className="text-yellow-400">Warm</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-3 rounded bg-orange-500/50" />
          <span className="text-orange-400">Hot</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="size-3 rounded bg-red-500/50" />
          <span className="text-red-400">Dangerous</span>
        </div>
      </div>

      {/* Zone Heat Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {heatStats.map((zone) => {
          const colors = HEAT_COLORS[zone.heat.level];
          const zoneHotAgents = hotAgentsByZone[zone.zoneId.toString()];

          return (
            <div
              key={zone.zoneId}
              className="rounded-lg p-3 cursor-pointer transition-all hover:scale-105"
              style={{
                backgroundColor: colors.bg,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              onClick={() => onZoneClick?.(zone.zoneId.toString())}
            >
              {/* Zone Name */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{zone.name}</span>
                {zone.heat.level === "dangerous" && (
                  <FlameIcon className="size-4 text-red-500 animate-pulse" />
                )}
              </div>

              {/* Heat Stats */}
              <div className="grid grid-cols-3 gap-1 text-xs mb-2">
                <div className="text-center">
                  <div className={`font-bold ${colors.text}`}>
                    {zone.heat.average}
                  </div>
                  <div className="text-muted-foreground">Avg</div>
                </div>
                <div className="text-center">
                  <div className={`font-bold ${colors.text}`}>
                    {zone.heat.max}
                  </div>
                  <div className="text-muted-foreground">Max</div>
                </div>
                <div className="text-center">
                  <div className="font-bold">{zone.heat.agentCount}</div>
                  <div className="text-muted-foreground">Agents</div>
                </div>
              </div>

              {/* Hot Agents */}
              {showLabels && zoneHotAgents && zoneHotAgents.hottestAgents.length > 0 && (
                <div className="border-t border-white/10 pt-2 mt-2">
                  <div className="text-xs text-muted-foreground mb-1">Hottest:</div>
                  <div className="space-y-0.5">
                    {zoneHotAgents.hottestAgents.slice(0, 2).map((agent) => (
                      <div
                        key={agent._id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="truncate max-w-[80px]">
                          {agent.gangTag && (
                            <span
                              className="mr-1"
                              style={{ color: agent.gangColor ?? undefined }}
                            >
                              [{agent.gangTag}]
                            </span>
                          )}
                          {agent.name}
                        </span>
                        <span className={colors.text}>{agent.heat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact heat indicator for dashboard
 */
export function HeatIndicator() {
  const heatStats = useQuery(api.map.getZoneHeatStats);

  if (!heatStats) {
    return <div className="animate-pulse h-6 bg-muted/50 rounded" />;
  }

  // Find hottest zone
  const hottestZone = [...heatStats].sort(
    (a, b) => b.heat.average - a.heat.average
  )[0];

  // Count dangerous zones
  const dangerousCount = heatStats.filter(
    (z) => z.heat.level === "dangerous"
  ).length;

  const colors = HEAT_COLORS[hottestZone?.heat.level ?? "cold"];

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <FlameIcon className={`size-4 ${colors.text}`} />
        <span className="text-sm">
          Hottest: <span className="font-medium">{hottestZone?.name ?? "N/A"}</span>
        </span>
        <Badge variant="outline" className={colors.text}>
          {hottestZone?.heat.average ?? 0} avg
        </Badge>
      </div>
      {dangerousCount > 0 && (
        <Badge variant="destructive">
          {dangerousCount} danger zone{dangerousCount > 1 ? "s" : ""}
        </Badge>
      )}
    </div>
  );
}

/**
 * Hot zones alert banner
 */
export function HotZonesAlert() {
  const heatStats = useQuery(api.map.getZoneHeatStats);

  if (!heatStats) return null;

  const dangerousZones = heatStats.filter((z) => z.heat.level === "dangerous");

  if (dangerousZones.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3">
      <FlameIcon className="size-5 text-red-500 animate-pulse" />
      <div className="flex-1">
        <span className="text-red-400 font-medium">High Heat Alert: </span>
        <span className="text-sm">
          {dangerousZones.map((z) => z.name).join(", ")}
        </span>
      </div>
      <Badge variant="destructive">
        {dangerousZones.length} zone{dangerousZones.length > 1 ? "s" : ""}
      </Badge>
    </div>
  );
}
