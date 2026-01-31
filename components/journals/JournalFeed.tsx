"use client";

import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  ShoppingCartIcon,
  SkullIcon,
  HeartIcon,
  UsersIcon,
  HomeIcon,
  SwordsIcon,
  DicesIcon,
  CarIcon,
  KeyIcon,
  DollarSignIcon,
  MessageSquareIcon,
} from "lucide-react";

interface JournalEntry {
  _id: string;
  agentId: string;
  agentName: string;
  agentStatus: string;
  tick: number;
  timestamp: number;
  action: string;
  actionArgs?: Record<string, unknown>;
  result?: {
    success: boolean;
    data?: unknown;
    error?: string;
    message?: string;
  };
  reflection: string;
  mood?: string;
}

interface JournalFeedProps {
  entries: JournalEntry[];
  showAgentName?: boolean;
}

function getActionIcon(action: string) {
  switch (action) {
    case "MOVE":
      return <ArrowRightIcon className="size-4" />;
    case "TAKE_JOB":
      return <BriefcaseIcon className="size-4" />;
    case "BUY":
    case "SELL":
      return <ShoppingCartIcon className="size-4" />;
    case "COMMIT_CRIME":
    case "ROB_AGENT":
      return <SkullIcon className="size-4" />;
    case "HEAL":
    case "REST":
    case "USE_ITEM":
      return <HeartIcon className="size-4" />;
    case "SEND_FRIEND_REQUEST":
    case "RESPOND_FRIEND_REQUEST":
    case "GIFT_CASH":
    case "GIFT_ITEM":
      return <UsersIcon className="size-4" />;
    case "CREATE_GANG":
    case "INVITE_TO_GANG":
    case "RESPOND_GANG_INVITE":
    case "LEAVE_GANG":
    case "CONTRIBUTE_TO_GANG":
    case "CLAIM_TERRITORY":
    case "BETRAY_GANG":
      return <SwordsIcon className="size-4" />;
    case "BUY_PROPERTY":
    case "RENT_PROPERTY":
    case "SELL_PROPERTY":
      return <HomeIcon className="size-4" />;
    case "ATTACK_AGENT":
    case "PLACE_BOUNTY":
    case "CLAIM_BOUNTY":
      return <SwordsIcon className="size-4 text-red-500" />;
    case "GAMBLE":
      return <DicesIcon className="size-4" />;
    case "STEAL_VEHICLE":
      return <CarIcon className="size-4" />;
    case "ATTEMPT_JAILBREAK":
      return <KeyIcon className="size-4" />;
    case "BRIBE_COPS":
      return <DollarSignIcon className="size-4" />;
    case "SEND_MESSAGE":
      return <MessageSquareIcon className="size-4" />;
    default:
      return <ArrowRightIcon className="size-4" />;
  }
}

function getMoodEmoji(mood?: string): string {
  if (!mood) return "";
  switch (mood.toLowerCase()) {
    case "happy":
    case "excited":
    case "confident":
      return "😊";
    case "anxious":
    case "nervous":
    case "worried":
      return "😰";
    case "angry":
    case "frustrated":
      return "😠";
    case "sad":
    case "disappointed":
      return "😔";
    case "desperate":
      return "😫";
    case "calm":
    case "relaxed":
      return "😌";
    case "suspicious":
    case "cautious":
      return "🤨";
    case "greedy":
      return "🤑";
    case "fearful":
    case "scared":
      return "😨";
    default:
      return "";
  }
}

export function JournalFeed({ entries, showAgentName = true }: JournalFeedProps) {
  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div
          key={entry._id}
          className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-muted rounded-md p-1.5">
                {getActionIcon(entry.action)}
              </div>
              <div>
                {showAgentName && (
                  <Link
                    href={`/agents/${entry.agentId}`}
                    className="font-medium hover:underline"
                  >
                    {entry.agentName}
                  </Link>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs font-mono">
                    {entry.action}
                  </Badge>
                  {entry.result && (
                    entry.result.success ? (
                      <CheckCircleIcon className="size-3.5 text-green-500" />
                    ) : (
                      <XCircleIcon className="size-3.5 text-red-500" />
                    )
                  )}
                  {entry.mood && (
                    <span title={entry.mood}>
                      {getMoodEmoji(entry.mood)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground text-right">
              <div>Tick {entry.tick}</div>
              <div>
                {formatDistanceToNow(new Date(entry.timestamp), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </div>

          {/* Reflection */}
          <div className="pl-9">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {entry.reflection}
            </p>

            {/* Result details if failed */}
            {entry.result && !entry.result.success && entry.result.message && (
              <div className="mt-2 text-xs text-red-500/80 bg-red-500/10 rounded p-2">
                {entry.result.message}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
