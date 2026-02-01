"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  HomeIcon,
  DollarSignIcon,
  StarIcon,
  TrophyIcon,
  UsersIcon,
  HeartIcon,
  BriefcaseIcon,
  ShieldIcon,
  TargetIcon,
} from "lucide-react";

type GoalType =
  | "wealth"
  | "property"
  | "reputation"
  | "achievement"
  | "social"
  | "health"
  | "career"
  | "power"
  | "custom";

type GoalBadgeProps = {
  title: string;
  type: GoalType;
  currentValue: number;
  targetValue: number;
  unit?: string;
  compact?: boolean;
  className?: string;
};

const GOAL_ICONS: Record<GoalType, React.ComponentType<{ className?: string }>> = {
  wealth: DollarSignIcon,
  property: HomeIcon,
  reputation: StarIcon,
  achievement: TrophyIcon,
  social: UsersIcon,
  health: HeartIcon,
  career: BriefcaseIcon,
  power: ShieldIcon,
  custom: TargetIcon,
};

function formatValue(value: number, unit?: string): string {
  if (unit === "$" || unit === "dollar" || unit === "dollars") {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value.toLocaleString()}`;
  }
  if (unit === "%") {
    return `${value}%`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toLocaleString();
}

function getProgressColor(percentage: number): string {
  if (percentage < 25) return "text-red-500";
  if (percentage < 50) return "text-orange-500";
  if (percentage < 75) return "text-yellow-500";
  return "text-green-500";
}

export function GoalBadge({
  title,
  type,
  currentValue,
  targetValue,
  unit,
  compact = false,
  className,
}: GoalBadgeProps) {
  const Icon = GOAL_ICONS[type] ?? TargetIcon;
  const percentage = Math.min(
    100,
    Math.round((currentValue / targetValue) * 100)
  );
  const progressColor = getProgressColor(percentage);

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-xs",
          className
        )}
        title={`${title}: ${formatValue(currentValue, unit)} / ${formatValue(targetValue, unit)} (${percentage}%)`}
      >
        <Icon className="size-3 text-muted-foreground" />
        <span className={cn("font-medium", progressColor)}>
          {formatValue(currentValue, unit)}/{formatValue(targetValue, unit)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 border border-border",
        className
      )}
    >
      <Icon className="size-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-xs font-medium">{title}</span>
        <span className={cn("text-xs", progressColor)}>
          {formatValue(currentValue, unit)} / {formatValue(targetValue, unit)}
        </span>
      </div>
    </div>
  );
}
