"use client";

import { MapPopup } from "@/components/ui/map";
import { Badge } from "@/components/ui/badge";
import { ZONE_TYPE_COLORS } from "./mapConstants";
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

type ZonePopupProps = {
  zone: Zone;
  onClose: () => void;
};

/**
 * Popup showing zone details when clicked
 */
export function ZonePopup({ zone, onClose }: ZonePopupProps) {
  if (!zone.mapCoords) return null;

  const colors = ZONE_TYPE_COLORS[zone.type as keyof typeof ZONE_TYPE_COLORS] || ZONE_TYPE_COLORS.commercial;

  return (
    <MapPopup
      longitude={zone.mapCoords.center.lng}
      latitude={zone.mapCoords.center.lat}
      onClose={onClose}
      closeButton
      offset={20}
    >
      <div className="min-w-[200px] max-w-[280px]">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold">{zone.name}</h3>
          <Badge
            className={cn("capitalize text-[10px]")}
            style={{
              backgroundColor: `${colors.text}20`,
              color: colors.text,
            }}
          >
            {zone.type}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-3">
          {zone.description}
        </p>

        {/* Territory info */}
        {zone.territory && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-muted/50">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: zone.territory.gangColor }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">
                {zone.territory.gangName}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>[{zone.territory.gangTag}]</span>
                <span>-</span>
                <span
                  className={cn(
                    zone.territory.controlStrength >= 75 && "text-green-500",
                    zone.territory.controlStrength >= 50 &&
                      zone.territory.controlStrength < 75 &&
                      "text-yellow-500",
                    zone.territory.controlStrength < 50 && "text-red-500"
                  )}
                >
                  {zone.territory.controlStrength}% control
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Agents: </span>
            <span className="font-medium">{zone.agentCount}</span>
          </div>
        </div>
      </div>
    </MapPopup>
  );
}
