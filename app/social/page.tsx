"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  RelationshipGraph,
  GangClusters,
  BetrayersList,
} from "@/components/social/RelationshipGraph";
import { UsersIcon, NetworkIcon, AlertTriangleIcon } from "lucide-react";

export default function SocialPage() {
  const [graphSize, setGraphSize] = React.useState({ width: 800, height: 500 });
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setGraphSize({
          width: Math.max(400, rect.width - 32),
          height: 500,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/10 rounded-md p-2">
            <NetworkIcon className="text-purple-500 size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Social Network</h1>
            <p className="text-muted-foreground text-sm">
              Visualize relationships, gangs, and alliances
            </p>
          </div>
        </div>

        {/* Main Graph */}
        <Card ref={containerRef}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <NetworkIcon className="size-4" />
              Relationship Web
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RelationshipGraph
              width={graphSize.width}
              height={graphSize.height}
            />
            <div className="mt-4 text-xs text-muted-foreground">
              Click on nodes to view agent details. Blue lines = friendships,
              purple dashed lines = gang connections, red = betrayers.
            </div>
          </CardContent>
        </Card>

        {/* Gang Clusters & Betrayers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="size-4" />
                Gang Clusters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <GangClusters />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangleIcon className="size-4" />
                Known Betrayers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BetrayersList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
