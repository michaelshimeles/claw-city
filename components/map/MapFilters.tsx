"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MapFiltersProps = {
  showAgents: boolean;
  showTerritories: boolean;
  showEvents: boolean;
  showConnections: boolean;
  onToggleAgents: () => void;
  onToggleTerritories: () => void;
  onToggleEvents: () => void;
  onToggleConnections: () => void;
  className?: string;
};

/**
 * Toggle controls for map layer visibility
 */
export function MapFilters({
  showAgents,
  showTerritories,
  showEvents,
  showConnections,
  onToggleAgents,
  onToggleTerritories,
  onToggleEvents,
  onToggleConnections,
  className,
}: MapFiltersProps) {
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      <FilterButton
        active={showAgents}
        onClick={onToggleAgents}
        label="Agents"
      />
      <FilterButton
        active={showTerritories}
        onClick={onToggleTerritories}
        label="Territories"
      />
      <FilterButton
        active={showEvents}
        onClick={onToggleEvents}
        label="Events"
      />
      <FilterButton
        active={showConnections}
        onClick={onToggleConnections}
        label="Routes"
      />
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <Button
      variant={active ? "default" : "secondary"}
      size="sm"
      onClick={onClick}
      className="h-7 text-xs"
    >
      {label}
    </Button>
  );
}
