"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useSpectate } from "@/lib/contexts/SpectateContext";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { XIcon, Eye } from "lucide-react";

type Toast = {
  id: string;
  message: string;
  agentName: string;
  dramaLevel: "normal" | "exciting" | "critical";
  createdAt: number;
};

const TOAST_DURATION = 6000; // 6 seconds

const SPECTATE_LEVEL_STYLES = {
  normal: "bg-blue-950/90 border-blue-500/30 text-blue-100",
  exciting: "bg-blue-900/90 border-blue-400/50 text-blue-50",
  critical: "bg-indigo-950/90 border-indigo-500/50 text-indigo-100",
};

/**
 * SpectateToaster - Shows toast notifications for new events from followed agents
 * Positioned bottom-left to differentiate from DramaToaster (bottom-right)
 * Uses blue color scheme vs DramaToaster's yellow/red
 */
export function SpectateToaster() {
  const { followedAgentIds, followedCount } = useSpectate();

  // Convert string IDs to proper Convex IDs for the query
  const agentIds = followedAgentIds as Id<"agents">[];

  const events = useQuery(
    api.dashboard.getFollowedAgentEvents,
    agentIds.length > 0 ? { agentIds, limit: 5 } : "skip"
  );

  const [toasts, setToasts] = useState<Toast[]>([]);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Process events when they change
  useEffect(() => {
    if (!events || events.length === 0) return;

    // On first load, mark all current events as "seen" without showing toasts
    if (!initializedRef.current) {
      initializedRef.current = true;
      for (const event of events) {
        processedEventsRef.current.add(event._id);
      }
      return;
    }

    // Find new events we haven't processed
    const newEvents = events.filter(
      (event) => !processedEventsRef.current.has(event._id)
    );

    if (newEvents.length === 0) return;

    // Mark as processed
    for (const event of newEvents) {
      processedEventsRef.current.add(event._id);
    }

    // Create toasts
    const now = performance.now();
    const newToasts: Toast[] = newEvents.slice(0, 3).map((event) => ({
      id: event._id,
      message: event.description,
      agentName: event.agentName,
      dramaLevel: event.dramaLevel,
      createdAt: now,
    }));

    setToasts((prev) => [...newToasts, ...prev].slice(0, 5));
  }, [events]);

  // Clean up expired toasts
  useEffect(() => {
    if (toasts.length === 0) return;

    const timer = setInterval(() => {
      const now = performance.now();
      setToasts((prev) =>
        prev.filter((toast) => now - toast.createdAt < TOAST_DURATION)
      );
    }, 500);

    return () => clearInterval(timer);
  }, [toasts.length]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Don't render if no followed agents or no toasts
  if (followedCount === 0 || toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto animate-in slide-in-from-left-full fade-in duration-300",
            "flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg",
            "font-mono text-sm max-w-sm",
            SPECTATE_LEVEL_STYLES[toast.dramaLevel]
          )}
        >
          <Eye className="size-4 mt-0.5 shrink-0 opacity-70" />
          <div className="flex-1 min-w-0">
            <div className="text-xs opacity-70 mb-0.5">{toast.agentName}</div>
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-50 hover:opacity-100 transition-opacity shrink-0"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
