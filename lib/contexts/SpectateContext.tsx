"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useFollowedAgents } from "@/lib/hooks/useFollowedAgents";

type SpectateContextType = ReturnType<typeof useFollowedAgents>;

const SpectateContext = createContext<SpectateContextType | null>(null);

interface SpectateProviderProps {
  children: ReactNode;
}

export function SpectateProvider({ children }: SpectateProviderProps) {
  const followedAgents = useFollowedAgents();

  return (
    <SpectateContext.Provider value={followedAgents}>
      {children}
    </SpectateContext.Provider>
  );
}

export function useSpectate(): SpectateContextType {
  const context = useContext(SpectateContext);
  if (!context) {
    throw new Error("useSpectate must be used within a SpectateProvider");
  }
  return context;
}
