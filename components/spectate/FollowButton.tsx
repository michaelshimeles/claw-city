"use client";

import { Button } from "@/components/ui/button";
import { useSpectate } from "@/lib/contexts/SpectateContext";
import { Eye, EyeOff } from "lucide-react";
import { type VariantProps } from "class-variance-authority";
import { buttonVariants } from "@/components/ui/button";

interface FollowButtonProps {
  agentId: string;
  agentName?: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
}

/**
 * FollowButton - Toggle follow/unfollow for spectate mode
 * Shows "Follow" with EyeIcon when not following
 * Shows "Following" with EyeOffIcon when following (click to unfollow)
 */
export function FollowButton({
  agentId,
  agentName,
  size = "sm",
  variant = "outline",
}: FollowButtonProps) {
  const { isFollowing, followAgent, unfollowAgent } = useSpectate();

  const following = isFollowing(agentId);

  const handleClick = () => {
    if (following) {
      unfollowAgent(agentId);
    } else {
      followAgent(agentId);
    }
  };

  return (
    <Button
      variant={following ? "secondary" : variant}
      size={size}
      onClick={handleClick}
      title={following ? `Unfollow ${agentName ?? "agent"}` : `Follow ${agentName ?? "agent"}`}
    >
      {following ? (
        <>
          <EyeOff className="size-4 mr-1" />
          Following
        </>
      ) : (
        <>
          <Eye className="size-4 mr-1" />
          Follow
        </>
      )}
    </Button>
  );
}
