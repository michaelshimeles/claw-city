"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { memo, useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";

type Toast = {
  id: string;
  message: string;
  dramaLevel: "normal" | "exciting" | "critical";
  createdAt: number;
};

const TOAST_DURATION = 5000; // 5 seconds

const DRAMA_LEVEL_STYLES = {
  normal: "bg-muted border-border",
  exciting: "bg-yellow-950/90 border-yellow-500/50 text-yellow-100",
  critical: "bg-red-950/90 border-red-500/50 text-red-100",
};

/**
 * Drama Toaster - shows toast notifications for exciting events
 * Subscribes to drama events and shows new ones as toasts
 * Wrapped in memo to prevent unnecessary re-renders of parent components
 */
export const DramaToaster = memo(function DramaToaster() {
  const events = useQuery(api.dashboard.getDramaEvents, { limit: 5 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const processedEventsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  // Stabilize event IDs to prevent unnecessary effect runs
  const eventIds = useMemo(
    () => events?.map((e) => e._id).join(",") ?? "",
    [events]
  );

  // Process events when they change (using stable eventIds to reduce re-runs)
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
      (event) =>
        !processedEventsRef.current.has(event._id) &&
        (event.dramaLevel === "exciting" || event.dramaLevel === "critical")
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
      dramaLevel: event.dramaLevel,
      createdAt: now,
    }));

    setToasts((prev) => [...newToasts, ...prev].slice(0, 5));
  }, [eventIds, events]);

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

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto animate-in slide-in-from-right-full fade-in duration-300",
            "flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg",
            "font-mono text-sm max-w-sm",
            DRAMA_LEVEL_STYLES[toast.dramaLevel]
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="opacity-50 hover:opacity-100 transition-opacity"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
});
