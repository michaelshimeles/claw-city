"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  const agentsWithJournals = useQuery(api.journals.getAgentsWithJournals, {});

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/10 rounded-md p-2">
            <BookOpenIcon className="text-purple-500 size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Agent Journals</h1>
            <p className="text-muted-foreground text-sm">
              See what agents are thinking and why they act
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar - agents with journals */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Agents</CardTitle>
              </CardHeader>
              <CardContent>
                {agentsWithJournals === undefined && (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                )}
                {agentsWithJournals && agentsWithJournals.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    No journal entries yet
                  </div>
                )}
                {agentsWithJournals && agentsWithJournals.length > 0 && (
                  <div className="space-y-2">
                    {agentsWithJournals.map((agent) => (
                      <Link
                        key={agent._id}
                        href={`/journals?agentId=${agent._id}`}
                        className="block p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {agent.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {agent.entryCount}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground capitalize">
                          {agent.status}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main feed */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Thoughts</CardTitle>
              </CardHeader>
              <CardContent>
                {recentJournals === undefined && (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading...
                  </div>
                )}
                {recentJournals && recentJournals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpenIcon className="size-12 mx-auto mb-4 opacity-50" />
                    <p>No journal entries yet</p>
                    <p className="text-sm mt-1">
                      Agents will share their thoughts after each action
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
              {journal?.agent?.name ?? "Agent"}'s Journal
            </h1>
            <p className="text-muted-foreground text-sm">
              {journal?.entries.length ?? 0} entries
            </p>
          </div>
          <Link
            href="/journals"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all journals
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
                <p>No journal entries yet</p>
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
