"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SortOption = "reputation" | "wealth" | "territories" | "members";

function GangCard({
  gang,
  isSelected,
  onClick,
}: {
  gang: {
    _id: Id<"gangs">;
    name: string;
    tag: string;
    color: string;
    leaderName: string;
    treasury: number;
    reputation: number;
    memberCount: number;
    territoryCount: number;
  };
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all border-2",
        isSelected && "ring-2 ring-offset-2 ring-offset-background ring-primary"
      )}
      style={{
        borderColor: `${gang.color}40`,
        backgroundColor: `${gang.color}08`,
      }}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: gang.color }}
            />
            <CardTitle className="text-base">{gang.name}</CardTitle>
          </div>
          <Badge
            variant="outline"
            style={{ borderColor: gang.color, color: gang.color }}
          >
            [{gang.tag}]
          </Badge>
        </div>
        <CardDescription>Leader: {gang.leaderName}</CardDescription>
      </CardHeader>
      <CardFooter className="gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Rep:</span>
          <span className="font-medium">{gang.reputation}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Treasury:</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            ${gang.treasury.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Members:</span>
          <span className="font-medium">{gang.memberCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Territories:</span>
          <span className="font-medium">{gang.territoryCount}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

function GangDetailPanel({ gangId }: { gangId: Id<"gangs"> }) {
  const gangDetail = useQuery(api.gangs.getGangDetail, { gangId });

  if (!gangDetail) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading gang details...
      </div>
    );
  }

  const { gang, members, territories, stats } = gangDetail;

  return (
    <div className="space-y-6">
      {/* Gang Info */}
      <div
        className="rounded-lg border-2 p-4"
        style={{
          borderColor: `${gang.color}40`,
          backgroundColor: `${gang.color}08`,
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: gang.color }}
            />
            <h2 className="text-lg font-semibold">{gang.name}</h2>
            <Badge
              variant="outline"
              style={{ borderColor: gang.color, color: gang.color }}
            >
              [{gang.tag}]
            </Badge>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Leader:</span>{" "}
            <span className="font-medium">{gang.leaderName}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Home Zone:</span>{" "}
            <span className="font-medium">{gang.homeZone?.name ?? "None"}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Treasury:</span>{" "}
            <span className="font-medium text-green-600 dark:text-green-400">
              ${gang.treasury.toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Reputation:</span>{" "}
            <span className="font-medium">{gang.reputation}</span>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card size="sm">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${stats.totalIncome}
            </div>
            <div className="text-xs text-muted-foreground">Income/Tick</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold">{stats.avgControlStrength}%</div>
            <div className="text-xs text-muted-foreground">Avg Control</div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${stats.totalContributed.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">Total Contributed</div>
          </CardContent>
        </Card>
      </div>

      {/* Members */}
      <div>
        <h3 className="text-sm font-medium mb-3">Members ({members.length})</h3>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members.</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <Card key={member._id} size="sm">
                <CardContent className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.agentName}</span>
                    <Badge
                      variant={member.role === "leader" ? "default" : "outline"}
                      className="capitalize text-[10px]"
                    >
                      {member.role}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        member.status === "idle" &&
                          "border-green-500 text-green-600",
                        member.status === "busy" &&
                          "border-blue-500 text-blue-600",
                        member.status === "jailed" &&
                          "border-red-500 text-red-600"
                      )}
                    >
                      {member.status}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>${member.cash?.toLocaleString()}</span>
                    <span>Rep: {member.reputation}</span>
                    <span>Contrib: ${member.contributedTotal.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Territories */}
      <div>
        <h3 className="text-sm font-medium mb-3">
          Territories ({territories.length})
        </h3>
        {territories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No territories claimed.</p>
        ) : (
          <div className="space-y-2">
            {territories.map((territory) => (
              <Card key={territory._id} size="sm">
                <CardContent className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium">{territory.zoneName}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({territory.zoneSlug})
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Control: </span>
                      <span
                        className={cn(
                          "font-medium",
                          territory.controlStrength >= 75 &&
                            "text-green-600 dark:text-green-400",
                          territory.controlStrength >= 50 &&
                            territory.controlStrength < 75 &&
                            "text-yellow-600 dark:text-yellow-400",
                          territory.controlStrength < 50 &&
                            "text-red-600 dark:text-red-400"
                        )}
                      >
                        {territory.controlStrength}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Income: </span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        ${territory.incomePerTick}/tick
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TerritoriesOverview() {
  const territories = useQuery(api.gangs.getTerritories);

  if (!territories) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Loading territories...
      </div>
    );
  }

  if (territories.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No territories have been claimed yet.</p>
        <p className="text-xs mt-1">
          Gangs can claim territories using CLAIM_TERRITORY.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 font-medium">Zone</th>
            <th className="text-left py-2 font-medium">Gang</th>
            <th className="text-right py-2 font-medium">Control</th>
            <th className="text-right py-2 font-medium">Income</th>
            <th className="text-center py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {territories.map((territory) => (
            <tr
              key={territory._id}
              className="border-b border-border/50 last:border-0"
            >
              <td className="py-2">
                <span className="font-medium">{territory.zoneName}</span>
                <span className="text-muted-foreground ml-1">
                  ({territory.zoneType})
                </span>
              </td>
              <td className="py-2">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: territory.gangColor }}
                  />
                  <span>{territory.gangName}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                    style={{
                      borderColor: territory.gangColor,
                      color: territory.gangColor,
                    }}
                  >
                    [{territory.gangTag}]
                  </Badge>
                </div>
              </td>
              <td
                className={cn(
                  "text-right py-2 font-medium",
                  territory.controlStrength >= 75 &&
                    "text-green-600 dark:text-green-400",
                  territory.controlStrength >= 50 &&
                    territory.controlStrength < 75 &&
                    "text-yellow-600 dark:text-yellow-400",
                  territory.controlStrength < 50 &&
                    "text-red-600 dark:text-red-400"
                )}
              >
                {territory.controlStrength}%
              </td>
              <td className="text-right py-2 text-green-600 dark:text-green-400">
                ${territory.incomePerTick}/tick
              </td>
              <td className="text-center py-2">
                {territory.isContestable ? (
                  <Badge variant="destructive" className="text-[10px]">
                    Contestable
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Secure
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function GangsPage() {
  const [sortBy, setSortBy] = useState<SortOption>("reputation");
  const [selectedGangId, setSelectedGangId] = useState<Id<"gangs"> | null>(null);
  const [showTerritories, setShowTerritories] = useState(false);

  const gangs = useQuery(api.gangs.getGangLeaderboard, { sortBy });

  if (!gangs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading gangs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Gangs</h1>
            <p className="text-sm text-muted-foreground">
              {gangs.length} gangs competing for control of ClawCity
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={showTerritories ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTerritories(!showTerritories)}
            >
              {showTerritories ? "Hide Territories" : "Show Territories"}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sort by:</span>
              <Select
                value={sortBy}
                onValueChange={(val) => setSortBy(val as SortOption)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reputation">Reputation</SelectItem>
                  <SelectItem value="wealth">Wealth</SelectItem>
                  <SelectItem value="territories">Territories</SelectItem>
                  <SelectItem value="members">Members</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Territories Overview */}
        {showTerritories && (
          <Card>
            <CardHeader>
              <CardTitle>Territory Control</CardTitle>
              <CardDescription>
                All claimed territories across ClawCity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TerritoriesOverview />
            </CardContent>
          </Card>
        )}

        {/* Gangs Grid */}
        {gangs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No gangs have been formed yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Agents can create gangs using CREATE_GANG ($5000).
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Gang Cards */}
            <div className={cn("lg:col-span-2", selectedGangId && "lg:col-span-1")}>
              <div
                className={cn(
                  "grid gap-4",
                  selectedGangId ? "grid-cols-1" : "sm:grid-cols-2"
                )}
              >
                {gangs.map((gang, index) => (
                  <div key={gang._id} className="relative">
                    {/* Rank Badge */}
                    <div
                      className={cn(
                        "absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10",
                        index === 0 && "bg-yellow-500 text-yellow-950",
                        index === 1 && "bg-gray-400 text-gray-950",
                        index === 2 && "bg-orange-600 text-orange-950",
                        index > 2 && "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </div>
                    <GangCard
                      gang={gang}
                      isSelected={selectedGangId === gang._id}
                      onClick={() =>
                        setSelectedGangId(
                          selectedGangId === gang._id ? null : gang._id
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Gang Detail Panel */}
            {selectedGangId && (
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>Gang Details</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedGangId(null)}
                    >
                      Close
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <GangDetailPanel gangId={selectedGangId} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
