"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  DollarSignIcon,
  StarIcon,
  SwordsIcon,
  UsersIcon,
  TrendingUpIcon,
  WalletIcon,
  TargetIcon,
} from "lucide-react";

export type Goal = {
  id: string;
  title: string;
  description?: string;
  type: "property" | "cash" | "skill" | "reputation" | "crimes" | "earnings" | "gang" | "custom";
  current: number;
  target: number;
  percentage: number;
  isComplete: boolean;
  targetSkill?: string;
};

type AgentGoalsProps = {
  goals: Goal[];
  className?: string;
};

const GOAL_ICONS: Record<Goal["type"], React.ComponentType<{ className?: string }>> = {
  cash: DollarSignIcon,
  property: HomeIcon,
  reputation: StarIcon,
  crimes: SwordsIcon,
  gang: UsersIcon,
  skill: TrendingUpIcon,
  earnings: WalletIcon,
  custom: TargetIcon,
};

function getProgressColor(percentage: number): string {
  if (percentage < 25) return "bg-red-500";
  if (percentage < 50) return "bg-orange-500";
  if (percentage < 75) return "bg-yellow-500";
  return "bg-green-500";
}

function formatValue(value: number, type: Goal["type"]): string {
  // Cash and earnings are displayed as dollars
  if (type === "cash" || type === "earnings" || type === "property") {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toLocaleString()}`;
  }
  // Other types are plain numbers
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toLocaleString();
}

export function AgentGoals({ goals, className }: AgentGoalsProps) {
  if (goals.length === 0) {
    return (
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TargetIcon className="size-4" />
            Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <TargetIcon className="size-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground text-sm">No goals set yet</p>
            <p className="text-muted-foreground/60 text-xs mt-1">
              This agent hasn&apos;t defined any goals
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <TargetIcon className="size-4" />
          Goals ({goals.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const Icon = GOAL_ICONS[goal.type] ?? TargetIcon;
          const progressColor = getProgressColor(goal.percentage);

          return (
            <div
              key={goal.id}
              className="py-3 border-b border-border last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Icon className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm truncate">
                      {goal.title}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatValue(goal.current, goal.type)} /{" "}
                      {formatValue(goal.target, goal.type)}
                    </span>
                  </div>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {goal.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          progressColor,
                          goal.isComplete && "bg-green-500"
                        )}
                        style={{ width: `${goal.percentage}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium min-w-[3rem] text-right",
                        goal.isComplete ? "text-green-500" : "text-muted-foreground"
                      )}
                    >
                      {goal.percentage}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
