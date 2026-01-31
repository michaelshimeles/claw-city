"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  BriefcaseIcon,
  MapPinIcon,
  ShieldAlertIcon,
  DollarSignIcon,
  UsersIcon,
  SwordsIcon,
  HeartIcon,
  PackageIcon,
  HomeIcon,
  FlagIcon,
} from "lucide-react";

type TimelineEvent = {
  _id: string;
  type: string;
  tick: number;
  timestamp: number;
  zoneName?: string | null;
  payload?: unknown;
};

type AgentTimelineProps = {
  events: TimelineEvent[];
  summary?: {
    crimes: number;
    jobs: number;
    arrests: number;
    moves: number;
    trades: number;
  };
  currentTick?: number;
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  CRIME_SUCCESS: <SwordsIcon className="size-4 text-green-500" />,
  CRIME_FAILED: <SwordsIcon className="size-4 text-red-500" />,
  CRIME_ATTEMPTED: <SwordsIcon className="size-4 text-yellow-500" />,
  AGENT_ARRESTED: <ShieldAlertIcon className="size-4 text-red-500" />,
  AGENT_RELEASED: <ShieldAlertIcon className="size-4 text-green-500" />,
  JOB_STARTED: <BriefcaseIcon className="size-4 text-blue-500" />,
  JOB_COMPLETED: <BriefcaseIcon className="size-4 text-green-500" />,
  MOVE_STARTED: <MapPinIcon className="size-4 text-blue-500" />,
  MOVE_COMPLETED: <MapPinIcon className="size-4 text-green-500" />,
  BUY: <DollarSignIcon className="size-4 text-red-400" />,
  SELL: <DollarSignIcon className="size-4 text-green-400" />,
  GANG_JOINED: <UsersIcon className="size-4 text-purple-500" />,
  GANG_LEFT: <UsersIcon className="size-4 text-gray-500" />,
  GANG_BETRAYED: <UsersIcon className="size-4 text-red-500" />,
  FRIEND_REQUEST_ACCEPTED: <HeartIcon className="size-4 text-pink-500" />,
  HEAL_COMPLETED: <HeartIcon className="size-4 text-green-500" />,
  REST_COMPLETED: <HeartIcon className="size-4 text-blue-500" />,
  ITEM_USED: <PackageIcon className="size-4 text-blue-500" />,
  PROPERTY_PURCHASED: <HomeIcon className="size-4 text-yellow-500" />,
  TERRITORY_CLAIMED: <FlagIcon className="size-4 text-purple-500" />,
};

const EVENT_COLORS: Record<string, string> = {
  CRIME_SUCCESS: "border-green-500/50",
  CRIME_FAILED: "border-red-500/50",
  AGENT_ARRESTED: "border-red-500/50",
  JOB_COMPLETED: "border-blue-500/50",
  GANG_BETRAYED: "border-red-500/50",
};

function getEventIcon(type: string): React.ReactNode {
  return EVENT_ICONS[type] || <div className="size-4 rounded-full bg-muted-foreground" />;
}

function formatEventDescription(type: string, payload: unknown): string {
  const p = payload as Record<string, unknown> | null;

  switch (type) {
    case "CRIME_SUCCESS":
      return `Committed ${p?.crimeType ?? "crime"} successfully`;
    case "CRIME_FAILED":
      return `Failed ${p?.crimeType ?? "crime"} attempt`;
    case "AGENT_ARRESTED":
      return "Arrested by police";
    case "AGENT_RELEASED":
      return "Released from jail";
    case "JOB_STARTED":
      return `Started ${p?.jobTitle ?? "a job"}`;
    case "JOB_COMPLETED":
      return `Completed job, earned $${p?.wage ?? 0}`;
    case "MOVE_COMPLETED":
      return `Arrived at destination`;
    case "BUY":
      return `Purchased items`;
    case "SELL":
      return `Sold items`;
    case "GANG_JOINED":
      return "Joined a gang";
    case "GANG_LEFT":
      return "Left gang";
    case "GANG_BETRAYED":
      return "Betrayed the gang!";
    case "HEAL_COMPLETED":
      return "Fully healed";
    case "REST_COMPLETED":
      return "Rested and recovered stamina";
    default:
      return type.replace(/_/g, " ").toLowerCase();
  }
}

export function AgentTimeline({
  events,
  summary,
  currentTick = 0,
}: AgentTimelineProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpanded(next);
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-5 gap-2 text-center text-xs">
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-lg font-bold text-foreground">{summary.crimes}</div>
            <div className="text-muted-foreground">Crimes</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-lg font-bold text-foreground">{summary.jobs}</div>
            <div className="text-muted-foreground">Jobs</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-lg font-bold text-red-400">{summary.arrests}</div>
            <div className="text-muted-foreground">Arrests</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-lg font-bold text-foreground">{summary.moves}</div>
            <div className="text-muted-foreground">Moves</div>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-lg font-bold text-foreground">{summary.trades}</div>
            <div className="text-muted-foreground">Trades</div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative space-y-0">
        {/* Vertical line */}
        <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

        {events.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No events recorded yet
          </div>
        ) : (
          events.map((event) => {
            const ticksAgo = currentTick - event.tick;
            const isExpanded = expanded.has(event._id);

            return (
              <div
                key={event._id}
                className={`relative flex gap-3 pl-8 py-2 cursor-pointer hover:bg-muted/30 transition-colors ${
                  EVENT_COLORS[event.type] ?? ""
                }`}
                onClick={() => toggleExpand(event._id)}
              >
                {/* Icon circle */}
                <div className="absolute left-2 top-3 z-10 flex size-5 items-center justify-center rounded-full bg-background ring-2 ring-border">
                  {getEventIcon(event.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {event.type.replace(/_/g, " ")}
                    </Badge>
                    {event.zoneName && (
                      <span className="text-xs text-muted-foreground">{event.zoneName}</span>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-0.5">
                    {formatEventDescription(event.type, event.payload)}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>Tick {event.tick}</span>
                    <span>•</span>
                    <span>{ticksAgo} ticks ago</span>
                    <span>•</span>
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                  </div>

                  {isExpanded && event.payload ? (
                    <pre className="mt-2 p-2 rounded bg-muted/50 text-xs text-muted-foreground overflow-x-auto">
                      {JSON.stringify(event.payload as Record<string, unknown>, null, 2)}
                    </pre>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
