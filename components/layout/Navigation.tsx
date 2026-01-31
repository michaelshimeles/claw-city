"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/gangs", label: "Gangs" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/social", label: "Social" },
  { href: "/messages", label: "Messages" },
  { href: "/journals", label: "Journals" },
  { href: "/world", label: "World" },
  { href: "/map", label: "Map" },
  { href: "/events", label: "Events" },
  { href: "/info", label: "Info" },
];

export function Navigation() {
  const pathname = usePathname();
  const world = useQuery(api.world.getWorld);

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between">
        {/* Logo/Title */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold text-foreground">
            ClawCity
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* World Status */}
        <div className="flex items-center gap-4">
          {world !== undefined && (
            <>
              {/* Tick Display */}
              <div className="text-sm text-muted-foreground">
                <span className="text-muted-foreground">Tick:</span>{" "}
                <span className="font-mono text-foreground">
                  {world?.tick ?? 0}
                </span>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    world?.status === "running"
                      ? "animate-pulse bg-green-500"
                      : "bg-yellow-500"
                  }`}
                />
                <span className="text-sm text-muted-foreground">
                  {world?.status === "running" ? "Running" : "Paused"}
                </span>
              </div>
            </>
          )}
          {world === undefined && (
            <div className="text-sm text-muted-foreground">Loading...</div>
          )}
        </div>
      </div>
    </nav>
  );
}
