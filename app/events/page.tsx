"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { EVENT_TYPES } from "@/convex/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

// Event type color mapping
function getEventTypeStyle(type: string): {
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
} {
  // TICK events - gray/muted
  if (type === "TICK") {
    return { variant: "secondary" };
  }

  // Crime events - red
  if (
    type === "CRIME_ATTEMPTED" ||
    type === "CRIME_SUCCESS" ||
    type === "CRIME_FAILED"
  ) {
    return { variant: "destructive" };
  }

  // Arrest/Jail events - orange
  if (
    type === "AGENT_ARRESTED" ||
    type === "AGENT_RELEASED" ||
    type === "POLICE_CRACKDOWN"
  ) {
    return {
      variant: "outline",
      className: "border-orange-500 text-orange-600 dark:text-orange-400",
    };
  }

  // Job events - blue
  if (type === "JOB_STARTED" || type === "JOB_COMPLETED" || type === "JOB_DROUGHT") {
    return {
      variant: "outline",
      className: "border-blue-500 text-blue-600 dark:text-blue-400",
    };
  }

  // Buy/Sell events - green
  if (
    type === "BUY" ||
    type === "SELL" ||
    type === "MARKET_UPDATE" ||
    type === "PRICE_CHANGE" ||
    type === "BUSINESS_STARTED" ||
    type === "PRICES_SET" ||
    type === "BUSINESS_STOCKED" ||
    type === "BUSINESS_REVENUE"
  ) {
    return {
      variant: "outline",
      className: "border-green-500 text-green-600 dark:text-green-400",
    };
  }

  // World events - purple
  if (
    type === "WORLD_STARTED" ||
    type === "WORLD_PAUSED" ||
    type === "WORLD_RESUMED"
  ) {
    return {
      variant: "outline",
      className: "border-purple-500 text-purple-600 dark:text-purple-400",
    };
  }

  // Agent lifecycle - cyan
  if (
    type === "AGENT_REGISTERED" ||
    type === "AGENT_HOSPITALIZED" ||
    type === "AGENT_RECOVERED"
  ) {
    return {
      variant: "outline",
      className: "border-cyan-500 text-cyan-600 dark:text-cyan-400",
    };
  }

  // Default - outline
  return { variant: "outline" };
}

// Format timestamp
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Format payload for display
function formatPayload(payload: unknown): string {
  if (!payload) return "";
  if (typeof payload === "string") return payload;
  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    // Show key fields for common event types
    const summaryFields = ["action", "result", "amount", "from", "to", "item", "zone", "reason", "message"];
    const summaryParts: string[] = [];
    for (const field of summaryFields) {
      if (obj[field] !== undefined) {
        summaryParts.push(`${field}: ${obj[field]}`);
      }
    }
    if (summaryParts.length > 0) {
      return summaryParts.join(", ");
    }
    // Fallback to JSON
    const json = JSON.stringify(payload);
    return json.length > 100 ? json.substring(0, 100) + "..." : json;
  }
  return String(payload);
}

export default function EventsPage() {
  // Filter state
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("");
  const [agentFilter, setAgentFilter] = useState<Id<"agents"> | null>(null);
  const [agentSearchValue, setAgentSearchValue] = useState("");
  const [sinceTickFilter, setSinceTickFilter] = useState<number | undefined>(undefined);
  const [limit, setLimit] = useState(50);

  // Fetch agents for the agent filter dropdown
  const agents = useQuery(api.agents.listAgents, {});

  // Fetch zones for displaying zone names
  const zones = useQuery(api.zones.listZones);

  // Build query args based on filters
  const queryArgs = useMemo(() => {
    const args: {
      sinceTick?: number;
      agentId?: Id<"agents">;
      type?: string;
      limit: number;
    } = { limit };

    if (sinceTickFilter !== undefined && sinceTickFilter > 0) {
      args.sinceTick = sinceTickFilter;
    }
    if (agentFilter) {
      args.agentId = agentFilter;
    }
    if (eventTypeFilter && eventTypeFilter !== "all") {
      args.type = eventTypeFilter;
    }

    return args;
  }, [sinceTickFilter, agentFilter, eventTypeFilter, limit]);

  // Fetch events with filters
  const events = useQuery(api.events.getEvents, queryArgs);

  // Create lookup maps for agents and zones
  const agentMap = useMemo(() => {
    const map = new Map<string, string>();
    if (agents) {
      for (const agent of agents) {
        map.set(agent._id, agent.name);
      }
    }
    return map;
  }, [agents]);

  const zoneMap = useMemo(() => {
    const map = new Map<string, string>();
    if (zones) {
      for (const zone of zones) {
        map.set(zone._id, zone.name);
      }
    }
    return map;
  }, [zones]);

  // Filter agents for combobox based on search
  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    if (!agentSearchValue) return agents;
    const lower = agentSearchValue.toLowerCase();
    return agents.filter((a) => a.name.toLowerCase().includes(lower));
  }, [agents, agentSearchValue]);

  // Handle load more
  const handleLoadMore = () => {
    setLimit((prev) => prev + 50);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setEventTypeFilter("");
    setAgentFilter(null);
    setAgentSearchValue("");
    setSinceTickFilter(undefined);
    setLimit(50);
  };

  const hasActiveFilters =
    eventTypeFilter !== "" ||
    agentFilter !== null ||
    sinceTickFilter !== undefined;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Events Feed</h1>
          <div className="flex items-center gap-2">
            {events && (
              <span className="text-sm text-muted-foreground">
                {events.length} events
              </span>
            )}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card size="sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {/* Event Type Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">
                  Event Type
                </label>
                <Select
                  value={eventTypeFilter}
                  onValueChange={(val: string | null) => setEventTypeFilter(val ?? "")}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All events</SelectItem>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Agent Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">Agent</label>
                <Combobox
                  value={agentFilter ?? undefined}
                  onValueChange={(val) =>
                    setAgentFilter(val ? (val as Id<"agents">) : null)
                  }
                  onInputValueChange={(val) => setAgentSearchValue(val)}
                >
                  <ComboboxInput
                    placeholder="Search agents..."
                    className="w-48"
                    showClear={!!agentFilter}
                  />
                  <ComboboxContent>
                    <ComboboxList>
                      {filteredAgents.map((agent) => (
                        <ComboboxItem key={agent._id} value={agent._id}>
                          {agent.name}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                    <ComboboxEmpty>No agents found</ComboboxEmpty>
                  </ComboboxContent>
                </Combobox>
              </div>

              {/* Since Tick Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted-foreground">
                  Since Tick
                </label>
                <Input
                  type="number"
                  placeholder="From tick..."
                  className="w-32"
                  value={sinceTickFilter ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSinceTickFilter(val ? parseInt(val, 10) : undefined);
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events List */}
        <Card>
          <CardContent className="p-0">
            {events === undefined ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-muted-foreground">
                  Loading events...
                </div>
              </div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-muted-foreground">
                  No events found
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {events.map((event) => {
                  const typeStyle = getEventTypeStyle(event.type);
                  const agentName = event.agentId
                    ? agentMap.get(event.agentId) ?? "Unknown Agent"
                    : null;
                  const zoneName = event.zoneId
                    ? zoneMap.get(event.zoneId) ?? "Unknown Zone"
                    : null;

                  return (
                    <div
                      key={event._id}
                      className="flex flex-col gap-2 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      {/* Row 1: Tick, timestamp, type badge */}
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground w-16">
                          T{event.tick}
                        </span>
                        <span className="text-xs text-muted-foreground w-36">
                          {formatTimestamp(event.timestamp)}
                        </span>
                        <Badge
                          variant={typeStyle.variant}
                          className={typeStyle.className}
                        >
                          {event.type.replace(/_/g, " ")}
                        </Badge>
                        {agentName && (
                          <span className="text-xs">
                            <span className="text-muted-foreground">Agent: </span>
                            <span className="font-medium">{agentName}</span>
                          </span>
                        )}
                        {zoneName && (
                          <span className="text-xs">
                            <span className="text-muted-foreground">Zone: </span>
                            <span className="font-medium">{zoneName}</span>
                          </span>
                        )}
                      </div>

                      {/* Row 2: Payload summary */}
                      {event.payload && (
                        <div className="ml-16 text-xs text-muted-foreground">
                          {formatPayload(event.payload)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Load More */}
        {events && events.length >= limit && (
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleLoadMore}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
