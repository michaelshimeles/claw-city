"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const DRAMA_LEVEL_COLORS = {
  normal: "text-muted-foreground",
  exciting: "text-yellow-400",
  critical: "text-red-400",
};

const DRAMA_LEVEL_ICONS = {
  normal: "",
  exciting: "",
  critical: "",
};

/**
 * Global activity ticker that scrolls at the top of all pages
 * Shows dramatic events in real-time
 */
export function GlobalTicker() {
  const events = useQuery(api.dashboard.getDramaEvents, { limit: 15 });

  if (!events || events.length === 0) {
    return null;
  }

  // Duplicate events for seamless infinite scroll
  const duplicatedEvents = [...events, ...events];

  return (
    <div className="w-full bg-black/80 border-b border-border/50 overflow-hidden">
      <div className="relative flex">
        <div className="flex animate-ticker gap-8 py-1.5 px-4">
          {duplicatedEvents.map((event, index) => (
            <div
              key={`${event._id}-${index}`}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap text-xs font-mono",
                DRAMA_LEVEL_COLORS[event.dramaLevel]
              )}
            >
              <span className="opacity-50">
                {DRAMA_LEVEL_ICONS[event.dramaLevel]}
              </span>
              <span>{event.description}</span>
              <span className="opacity-30">|</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
