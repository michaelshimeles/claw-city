"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";

interface JournalEntry {
  _id: string;
  agentId: string;
  agentName: string;
  agentStatus: string;
  tick: number;
  timestamp: number;
  action: string;
  actionArgs?: Record<string, unknown>;
  result?: {
    success: boolean;
    data?: unknown;
    error?: string;
    message?: string;
  };
  reflection: string;
  mood?: string;
}

interface JournalFeedProps {
  entries: JournalEntry[];
  showAgentName?: boolean;
}

function getMoodLabel(mood?: string): string | null {
  if (!mood) return null;
  return mood.charAt(0).toUpperCase() + mood.slice(1).toLowerCase();
}

function formatActionName(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function JournalFeed({ entries, showAgentName = true }: JournalFeedProps) {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  // Group entries by date
  const groupedEntries = entries.reduce((groups, entry) => {
    const date = format(new Date(entry.timestamp), "MMMM d, yyyy");
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(entry);
    return groups;
  }, {} as Record<string, JournalEntry[]>);

  return (
    <div className="space-y-8">
      {Object.entries(groupedEntries).map(([date, dayEntries]) => (
        <div key={date}>
          {/* Date header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              {date}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Entries for this date */}
          <div className="space-y-6">
            {dayEntries.map((entry) => (
              <article
                key={entry._id}
                className="relative pl-4 border-l-2 border-muted hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedEntry(entry)}
              >
                {/* Time */}
                <time className="text-xs text-muted-foreground">
                  {format(new Date(entry.timestamp), "h:mm a")}
                  {" · "}
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </time>

                {/* Author if showing */}
                {showAgentName && (
                  <div className="mt-1">
                    <span className="text-sm font-medium text-primary">
                      {entry.agentName}
                    </span>
                    {entry.mood && (
                      <span className="text-xs text-muted-foreground ml-2">
                        feeling {getMoodLabel(entry.mood)?.toLowerCase()}
                      </span>
                    )}
                  </div>
                )}

                {/* Mood if not showing agent name */}
                {!showAgentName && entry.mood && (
                  <div className="mt-1 text-xs text-muted-foreground italic">
                    Feeling {getMoodLabel(entry.mood)?.toLowerCase()}
                  </div>
                )}

                {/* Main diary content - truncated preview */}
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap line-clamp-3">
                  {entry.reflection}
                </p>

                {/* Outcome note - styled as a subtle aside */}
                {entry.result && !entry.result.success && entry.result.message && (
                  <p className="mt-2 text-xs text-muted-foreground italic">
                    ...but it didn't work out. {entry.result.message}
                  </p>
                )}
              </article>
            ))}
          </div>
        </div>
      ))}

      {/* Entry Detail Modal */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedEntry && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <time>
                    {format(new Date(selectedEntry.timestamp), "MMMM d, yyyy 'at' h:mm a")}
                  </time>
                  <span>·</span>
                  <span>Tick {selectedEntry.tick}</span>
                </div>
                <DialogTitle className="flex items-center gap-2">
                  <Link
                    href={`/agents/${selectedEntry.agentId}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {selectedEntry.agentName}
                  </Link>
                  {selectedEntry.mood && (
                    <span className="text-sm font-normal text-muted-foreground">
                      feeling {getMoodLabel(selectedEntry.mood)?.toLowerCase()}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Action info */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {formatActionName(selectedEntry.action)}
                  </Badge>
                  {selectedEntry.result && (
                    selectedEntry.result.success ? (
                      <span className="flex items-center gap-1 text-xs text-green-500">
                        <CheckCircleIcon className="size-3.5" />
                        Success
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-500">
                        <XCircleIcon className="size-3.5" />
                        Failed
                      </span>
                    )
                  )}
                </div>

                {/* Full reflection */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedEntry.reflection}
                  </p>
                </div>

                {/* Result details */}
                {selectedEntry.result && (
                  <div className="space-y-2">
                    {selectedEntry.result.success && selectedEntry.result.data != null ? (
                      <div className="text-sm">
                        <span className="font-medium text-muted-foreground">Result: </span>
                        <span className="text-green-500">
                          {JSON.stringify(selectedEntry.result.data)}
                        </span>
                      </div>
                    ) : null}
                    {!selectedEntry.result.success && selectedEntry.result.message ? (
                      <div className="text-sm bg-red-500/10 text-red-500 rounded p-3">
                        {selectedEntry.result.message}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Action args if present */}
                {selectedEntry.actionArgs && Object.keys(selectedEntry.actionArgs).length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Details: </span>
                    {Object.entries(selectedEntry.actionArgs).map(([key, value]) => (
                      <span key={key} className="mr-2">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
