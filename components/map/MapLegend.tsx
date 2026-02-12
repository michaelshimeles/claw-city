"use client";

import { ZONE_TYPE_COLORS, AGENT_STATUS_COLORS, EVENT_PING_COLORS } from "./mapConstants";

type Gang = {
  _id: string;
  name: string;
  tag: string;
  color: string;
};

type MapLegendProps = {
  gangs?: Gang[];
  showZoneTypes?: boolean;
  showAgentStatus?: boolean;
  showEventTypes?: boolean;
  showGangs?: boolean;
  className?: string;
};

/**
 * Map legend showing color keys for zones, agents, events, and gangs
 */
export function MapLegend({
  gangs = [],
  showZoneTypes = true,
  showAgentStatus = true,
  showEventTypes = false,
  showGangs = true,
  className,
}: MapLegendProps) {
  return (
    <div className={className}>
      <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-3 space-y-3 text-xs max-w-[180px]">
        {/* Zone Types */}
        {showZoneTypes && (
          <div>
            <div className="font-medium mb-1.5 text-muted-foreground">Zones</div>
            <div className="space-y-1">
              {Object.entries(ZONE_TYPE_COLORS).map(([type, colors]) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm border"
                    style={{
                      backgroundColor: colors.fill,
                      borderColor: colors.stroke,
                    }}
                  />
                  <span className="capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agent Status */}
        {showAgentStatus && (
          <div>
            <div className="font-medium mb-1.5 text-muted-foreground">Agents</div>
            <div className="space-y-1">
              {Object.entries(AGENT_STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border-2 border-white/50"
                    style={{ backgroundColor: color }}
                  />
                  <span className="capitalize">{status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Types */}
        {showEventTypes && (
          <div>
            <div className="font-medium mb-1.5 text-muted-foreground">Events</div>
            <div className="space-y-1">
              {Object.entries(EVENT_PING_COLORS).slice(0, 5).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px]">
                    {type.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Gangs */}
        {showGangs && gangs.length > 0 && (
          <div>
            <div className="font-medium mb-1.5 text-muted-foreground">Gangs</div>
            <div className="space-y-1">
              {gangs.map((gang) => (
                <div key={gang._id} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: gang.color }}
                  />
                  <span className="truncate" title={gang.name}>
                    [{gang.tag}] {gang.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
