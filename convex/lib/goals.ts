/**
 * Agent Goals System for ClawCity
 * Computes goal progress and provides motivational text for agents
 */

import { Doc, Id } from "../_generated/dataModel";

/**
 * Goal type definitions
 */
export const GOAL_TYPES = [
  "property",
  "cash",
  "skill",
  "reputation",
  "crimes",
  "earnings",
  "gang",
  "custom",
] as const;

export type GoalType = (typeof GOAL_TYPES)[number];

/**
 * Goal structure matching schema
 */
export type Goal = {
  id: string;
  type: GoalType;
  title: string;
  description?: string;
  target: number;
  targetPropertyId?: Id<"properties">;
  targetSkill?: string;
  priority: number;
  status: "active" | "completed" | "abandoned";
  createdAt: number;
  completedAt?: number;
};

/**
 * Goal progress information
 */
export type GoalProgress = {
  current: number;
  target: number;
  percentage: number;
  isComplete: boolean;
};

/**
 * Goal with computed progress
 */
export type GoalWithProgress = Goal & {
  progress: GoalProgress;
};

/**
 * Goal templates for AI agents to select from
 */
export const GOAL_TEMPLATES: Array<{
  type: GoalType;
  title: string;
  description: string;
  target: number;
  targetSkill?: string;
  priorityRange: [number, number];
}> = [
  // Cash goals
  {
    type: "cash",
    title: "Build a War Chest",
    description: "Accumulate $5,000 in cash reserves",
    target: 5000,
    priorityRange: [60, 80],
  },
  {
    type: "cash",
    title: "Get Rich",
    description: "Amass $25,000 in liquid assets",
    target: 25000,
    priorityRange: [70, 90],
  },
  {
    type: "cash",
    title: "Pocket Money",
    description: "Have at least $1,000 on hand",
    target: 1000,
    priorityRange: [40, 60],
  },
  {
    type: "cash",
    title: "Millionaire Dreams",
    description: "Reach $100,000 in cash",
    target: 100000,
    priorityRange: [90, 100],
  },

  // Earnings goals
  {
    type: "earnings",
    title: "Hustle Hard",
    description: "Earn $10,000 in lifetime earnings",
    target: 10000,
    priorityRange: [50, 70],
  },
  {
    type: "earnings",
    title: "Big Earner",
    description: "Reach $50,000 in lifetime earnings",
    target: 50000,
    priorityRange: [70, 85],
  },
  {
    type: "earnings",
    title: "Money Machine",
    description: "Accumulate $200,000 in lifetime earnings",
    target: 200000,
    priorityRange: [85, 100],
  },

  // Reputation goals
  {
    type: "reputation",
    title: "Earn Respect",
    description: "Build reputation to 100",
    target: 100,
    priorityRange: [50, 70],
  },
  {
    type: "reputation",
    title: "Become a Legend",
    description: "Reach 500 reputation",
    target: 500,
    priorityRange: [75, 90],
  },
  {
    type: "reputation",
    title: "Street Cred",
    description: "Establish yourself with 50 reputation",
    target: 50,
    priorityRange: [40, 60],
  },

  // Crime goals
  {
    type: "crimes",
    title: "First Score",
    description: "Successfully commit 5 crimes",
    target: 5,
    priorityRange: [30, 50],
  },
  {
    type: "crimes",
    title: "Career Criminal",
    description: "Pull off 25 successful crimes",
    target: 25,
    priorityRange: [55, 75],
  },
  {
    type: "crimes",
    title: "Crime Lord",
    description: "Commit 100 crimes",
    target: 100,
    priorityRange: [80, 95],
  },
  {
    type: "crimes",
    title: "Master Thief",
    description: "Execute 50 crimes without getting caught",
    target: 50,
    priorityRange: [70, 85],
  },

  // Skill goals
  {
    type: "skill",
    title: "Silent Shadow",
    description: "Max out stealth to 100",
    target: 100,
    targetSkill: "stealth",
    priorityRange: [65, 85],
  },
  {
    type: "skill",
    title: "Street Fighter",
    description: "Train combat to 100",
    target: 100,
    targetSkill: "combat",
    priorityRange: [65, 85],
  },
  {
    type: "skill",
    title: "Smooth Operator",
    description: "Perfect negotiation skills to 100",
    target: 100,
    targetSkill: "negotiation",
    priorityRange: [65, 85],
  },
  {
    type: "skill",
    title: "Getaway Driver",
    description: "Master driving to 100",
    target: 100,
    targetSkill: "driving",
    priorityRange: [65, 85],
  },
  {
    type: "skill",
    title: "Learn the Ropes",
    description: "Get any skill to 50",
    target: 50,
    targetSkill: "any",
    priorityRange: [40, 55],
  },

  // Property goals
  {
    type: "property",
    title: "Find a Crib",
    description: "Own any property",
    target: 1,
    priorityRange: [55, 75],
  },
  {
    type: "property",
    title: "Real Estate Mogul",
    description: "Own 3 properties",
    target: 3,
    priorityRange: [80, 95],
  },

  // Gang goals
  {
    type: "gang",
    title: "Join the Crew",
    description: "Become part of a gang",
    target: 1,
    priorityRange: [50, 70],
  },
  {
    type: "gang",
    title: "Rise to Leadership",
    description: "Become a gang leader",
    target: 1,
    priorityRange: [85, 100],
  },
];

/**
 * Context needed to compute goal progress
 */
export type GoalContext = {
  agent: Doc<"agents">;
  ownedPropertyCount: number;
  isInGang: boolean;
  isGangLeader: boolean;
};

/**
 * Compute the current progress for a goal based on agent state
 */
export function computeGoalProgress(
  goal: Goal,
  context: GoalContext
): GoalProgress {
  let current = 0;

  switch (goal.type) {
    case "cash":
      current = context.agent.cash;
      break;

    case "earnings":
      current = context.agent.stats.lifetimeEarnings;
      break;

    case "reputation":
      current = context.agent.reputation;
      break;

    case "crimes":
      current = context.agent.stats.totalCrimes;
      break;

    case "skill":
      if (goal.targetSkill === "any") {
        // Any skill goal - take the highest
        current = Math.max(
          context.agent.skills.driving,
          context.agent.skills.negotiation,
          context.agent.skills.stealth,
          context.agent.skills.combat
        );
      } else if (goal.targetSkill && goal.targetSkill in context.agent.skills) {
        current =
          context.agent.skills[
            goal.targetSkill as keyof typeof context.agent.skills
          ];
      }
      break;

    case "property":
      current = context.ownedPropertyCount;
      break;

    case "gang":
      if (goal.title.toLowerCase().includes("leader")) {
        current = context.isGangLeader ? 1 : 0;
      } else {
        current = context.isInGang ? 1 : 0;
      }
      break;

    case "custom":
      // Custom goals need external tracking - default to 0
      current = 0;
      break;
  }

  const percentage = Math.min(100, Math.floor((current / goal.target) * 100));
  const isComplete = current >= goal.target;

  return {
    current,
    target: goal.target,
    percentage,
    isComplete,
  };
}

/**
 * Story blurbs for different goal states and types
 */
const GOAL_BLURBS: Record<GoalType, { pursuing: string[]; achieved: string[] }> = {
  cash: {
    pursuing: [
      "Every dollar counts on the way to the top.",
      "Chasing that paper, one hustle at a time.",
      "Money talks, and soon it'll be shouting.",
      "Stacking cash like there's no tomorrow.",
      "The streets reward those who stay hungry.",
    ],
    achieved: [
      "The money's flowing now. Time to make it work.",
      "Cash in hand, respect on the rise.",
      "Proof that the grind pays off.",
      "From broke to boss. The journey continues.",
    ],
  },
  earnings: {
    pursuing: [
      "Building an empire, one deal at a time.",
      "The hustle never stops.",
      "Making moves that'll echo through the streets.",
      "Every job brings us closer to the dream.",
    ],
    achieved: [
      "The earnings speak for themselves.",
      "A testament to relentless ambition.",
      "The streets know a real earner when they see one.",
      "From nothing to something. That's the story.",
    ],
  },
  reputation: {
    pursuing: [
      "Respect isn't given, it's earned on these streets.",
      "Building a name that echoes in every corner.",
      "Making sure everyone knows who's coming up.",
      "The streets are watching. Time to impress.",
    ],
    achieved: [
      "The name rings out across the city now.",
      "Respect earned, never borrowed.",
      "A reputation that opens doors and closes mouths.",
      "They know the name. They know what it means.",
    ],
  },
  crimes: {
    pursuing: [
      "Every job is practice for the next.",
      "Sharpening skills in the shadows.",
      "The thrill of the score never gets old.",
      "Walking the line, but never crossing the wrong one.",
    ],
    achieved: [
      "A resume that speaks for itself, if you know who to ask.",
      "Experience that can't be taught in any school.",
      "The streets have been good teachers.",
      "A track record that commands respect.",
    ],
  },
  skill: {
    pursuing: [
      "Mastery takes time, but the results are worth it.",
      "Training hard for when it matters most.",
      "Getting sharper every day.",
      "The best never stop improving.",
    ],
    achieved: [
      "Skills honed to perfection.",
      "Ready for anything the streets can throw.",
      "A master of the craft.",
      "When expertise becomes second nature.",
    ],
  },
  property: {
    pursuing: [
      "A place to call home - every hustler's dream.",
      "Looking for that perfect spot to lay low.",
      "Real estate is real power.",
      "Brick by brick, building a foundation.",
    ],
    achieved: [
      "Roots planted deep in the city.",
      "A base of operations to build from.",
      "Property means permanence.",
      "From the streets to the deed.",
    ],
  },
  gang: {
    pursuing: [
      "Strength in numbers. Time to find a crew.",
      "Lone wolves don't last long in this city.",
      "Looking for brothers and sisters to ride with.",
      "The right crew changes everything.",
    ],
    achieved: [
      "Part of something bigger now.",
      "The crew rides together.",
      "Family by choice, bound by the streets.",
      "Stronger together than apart.",
    ],
  },
  custom: {
    pursuing: [
      "Eyes on the prize.",
      "A personal mission that drives everything.",
      "Some goals only make sense to those who set them.",
      "Walking a path of their own design.",
    ],
    achieved: [
      "Mission accomplished, on their own terms.",
      "A goal that was worth the journey.",
      "Personal victory, personal satisfaction.",
      "Dreams realized through determination.",
    ],
  },
};

/**
 * Get a motivational story blurb for a goal
 */
export function getGoalStoryBlurb(goal: Goal, progress: GoalProgress): string {
  const blurbs = GOAL_BLURBS[goal.type];
  const pool = progress.isComplete ? blurbs.achieved : blurbs.pursuing;

  // Use goal ID as seed for consistent selection
  const hash = goal.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % pool.length;

  return pool[index];
}

/**
 * Generate a unique goal ID
 */
export function generateGoalId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Select a random goal from templates, considering what goals the agent already has
 */
export function selectRandomGoalTemplate(
  existingGoals: Goal[]
): (typeof GOAL_TEMPLATES)[number] | null {
  // Filter out templates where agent already has an active goal of that type/title
  const existingTitles = new Set(
    existingGoals.filter((g) => g.status === "active").map((g) => g.title)
  );

  const availableTemplates = GOAL_TEMPLATES.filter(
    (t) => !existingTitles.has(t.title)
  );

  if (availableTemplates.length === 0) {
    return null;
  }

  // Random selection
  const index = Math.floor(Math.random() * availableTemplates.length);
  return availableTemplates[index];
}

/**
 * Create a goal from a template
 */
export function createGoalFromTemplate(
  template: (typeof GOAL_TEMPLATES)[number]
): Goal {
  const [minPriority, maxPriority] = template.priorityRange;
  const priority =
    minPriority + Math.floor(Math.random() * (maxPriority - minPriority + 1));

  return {
    id: generateGoalId(),
    type: template.type,
    title: template.title,
    description: template.description,
    target: template.target,
    targetSkill: template.targetSkill,
    priority,
    status: "active",
    createdAt: Date.now(),
  };
}
