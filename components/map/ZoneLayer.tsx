"use client";

import { useEffect, useRef } from "react";
import { useMap } from "@/components/ui/map";
import { ZONE_TYPE_COLORS, generateCirclePolygon } from "./mapConstants";

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

type ZoneLayerProps = {
  zones: Zone[];
  selectedZoneId?: string | null;
  onZoneClick?: (zone: Zone) => void;
  showTerritories?: boolean;
};

/**
 * Renders zone polygons on the map with type-based coloring
 * and territory overlays
 */
export function ZoneLayer({
  zones,
  selectedZoneId,
  onZoneClick,
  showTerritories = true,
}: ZoneLayerProps) {
  const { map, isLoaded } = useMap();
  const layersAddedRef = useRef(false);
  const onZoneClickRef = useRef(onZoneClick);
  const zonesRef = useRef(zones);

  // Keep refs updated
  onZoneClickRef.current = onZoneClick;
  zonesRef.current = zones;

  const sourceId = "zones-source";
  const fillLayerId = "zones-fill";
  const strokeLayerId = "zones-stroke";
  const territoryLayerId = "zones-territory";

  // Build GeoJSON from zones
  const buildGeoJSON = (zonesData: Zone[], selected: string | null | undefined) => {
    const features = zonesData
      .filter((zone) => zone.mapCoords)
      .map((zone) => {
        const { center, radius } = zone.mapCoords!;
        const coords = generateCirclePolygon(center.lng, center.lat, radius);
        const colors = ZONE_TYPE_COLORS[zone.type as keyof typeof ZONE_TYPE_COLORS] || ZONE_TYPE_COLORS.commercial;

        return {
          type: "Feature" as const,
          properties: {
            id: zone._id,
            slug: zone.slug,
            name: zone.name,
            type: zone.type,
            fillColor: colors.fill,
            strokeColor: colors.stroke,
            isSelected: zone._id === selected,
            hasTerritory: zone.territory !== null,
            territoryColor: zone.territory?.gangColor || "#000000",
            controlStrength: zone.territory?.controlStrength || 0,
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [coords],
          },
        };
      });

    return {
      type: "FeatureCollection" as const,
      features,
    };
  };

  // Initialize layers once
  useEffect(() => {
    if (!isLoaded || !map || layersAddedRef.current) return;

    const geojson = buildGeoJSON(zones, selectedZoneId);

    // Add source
    map.addSource(sourceId, {
      type: "geojson",
      data: geojson,
    });

    // Territory fill layer (under zone fill)
    map.addLayer({
      id: territoryLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": ["get", "territoryColor"],
        "fill-opacity": [
          "case",
          ["boolean", ["get", "hasTerritory"], false],
          ["*", ["/", ["get", "controlStrength"], 100], 0.4],
          0,
        ],
      },
    });

    // Zone fill layer
    map.addLayer({
      id: fillLayerId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": ["get", "fillColor"],
        "fill-opacity": [
          "case",
          ["boolean", ["get", "isSelected"], false],
          0.5,
          0.3,
        ],
      },
    });

    // Zone stroke layer
    map.addLayer({
      id: strokeLayerId,
      type: "line",
      source: sourceId,
      paint: {
        "line-color": [
          "case",
          ["boolean", ["get", "isSelected"], false],
          "#ffffff",
          ["get", "strokeColor"],
        ],
        "line-width": [
          "case",
          ["boolean", ["get", "isSelected"], false],
          3,
          2,
        ],
        "line-opacity": 1,
      },
    });

    // Add click handler
    map.on("click", fillLayerId, (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const zoneId = feature.properties?.id;
        const zone = zonesRef.current.find((z) => z._id === zoneId);
        if (zone && onZoneClickRef.current) {
          onZoneClickRef.current(zone);
        }
      }
    });

    // Change cursor on hover
    map.on("mouseenter", fillLayerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", fillLayerId, () => {
      map.getCanvas().style.cursor = "";
    });

    layersAddedRef.current = true;

    return () => {
      layersAddedRef.current = false;
      try {
        if (map.getLayer(strokeLayerId)) map.removeLayer(strokeLayerId);
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId);
        if (map.getLayer(territoryLayerId)) map.removeLayer(territoryLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // Ignore
      }
    };
  }, [isLoaded, map]); // Only depend on map being loaded

  // Update data when zones or selection changes
  useEffect(() => {
    if (!isLoaded || !map || !layersAddedRef.current) return;

    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      const geojson = buildGeoJSON(zones, selectedZoneId);
      source.setData(geojson);
    }
  }, [isLoaded, map, zones, selectedZoneId]);

  // Update territory visibility
  useEffect(() => {
    if (!isLoaded || !map || !layersAddedRef.current) return;

    if (map.getLayer(territoryLayerId)) {
      map.setLayoutProperty(
        territoryLayerId,
        "visibility",
        showTerritories ? "visible" : "none"
      );
    }
  }, [isLoaded, map, showTerritories]);

  return null;
}
