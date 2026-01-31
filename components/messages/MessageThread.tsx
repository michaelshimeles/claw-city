"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";

interface Message {
  _id: string;
  senderId: string;
  recipientId: string;
  content: string;
  read: boolean;
  tick: number;
  timestamp: number;
  isSent: boolean;
}

interface MessageThreadProps {
  messages: Message[];
  currentAgentName?: string;
  otherAgentName?: string;
}

export function MessageThread({
  messages,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((message, index) => {
        const showDate =
          index === 0 ||
          new Date(messages[index - 1].timestamp).toDateString() !==
            new Date(message.timestamp).toDateString();

        return (
          <div key={message._id}>
            {showDate && (
              <div className="flex justify-center my-4">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  {format(new Date(message.timestamp), "MMM d, yyyy")}
                </span>
              </div>
            )}
            <div
              className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.isSent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <div
                  className={`text-xs mt-1 ${
                    message.isSent
                      ? "text-primary-foreground/60"
                      : "text-muted-foreground"
                  }`}
                >
                  {format(new Date(message.timestamp), "h:mm a")}
                  {message.isSent && (
                    <span className="ml-2">
                      {message.read ? "Read" : "Sent"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
