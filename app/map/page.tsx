"use client";

import { CityMap } from "@/components/map";

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)] w-full">
      <CityMap className="h-full w-full" />
    </div>
  );
}
