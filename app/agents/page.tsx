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
import { EyeIcon, UsersIcon, FilterIcon } from "lucide-react";

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

export default function AgentsPage() {
  const [statusFilter, setStatusFilter] = React.useState<AgentStatus | "all">(
    "all"
  );
  const [zoneFilter, setZoneFilter] = React.useState<string>("all");

  // Query agents with optional status filter
  const agents = useQuery(
    api.agents.listAgents,
    statusFilter !== "all" ? { status: statusFilter } : {}
  );

  // Query zones for filter dropdown
  const zones = useQuery(api.zones.listZones);

  // Create zone lookup map
  const zoneMap = React.useMemo(() => {
    if (!zones) return new Map<string, string>();
    return new Map(zones.map((z) => [z._id, z.name]));
  }, [zones]);

  // Filter agents by zone (client-side since listAgents only supports one filter at a time)
  const filteredAgents = React.useMemo(() => {
    if (!agents) return [];
    if (zoneFilter === "all") return agents;
    return agents.filter((agent) => agent.locationZoneId === zoneFilter);
  }, [agents, zoneFilter]);

  const isLoading = agents === undefined || zones === undefined;

  return (
    <div className="min-h-screen bg-background px-4 py-6"><div className="max-w-7xl mx-auto space-y-6">
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
      <Card size="sm">
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
              <SelectTrigger className="w-[160px]">
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
            <Select value={zoneFilter} onValueChange={(value: string | null) => setZoneFilter(value ?? "all")}>
              <SelectTrigger className="w-[180px]">
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
                : `${filteredAgents.length} Agent${filteredAgents.length !== 1 ? "s" : ""}`}
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
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                      Name
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                      Status
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                      Location
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                      Cash
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                      Health
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-left font-medium">
                      Heat
                    </th>
                    <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent) => (
                    <tr
                      key={agent._id}
                      className="border-border hover:bg-muted/50 border-b transition-colors last:border-0"
                    >
                      <td className="px-4 py-3 font-medium">{agent.name}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getStatusBadgeVariant(agent.status)}>
                          {agent.status}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {zoneMap.get(agent.locationZoneId) || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        ${agent.cash.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="bg-muted h-2 w-16 overflow-hidden rounded-full">
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
                          <span className="text-muted-foreground w-8 text-xs">
                            {agent.health}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-right">
                        <Link href={`/agents/${agent._id}`}>
                          <Button variant="ghost" size="sm">
                            <EyeIcon className="mr-1 size-3.5" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div></div>
  );
}
