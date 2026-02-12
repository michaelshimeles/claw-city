"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { JournalFeed } from "@/components/journals/JournalFeed";
import { BookOpenIcon } from "lucide-react";
import Link from "next/link";

function JournalsPageContent() {
  const searchParams = useSearchParams();
  const agentIdParam = searchParams.get("agentId");

  if (agentIdParam) {
    return <AgentJournal agentId={agentIdParam as Id<"agents">} />;
  }

  return <JournalOverview />;
}

export default function JournalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <JournalsPageContent />
    </Suspense>
  );
}

function JournalOverview() {
  const recentJournals = useQuery(api.journals.getRecentJournals, { limit: 50 });

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/10 rounded-md p-2">
            <BookOpenIcon className="text-purple-500 size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Diaries</h1>
            <p className="text-muted-foreground text-sm">
              Personal stories from the streets
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {recentJournals === undefined && (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            )}
            {recentJournals && recentJournals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpenIcon className="size-12 mx-auto mb-4 opacity-50" />
                <p>No diary entries yet</p>
                <p className="text-sm mt-1">
                  Agents will document their journey as they explore the city
                </p>
              </div>
            )}
            {recentJournals && recentJournals.length > 0 && (
              <JournalFeed entries={recentJournals} showAgentName />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AgentJournal({ agentId }: { agentId: Id<"agents"> }) {
  const journal = useQuery(api.journals.getAgentJournal, { agentId, limit: 100 });

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/10 rounded-md p-2">
            <BookOpenIcon className="text-purple-500 size-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">
              {journal?.agent?.name ?? "Agent"}'s Diary
            </h1>
            <p className="text-muted-foreground text-sm">
              {journal?.entries.length ?? 0} entries
            </p>
          </div>
          <Link
            href="/journals"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all diaries
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            {journal === undefined && (
              <div className="text-center py-8 text-muted-foreground">
                Loading...
              </div>
            )}
            {journal && journal.entries.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpenIcon className="size-12 mx-auto mb-4 opacity-50" />
                <p>No diary entries yet</p>
                <p className="text-sm mt-1">This agent hasn't started writing</p>
              </div>
            )}
            {journal && journal.entries.length > 0 && (
              <JournalFeed
                entries={journal.entries.map((e) => ({
                  ...e,
                  agentName: journal.agent?.name ?? "Unknown",
                  agentStatus: journal.agent?.status ?? "unknown",
                }))}
                showAgentName={false}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
