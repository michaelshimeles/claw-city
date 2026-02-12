"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "clawcity:followed-agents";

export function useFollowedAgents() {
  const [followedAgents, setFollowedAgents] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...followedAgents]));
  }, [followedAgents]);

  const followAgent = useCallback((agentId: string) => {
    setFollowedAgents((prev) => new Set([...prev, agentId]));
  }, []);

  const unfollowAgent = useCallback((agentId: string) => {
    setFollowedAgents((prev) => {
      const next = new Set(prev);
      next.delete(agentId);
      return next;
    });
  }, []);

  const isFollowing = useCallback(
    (agentId: string) => followedAgents.has(agentId),
    [followedAgents]
  );

  return {
    followedAgentIds: [...followedAgents],
    followAgent,
    unfollowAgent,
    isFollowing,
    followedCount: followedAgents.size,
  };
}
