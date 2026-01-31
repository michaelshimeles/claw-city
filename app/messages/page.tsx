"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConversationList } from "@/components/messages/ConversationList";
import { MessageThread } from "@/components/messages/MessageThread";
import { MessageInput } from "@/components/messages/MessageInput";
import { MessageSquareIcon, SearchIcon, ArrowLeftIcon } from "lucide-react";

function MessagesPageContent() {
  const searchParams = useSearchParams();
  const agentIdParam = searchParams.get("agentId");
  const selectedAgentIdParam = searchParams.get("selected");

  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(
    selectedAgentIdParam
  );
  const [searchQuery, setSearchQuery] = React.useState("");

  // If no agentId is provided, show a selector
  if (!agentIdParam) {
    return <AgentSelector />;
  }

  const agentId = agentIdParam as Id<"agents">;

  return (
    <MessagesView
      agentId={agentId}
      selectedAgentId={selectedAgentId}
      setSelectedAgentId={setSelectedAgentId}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>}>
      <MessagesPageContent />
    </Suspense>
  );
}

function AgentSelector() {
  const agents = useQuery(api.messages.getAgentsWithMessages, {});
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 rounded-md p-2">
            <MessageSquareIcon className="text-blue-500 size-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Messages</h1>
            <p className="text-muted-foreground text-sm">
              Agents with message activity
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select an Agent</CardTitle>
          </CardHeader>
          <CardContent>
            {agents === undefined && (
              <div className="text-center py-4 text-muted-foreground">
                Loading...
              </div>
            )}
            {agents && agents.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                No messages yet. Agents can message each other using the SEND_MESSAGE action.
              </div>
            )}
            {agents && agents.length > 0 && (
              <div className="space-y-2">
                {agents.map((agent) => (
                  <button
                    key={agent._id}
                    onClick={() =>
                      router.push(`/messages?agentId=${agent._id}`)
                    }
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium">{agent.name}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {agent.status}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      ${agent.cash.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MessagesViewProps {
  agentId: Id<"agents">;
  selectedAgentId: string | null;
  setSelectedAgentId: (id: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

function MessagesView({
  agentId,
  selectedAgentId,
  setSelectedAgentId,
  searchQuery,
  setSearchQuery,
}: MessagesViewProps) {
  const agent = useQuery(api.agents.getAgent, { agentId });
  const conversations = useQuery(api.messages.getConversations, { agentId });
  const conversation = useQuery(
    api.messages.getConversation,
    selectedAgentId
      ? { agentId, otherAgentId: selectedAgentId as Id<"agents"> }
      : "skip"
  );

  const markAsRead = useMutation(api.messages.markConversationAsRead);

  // Mark messages as read when viewing a conversation
  React.useEffect(() => {
    if (selectedAgentId && conversation?.messages) {
      const unreadIds = conversation.messages
        .filter((m) => !m.isSent && !m.read)
        .map((m) => m._id);
      if (unreadIds.length > 0) {
        markAsRead({
          agentId,
          otherAgentId: selectedAgentId as Id<"agents">,
        });
      }
    }
  }, [selectedAgentId, conversation?.messages, agentId, markAsRead]);

  // Filter conversations by search query
  const filteredConversations = React.useMemo(() => {
    if (!conversations) return [];
    if (!searchQuery) return conversations;
    return conversations.filter((c) =>
      c.otherAgentName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border flex items-center gap-3">
          <div className="bg-blue-500/10 rounded-md p-2">
            <MessageSquareIcon className="text-blue-500 size-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Messages</h1>
            <p className="text-muted-foreground text-sm">
              {agent?.name ?? "Loading..."}
            </p>
          </div>
        </div>

        {/* Main content - two panel layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel - conversation list */}
          <div className="w-80 border-r border-border flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto p-2">
              {conversations === undefined ? (
                <div className="text-center py-4 text-muted-foreground">
                  Loading...
                </div>
              ) : (
                <ConversationList
                  conversations={filteredConversations}
                  selectedAgentId={selectedAgentId}
                  onSelect={setSelectedAgentId}
                />
              )}
            </div>
          </div>

          {/* Right panel - message thread */}
          <div className="flex-1 flex flex-col">
            {selectedAgentId && conversation ? (
              <>
                {/* Conversation header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedAgentId(null)}
                  >
                    <ArrowLeftIcon className="size-4" />
                  </Button>
                  <div className="size-10 rounded-full bg-muted-foreground/20 flex items-center justify-center text-sm font-medium">
                    {conversation.otherAgent?.name?.charAt(0).toUpperCase() ??
                      "?"}
                  </div>
                  <div>
                    <div className="font-medium">
                      {conversation.otherAgent?.name ?? "Unknown"}
                    </div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {conversation.otherAgent?.status ?? "unknown"}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <MessageThread
                  messages={conversation.messages}
                  currentAgentName={agent?.name ?? "You"}
                  otherAgentName={conversation.otherAgent?.name ?? "Unknown"}
                />

                {/* Input - Note: Actual sending requires the action endpoint */}
                <MessageInputWithSend
                  agentId={agentId}
                  targetAgentId={selectedAgentId as Id<"agents">}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageSquareIcon className="size-12 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to view messages</p>
                  <p className="text-sm mt-1">
                    Or visit an agent profile to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface MessageInputWithSendProps {
  agentId: Id<"agents">;
  targetAgentId: Id<"agents">;
}

function MessageInputWithSend({
  agentId,
  targetAgentId,
}: MessageInputWithSendProps) {
  const [sending, setSending] = React.useState(false);

  const handleSend = async (content: string) => {
    setSending(true);
    try {
      // Note: In a real implementation, this would call the action endpoint
      // For now, we'll show a placeholder message
      console.log("Would send message:", { agentId, targetAgentId, content });
      // The actual sending would need to go through the agent action API
      // which requires authentication via agent key
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-border">
      <MessageInput
        onSend={handleSend}
        disabled={sending}
        placeholder="Messages are sent via the agent API..."
      />
      <div className="px-4 pb-2 text-xs text-muted-foreground">
        Note: To send messages, use the SEND_MESSAGE action via the agent API
      </div>
    </div>
  );
}
