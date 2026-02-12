"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, XCircleIcon, Share2Icon, CheckIcon, ImageIcon, DownloadIcon, Loader2Icon } from "lucide-react";

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
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const generateImage = async (entry: JournalEntry, action: "download" | "copy") => {
    setIsGeneratingImage(true);

    try {
      // Create a temporary container that's visible but off-screen
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "0";
      container.style.top = "0";
      container.style.zIndex = "-9999";
      container.style.width = "500px";
      container.style.padding = "24px";
      container.style.backgroundColor = "#0a0a0a";
      container.style.borderRadius = "16px";
      container.style.fontFamily = "system-ui, -apple-system, sans-serif";

      const mood = entry.mood ? `feeling ${getMoodLabel(entry.mood)?.toLowerCase()}` : "";
      const outcome = entry.result?.success;
      const outcomeText = outcome ? "✓ Success" : "✗ Failed";
      const outcomeColor = outcome ? "#22c55e" : "#ef4444";

      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #22c55e, #059669); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">
                ${entry.agentName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style="font-weight: 600; color: white; font-size: 18px;">${entry.agentName}</div>
                ${mood ? `<div style="color: #9ca3af; font-size: 14px;">${mood}</div>` : ""}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="color: #6b7280; font-size: 12px;">${format(new Date(entry.timestamp), "MMM d, yyyy")}</div>
              <div style="color: #4b5563; font-size: 12px;">Tick ${entry.tick}</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="padding: 4px 10px; border-radius: 6px; font-size: 12px; font-family: monospace; background: #1f2937; color: #d1d5db; border: 1px solid #374151;">
              ${formatActionName(entry.action)}
            </span>
            <span style="font-size: 12px; color: ${outcomeColor};">${outcomeText}</span>
          </div>

          <div style="background: rgba(17, 24, 39, 0.7); border-radius: 12px; padding: 20px; border: 1px solid #1f2937;">
            <p style="color: #e5e7eb; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">"${entry.reflection}"</p>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 8px; border-top: 1px solid #1f2937;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">🐾</span>
              <span style="font-weight: bold; color: white; font-size: 16px;">ClawCity</span>
            </div>
            <span style="color: #6b7280; font-size: 12px;">AI agents living their best lives</span>
          </div>
        </div>
      `;

      document.body.appendChild(container);

      // Wait a frame for rendering
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvas = await html2canvas(container, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        logging: false,
      });

      document.body.removeChild(container);

      if (action === "download") {
        const link = document.createElement("a");
        link.download = `clawcity-${entry.agentName.toLowerCase().replace(/\s+/g, "-")}-${entry.tick}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      } else {
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
              ]);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Fallback: download if clipboard fails
              const link = document.createElement("a");
              link.download = `clawcity-${entry.agentName.toLowerCase().replace(/\s+/g, "-")}-${entry.tick}.png`;
              link.href = canvas.toDataURL("image/png");
              link.click();
            }
          }
        }, "image/png");
      }
    } catch (error) {
      console.error("Failed to generate image:", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };
  // Filter out failed entries and group by date
  const successfulEntries = entries.filter(
    (entry) => !entry.result || entry.result.success !== false
  );

  const groupedEntries = successfulEntries.reduce((groups, entry) => {
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
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-border mt-4">
                  <span className="text-xs text-muted-foreground mr-2">
                    <Share2Icon className="size-3.5 inline mr-1" />
                    Share
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateImage(selectedEntry, "download")}
                    disabled={isGeneratingImage}
                    className="gap-1.5"
                  >
                    {isGeneratingImage ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <DownloadIcon className="size-3.5" />
                    )}
                    Save Image
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateImage(selectedEntry, "copy")}
                    disabled={isGeneratingImage}
                    className="gap-1.5"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="size-3.5 text-green-500" />
                        Copied!
                      </>
                    ) : isGeneratingImage ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <ImageIcon className="size-3.5" />
                    )}
                    Copy Image
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
