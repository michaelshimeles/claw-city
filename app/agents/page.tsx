"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegisterAgentDialog } from "@/components/agents/register-agent-dialog";
import {
  EyeIcon,
  UsersIcon,
  FilterIcon,
  ZapIcon,
  StarIcon,
  PackageIcon,
  Loader2Icon,
} from "lucide-react";

type AgentStatus = "idle" | "busy" | "jailed" | "hospitalized";

const STATUS_OPTIONS: { label: string; value: AgentStatus | "all" }[] = [
  { label: "All Statuses", value: "all" },
  { label: "Idle", value: "idle" },
  { label: "Busy", value: "busy" },
  { label: "Jailed", value: "jailed" },
  { label: "Hospitalized", value: "hospitalized" },
];

function getStatusBadgeVariant(
  status: AgentStatus
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

function getHeatColor(heat: number): string {
  if (heat < 30) return "bg-green-500";
  if (heat < 60) return "bg-yellow-500";
  return "bg-red-500";
}

function getHeatTextColor(heat: number): string {
  if (heat < 30) return "text-green-600 dark:text-green-400";
  if (heat < 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

// Skill bar component
function SkillBars({ skills }: { skills: { driving: number; negotiation: number; stealth: number; combat: number } }) {
  return (
    <div className="flex gap-0.5" title={`D:${skills.driving} N:${skills.negotiation} S:${skills.stealth} C:${skills.combat}`}>
      <div className="w-1 h-3 rounded-sm" style={{ backgroundColor: `rgba(34, 197, 94, ${skills.driving / 100})` }} />
      <div className="w-1 h-3 rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${skills.negotiation / 100})` }} />
      <div className="w-1 h-3 rounded-sm" style={{ backgroundColor: `rgba(168, 85, 247, ${skills.stealth / 100})` }} />
      <div className="w-1 h-3 rounded-sm" style={{ backgroundColor: `rgba(239, 68, 68, ${skills.combat / 100})` }} />
    </div>
  );
}

export default function AgentsPage() {
  const [statusFilter, setStatusFilter] = React.useState<AgentStatus | "all">("all");
  const [zoneFilter, setZoneFilter] = React.useState<string>("all");
  const [displayLimit, setDisplayLimit] = React.useState(50);

  // Reset display limit when filters change
  React.useEffect(() => {
    setDisplayLimit(50);
  }, [statusFilter, zoneFilter]);

  // Query agents with pagination limit
  const agentsResult = useQuery(
    api.agents.listAgents,
    statusFilter !== "all" ? { status: statusFilter, limit: displayLimit } : { limit: displayLimit }
  );

  // Query zones for filter dropdown
  const zones = useQuery(api.zones.listZones);

  // Query gangs for gang badges
  const gangs = useQuery(api.gangs.listGangs, {});

  // Create zone lookup map
  const zoneMap = React.useMemo(() => {
    if (!zones) return new Map<string, string>();
    return new Map(zones.map((z) => [z._id, z.name]));
  }, [zones]);

  // Create gang lookup map
  const gangMap = React.useMemo(() => {
    if (!gangs) return new Map<string, { tag: string; color: string }>();
    return new Map(gangs.map((g) => [g._id, { tag: g.tag, color: g.color }]));
  }, [gangs]);

  const agents = agentsResult?.agents ?? [];
  const totalCount = agentsResult?.totalCount ?? 0;

  // Filter agents by zone (client-side since listAgents only supports one filter at a time)
  const filteredAgents = React.useMemo(() => {
    if (zoneFilter === "all") return agents;
    return agents.filter((agent) => agent.locationZoneId === zoneFilter);
  }, [agents, zoneFilter]);

  const hasMore = agentsResult?.hasMore ?? false;
  const isLoading = agentsResult === undefined || zones === undefined;

  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 50);
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-md p-2">
              <UsersIcon className="text-primary size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Agents</h1>
              <p className="text-muted-foreground text-sm">
                Manage registered agents in ClawCity
              </p>
            </div>
          </div>
          <RegisterAgentDialog />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <FilterIcon className="text-muted-foreground size-4" />
                <span className="text-muted-foreground text-sm font-medium">
                  Filters:
                </span>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value: string | null) =>
                  setStatusFilter((value ?? "all") as AgentStatus | "all")
                }
              >
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={zoneFilter}
                onValueChange={(value: string | null) => setZoneFilter(value ?? "all")}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by zone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Zones</SelectItem>
                    {zones?.map((zone) => (
                      <SelectItem key={zone._id} value={zone._id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {(statusFilter !== "all" || zoneFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setZoneFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Agents Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {isLoading
                  ? "Loading..."
                  : `${filteredAgents.length} of ${totalCount} Agents`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">Loading agents...</p>
              </div>
            ) : filteredAgents.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No agents found.{" "}
                  {statusFilter !== "all" || zoneFilter !== "all"
                    ? "Try adjusting your filters."
                    : "Register a new agent to get started."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-border border-b">
                      <th className="text-muted-foreground px-2 sm:px-4 py-3 text-left font-medium">
                        Name
                      </th>
                      <th className="text-muted-foreground px-2 sm:px-4 py-3 text-left font-medium">
                        Status
                      </th>
                      <th className="text-muted-foreground px-2 sm:px-4 py-3 text-left font-medium hidden sm:table-cell">
                        Location
                      </th>
                      <th className="text-muted-foreground px-2 sm:px-4 py-3 text-right font-medium">
                        Cash
                      </th>
                      <th className="text-muted-foreground px-2 sm:px-4 py-3 text-left font-medium hidden md:table-cell">
                        Health/Stamina
                      </th>
                      <th className="text-muted-foreground px-2 sm:px-4 py-3 text-left font-medium hidden lg:table-cell">
                        Heat
                      </th>
                      <th className="text-muted-foreground px-2 sm:px-4 py-3 text-center font-medium hidden lg:table-cell">
                        Rep
                      </th>
                      <th className="text-muted-foreground px-2 sm:px-4 py-3 text-center font-medium hidden xl:table-cell">
                        Skills
                      </th>
                      <th className="text-muted-foreground px-2 sm:px-4 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map((agent) => {
                      const gang = agent.gangId ? gangMap.get(agent.gangId) : null;

                      return (
                        <tr
                          key={agent._id}
                          className="border-border hover:bg-muted/50 border-b transition-colors last:border-0 relative"
                        >
                          <td className="px-2 sm:px-4 py-3">
                            <div className="flex items-center gap-1 sm:gap-2">
                              {gang && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] sm:text-xs"
                                  style={{
                                    borderColor: gang.color,
                                    color: gang.color,
                                  }}
                                >
                                  [{gang.tag}]
                                </Badge>
                              )}
                              <span className="font-medium text-sm sm:text-base truncate max-w-[80px] sm:max-w-none">{agent.name}</span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <Badge variant={getStatusBadgeVariant(agent.status)} className="text-[10px] sm:text-xs">
                                {agent.status}
                              </Badge>
                              {agent.status === "busy" && agent.busyAction && (
                                <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[60px] sm:max-w-[100px]">
                                  {agent.busyAction}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="text-muted-foreground px-2 sm:px-4 py-3 hidden sm:table-cell">
                            {zoneMap.get(agent.locationZoneId) || "Unknown"}
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-right font-mono text-xs sm:text-sm">
                            ${agent.cash.toLocaleString()}
                          </td>
                          <td className="px-2 sm:px-4 py-3 hidden md:table-cell">
                            <div className="space-y-1">
                              {/* Health bar */}
                              <div className="flex items-center gap-2">
                                <div className="bg-muted h-2 w-12 overflow-hidden rounded-full">
                                  <div
                                    className={`h-full transition-all ${
                                      agent.health > 60
                                        ? "bg-green-500"
                                        : agent.health > 30
                                          ? "bg-yellow-500"
                                          : "bg-red-500"
                                    }`}
                                    style={{ width: `${agent.health}%` }}
                                  />
                                </div>
                                <span className="text-muted-foreground text-xs w-6">
                                  {agent.health}
                                </span>
                              </div>
                              {/* Stamina bar */}
                              <div className="flex items-center gap-2">
                                <div className="bg-muted h-2 w-12 overflow-hidden rounded-full">
                                  <div
                                    className="h-full bg-yellow-500 transition-all"
                                    style={{ width: `${agent.stamina}%` }}
                                  />
                                </div>
                                <ZapIcon className="size-3 text-yellow-500" />
                              </div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 hidden lg:table-cell">
                            <div className="flex items-center gap-2">
                              <div
                                className={`size-2.5 rounded-full ${getHeatColor(agent.heat)}`}
                              />
                              <span
                                className={`text-xs font-medium ${getHeatTextColor(agent.heat)}`}
                              >
                                {agent.heat}
                              </span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-center hidden lg:table-cell">
                            <div className="flex items-center justify-center gap-1">
                              <StarIcon className="size-3 text-purple-500" />
                              <span className="text-sm">{agent.reputation}</span>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 hidden xl:table-cell">
                            <div className="flex justify-center">
                              <SkillBars skills={agent.skills} />
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Inventory indicator */}
                              {agent.inventory.length > 0 && (
                                <div className="relative group hidden sm:block">
                                  <PackageIcon className="size-4 text-muted-foreground" />
                                  <span className="absolute -top-1 -right-1 text-[10px] bg-primary text-primary-foreground rounded-full size-3.5 flex items-center justify-center">
                                    {agent.inventory.reduce((sum, i) => sum + i.qty, 0)}
                                  </span>
                                </div>
                              )}
                              <Link href={`/agents/${agent._id}`}>
                                <Button variant="ghost" size="sm" className="px-2 sm:px-3">
                                  <EyeIcon className="size-3.5 sm:mr-1" />
                                  <span className="hidden sm:inline">View</span>
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* Load More Button */}
            {!isLoading && hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  className="gap-2"
                >
                  <Loader2Icon className="size-4 animate-spin hidden" />
                  Load More Agents
                </Button>
              </div>
            )}
            {!isLoading && filteredAgents.length > 0 && (
              <p className="text-center text-xs text-muted-foreground mt-4">
                Showing {filteredAgents.length} of {totalCount} agents
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
