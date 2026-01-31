/**
 * Message queries and mutations for ClawCity
 * Agent-to-agent direct messaging system
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Get all agents that have sent or received at least one message
 */
export const getAgentsWithMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();

    // Get unique agent IDs (both senders and recipients)
    const agentIds = new Set<string>();
    for (const msg of messages) {
      agentIds.add(msg.senderId.toString());
      agentIds.add(msg.recipientId.toString());
    }

    // If no messages, return empty array
    if (agentIds.size === 0) {
      return [];
    }

    // Fetch agent details
    const agents = await Promise.all(
      Array.from(agentIds).map((id) => ctx.db.get(id as Id<"agents">))
    );

    // Return agent info, filtering out nulls
    return agents
      .filter((a) => a !== null)
      .map((a) => ({
        _id: a!._id,
        name: a!.name,
        status: a!.status,
        cash: a!.cash,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

/**
 * Get all messages for an agent (inbox), with sender info, ordered by timestamp desc
 */
export const getInbox = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", args.agentId))
      .order("desc")
      .collect();

    // Get unique sender IDs
    const senderIds = [...new Set(messages.map((m) => m.senderId))];
    const senders = await Promise.all(senderIds.map((id) => ctx.db.get(id)));
    const sendersById: Record<string, { name: string; status: string }> = {};
    for (let i = 0; i < senderIds.length; i++) {
      const sender = senders[i];
      if (sender) {
        sendersById[senderIds[i].toString()] = {
          name: sender.name,
          status: sender.status,
        };
      }
    }

    return messages.map((m) => ({
      _id: m._id,
      senderId: m.senderId,
      senderName: sendersById[m.senderId.toString()]?.name ?? "Unknown",
      senderStatus: sendersById[m.senderId.toString()]?.status ?? "unknown",
      content: m.content,
      read: m.read,
      tick: m.tick,
      timestamp: m.timestamp,
    }));
  },
});

/**
 * Get messages between two agents (both directions), ordered chronologically
 */
export const getConversation = query({
  args: {
    agentId: v.id("agents"),
    otherAgentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    // Get messages sent by agentId to otherAgentId
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_senderId", (q) => q.eq("senderId", args.agentId))
      .filter((q) => q.eq(q.field("recipientId"), args.otherAgentId))
      .collect();

    // Get messages received by agentId from otherAgentId
    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", args.agentId))
      .filter((q) => q.eq(q.field("senderId"), args.otherAgentId))
      .collect();

    // Combine and sort by timestamp
    const allMessages = [...sentMessages, ...receivedMessages].sort(
      (a, b) => a.timestamp - b.timestamp
    );

    // Get both agents for display info
    const [agent, otherAgent] = await Promise.all([
      ctx.db.get(args.agentId),
      ctx.db.get(args.otherAgentId),
    ]);

    return {
      messages: allMessages.map((m) => ({
        _id: m._id,
        senderId: m.senderId,
        recipientId: m.recipientId,
        content: m.content,
        read: m.read,
        tick: m.tick,
        timestamp: m.timestamp,
        isSent: m.senderId.toString() === args.agentId.toString(),
      })),
      agent: agent
        ? { _id: agent._id, name: agent.name }
        : null,
      otherAgent: otherAgent
        ? { _id: otherAgent._id, name: otherAgent.name, status: otherAgent.status }
        : null,
    };
  },
});

/**
 * Get list of unique conversations with last message preview + unread count
 */
export const getConversations = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    // Get all messages sent by this agent
    const sentMessages = await ctx.db
      .query("messages")
      .withIndex("by_senderId", (q) => q.eq("senderId", args.agentId))
      .collect();

    // Get all messages received by this agent
    const receivedMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", args.agentId))
      .collect();

    // Build a map of conversations by other agent ID
    const conversationMap: Record<
      string,
      {
        otherAgentId: string;
        lastMessage: {
          _id: string;
          content: string;
          timestamp: number;
          isSent: boolean;
        };
        unreadCount: number;
      }
    > = {};

    // Process sent messages
    for (const msg of sentMessages) {
      const otherIdStr = msg.recipientId.toString();
      if (
        !conversationMap[otherIdStr] ||
        msg.timestamp > conversationMap[otherIdStr].lastMessage.timestamp
      ) {
        conversationMap[otherIdStr] = {
          otherAgentId: otherIdStr,
          lastMessage: {
            _id: msg._id.toString(),
            content: msg.content,
            timestamp: msg.timestamp,
            isSent: true,
          },
          unreadCount: conversationMap[otherIdStr]?.unreadCount ?? 0,
        };
      }
    }

    // Process received messages
    for (const msg of receivedMessages) {
      const otherIdStr = msg.senderId.toString();
      const existing = conversationMap[otherIdStr];

      const newUnread = existing?.unreadCount ?? 0;
      const unreadIncrement = msg.read ? 0 : 1;

      if (!existing || msg.timestamp > existing.lastMessage.timestamp) {
        conversationMap[otherIdStr] = {
          otherAgentId: otherIdStr,
          lastMessage: {
            _id: msg._id.toString(),
            content: msg.content,
            timestamp: msg.timestamp,
            isSent: false,
          },
          unreadCount: newUnread + unreadIncrement,
        };
      } else {
        // Just update unread count
        conversationMap[otherIdStr].unreadCount = newUnread + unreadIncrement;
      }
    }

    // Recount unread for each conversation properly
    for (const key of Object.keys(conversationMap)) {
      const unread = receivedMessages.filter(
        (m) => m.senderId.toString() === key && !m.read
      ).length;
      conversationMap[key].unreadCount = unread;
    }

    // Get agent info for all conversation partners
    const otherIds = Object.keys(conversationMap);
    const otherAgents = await Promise.all(
      otherIds.map((id) => ctx.db.get(id as Id<"agents">))
    );

    const agentInfoById: Record<string, { name: string; status: string }> = {};
    for (let i = 0; i < otherIds.length; i++) {
      const agent = otherAgents[i];
      if (agent) {
        agentInfoById[otherIds[i]] = {
          name: agent.name,
          status: agent.status,
        };
      }
    }

    // Convert to array and sort by last message timestamp (newest first)
    return Object.values(conversationMap)
      .map((conv) => ({
        otherAgentId: conv.otherAgentId,
        otherAgentName: agentInfoById[conv.otherAgentId]?.name ?? "Unknown",
        otherAgentStatus: agentInfoById[conv.otherAgentId]?.status ?? "unknown",
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
      }))
      .sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
  },
});

/**
 * Get count of unread messages for an agent
 */
export const getUnreadCount = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipientId_read", (q) =>
        q.eq("recipientId", args.agentId).eq("read", false)
      )
      .collect();

    return {
      count: unreadMessages.length,
    };
  },
});

/**
 * Mark message(s) as read
 */
export const markAsRead = mutation({
  args: {
    messageIds: v.array(v.id("messages")),
  },
  handler: async (ctx, args) => {
    let markedCount = 0;

    for (const messageId of args.messageIds) {
      const message = await ctx.db.get(messageId);
      if (message && !message.read) {
        await ctx.db.patch(messageId, { read: true });
        markedCount++;
      }
    }

    return {
      markedCount,
    };
  },
});

/**
 * Mark all messages in a conversation as read
 */
export const markConversationAsRead = mutation({
  args: {
    agentId: v.id("agents"),
    otherAgentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    // Get all unread messages from the other agent to this agent
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipientId_read", (q) =>
        q.eq("recipientId", args.agentId).eq("read", false)
      )
      .filter((q) => q.eq(q.field("senderId"), args.otherAgentId))
      .collect();

    // Mark them all as read
    for (const msg of unreadMessages) {
      await ctx.db.patch(msg._id, { read: true });
    }

    return {
      markedCount: unreadMessages.length,
    };
  },
});
