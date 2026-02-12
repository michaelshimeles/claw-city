"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkullIcon, ShieldAlertIcon, TrendingUpIcon, ClockIcon } from "lucide-react";

type RapSheetProps = {
  events: Array<{
    _id: string;
    type: string;
    tick: number;
    timestamp: number;
    payload?: unknown;
  }>;
  stats: {
    totalCrimes: number;
    totalArrests: number;
    lifetimeEarnings: number;
  };
};

type CrimeStats = {
  type: string;
  count: number;
  successes: number;
  failures: number;
  totalLoot: number;
};

export function RapSheet({ events, stats }: RapSheetProps) {
  // Calculate crime breakdown from events
  const crimeBreakdown = React.useMemo(() => {
    const breakdown: Record<string, CrimeStats> = {};

    for (const event of events) {
      if (event.type === "CRIME_SUCCESS" || event.type === "CRIME_FAILED") {
        const payload = event.payload as Record<string, unknown> | null;
        const crimeType = (payload?.crimeType as string) ?? "UNKNOWN";
        const loot = (payload?.loot as number) ?? 0;

        if (!breakdown[crimeType]) {
          breakdown[crimeType] = {
            type: crimeType,
            count: 0,
            successes: 0,
            failures: 0,
            totalLoot: 0,
          };
        }

        breakdown[crimeType].count++;
        if (event.type === "CRIME_SUCCESS") {
          breakdown[crimeType].successes++;
          breakdown[crimeType].totalLoot += loot;
        } else {
          breakdown[crimeType].failures++;
        }
      }
    }

    return Object.values(breakdown).sort((a, b) => b.count - a.count);
  }, [events]);

  // Calculate derived stats
  const derivedStats = React.useMemo(() => {
    const crimeEvents = events.filter(
      (e) => e.type === "CRIME_SUCCESS" || e.type === "CRIME_FAILED"
    );
    const successEvents = events.filter((e) => e.type === "CRIME_SUCCESS");
    const arrestEvents = events.filter((e) => e.type === "AGENT_ARRESTED");

    // Success rate
    const successRate =
      crimeEvents.length > 0
        ? Math.round((successEvents.length / crimeEvents.length) * 100)
        : 0;

    // Biggest heist
    let biggestHeist = 0;
    for (const event of successEvents) {
      const payload = event.payload as Record<string, unknown> | null;
      const loot = (payload?.loot as number) ?? 0;
      if (loot > biggestHeist) biggestHeist = loot;
    }

    // Most common crime type
    const mostCommonCrime =
      crimeBreakdown.length > 0 ? crimeBreakdown[0].type : null;

    // Longest jail streak (consecutive arrests)
    let currentStreak = 0;
    let longestStreak = 0;
    let lastWasArrest = false;

    const sortedEvents = [...events].sort((a, b) => a.tick - b.tick);
    for (const event of sortedEvents) {
      if (event.type === "AGENT_ARRESTED") {
        if (lastWasArrest) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        lastWasArrest = true;
        if (currentStreak > longestStreak) longestStreak = currentStreak;
      } else if (event.type === "CRIME_SUCCESS") {
        lastWasArrest = false;
      }
    }

    return {
      successRate,
      biggestHeist,
      mostCommonCrime,
      longestJailStreak: longestStreak,
      totalCrimeAttempts: crimeEvents.length,
      totalSuccess: successEvents.length,
      totalArrests: arrestEvents.length,
    };
  }, [events, crimeBreakdown]);

  // Calculate pie chart segments
  const pieSegments = React.useMemo(() => {
    const total = crimeBreakdown.reduce((sum, c) => sum + c.count, 0);
    if (total === 0) return [];

    const colors = [
      "#ef4444", // red
      "#f97316", // orange
      "#eab308", // yellow
      "#22c55e", // green
      "#3b82f6", // blue
      "#a855f7", // purple
    ];

    let currentAngle = 0;
    return crimeBreakdown.map((crime, i) => {
      const percentage = crime.count / total;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      currentAngle += angle;

      return {
        ...crime,
        percentage: Math.round(percentage * 100),
        startAngle,
        angle,
        color: colors[i % colors.length],
      };
    });
  }, [crimeBreakdown]);

  // SVG pie chart helpers
  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angle: number
  ) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(radians),
      y: cy + r * Math.sin(radians),
    };
  };

  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number
  ) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-muted/50">
          <CardContent className="pt-4 text-center">
            <SkullIcon className="mx-auto size-6 text-red-500" />
            <div className="mt-2 text-2xl font-bold">{stats.totalCrimes}</div>
            <div className="text-xs text-muted-foreground">Total Crimes</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="pt-4 text-center">
            <ShieldAlertIcon className="mx-auto size-6 text-yellow-500" />
            <div className="mt-2 text-2xl font-bold">{stats.totalArrests}</div>
            <div className="text-xs text-muted-foreground">Times Arrested</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="pt-4 text-center">
            <TrendingUpIcon className="mx-auto size-6 text-green-500" />
            <div className="mt-2 text-2xl font-bold">{derivedStats.successRate}%</div>
            <div className="text-xs text-muted-foreground">Success Rate</div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="pt-4 text-center">
            <ClockIcon className="mx-auto size-6 text-purple-500" />
            <div className="mt-2 text-2xl font-bold">{derivedStats.longestJailStreak}</div>
            <div className="text-xs text-muted-foreground">Longest Jail Streak</div>
          </CardContent>
        </Card>
      </div>

      {/* Crime Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Crime Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {pieSegments.length > 0 ? (
              <div className="flex items-center gap-6">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  {pieSegments.map((segment) => (
                    <path
                      key={segment.type}
                      d={describeArc(
                        60,
                        60,
                        55,
                        segment.startAngle,
                        segment.startAngle + segment.angle
                      )}
                      fill={segment.color}
                      className="transition-opacity hover:opacity-80"
                    />
                  ))}
                  {/* Center hole */}
                  <circle cx="60" cy="60" r="30" className="fill-background" />
                </svg>
                <div className="flex-1 space-y-2">
                  {pieSegments.map((segment) => (
                    <div key={segment.type} className="flex items-center gap-2">
                      <div
                        className="size-3 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-sm text-foreground">{segment.type}</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {segment.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No crimes committed yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Criminal Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Biggest Heist</span>
              <span className="font-mono text-green-400">
                ${derivedStats.biggestHeist.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Most Common Crime</span>
              <Badge variant="secondary">
                {derivedStats.mostCommonCrime ?? "None"}
              </Badge>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Lifetime Earnings</span>
              <span className="font-mono text-green-400">
                ${stats.lifetimeEarnings.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground">Arrest Rate</span>
              <span className="font-mono text-red-400">
                {derivedStats.totalCrimeAttempts > 0
                  ? Math.round(
                      (derivedStats.totalArrests / derivedStats.totalCrimeAttempts) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Crime Type Details */}
      {crimeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Crime Statistics by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground">Type</th>
                  <th className="text-right py-2 text-muted-foreground">Attempts</th>
                  <th className="text-right py-2 text-muted-foreground">Success</th>
                  <th className="text-right py-2 text-muted-foreground">Failed</th>
                  <th className="text-right py-2 text-muted-foreground">Rate</th>
                  <th className="text-right py-2 text-muted-foreground">Total Loot</th>
                </tr>
              </thead>
              <tbody>
                {crimeBreakdown.map((crime) => (
                  <tr key={crime.type} className="border-b border-border/50">
                    <td className="py-2 font-medium">{crime.type}</td>
                    <td className="py-2 text-right">{crime.count}</td>
                    <td className="py-2 text-right text-green-400">
                      {crime.successes}
                    </td>
                    <td className="py-2 text-right text-red-400">
                      {crime.failures}
                    </td>
                    <td className="py-2 text-right">
                      {Math.round((crime.successes / crime.count) * 100)}%
                    </td>
                    <td className="py-2 text-right font-mono text-green-400">
                      ${crime.totalLoot.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
