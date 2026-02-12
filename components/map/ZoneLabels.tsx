"use client";

import { MapMarker, MarkerContent } from "@/components/ui/map";

type Zone = {
  _id: string;
  slug: string;
  name: string;
  type: string;
  mapCoords?: { center: { lng: number; lat: number }; radius: number };
};

type ZoneLabelsProps = {
  zones: Zone[];
};

/**
 * Renders zone name labels as markers on the map
 */
export function ZoneLabels({ zones }: ZoneLabelsProps) {
  return (
    <>
      {zones
        .filter((zone) => zone.mapCoords)
        .map((zone) => (
          <MapMarker
            key={`label-${zone._id}`}
            longitude={zone.mapCoords!.center.lng}
            latitude={zone.mapCoords!.center.lat}
          >
            <MarkerContent className="pointer-events-none">
              <div className="text-xs font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] whitespace-nowrap">
                {zone.name}
              </div>
            </MarkerContent>
          </MapMarker>
        ))}
    </>
  );
}
