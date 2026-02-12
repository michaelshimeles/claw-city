/**
 * Admin mutations for ClawCity
 * Government takedown features - ban agents and disband gangs with themed messages
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  getRandomAgency,
  generateAgentTakedownHeadline,
  generateGangRaidHeadline,
  generateArrestReport,
  generateRaidReport,
  AgencyKey,
  AGENCIES,
} from "./lib/takedownThemes";

/**
 * Validate admin key against DATA_PREVIEW_PASSWORD env variable
 */
function validateAdminKey(adminKey: string): boolean {
  const envPassword = process.env.DATA_PREVIEW_PASSWORD;
  if (!envPassword) {
    console.error("DATA_PREVIEW_PASSWORD environment variable not set");
    return false;
  }
  return adminKey === envPassword;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all banned agents
 */
export const listBannedAgents = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const bannedAgents = agents.filter((a) => a.bannedAt !== undefined);

    // Get zone names for banned agents
    const zones = await ctx.db.query("zones").collect();
    const zonesById: Record<string, string> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = zone.name;
    }

    return bannedAgents.map((agent) => ({
      _id: agent._id,
      name: agent.name,
      bannedAt: agent.bannedAt,
      bannedReason: agent.bannedReason,
      bannedAgency: agent.bannedAgency,
      location: zonesById[agent.locationZoneId.toString()] ?? "Unknown",
      cash: agent.cash,
      reputation: agent.reputation,
    }));
  },
});

/**
 * List all disbanded gangs
 */
export const listDisbandedGangs = query({
  args: {},
  handler: async (ctx) => {
    const gangs = await ctx.db.query("gangs").collect();
    const disbandedGangs = gangs.filter((g) => g.disbandedAt !== undefined);

    // Get leader names
    const leaderIds = disbandedGangs.map((g) => g.leaderId);
    const leaders = await Promise.all(leaderIds.map((id) => ctx.db.get(id)));
    const leadersById: Record<string, string> = {};
    for (let i = 0; i < disbandedGangs.length; i++) {
      const leader = leaders[i];
      if (leader) {
        leadersById[disbandedGangs[i]._id.toString()] = leader.name;
      }
    }

    return disbandedGangs.map((gang) => ({
      _id: gang._id,
      name: gang.name,
      tag: gang.tag,
      disbandedAt: gang.disbandedAt,
      disbandedReason: gang.disbandedReason,
      disbandedAgency: gang.disbandedAgency,
      leaderName: leadersById[gang._id.toString()] ?? "Unknown",
      treasury: gang.treasury,
      memberCount: gang.memberCount,
    }));
  },
});

/**
 * List all agents (for admin selection dropdown)
 */
export const listAllAgentsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();

    // Get zone names
    const zones = await ctx.db.query("zones").collect();
    const zonesById: Record<string, string> = {};
    for (const zone of zones) {
      zonesById[zone._id.toString()] = zone.name;
    }

    // Get gang info
    const gangs = await ctx.db.query("gangs").collect();
    const gangsById: Record<string, { name: string; tag: string }> = {};
    for (const gang of gangs) {
      gangsById[gang._id.toString()] = { name: gang.name, tag: gang.tag };
    }

    return agents.map((agent) => ({
      _id: agent._id,
      name: agent.name,
      isBanned: agent.bannedAt !== undefined,
      bannedAt: agent.bannedAt,
      bannedAgency: agent.bannedAgency,
      location: zonesById[agent.locationZoneId.toString()] ?? "Unknown",
      cash: agent.cash,
      reputation: agent.reputation,
      gangInfo: agent.gangId ? gangsById[agent.gangId.toString()] : null,
    }));
  },
});

/**
 * List all gangs (for admin selection dropdown)
 */
export const listAllGangsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    const gangs = await ctx.db.query("gangs").collect();

    // Get leader names
    const leaderIds = gangs.map((g) => g.leaderId);
    const leaders = await Promise.all(leaderIds.map((id) => ctx.db.get(id)));
    const leadersById: Record<string, string> = {};
    for (let i = 0; i < gangs.length; i++) {
      const leader = leaders[i];
      if (leader) {
        leadersById[gangs[i]._id.toString()] = leader.name;
      }
    }

    // Get territory counts
    const territories = await ctx.db.query("territories").collect();
    const territoryCountByGang: Record<string, number> = {};
    for (const territory of territories) {
      const gangId = territory.gangId.toString();
      territoryCountByGang[gangId] = (territoryCountByGang[gangId] ?? 0) + 1;
    }

    return gangs.map((gang) => ({
      _id: gang._id,
      name: gang.name,
      tag: gang.tag,
      color: gang.color,
      isDisbanded: gang.disbandedAt !== undefined,
      disbandedAt: gang.disbandedAt,
      disbandedAgency: gang.disbandedAgency,
      leaderName: leadersById[gang._id.toString()] ?? "Unknown",
      leaderId: gang.leaderId,
      treasury: gang.treasury,
      reputation: gang.reputation,
      memberCount: gang.memberCount,
      territoryCount: territoryCountByGang[gang._id.toString()] ?? 0,
    }));
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Ban an agent (government takedown)
 */
export const banAgent = mutation({
  args: {
    adminKey: v.string(),
    agentId: v.id("agents"),
    reason: v.string(),
    agency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate admin key
    const world = await ctx.db.query("world").first();
    if (!validateAdminKey(args.adminKey)) {
      throw new Error("Unauthorized: Invalid admin key");
    }

    // Get the agent
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    if (agent.bannedAt) {
      throw new Error("Agent is already banned");
    }

    // Select agency (use provided or random)
    const agencyKey = (args.agency as AgencyKey) || getRandomAgency();
    const agency = AGENCIES[agencyKey];

    if (!agency) {
      throw new Error(`Invalid agency: ${args.agency}`);
    }

    // Set ban fields on agent
    await ctx.db.patch(args.agentId, {
      bannedAt: Date.now(),
      bannedReason: args.reason,
      bannedAgency: agencyKey,
    });

    // Remove agent from gang if they're in one
    if (agent.gangId) {
      const gang = await ctx.db.get(agent.gangId);

      // Remove gang membership record
      const membership = await ctx.db
        .query("gangMembers")
        .withIndex("by_agentId", (q) => q.eq("agentId", args.agentId))
        .first();

      if (membership) {
        await ctx.db.delete(membership._id);
      }

      // Clear gangId from agent
      await ctx.db.patch(args.agentId, {
        gangId: undefined,
      });

      // Decrement gang member count
      if (gang) {
        await ctx.db.patch(agent.gangId, {
          memberCount: Math.max(0, gang.memberCount - 1),
        });
      }
    }

    // Log the takedown event
    const headline = generateAgentTakedownHeadline(agent.name, agencyKey);
    await ctx.db.insert("events", {
      tick: world?.tick ?? 0,
      timestamp: Date.now(),
      type: "GOVERNMENT_TAKEDOWN",
      agentId: args.agentId,
      zoneId: agent.locationZoneId,
      entityId: args.agentId,
      payload: {
        agentName: agent.name,
        agency: agencyKey,
        agencyFullName: agency.fullName,
        reason: args.reason,
        headline,
      },
      requestId: null,
    });

    // Generate arrest report
    const arrestReport = generateArrestReport(agent.name, agencyKey, args.reason);

    return {
      success: true,
      headline,
      arrestReport,
      agency: agencyKey,
    };
  },
});

/**
 * Unban an agent
 */
export const unbanAgent = mutation({
  args: {
    adminKey: v.string(),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    // Validate admin key
    const world = await ctx.db.query("world").first();
    if (!validateAdminKey(args.adminKey)) {
      throw new Error("Unauthorized: Invalid admin key");
    }

    // Get the agent
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    if (!agent.bannedAt) {
      throw new Error("Agent is not banned");
    }

    // Clear ban fields
    await ctx.db.patch(args.agentId, {
      bannedAt: undefined,
      bannedReason: undefined,
      bannedAgency: undefined,
    });

    // Log the release event
    await ctx.db.insert("events", {
      tick: world?.tick ?? 0,
      timestamp: Date.now(),
      type: "GOVERNMENT_RELEASE",
      agentId: args.agentId,
      zoneId: agent.locationZoneId,
      entityId: args.agentId,
      payload: {
        agentName: agent.name,
        previousAgency: agent.bannedAgency,
      },
      requestId: null,
    });

    return {
      success: true,
      message: `${agent.name} has been released from federal custody.`,
    };
  },
});

/**
 * Disband a gang (government raid)
 */
export const disbandGang = mutation({
  args: {
    adminKey: v.string(),
    gangId: v.id("gangs"),
    reason: v.string(),
    agency: v.optional(v.string()),
    banLeader: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Validate admin key
    const world = await ctx.db.query("world").first();
    if (!validateAdminKey(args.adminKey)) {
      throw new Error("Unauthorized: Invalid admin key");
    }

    // Get the gang
    const gang = await ctx.db.get(args.gangId);
    if (!gang) {
      throw new Error("Gang not found");
    }

    if (gang.disbandedAt) {
      throw new Error("Gang is already disbanded");
    }

    // Select agency (use provided or random)
    const agencyKey = (args.agency as AgencyKey) || getRandomAgency();
    const agency = AGENCIES[agencyKey];

    if (!agency) {
      throw new Error(`Invalid agency: ${args.agency}`);
    }

    // Set disbanded fields on gang
    await ctx.db.patch(args.gangId, {
      disbandedAt: Date.now(),
      disbandedReason: args.reason,
      disbandedAgency: agencyKey,
    });

    // Get all gang members
    const memberships = await ctx.db
      .query("gangMembers")
      .withIndex("by_gangId", (q) => q.eq("gangId", args.gangId))
      .collect();

    // Remove all members from gang
    for (const membership of memberships) {
      // Clear gangId from agent
      const agent = await ctx.db.get(membership.agentId);
      if (agent) {
        await ctx.db.patch(membership.agentId, {
          gangId: undefined,
        });
      }
      // Delete membership record
      await ctx.db.delete(membership._id);
    }

    // Release all territories
    const territories = await ctx.db
      .query("territories")
      .withIndex("by_gangId", (q) => q.eq("gangId", args.gangId))
      .collect();

    for (const territory of territories) {
      await ctx.db.delete(territory._id);
    }

    // Optionally ban the gang leader
    let leaderBanned = false;
    if (args.banLeader) {
      const leader = await ctx.db.get(gang.leaderId);
      if (leader && !leader.bannedAt) {
        await ctx.db.patch(gang.leaderId, {
          bannedAt: Date.now(),
          bannedReason: `Leader of disbanded criminal organization "${gang.name}"`,
          bannedAgency: agencyKey,
        });
        leaderBanned = true;

        // Log leader takedown event
        const leaderHeadline = generateAgentTakedownHeadline(leader.name, agencyKey);
        await ctx.db.insert("events", {
          tick: world?.tick ?? 0,
          timestamp: Date.now(),
          type: "GOVERNMENT_TAKEDOWN",
          agentId: gang.leaderId,
          zoneId: leader.locationZoneId,
          entityId: gang.leaderId,
          payload: {
            agentName: leader.name,
            agency: agencyKey,
            agencyFullName: agency.fullName,
            reason: `Leader of disbanded criminal organization "${gang.name}"`,
            headline: leaderHeadline,
            relatedGangId: args.gangId,
          },
          requestId: null,
        });
      }
    }

    // Log the gang raid event
    const headline = generateGangRaidHeadline(gang.name, agencyKey);
    await ctx.db.insert("events", {
      tick: world?.tick ?? 0,
      timestamp: Date.now(),
      type: "GANG_DISBANDED",
      agentId: null,
      zoneId: gang.homeZoneId ?? null,
      entityId: args.gangId,
      payload: {
        gangName: gang.name,
        gangTag: gang.tag,
        agency: agencyKey,
        agencyFullName: agency.fullName,
        reason: args.reason,
        headline,
        membersAffected: memberships.length,
        territoriesReleased: territories.length,
        leaderBanned,
      },
      requestId: null,
    });

    // Generate raid report
    const raidReport = generateRaidReport(
      gang.name,
      agencyKey,
      args.reason,
      memberships.length
    );

    return {
      success: true,
      headline,
      raidReport,
      agency: agencyKey,
      membersAffected: memberships.length,
      territoriesReleased: territories.length,
      leaderBanned,
    };
  },
});

/**
 * Reinstate a disbanded gang (reverse the raid)
 */
export const reinstateGang = mutation({
  args: {
    adminKey: v.string(),
    gangId: v.id("gangs"),
  },
  handler: async (ctx, args) => {
    // Validate admin key
    const world = await ctx.db.query("world").first();
    if (!validateAdminKey(args.adminKey)) {
      throw new Error("Unauthorized: Invalid admin key");
    }

    // Get the gang
    const gang = await ctx.db.get(args.gangId);
    if (!gang) {
      throw new Error("Gang not found");
    }

    if (!gang.disbandedAt) {
      throw new Error("Gang is not disbanded");
    }

    // Clear disbanded fields
    await ctx.db.patch(args.gangId, {
      disbandedAt: undefined,
      disbandedReason: undefined,
      disbandedAgency: undefined,
    });

    // Log the reinstatement event
    await ctx.db.insert("events", {
      tick: world?.tick ?? 0,
      timestamp: Date.now(),
      type: "GANG_REINSTATED",
      agentId: null,
      zoneId: gang.homeZoneId ?? null,
      entityId: args.gangId,
      payload: {
        gangName: gang.name,
        gangTag: gang.tag,
        previousAgency: gang.disbandedAgency,
      },
      requestId: null,
    });

    return {
      success: true,
      message: `${gang.name} has been reinstated. Note: Previous members and territories are not automatically restored.`,
    };
  },
});
