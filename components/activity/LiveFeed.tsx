"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  SwordsIcon,
  UsersIcon,
  DollarSignIcon,
  CircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";

type Category = "all" | "crime" | "social" | "economic";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  crime: <SwordsIcon className="size-3" />,
  social: <UsersIcon className="size-3" />,
  economic: <DollarSignIcon className="size-3" />,
  other: <CircleIcon className="size-3" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  crime: "bg-red-500/10 text-red-400 border-red-500/20",
  social: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  economic: "bg-green-500/10 text-green-400 border-green-500/20",
  other: "bg-muted/50 text-muted-foreground border-border",
};

type LiveFeedProps = {
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
};

export function LiveFeed({ limit = 20, showFilters = true, compact = false }: LiveFeedProps) {
  const [category, setCategory] = React.useState<Category>("all");
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());

  const events = useQuery(api.dashboard.getRecentActivityFeed, {
    limit,
    category,
  });

  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (events === undefined) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse h-12 bg-muted/50 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          {(["all", "crime", "social", "economic"] as Category[]).map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat)}
              className="capitalize"
            >
              {cat !== "all" && (
                <span className="mr-1">{CATEGORY_ICONS[cat]}</span>
              )}
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* Events List */}
      <div className="space-y-1">
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No events found
          </div>
        ) : (
          events.map((event) => {
            const isExpanded = expandedIds.has(event._id);

            return (
              <div
                key={event._id}
                className={`group rounded-lg border transition-colors ${CATEGORY_COLORS[event.category]} ${
                  compact ? "p-2" : "p-3"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Category Icon */}
                  <div className="mt-0.5">
                    {CATEGORY_ICONS[event.category]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {event.agentName && (
                        <Link
                          href={`/agents/${event.agentId}`}
                          className="font-medium hover:underline"
                        >
                          {event.agentName}
                        </Link>
                      )}
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          event.isSuccess
                            ? "bg-green-500/20 text-green-400"
                            : event.isFailure
                              ? "bg-red-500/20 text-red-400"
                              : ""
                        }`}
                      >
                        {event.type.replace(/_/g, " ")}
                      </Badge>
                      {event.zoneName && (
                        <span className="text-xs text-muted-foreground">
                          in {event.zoneName}
                        </span>
                      )}
                    </div>

                    {!compact && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {event.description}
                      </p>
                    )}

                    {/* Expanded Details */}
                    {isExpanded && event.payload && (
                      <pre className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground overflow-x-auto">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    )}
                  </div>

                  {/* Time & Expand */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>T{event.tick}</span>
                    <span>{formatTime(event.timestamp)}</span>
                    {event.payload && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => toggleExpand(event._id)}
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="size-3" />
                        ) : (
                          <ChevronDownIcon className="size-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/**
 * Compact ticker variant for dashboard
 */
export function ActivityTicker({ limit = 5 }: { limit?: number }) {
  const events = useQuery(api.dashboard.getRecentActivityFeed, { limit, category: "all" });

  if (!events) {
    return <div className="animate-pulse h-6 bg-muted/50 rounded" />;
  }

  return (
    <div className="overflow-hidden">
      <div className="flex gap-6 animate-marquee">
        {events.map((event) => (
          <div
            key={event._id}
            className="flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <span className={CATEGORY_COLORS[event.category].split(" ")[1]}>
              {CATEGORY_ICONS[event.category]}
            </span>
            {event.agentName && (
              <span className="font-medium">{event.agentName}</span>
            )}
            <span className="text-muted-foreground">{event.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
