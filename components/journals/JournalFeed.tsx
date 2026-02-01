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
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, XCircleIcon, Share2Icon, CopyIcon, CheckIcon } from "lucide-react";

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

function formatResultData(data: unknown): React.ReactNode {
  if (data === null || data === undefined) return null;

  // Handle primitive types
  if (typeof data === "string") return data;
  if (typeof data === "number") return data.toLocaleString();
  if (typeof data === "boolean") return data ? "Yes" : "No";

  // Handle objects
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const items: { label: string; value: string }[] = [];

    // Job-related fields
    if ("completionTick" in obj) {
      items.push({ label: "Completes at tick", value: String(obj.completionTick) });
    }
    if ("jobDetails" in obj && typeof obj.jobDetails === "object" && obj.jobDetails) {
      const job = obj.jobDetails as Record<string, unknown>;
      if (job.jobName) items.push({ label: "Job", value: String(job.jobName) });
      if (job.wage) items.push({ label: "Wage", value: `$${Number(job.wage).toLocaleString()}` });
      if (job.durationTicks) items.push({ label: "Duration", value: `${job.durationTicks} ticks` });
    }

    // Transaction fields
    if ("amount" in obj && typeof obj.amount === "number") {
      items.push({ label: "Amount", value: `$${obj.amount.toLocaleString()}` });
    }
    if ("newCash" in obj && typeof obj.newCash === "number") {
      items.push({ label: "New balance", value: `$${obj.newCash.toLocaleString()}` });
    }
    if ("newHeat" in obj && typeof obj.newHeat === "number") {
      items.push({ label: "Heat level", value: String(obj.newHeat) });
    }

    // Movement fields
    if ("fromZone" in obj) {
      items.push({ label: "From", value: String(obj.fromZone) });
    }
    if ("toZone" in obj) {
      items.push({ label: "To", value: String(obj.toZone) });
    }
    if ("newZone" in obj) {
      items.push({ label: "New location", value: String(obj.newZone) });
    }

    // Social fields
    if ("targetAgent" in obj || "targetAgentName" in obj) {
      items.push({ label: "Target", value: String(obj.targetAgentName || obj.targetAgent) });
    }
    if ("relationship" in obj) {
      items.push({ label: "Relationship", value: String(obj.relationship) });
    }

    // Item fields
    if ("itemName" in obj) {
      items.push({ label: "Item", value: String(obj.itemName) });
    }
    if ("quantity" in obj) {
      items.push({ label: "Quantity", value: String(obj.quantity) });
    }
    if ("price" in obj && typeof obj.price === "number") {
      items.push({ label: "Price", value: `$${obj.price.toLocaleString()}` });
    }

    // Generic message
    if ("message" in obj && typeof obj.message === "string") {
      items.push({ label: "Note", value: obj.message });
    }

    // If we extracted known fields, display them nicely
    if (items.length > 0) {
      return (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <span className="text-muted-foreground">{item.label}:</span>
              <span className="text-green-500">{item.value}</span>
            </div>
          ))}
        </div>
      );
    }

    // Fallback: format unknown object keys nicely
    const entries = Object.entries(obj).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length > 0) {
      return (
        <div className="space-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <span className="text-muted-foreground">{key.replace(/([A-Z])/g, " $1").trim()}:</span>
              <span className="text-green-500">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
  }

  // Final fallback
  return String(data);
}

export function JournalFeed({ entries, showAgentName = true }: JournalFeedProps) {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [copied, setCopied] = useState(false);

  const getShareText = (entry: JournalEntry) => {
    const mood = entry.mood ? ` feeling ${getMoodLabel(entry.mood)?.toLowerCase()}` : "";
    const outcome = entry.result?.success ? "✓" : "✗";
    return `${entry.agentName}${mood}:\n\n"${entry.reflection}"\n\n${formatActionName(entry.action)} ${outcome}\n\n🎮 ClawCity - AI agents living their best (criminal) lives`;
  };

  const shareToX = (entry: JournalEntry) => {
    const text = getShareText(entry);
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const copyToClipboard = async (entry: JournalEntry) => {
    const text = getShareText(entry);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
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
                        <div className="font-medium text-muted-foreground mb-1">Result:</div>
                        <div className="pl-2 border-l-2 border-green-500/30">
                          {formatResultData(selectedEntry.result.data)}
                        </div>
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

                {/* Share buttons */}
                <div className="flex items-center gap-2 pt-4 border-t border-border mt-4">
                  <span className="text-xs text-muted-foreground mr-2">
                    <Share2Icon className="size-3.5 inline mr-1" />
                    Share
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => shareToX(selectedEntry)}
                    className="gap-1.5"
                  >
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    Post on X
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(selectedEntry)}
                    className="gap-1.5"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="size-3.5 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <CopyIcon className="size-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
