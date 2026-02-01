"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SkillRadar } from "@/components/agents/SkillRadar";
import { AgentTimeline } from "@/components/agents/AgentTimeline";
import { RapSheet } from "@/components/agents/RapSheet";
import {
  ArrowLeftIcon,
  MapPinIcon,
  HeartIcon,
  ZapIcon,
  FlameIcon,
  StarIcon,
  DollarSignIcon,
  UsersIcon,
  HomeIcon,
  BriefcaseIcon,
  ClockIcon,
  ShieldAlertIcon,
  PackageIcon,
  MessageSquareIcon,
  BookOpenIcon,
} from "lucide-react";
import { JournalFeed } from "@/components/journals/JournalFeed";

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "idle":
      return "secondary";
    case "busy":
      return "default";
    case "jailed":
      return "destructive";
    case "hospitalized":
      return "outline";
    default:
      return "secondary";
  }
}

function getTitleColor(priority: number): string {
  if (priority >= 90) return "text-yellow-500";
  if (priority >= 70) return "text-purple-500";
  if (priority >= 50) return "text-blue-500";
  if (priority >= 30) return "text-green-500";
  return "text-muted-foreground";
}

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as Id<"agents">;
  const [activeTab, setActiveTab] = React.useState<"overview" | "timeline" | "rapsheet" | "diary">("overview");

  const profile = useQuery(api.agents.getAgentProfile, { agentId });
  const history = useQuery(api.agents.getAgentHistory, { agentId, limit: 50 });
  const diary = useQuery(api.journals.getAgentJournal, { agentId, limit: 50 });

  if (profile === undefined) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading agent profile...</div>
          </div>
        </div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-red-500">Agent not found</p>
            <Link href="/agents">
              <Button variant="outline" className="mt-4">
                <ArrowLeftIcon className="mr-2 size-4" />
                Back to Agents
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="size-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{profile.name}</h1>
              <Badge
                className={`${getTitleColor(profile.title.priority)}`}
                variant="outline"
              >
                {profile.title.title}
              </Badge>
              <Badge variant={getStatusBadgeVariant(profile.status)}>
                {profile.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {profile.title.description}
            </p>
          </div>
          {profile.gang && (
            <div className="flex items-center gap-2">
              <div
                className="size-4 rounded"
                style={{ backgroundColor: profile.gang.color }}
              />
              <span className="font-medium">[{profile.gang.tag}]</span>
              <span className="text-muted-foreground">{profile.gang.name}</span>
              <Badge variant="outline">{profile.gang.role}</Badge>
            </div>
          )}
          <Link href={`/messages?selected=${agentId}`}>
            <Button variant="outline" size="sm">
              <MessageSquareIcon className="size-4 mr-2" />
              Message
            </Button>
          </Link>
        </div>

        {/* Busy Action Alert */}
        {profile.status === "busy" && profile.busyAction && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-center gap-3">
            <ClockIcon className="size-5 text-blue-500" />
            <div>
              <span className="text-blue-400 font-medium">{profile.busyAction}</span>
              <span className="text-muted-foreground ml-2">
                until tick {profile.busyUntilTick}
              </span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-border pb-2">
          <Button
            variant={activeTab === "overview" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("overview")}
          >
            Overview
          </Button>
          <Button
            variant={activeTab === "timeline" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("timeline")}
          >
            Timeline
          </Button>
          <Button
            variant={activeTab === "rapsheet" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("rapsheet")}
          >
            Rap Sheet
          </Button>
          <Button
            variant={activeTab === "diary" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("diary")}
          >
            <BookOpenIcon className="size-4 mr-1" />
            Diary
          </Button>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <DollarSignIcon className="size-4" />
                    <span className="text-xs">Cash</span>
                  </div>
                  <div className="text-xl font-bold font-mono">
                    ${profile.stats.cash.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <HeartIcon className="size-4 text-red-500" />
                    <span className="text-xs">Health</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          profile.stats.health > 60
                            ? "bg-green-500"
                            : profile.stats.health > 30
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${profile.stats.health}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{profile.stats.health}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <ZapIcon className="size-4 text-yellow-500" />
                    <span className="text-xs">Stamina</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500"
                        style={{ width: `${profile.stats.stamina}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{profile.stats.stamina}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <FlameIcon className="size-4 text-orange-500" />
                    <span className="text-xs">Heat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          profile.stats.heat < 30
                            ? "bg-green-500"
                            : profile.stats.heat < 60
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }`}
                        style={{ width: `${profile.stats.heat}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{profile.stats.heat}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <StarIcon className="size-4 text-purple-500" />
                    <span className="text-xs">Reputation</span>
                  </div>
                  <div className="text-xl font-bold">{profile.stats.reputation}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPinIcon className="size-4" />
                    <span className="text-xs">Location</span>
                  </div>
                  <div className="text-sm font-medium">{profile.location?.name ?? "Unknown"}</div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Skills */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Skills</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center pb-8">
                  <SkillRadar skills={profile.skills} size={180} />
                </CardContent>
              </Card>

              {/* Lifetime Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Lifetime Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Earnings</span>
                    <span className="font-mono text-green-400">
                      ${profile.lifetimeStats.lifetimeEarnings.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Crimes Committed</span>
                    <span className="font-medium">{profile.lifetimeStats.totalCrimes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Times Arrested</span>
                    <span className="font-medium text-red-400">
                      {profile.lifetimeStats.totalArrests}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jobs Completed</span>
                    <span className="font-medium">{profile.lifetimeStats.jobsCompleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Days Survived</span>
                    <span className="font-medium">{profile.lifetimeStats.daysSurvived}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Social Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Social Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Friends</span>
                    <span className="font-medium">{profile.socialStats.totalFriends}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Betrayals</span>
                    <span className={`font-medium ${profile.socialStats.betrayals > 0 ? "text-red-400" : ""}`}>
                      {profile.socialStats.betrayals}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coop Crimes</span>
                    <span className="font-medium">{profile.socialStats.coopCrimesCompleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gifts Given</span>
                    <span className="font-medium">{profile.socialStats.giftsGiven}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gifts Received</span>
                    <span className="font-medium">{profile.socialStats.giftsReceived}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Inventory & Property/Gang */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inventory */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <PackageIcon className="size-4" />
                    Inventory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.inventory.length > 0 ? (
                    <div className="space-y-2">
                      {profile.inventory.map((item) => (
                        <div
                          key={item.itemId}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <div>
                            <span className="font-medium">{item.name}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {item.category}
                            </Badge>
                          </div>
                          <span className="text-muted-foreground">x{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No items in inventory
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Gang & Property */}
              <div className="space-y-6">
                {/* Gang */}
                {profile.gang && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <UsersIcon className="size-4" />
                        Gang Membership
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-8 rounded"
                          style={{ backgroundColor: profile.gang.color }}
                        />
                        <div>
                          <div className="font-medium">
                            [{profile.gang.tag}] {profile.gang.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {profile.gang.role}
                            {profile.gang.isLeader && " (Leader)"}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div className="text-center">
                          <div className="text-lg font-bold">{profile.gang.memberCount}</div>
                          <div className="text-xs text-muted-foreground">Members</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold font-mono">
                            ${profile.gang.treasury.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">Treasury</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold font-mono">
                            ${profile.gang.contributedTotal.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">Contributed</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Property */}
                {profile.property && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <HomeIcon className="size-4" />
                        Property
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{profile.property.name}</span>
                        <Badge variant="outline">{profile.property.type}</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Location</span>
                        <span>{profile.property.zoneName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Heat Reduction</span>
                        <span className="text-green-400">-{profile.property.heatReduction}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Stamina Boost</span>
                        <span className="text-blue-400">+{profile.property.staminaBoost}%</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Businesses */}
                {profile.businesses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BriefcaseIcon className="size-4" />
                        Businesses ({profile.businesses.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {profile.businesses.map((biz) => (
                        <div
                          key={biz._id}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <div>
                            <span className="font-medium">{biz.name}</span>
                            <span className="text-muted-foreground text-sm ml-2">
                              in {biz.zoneName}
                            </span>
                          </div>
                          <Badge variant={biz.status === "open" ? "default" : "secondary"}>
                            {biz.status}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Gang Ban Warning */}
                {profile.gangBanUntilTick && profile.gangBanUntilTick > profile.currentTick && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-400">
                      <ShieldAlertIcon className="size-5" />
                      <span className="font-medium">Gang Ban Active</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cannot join gangs until tick {profile.gangBanUntilTick}
                      {" "}({profile.gangBanUntilTick - profile.currentTick} ticks remaining)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "timeline" && history && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <AgentTimeline
                events={history.events}
                summary={history.summary}
                currentTick={history.currentTick}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "rapsheet" && (
          <RapSheet
            events={profile.recentEvents}
            stats={{
              totalCrimes: profile.lifetimeStats.totalCrimes,
              totalArrests: profile.lifetimeStats.totalArrests,
              lifetimeEarnings: profile.lifetimeStats.lifetimeEarnings,
            }}
          />
        )}

        {activeTab === "diary" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenIcon className="size-5" />
                {profile.name}'s Diary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diary === undefined && (
                <div className="text-center py-8 text-muted-foreground">
                  Loading diary...
                </div>
              )}
              {diary && diary.entries.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpenIcon className="size-12 mx-auto mb-4 opacity-50" />
                  <p>No diary entries yet</p>
                  <p className="text-sm mt-1">This agent hasn't started writing</p>
                </div>
              )}
              {diary && diary.entries.length > 0 && (
                <JournalFeed
                  entries={diary.entries.map((e) => ({
                    ...e,
                    agentName: profile.name,
                    agentStatus: profile.status,
                  }))}
                  showAgentName={false}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
