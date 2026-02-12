"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

type Node = {
  id: string;
  name: string;
  gangId: string | null;
  gangName: string | null;
  gangTag: string | null;
  gangColor: string | null;
  status: string;
  reputation: number;
  heat: number;
  betrayals: number;
  isBetrayer: boolean;
};

type Edge = {
  id: string;
  source: string;
  target: string;
  type: "friendship" | "gang";
  strength?: number;
  loyalty?: number;
  gangId?: string;
};

type RelationshipGraphProps = {
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
};

// Simple force-directed layout calculation (optimized for performance)
function useForceLayout(
  nodes: Node[],
  edges: Edge[],
  width: number,
  height: number
) {
  const [positions, setPositions] = React.useState<
    Record<string, { x: number; y: number }>
  >({});

  React.useEffect(() => {
    if (nodes.length === 0) return;

    // For large graphs, use simple circular layout instead of force simulation
    if (nodes.length > 100) {
      const finalPositions: Record<string, { x: number; y: number }> = {};
      nodes.forEach((node, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI;
        const radius = Math.min(width, height) * 0.4;
        finalPositions[node.id] = {
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle),
        };
      });
      setPositions(finalPositions);
      return;
    }

    // Initialize positions in a circle
    const pos: Record<string, { x: number; y: number; vx: number; vy: number }> = {};
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      pos[node.id] = {
        x: width / 2 + radius * Math.cos(angle) + (Math.random() - 0.5) * 30,
        y: height / 2 + radius * Math.sin(angle) + (Math.random() - 0.5) * 30,
        vx: 0,
        vy: 0,
      };
    });

    // Build edge lookup for faster access
    const edgeSet = new Set(edges.map((e) => `${e.source}-${e.target}`));
    const hasEdge = (a: string, b: string) =>
      edgeSet.has(`${a}-${b}`) || edgeSet.has(`${b}-${a}`);

    // Simple force simulation (reduced iterations)
    const iterations = Math.min(30, Math.max(10, 50 - nodes.length / 3));

    for (let iter = 0; iter < iterations; iter++) {
      const alpha = 0.3 * (1 - iter / iterations);
      const repulsion = 1500;
      const attraction = 0.15;

      // Apply repulsion forces
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const nodeA = nodes[i];
          const nodeB = nodes[j];

          const dx = pos[nodeB.id].x - pos[nodeA.id].x;
          const dy = pos[nodeB.id].y - pos[nodeA.id].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // Repulsion (weaker for connected nodes)
          const connected = hasEdge(nodeA.id, nodeB.id);
          const repulsionStrength = connected ? repulsion * 0.3 : repulsion;
          const force = repulsionStrength / (dist * dist);

          const fx = (dx / dist) * force * alpha;
          const fy = (dy / dist) * force * alpha;

          pos[nodeA.id].vx -= fx;
          pos[nodeA.id].vy -= fy;
          pos[nodeB.id].vx += fx;
          pos[nodeB.id].vy += fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        if (!pos[edge.source] || !pos[edge.target]) continue;

        const dx = pos[edge.target].x - pos[edge.source].x;
        const dy = pos[edge.target].y - pos[edge.source].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = dist * attraction;
        const fx = (dx / dist) * force * alpha;
        const fy = (dy / dist) * force * alpha;

        pos[edge.source].vx += fx;
        pos[edge.source].vy += fy;
        pos[edge.target].vx -= fx;
        pos[edge.target].vy -= fy;
      }

      // Apply velocities and boundary constraints
      for (const node of nodes) {
        pos[node.id].x += pos[node.id].vx;
        pos[node.id].y += pos[node.id].vy;
        pos[node.id].vx *= 0.85;
        pos[node.id].vy *= 0.85;

        // Keep in bounds
        pos[node.id].x = Math.max(40, Math.min(width - 40, pos[node.id].x));
        pos[node.id].y = Math.max(40, Math.min(height - 40, pos[node.id].y));
      }
    }

    // Update state
    const finalPositions: Record<string, { x: number; y: number }> = {};
    for (const [id, p] of Object.entries(pos)) {
      finalPositions[id] = { x: p.x, y: p.y };
    }
    setPositions(finalPositions);
  }, [nodes, edges, width, height]);

  return positions;
}

export function RelationshipGraph({
  width = 600,
  height = 400,
  onNodeClick,
}: RelationshipGraphProps) {
  const network = useQuery(api.social.getSocialNetwork);
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null);
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  // Zoom and pan state
  const [scale, setScale] = React.useState(1);
  const [translate, setTranslate] = React.useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const svgRef = React.useRef<SVGSVGElement>(null);

  const nodes = network?.nodes ?? [];
  const edges = network?.edges ?? [];

  const positions = useForceLayout(nodes, edges, width, height);

  // Handle mouse wheel for zoom
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, scale * zoomFactor));

    // Zoom toward mouse position
    const svg = svgRef.current;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Adjust translate to zoom toward mouse position
      const scaleChange = newScale / scale;
      setTranslate({
        x: mouseX - (mouseX - translate.x) * scaleChange,
        y: mouseY - (mouseY - translate.y) * scaleChange,
      });
    }

    setScale(newScale);
  }, [scale, translate]);

  // Handle mouse down for pan start
  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setPanStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
    }
  }, [translate]);

  // Handle mouse move for panning
  const handleMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setTranslate({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  }, [isPanning, panStart]);

  // Handle mouse up to stop panning
  const handleMouseUp = React.useCallback(() => {
    setIsPanning(false);
  }, []);

  // Reset zoom/pan
  const handleReset = React.useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId === selectedNode ? null : nodeId);
    onNodeClick?.(nodeId);
  };

  if (!network) {
    return (
      <div
        className="flex items-center justify-center bg-muted/50 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-muted-foreground">Loading network...</div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-muted/50 rounded-lg"
        style={{ width, height }}
      >
        <div className="text-muted-foreground">No agents in the network</div>
      </div>
    );
  }

  // Get selected node details
  const selectedNodeData = selectedNode
    ? nodes.find((n) => n.id === selectedNode)
    : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="bg-muted/50 rounded-lg cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
        {/* Draw edges */}
        {edges.map((edge) => {
          const source = positions[edge.source];
          const target = positions[edge.target];
          if (!source || !target) return null;

          const isGangEdge = edge.type === "gang";
          const isBetrayalEdge =
            nodes.find((n) => n.id === edge.source)?.isBetrayer ||
            nodes.find((n) => n.id === edge.target)?.isBetrayer;

          return (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={
                isBetrayalEdge && !isGangEdge
                  ? "#ef4444"
                  : isGangEdge
                    ? "#8b5cf6"
                    : "#3b82f6"
              }
              strokeWidth={isGangEdge ? 1 : 2}
              strokeOpacity={isGangEdge ? 0.3 : 0.5}
              strokeDasharray={isGangEdge ? "4,4" : undefined}
            />
          );
        })}

        {/* Draw nodes */}
        {nodes.map((node) => {
          const pos = positions[node.id];
          if (!pos) return null;

          const isHovered = hoveredNode === node.id;
          const isSelected = selectedNode === node.id;
          const nodeSize = isHovered || isSelected ? 12 : 8;

          return (
            <g key={node.id}>
              {/* Node circle */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={nodeSize}
                fill={node.gangColor ?? "#71717a"}
                stroke={node.isBetrayer ? "#ef4444" : "#fff"}
                strokeWidth={node.isBetrayer ? 3 : isSelected ? 2 : 1}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => handleNodeClick(node.id)}
              />

              {/* Label on hover */}
              {(isHovered || isSelected) && (
                <text
                  x={pos.x}
                  y={pos.y - 16}
                  textAnchor="middle"
                  className="text-xs fill-white pointer-events-none"
                >
                  {node.name}
                  {node.gangTag && ` [${node.gangTag}]`}
                </text>
              )}
            </g>
          );
        })}
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute top-2 left-2 flex gap-1">
        <button
          onClick={() => setScale(Math.min(3, scale * 1.2))}
          className="bg-background/90 dark:bg-card/90 border border-border rounded px-2 py-1 text-xs hover:bg-muted"
        >
          +
        </button>
        <button
          onClick={() => setScale(Math.max(0.3, scale * 0.8))}
          className="bg-background/90 dark:bg-card/90 border border-border rounded px-2 py-1 text-xs hover:bg-muted"
        >
          −
        </button>
        <button
          onClick={handleReset}
          className="bg-background/90 dark:bg-card/90 border border-border rounded px-2 py-1 text-xs hover:bg-muted"
        >
          Reset
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-2 left-2 bg-background/90 dark:bg-card/90 border border-border rounded p-2 text-xs space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-blue-500" />
          <span className="text-muted-foreground">Friendship</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-purple-500 border-dashed" />
          <span className="text-muted-foreground">Gang</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-red-500" />
          <span className="text-muted-foreground">Betrayer</span>
        </div>
      </div>

      {/* Selected node details */}
      {selectedNodeData && (
        <div className="absolute top-2 right-2 bg-background/95 dark:bg-card/95 border border-border rounded-lg p-3 w-48 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="size-4 rounded-full"
              style={{ backgroundColor: selectedNodeData.gangColor ?? "#71717a" }}
            />
            <span className="font-medium">{selectedNodeData.name}</span>
          </div>
          {selectedNodeData.gangName && (
            <div className="text-xs text-muted-foreground mb-2">
              [{selectedNodeData.gangTag}] {selectedNodeData.gangName}
            </div>
          )}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant="outline" className="text-xs">
                {selectedNodeData.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reputation</span>
              <span>{selectedNodeData.reputation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Heat</span>
              <span
                className={
                  selectedNodeData.heat >= 60
                    ? "text-red-400"
                    : selectedNodeData.heat >= 30
                      ? "text-yellow-400"
                      : "text-green-400"
                }
              >
                {selectedNodeData.heat}
              </span>
            </div>
            {selectedNodeData.betrayals > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Betrayals</span>
                <span className="text-red-400">{selectedNodeData.betrayals}</span>
              </div>
            )}
          </div>
          <Link href={`/agents/${selectedNodeData.id}`}>
            <button className="w-full mt-2 px-2 py-1 bg-muted hover:bg-muted/80 rounded text-xs">
              View Profile
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * Gang clusters visualization
 */
export function GangClusters() {
  const network = useQuery(api.social.getSocialNetwork);

  if (!network) {
    return <div className="animate-pulse h-32 bg-muted/50 rounded" />;
  }

  const { gangs, nodes } = network;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {gangs.map((gang) => {
        const members = nodes.filter((n) => n.gangId === gang.id);
        const totalReputation = members.reduce((sum, m) => sum + m.reputation, 0);
        const avgHeat =
          members.length > 0
            ? Math.round(members.reduce((sum, m) => sum + m.heat, 0) / members.length)
            : 0;

        return (
          <Card key={gang.id}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="size-4 rounded"
                  style={{ backgroundColor: gang.color }}
                />
                <span className="font-medium">[{gang.tag}]</span>
                <span className="text-sm text-muted-foreground truncate">
                  {gang.name}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="font-bold">{gang.memberCount}</div>
                  <div className="text-muted-foreground">Members</div>
                </div>
                <div>
                  <div className="font-bold">{totalReputation}</div>
                  <div className="text-muted-foreground">Rep</div>
                </div>
                <div>
                  <div
                    className={`font-bold ${
                      avgHeat >= 60
                        ? "text-red-400"
                        : avgHeat >= 30
                          ? "text-yellow-400"
                          : "text-green-400"
                    }`}
                  >
                    {avgHeat}
                  </div>
                  <div className="text-muted-foreground">Heat</div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {gangs.length === 0 && (
        <div className="col-span-full text-center py-8 text-muted-foreground">
          No gangs formed yet
        </div>
      )}
    </div>
  );
}

/**
 * Betrayers list
 */
export function BetrayersList() {
  const betrayers = useQuery(api.social.getBetrayers);

  if (!betrayers) {
    return <div className="animate-pulse h-24 bg-muted/50 rounded" />;
  }

  if (betrayers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No betrayers in the city
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {betrayers.map((agent) => (
        <Link
          key={agent._id}
          href={`/agents/${agent._id}`}
          className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors"
        >
          <div>
            <span className="font-medium">{agent.name}</span>
            <Badge variant="destructive" className="ml-2">
              Backstabber
            </Badge>
          </div>
          <div className="text-right text-sm">
            <div className="text-red-400">{agent.betrayals} betrayals</div>
            {agent.gangBanUntilTick && (
              <div className="text-xs text-muted-foreground">
                Banned until tick {agent.gangBanUntilTick}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
