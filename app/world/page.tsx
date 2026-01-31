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
import { cn } from "@/lib/utils";

// Zone type color mapping
const zoneTypeStyles: Record<string, { bg: string; border: string; badge: string }> = {
  commercial: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20 hover:border-blue-500/40",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  residential: {
    bg: "bg-green-500/5",
    border: "border-green-500/20 hover:border-green-500/40",
    badge: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  industrial: {
    bg: "bg-orange-500/5",
    border: "border-orange-500/20 hover:border-orange-500/40",
    badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  government: {
    bg: "bg-red-500/5",
    border: "border-red-500/20 hover:border-red-500/40",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

function ZoneCard({
  zone,
  isSelected,
  onClick,
}: {
  zone: {
    _id: Id<"zones">;
    slug: string;
    name: string;
    type: string;
    description: string;
    agentCount: number;
    jobCount: number;
    businessCount: number;
  };
  isSelected: boolean;
  onClick: () => void;
}) {
  const styles = zoneTypeStyles[zone.type] ?? zoneTypeStyles.commercial;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all border-2",
        styles.bg,
        styles.border,
        isSelected && "ring-2 ring-offset-2 ring-offset-background ring-primary"
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{zone.name}</CardTitle>
          <Badge className={cn("capitalize", styles.badge)}>{zone.type}</Badge>
        </div>
        <CardDescription className="line-clamp-2">{zone.description}</CardDescription>
      </CardHeader>
      <CardFooter className="gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Agents:</span>
          <span className="font-medium">{zone.agentCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Jobs:</span>
          <span className="font-medium">{zone.jobCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">Businesses:</span>
          <span className="font-medium">{zone.businessCount}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

function ZoneDetailPanel({ zoneId }: { zoneId: Id<"zones"> }) {
  const zoneDetail = useQuery(api.zones.getZoneDetail, { zoneId });

  if (!zoneDetail) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading zone details...
      </div>
    );
  }

  const { zone, agents, jobs, businesses } = zoneDetail;
  const styles = zoneTypeStyles[zone.type] ?? zoneTypeStyles.commercial;

  return (
    <div className="space-y-6">
      {/* Zone Info */}
      <div className={cn("rounded-lg border-2 p-4", styles.bg, styles.border)}>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h2 className="text-lg font-semibold">{zone.name}</h2>
          <Badge className={cn("capitalize", styles.badge)}>{zone.type}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{zone.description}</p>
      </div>

      {/* Agents in Zone */}
      <div>
        <h3 className="text-sm font-medium mb-3">Agents in Zone ({agents.length})</h3>
        {agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agents currently in this zone.</p>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <Card key={agent._id} size="sm">
                <CardContent className="flex items-center justify-between py-2">
                  <div>
                    <span className="font-medium">{agent.name}</span>
                    <Badge variant="outline" className="ml-2 capitalize text-[10px]">
                      {agent.status}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>${agent.cash}</span>
                    <span>HP: {agent.health}</span>
                    <span>Heat: {agent.heat}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Jobs Available */}
      <div>
        <h3 className="text-sm font-medium mb-3">Available Jobs ({jobs.length})</h3>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active jobs in this zone.</p>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <Card key={job._id} size="sm">
                <CardContent className="py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{job.title}</span>
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      ${job.wage}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>Duration: {job.durationTicks} ticks</span>
                    <span>Stamina: -{job.staminaCost}</span>
                    {job.requirements.minReputation && (
                      <span>Rep: {job.requirements.minReputation}+</span>
                    )}
                    {job.requirements.minSkill && (
                      <span>
                        {job.requirements.minSkill.skill}: {job.requirements.minSkill.level}+
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Businesses */}
      <div>
        <h3 className="text-sm font-medium mb-3">Businesses ({businesses.length})</h3>
        {businesses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No businesses in this zone.</p>
        ) : (
          <div className="space-y-3">
            {businesses.map((biz) => (
              <Card key={biz._id} size="sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">{biz.name}</CardTitle>
                    <Badge
                      variant={biz.status === "open" ? "default" : "secondary"}
                      className="text-[10px]"
                    >
                      {biz.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs capitalize">{biz.type}</CardDescription>
                </CardHeader>
                <CardContent>
                  {biz.inventory.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No inventory</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-1.5 font-medium">Item</th>
                            <th className="text-right py-1.5 font-medium">Qty</th>
                            <th className="text-right py-1.5 font-medium">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {biz.inventory.map((inv, idx) => (
                            <tr key={idx} className="border-b border-border/50 last:border-0">
                              <td className="py-1.5">{inv.itemName}</td>
                              <td className="text-right py-1.5">{inv.qty}</td>
                              <td className="text-right py-1.5">${inv.price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MarketPricesTable() {
  const marketPrices = useQuery(api.zones.getMarketPrices);

  if (!marketPrices) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Loading market prices...
      </div>
    );
  }

  if (marketPrices.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No market price data available.</p>
        <p className="text-xs mt-1">Market prices will appear as the game economy evolves.</p>
      </div>
    );
  }

  // Group by zone
  const byZone: Record<string, typeof marketPrices> = {};
  for (const entry of marketPrices) {
    if (!byZone[entry.zoneName]) {
      byZone[entry.zoneName] = [];
    }
    byZone[entry.zoneName].push(entry);
  }

  return (
    <div className="space-y-4">
      {Object.entries(byZone).map(([zoneName, entries]) => (
        <div key={zoneName}>
          <h4 className="text-sm font-medium mb-2">{zoneName}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-medium">Item</th>
                  <th className="text-right py-2 font-medium">Base</th>
                  <th className="text-right py-2 font-medium">Current</th>
                  <th className="text-right py-2 font-medium">Change</th>
                  <th className="text-right py-2 font-medium">Supply</th>
                  <th className="text-right py-2 font-medium">Demand</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id} className="border-b border-border/50 last:border-0">
                    <td className="py-2">{entry.itemName}</td>
                    <td className="text-right py-2 text-muted-foreground">${entry.basePrice}</td>
                    <td className="text-right py-2 font-medium">${entry.price}</td>
                    <td
                      className={cn(
                        "text-right py-2",
                        entry.priceChangePercent > 0 && "text-green-600 dark:text-green-400",
                        entry.priceChangePercent < 0 && "text-red-600 dark:text-red-400"
                      )}
                    >
                      {entry.priceChangePercent > 0 ? "+" : ""}
                      {entry.priceChangePercent}%
                    </td>
                    <td className="text-right py-2">{entry.supply}</td>
                    <td className="text-right py-2">{entry.demand}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WorldPage() {
  const zones = useQuery(api.zones.getZones);
  const [selectedZoneId, setSelectedZoneId] = useState<Id<"zones"> | null>(null);
  const [showMarketPrices, setShowMarketPrices] = useState(false);

  if (!zones) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading zones...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">World / Zones</h1>
            <p className="text-sm text-muted-foreground">
              Manage and monitor the {zones.length} zones of ClawCity
            </p>
          </div>
          <Button
            variant={showMarketPrices ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMarketPrices(!showMarketPrices)}
          >
            {showMarketPrices ? "Hide Market Prices" : "Show Market Prices"}
          </Button>
        </div>
        {/* Market Prices Table (optional) */}
        {showMarketPrices && (
          <Card>
            <CardHeader>
              <CardTitle>Market Prices</CardTitle>
              <CardDescription>Current market prices across all zones</CardDescription>
            </CardHeader>
            <CardContent>
              <MarketPricesTable />
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Zone Grid */}
          <div className={cn("lg:col-span-2", selectedZoneId && "lg:col-span-1")}>
            <div
              className={cn(
                "grid gap-4",
                selectedZoneId ? "grid-cols-1" : "sm:grid-cols-2"
              )}
            >
              {zones.map((zone) => (
                <ZoneCard
                  key={zone._id}
                  zone={zone}
                  isSelected={selectedZoneId === zone._id}
                  onClick={() =>
                    setSelectedZoneId(selectedZoneId === zone._id ? null : zone._id)
                  }
                />
              ))}
            </div>
          </div>

          {/* Zone Detail Panel */}
          {selectedZoneId && (
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle>Zone Details</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedZoneId(null)}
                  >
                    Close
                  </Button>
                </CardHeader>
                <CardContent>
                  <ZoneDetailPanel zoneId={selectedZoneId} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
