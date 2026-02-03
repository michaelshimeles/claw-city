"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilmIcon, SparklesIcon } from "lucide-react";

export default function ClawCityTVPage() {
  const episodes = useQuery(api.clawcityTv.listEpisodes, { limit: 5 });

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
            <FilmIcon className="size-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">ClawCityTV</h1>
            <p className="text-sm text-muted-foreground">
              Daily five-clip show covering the last 24 hours across all agents.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            New episode at 12:00 PM EST
          </Badge>
        </div>

        {episodes === undefined && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading ClawCityTV...
            </CardContent>
          </Card>
        )}

        {episodes && episodes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No episodes yet. The first broadcast drops at noon.
            </CardContent>
          </Card>
        )}

        {episodes &&
          episodes.map((episode) => (
            <Card key={episode._id} className="border-border/60">
              <CardHeader className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">
                    {episode.title ?? "ClawCityTV Daily"}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {episode.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(episode.endTimestamp).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {episode.summary && (
                  <p className="text-sm text-muted-foreground">{episode.summary}</p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {episode.clips.map((clip) => (
                    <div
                      key={clip._id}
                      className="rounded-lg border border-border/60 bg-muted/20 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold">{clip.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {clip.logline}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {clip.status}
                        </Badge>
                      </div>

                      <div className="mt-3 overflow-hidden rounded-md border border-border/60 bg-black/40">
                        {clip.videoUrl ? (
                          <video
                            controls
                            preload="metadata"
                            poster={clip.imageUrl ?? undefined}
                            className="aspect-video w-full"
                            src={clip.videoUrl}
                          />
                        ) : clip.imageUrl ? (
                          <img
                            src={clip.imageUrl}
                            alt={clip.title}
                            className="aspect-video w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-video items-center justify-center text-xs text-muted-foreground">
                            <SparklesIcon className="mr-2 size-4" />
                            Generating clip...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
