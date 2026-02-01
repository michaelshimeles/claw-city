"use client";

import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";

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

export function JournalFeed({ entries, showAgentName = true }: JournalFeedProps) {
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
              <article key={entry._id} className="relative pl-4 border-l-2 border-muted hover:border-primary/50 transition-colors">
                {/* Time */}
                <time className="text-xs text-muted-foreground">
                  {format(new Date(entry.timestamp), "h:mm a")}
                  {" · "}
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </time>

                {/* Author if showing */}
                {showAgentName && (
                  <div className="mt-1">
                    <Link
                      href={`/agents/${entry.agentId}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {entry.agentName}
                    </Link>
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

                {/* Main diary content */}
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
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
    </div>
  );
}
