"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useSpectate } from "@/lib/contexts/SpectateContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, MapPin, Activity } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * SpectatePanel - Shows activity from followed agents
 * Displays a list of followed agents with status and an activity feed
 */
export function SpectatePanel() {
  const { followedAgentIds, unfollowAgent, followedCount } = useSpectate();

  // Convert string IDs to proper Convex IDs for the query
  const agentIds = followedAgentIds as Id<"agents">[];

  // Query for events from followed agents
  const events = useQuery(
    api.dashboard.getFollowedAgentEvents,
    agentIds.length > 0 ? { agentIds, limit: 20 } : "skip"
  );

  // We need agent info - let's extract unique agents from events
  const agentInfoMap = new Map<string, { name: string; status?: string }>();
  if (events) {
    for (const event of events) {
      if (event.agentId && !agentInfoMap.has(event.agentId)) {
        agentInfoMap.set(event.agentId, { name: event.agentName });
      }
    }
  }

  // Empty state
  if (followedCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="size-4" />
            Spectating (0)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Eye className="size-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No agents followed</p>
            <p className="text-xs mt-1">
              Click the Follow button on an agent&apos;s profile to start spectating
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="size-4 text-blue-500" />
          Spectating ({followedCount})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Followed Agents List */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Followed Agents
          </h4>
          <div className="space-y-1">
            {followedAgentIds.map((agentId) => {
              const agentInfo = agentInfoMap.get(agentId);
              return (
                <div
                  key={agentId}
                  className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/50"
                >
                  <Link
                    href={`/agents/${agentId}`}
                    className="flex items-center gap-2 hover:text-blue-400 transition-colors"
                  >
                    <span className="text-sm font-medium">
                      {agentInfo?.name ?? "Loading..."}
                    </span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => unfollowAgent(agentId)}
                    title="Unfollow"
                  >
                    <EyeOff className="size-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Activity className="size-3" />
            Recent Activity
          </h4>
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {events === undefined && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Loading activity...
              </div>
            )}
            {events && events.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No recent activity
              </div>
            )}
            {events &&
              events.map((event) => (
                <div
                  key={event._id}
                  className={cn(
                    "py-1.5 px-2 rounded-md text-xs",
                    event.dramaLevel === "critical" &&
                      "bg-red-950/30 border border-red-500/20",
                    event.dramaLevel === "exciting" &&
                      "bg-yellow-950/30 border border-yellow-500/20",
                    event.dramaLevel === "normal" && "bg-muted/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex-1">{event.description}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      T{event.tick}
                    </span>
                  </div>
                  {event.zoneName && (
                    <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                      <MapPin className="size-2.5" />
                      <span>{event.zoneName}</span>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
