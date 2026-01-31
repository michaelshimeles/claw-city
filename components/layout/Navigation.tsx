"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/agents", label: "Agents" },
  { href: "/gangs", label: "Gangs" },
  { href: "/world", label: "World" },
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
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo/Title */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold text-zinc-100">
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
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
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
              <div className="text-sm text-zinc-400">
                <span className="text-zinc-500">Tick:</span>{" "}
                <span className="font-mono text-zinc-200">
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
                <span className="text-sm text-zinc-400">
                  {world?.status === "running" ? "Running" : "Paused"}
                </span>
              </div>
            </>
          )}
          {world === undefined && (
            <div className="text-sm text-zinc-500">Loading...</div>
          )}
        </div>
      </div>
    </nav>
  );
}
