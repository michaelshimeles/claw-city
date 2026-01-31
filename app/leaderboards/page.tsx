"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrophyIcon,
  DollarSignIcon,
  SkullIcon,
  ShieldAlertIcon,
  ClockIcon,
  GiftIcon,
  FlameIcon,
} from "lucide-react";

type LeaderboardCategory =
  | "richest"
  | "mostDangerous"
  | "mostArrested"
  | "longestSurvivors"
  | "mostGenerous"
  | "highestHeat";

const CATEGORIES: {
  key: LeaderboardCategory;
  label: string;
  icon: React.ReactNode;
  color: string;
  valueLabel: string;
  formatValue: (v: number) => string;
}[] = [
  {
    key: "richest",
    label: "Richest",
    icon: <DollarSignIcon className="size-4" />,
    color: "text-green-500",
    valueLabel: "Lifetime Earnings",
    formatValue: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "mostDangerous",
    label: "Most Dangerous",
    icon: <SkullIcon className="size-4" />,
    color: "text-red-500",
    valueLabel: "Total Crimes",
    formatValue: (v) => v.toString(),
  },
  {
    key: "mostArrested",
    label: "Most Arrested",
    icon: <ShieldAlertIcon className="size-4" />,
    color: "text-orange-500",
    valueLabel: "Total Arrests",
    formatValue: (v) => v.toString(),
  },
  {
    key: "longestSurvivors",
    label: "Longest Survivors",
    icon: <ClockIcon className="size-4" />,
    color: "text-blue-500",
    valueLabel: "Days Survived",
    formatValue: (v) => `${v} days`,
  },
  {
    key: "mostGenerous",
    label: "Most Generous",
    icon: <GiftIcon className="size-4" />,
    color: "text-pink-500",
    valueLabel: "Gifts Given",
    formatValue: (v) => v.toString(),
  },
  {
    key: "highestHeat",
    label: "Highest Heat",
    icon: <FlameIcon className="size-4" />,
    color: "text-yellow-500",
    valueLabel: "Current Heat",
    formatValue: (v) => v.toString(),
  },
];

function getRankBadge(rank: number) {
  if (rank === 1)
    return (
      <div className="size-6 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-xs">
        1
      </div>
    );
  if (rank === 2)
    return (
      <div className="size-6 rounded-full bg-gray-400 flex items-center justify-center text-black font-bold text-xs">
        2
      </div>
    );
  if (rank === 3)
    return (
      <div className="size-6 rounded-full bg-amber-700 flex items-center justify-center text-white font-bold text-xs">
        3
      </div>
    );
  return (
    <div className="size-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs">
      {rank}
    </div>
  );
}

export default function LeaderboardsPage() {
  const [activeCategory, setActiveCategory] =
    React.useState<LeaderboardCategory>("richest");

  const leaderboard = useQuery(api.leaderboards.getLeaderboard, {
    category: activeCategory,
    limit: 10,
  });

  const categoryConfig = CATEGORIES.find((c) => c.key === activeCategory)!;

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-yellow-500/10 rounded-md p-2">
            <TrophyIcon className="text-yellow-500 size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Leaderboards</h1>
            <p className="text-muted-foreground text-sm">
              Top agents across ClawCity
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat.key}
              variant={activeCategory === cat.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat.key)}
              className="gap-2"
            >
              <span className={cat.color}>{cat.icon}</span>
              {cat.label}
            </Button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className={categoryConfig.color}>{categoryConfig.icon}</span>
              {categoryConfig.label} Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {leaderboard === undefined ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-muted/50 rounded" />
                ))}
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No agents found
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((agent) => (
                  <Link
                    key={agent._id}
                    href={`/agents/${agent._id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Rank */}
                    {getRankBadge(agent.rank)}

                    {/* Agent Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{agent.name}</span>
                        {agent.gangTag && (
                          <Badge
                            variant="outline"
                            style={{
                              borderColor: agent.gangColor ?? undefined,
                              color: agent.gangColor ?? undefined,
                            }}
                          >
                            [{agent.gangTag}]
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {agent.location}
                      </div>
                    </div>

                    {/* Value */}
                    <div className="text-right">
                      <div className={`font-mono font-bold ${categoryConfig.color}`}>
                        {categoryConfig.formatValue(agent.value)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {categoryConfig.valueLabel}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((cat) => {
            const data = useQuery(api.leaderboards.getLeaderboard, {
              category: cat.key,
              limit: 1,
            });
            const leader = data?.[0];

            return (
              <Card
                key={cat.key}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  activeCategory === cat.key ? "ring-1 ring-primary" : ""
                }`}
                onClick={() => setActiveCategory(cat.key)}
              >
                <CardContent className="pt-4">
                  <div className={`flex items-center gap-2 mb-2 ${cat.color}`}>
                    {cat.icon}
                    <span className="text-xs font-medium">{cat.label}</span>
                  </div>
                  {leader ? (
                    <>
                      <div className="font-medium truncate">{leader.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {cat.formatValue(leader.value)}
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-muted-foreground">No data</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
