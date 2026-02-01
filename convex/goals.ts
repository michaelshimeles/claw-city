/**
 * Agent Goals System for ClawCity
 * Handles goal queries and mutations for agents
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import {
  Goal,
  GoalWithProgress,
  GoalContext,
  computeGoalProgress,
  getGoalStoryBlurb,
  generateGoalId,
  selectRandomGoalTemplate,
  createGoalFromTemplate,
  GOAL_TYPES,
} from "./lib/goals";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all active goals for an agent with computed progress
 */
export const getAgentGoals = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args): Promise<GoalWithProgress[] | null> => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return null;
    }

    const goals = agent.goals ?? [];
    const activeGoals = goals.filter((g) => g.status === "active");

    if (activeGoals.length === 0) {
      return [];
    }

    // Build context for progress calculation
    const ownedProperties = await ctx.db
      .query("properties")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.agentId))
      .collect();

    let isGangLeader = false;
    if (agent.gangId) {
      const gang = await ctx.db.get(agent.gangId);
      if (gang) {
        isGangLeader = gang.leaderId === args.agentId;
      }
    }

    const goalContext: GoalContext = {
      agent,
      ownedPropertyCount: ownedProperties.length,
      isInGang: !!agent.gangId,
      isGangLeader,
    };

    // Compute progress for each goal
    const goalsWithProgress: GoalWithProgress[] = activeGoals.map((goal) => {
      const progress = computeGoalProgress(goal as Goal, goalContext);
      return {
        ...goal,
        progress,
      } as GoalWithProgress;
    });

    // Sort by priority (highest first)
    goalsWithProgress.sort((a, b) => b.priority - a.priority);

    return goalsWithProgress;
  },
});

/**
 * Get the highest priority active goal for an agent (featured goal)
 */
export const getAgentFeaturedGoal = query({
  args: { agentId: v.id("agents") },
  handler: async (
    ctx,
    args
  ): Promise<(GoalWithProgress & { storyBlurb: string }) | null> => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return null;
    }

    const goals = agent.goals ?? [];
    const activeGoals = goals.filter((g) => g.status === "active");

    if (activeGoals.length === 0) {
      return null;
    }

    // Find highest priority goal
    const featuredGoal = activeGoals.reduce((highest, current) =>
      current.priority > highest.priority ? current : highest
    );

    // Build context for progress calculation
    const ownedProperties = await ctx.db
      .query("properties")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.agentId))
      .collect();

    let isGangLeader = false;
    if (agent.gangId) {
      const gang = await ctx.db.get(agent.gangId);
      if (gang) {
        isGangLeader = gang.leaderId === args.agentId;
      }
    }

    const goalContext: GoalContext = {
      agent,
      ownedPropertyCount: ownedProperties.length,
      isInGang: !!agent.gangId,
      isGangLeader,
    };

    const progress = computeGoalProgress(featuredGoal as Goal, goalContext);
    const storyBlurb = getGoalStoryBlurb(featuredGoal as Goal, progress);

    return {
      ...featuredGoal,
      progress,
      storyBlurb,
    } as GoalWithProgress & { storyBlurb: string };
  },
});

/**
 * Get all goals for an agent (including completed and abandoned)
 */
export const getAllAgentGoals = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return null;
    }

    const goals = agent.goals ?? [];

    // Build context for progress calculation
    const ownedProperties = await ctx.db
      .query("properties")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.agentId))
      .collect();

    let isGangLeader = false;
    if (agent.gangId) {
      const gang = await ctx.db.get(agent.gangId);
      if (gang) {
        isGangLeader = gang.leaderId === args.agentId;
      }
    }

    const goalContext: GoalContext = {
      agent,
      ownedPropertyCount: ownedProperties.length,
      isInGang: !!agent.gangId,
      isGangLeader,
    };

    // Compute progress for each goal
    const goalsWithProgress = goals.map((goal) => {
      const progress = computeGoalProgress(goal as Goal, goalContext);
      return {
        ...goal,
        progress,
      };
    });

    return {
      active: goalsWithProgress.filter((g) => g.status === "active"),
      completed: goalsWithProgress.filter((g) => g.status === "completed"),
      abandoned: goalsWithProgress.filter((g) => g.status === "abandoned"),
    };
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a new goal to an agent
 */
export const addGoal = mutation({
  args: {
    agentId: v.id("agents"),
    type: v.union(
      v.literal("property"),
      v.literal("cash"),
      v.literal("skill"),
      v.literal("reputation"),
      v.literal("crimes"),
      v.literal("earnings"),
      v.literal("gang"),
      v.literal("custom")
    ),
    title: v.string(),
    description: v.optional(v.string()),
    target: v.number(),
    targetPropertyId: v.optional(v.id("properties")),
    targetSkill: v.optional(v.string()),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    // Validate title length
    if (args.title.length < 2 || args.title.length > 100) {
      throw new Error("Goal title must be between 2 and 100 characters");
    }

    // Validate target
    if (args.target <= 0) {
      throw new Error("Goal target must be positive");
    }

    // Validate skill goals have a targetSkill
    if (args.type === "skill" && !args.targetSkill) {
      throw new Error("Skill goals must specify a targetSkill");
    }

    // Check for duplicate active goals with same title
    const existingGoals = agent.goals ?? [];
    const hasDuplicate = existingGoals.some(
      (g) => g.status === "active" && g.title === args.title
    );
    if (hasDuplicate) {
      throw new Error("An active goal with this title already exists");
    }

    // Create new goal
    const newGoal: Goal = {
      id: generateGoalId(),
      type: args.type,
      title: args.title,
      description: args.description,
      target: args.target,
      targetPropertyId: args.targetPropertyId,
      targetSkill: args.targetSkill,
      priority: args.priority ?? 50,
      status: "active",
      createdAt: Date.now(),
    };

    // Add to agent's goals
    const updatedGoals = [...existingGoals, newGoal];
    await ctx.db.patch(args.agentId, { goals: updatedGoals });

    return {
      goalId: newGoal.id,
      goal: newGoal,
    };
  },
});

/**
 * Assign a random goal from templates to an agent (for AI agents)
 */
export const assignRandomGoal = mutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const existingGoals = (agent.goals ?? []) as Goal[];

    // Check if agent already has 5 or more active goals
    const activeGoalCount = existingGoals.filter(
      (g) => g.status === "active"
    ).length;
    if (activeGoalCount >= 5) {
      throw new Error("Agent already has maximum number of active goals (5)");
    }

    // Select a random template
    const template = selectRandomGoalTemplate(existingGoals);
    if (!template) {
      throw new Error(
        "No available goal templates - agent may have all possible goals"
      );
    }

    // Create goal from template
    const newGoal = createGoalFromTemplate(template);

    // Add to agent's goals
    const updatedGoals = [...existingGoals, newGoal];
    await ctx.db.patch(args.agentId, { goals: updatedGoals });

    return {
      goalId: newGoal.id,
      goal: newGoal,
    };
  },
});

/**
 * Update goal status (complete or abandon)
 */
export const updateGoalStatus = mutation({
  args: {
    agentId: v.id("agents"),
    goalId: v.string(),
    status: v.union(v.literal("completed"), v.literal("abandoned")),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    const goals = agent.goals ?? [];
    const goalIndex = goals.findIndex((g) => g.id === args.goalId);

    if (goalIndex === -1) {
      throw new Error("Goal not found");
    }

    const goal = goals[goalIndex];
    if (goal.status !== "active") {
      throw new Error("Can only update active goals");
    }

    // Update goal status
    const updatedGoal = {
      ...goal,
      status: args.status,
      completedAt: args.status === "completed" ? Date.now() : undefined,
    };

    const updatedGoals = [...goals];
    updatedGoals[goalIndex] = updatedGoal;

    await ctx.db.patch(args.agentId, { goals: updatedGoals });

    return {
      goalId: args.goalId,
      newStatus: args.status,
    };
  },
});

/**
 * Update goal priority
 */
export const updateGoalPriority = mutation({
  args: {
    agentId: v.id("agents"),
    goalId: v.string(),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      throw new Error("Agent not found");
    }

    if (args.priority < 0 || args.priority > 100) {
      throw new Error("Priority must be between 0 and 100");
    }

    const goals = agent.goals ?? [];
    const goalIndex = goals.findIndex((g) => g.id === args.goalId);

    if (goalIndex === -1) {
      throw new Error("Goal not found");
    }

    const goal = goals[goalIndex];
    if (goal.status !== "active") {
      throw new Error("Can only update priority of active goals");
    }

    // Update goal priority
    const updatedGoal = {
      ...goal,
      priority: args.priority,
    };

    const updatedGoals = [...goals];
    updatedGoals[goalIndex] = updatedGoal;

    await ctx.db.patch(args.agentId, { goals: updatedGoals });

    return {
      goalId: args.goalId,
      newPriority: args.priority,
    };
  },
});

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Check and auto-complete goals that have been achieved
 * Called during tick processing or after agent state changes
 */
export const checkGoalCompletion = internalMutation({
  args: {
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) {
      return { completed: [] };
    }

    const goals = agent.goals ?? [];
    const activeGoals = goals.filter((g) => g.status === "active");

    if (activeGoals.length === 0) {
      return { completed: [] };
    }

    // Build context for progress calculation
    const ownedProperties = await ctx.db
      .query("properties")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.agentId))
      .collect();

    let isGangLeader = false;
    if (agent.gangId) {
      const gang = await ctx.db.get(agent.gangId);
      if (gang) {
        isGangLeader = gang.leaderId === args.agentId;
      }
    }

    const goalContext: GoalContext = {
      agent,
      ownedPropertyCount: ownedProperties.length,
      isInGang: !!agent.gangId,
      isGangLeader,
    };

    // Check each active goal for completion
    const completedGoalIds: string[] = [];
    const updatedGoals = goals.map((goal) => {
      if (goal.status !== "active") {
        return goal;
      }

      const progress = computeGoalProgress(goal as Goal, goalContext);
      if (progress.isComplete) {
        completedGoalIds.push(goal.id);
        return {
          ...goal,
          status: "completed" as const,
          completedAt: Date.now(),
        };
      }

      return goal;
    });

    // Update agent if any goals were completed
    if (completedGoalIds.length > 0) {
      await ctx.db.patch(args.agentId, { goals: updatedGoals });
    }

    return { completed: completedGoalIds };
  },
});

/**
 * Bulk assign random goals to agents without any goals
 * Useful for populating AI agents with initial goals
 */
export const bulkAssignRandomGoals = internalMutation({
  args: {
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.count ?? 50;

    // Find agents without goals
    const allAgents = await ctx.db.query("agents").take(200);
    const agentsWithoutGoals = allAgents.filter(
      (a) => !a.goals || a.goals.length === 0
    );

    const toProcess = agentsWithoutGoals.slice(0, limit);
    const assigned: string[] = [];

    for (const agent of toProcess) {
      const template = selectRandomGoalTemplate([]);
      if (template) {
        const newGoal = createGoalFromTemplate(template);
        await ctx.db.patch(agent._id, { goals: [newGoal] });
        assigned.push(agent._id);
      }
    }

    return {
      processed: assigned.length,
      agentIds: assigned,
    };
  },
});
