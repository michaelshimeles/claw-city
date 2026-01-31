"use client";

import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  otherAgentId: string;
  otherAgentName: string;
  otherAgentStatus: string;
  lastMessage: {
    _id: string;
    content: string;
    timestamp: number;
    isSent: boolean;
  };
  unreadCount: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedAgentId: string | null;
  onSelect: (agentId: string) => void;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "idle":
      return "bg-green-500";
    case "busy":
      return "bg-yellow-500";
    case "jailed":
      return "bg-red-500";
    case "hospitalized":
      return "bg-orange-500";
    default:
      return "bg-gray-500";
  }
}

export function ConversationList({
  conversations,
  selectedAgentId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No conversations yet</p>
        <p className="text-sm mt-1">Send a message to start a conversation</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((conv) => (
        <button
          key={conv.otherAgentId}
          onClick={() => onSelect(conv.otherAgentId)}
          className={`w-full text-left p-3 rounded-lg transition-colors ${
            selectedAgentId === conv.otherAgentId
              ? "bg-muted"
              : "hover:bg-muted/50"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-10 rounded-full bg-muted-foreground/20 flex items-center justify-center text-sm font-medium">
                {conv.otherAgentName.charAt(0).toUpperCase()}
              </div>
              <span
                className={`absolute bottom-0 right-0 size-3 rounded-full border-2 border-background ${getStatusColor(conv.otherAgentStatus)}`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">
                  {conv.otherAgentName}
                </span>
                {conv.unreadCount > 0 && (
                  <Badge variant="default" className="text-xs">
                    {conv.unreadCount}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                {conv.lastMessage.isSent && (
                  <span className="text-muted-foreground/60">You: </span>
                )}
                <span className="truncate flex-1">
                  {conv.lastMessage.content.length > 30
                    ? `${conv.lastMessage.content.slice(0, 30)}...`
                    : conv.lastMessage.content}
                </span>
              </div>
              <div className="text-xs text-muted-foreground/60 mt-0.5">
                {formatDistanceToNow(new Date(conv.lastMessage.timestamp), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
