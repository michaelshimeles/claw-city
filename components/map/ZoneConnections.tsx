"use client";

import { MapRoute } from "@/components/ui/map";

type Connection = {
  from: { lng: number; lat: number };
  to: { lng: number; lat: number };
  fromSlug: string;
  toSlug: string;
};

type ZoneConnectionsProps = {
  connections: Connection[];
  visible?: boolean;
};

/**
 * Renders zone connections/routes on the map
 */
export function ZoneConnections({ connections, visible = true }: ZoneConnectionsProps) {
  if (!visible) return null;

  return (
    <>
      {connections.map((conn, index) => (
        <MapRoute
          key={`${conn.fromSlug}-${conn.toSlug}`}
          id={`connection-${index}`}
          coordinates={[
            [conn.from.lng, conn.from.lat],
            [conn.to.lng, conn.to.lat],
          ]}
          color="rgba(255, 255, 255, 0.15)"
          width={1}
          opacity={0.5}
          dashArray={[4, 4]}
          interactive={false}
        />
      ))}
    </>
  );
}
