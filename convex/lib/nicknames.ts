/**
 * Agent Nickname/Title System for ClawCity
 * Computes dynamic titles based on agent behavior and stats
 */

import { Doc } from "../_generated/dataModel";

export type AgentTitle = {
  title: string;
  description: string;
  priority: number; // Higher = more important
};

/**
 * Available titles and their conditions
 */
const TITLES: Array<{
  title: string;
  description: string;
  priority: number;
  check: (agent: Doc<"agents">, context: TitleContext) => boolean;
}> = [
  {
    title: "Kingpin",
    description: "Gang leader with territories",
    priority: 100,
    check: (agent, ctx) =>
      ctx.isGangLeader && ctx.territoryCount > 0,
  },
  {
    title: "Crime Lord",
    description: "Gang leader with high reputation",
    priority: 95,
    check: (agent, ctx) =>
      ctx.isGangLeader && agent.reputation >= 500,
  },
  {
    title: "The Boss",
    description: "Gang leader",
    priority: 90,
    check: (_agent, ctx) => ctx.isGangLeader,
  },
  {
    title: "Mastermind",
    description: "High crimes with low arrests",
    priority: 85,
    check: (agent) =>
      agent.stats.totalCrimes >= 50 && agent.stats.totalArrests <= 2,
  },
  {
    title: "Ghost",
    description: "High stealth, consistently low heat",
    priority: 80,
    check: (agent) =>
      agent.skills.stealth >= 50 && agent.heat <= 10 && agent.stats.totalCrimes >= 20,
  },
  {
    title: "Muscle",
    description: "High combat skill",
    priority: 75,
    check: (agent) => agent.skills.combat >= 70,
  },
  {
    title: "Wheelman",
    description: "High driving skill",
    priority: 75,
    check: (agent) => agent.skills.driving >= 70,
  },
  {
    title: "Smooth Talker",
    description: "High negotiation skill",
    priority: 75,
    check: (agent) => agent.skills.negotiation >= 70,
  },
  {
    title: "Shadow",
    description: "High stealth skill",
    priority: 75,
    check: (agent) => agent.skills.stealth >= 70,
  },
  {
    title: "Backstabber",
    description: "Has betrayed their gang",
    priority: 70,
    check: (agent) => (agent.socialStats?.betrayals ?? 0) > 0,
  },
  {
    title: "The Snitch",
    description: "High arrests relative to crimes",
    priority: 65,
    check: (agent) =>
      agent.stats.totalArrests >= 5 &&
      agent.stats.totalArrests / Math.max(1, agent.stats.totalCrimes) > 0.3,
  },
  {
    title: "Workhorse",
    description: "High jobs completed",
    priority: 60,
    check: (agent) => agent.stats.jobsCompleted >= 50,
  },
  {
    title: "Philanthropist",
    description: "Very generous with gifts",
    priority: 55,
    check: (agent) => (agent.socialStats?.giftsGiven ?? 0) >= 20,
  },
  {
    title: "Team Player",
    description: "Active in coop crimes",
    priority: 50,
    check: (agent) => (agent.socialStats?.coopCrimesCompleted ?? 0) >= 10,
  },
  {
    title: "Socialite",
    description: "Many friends",
    priority: 45,
    check: (agent) => (agent.socialStats?.totalFriends ?? 0) >= 10,
  },
  {
    title: "Lone Wolf",
    description: "No gang, no friends",
    priority: 40,
    check: (agent) =>
      !agent.gangId && (agent.socialStats?.totalFriends ?? 0) === 0,
  },
  {
    title: "Hothead",
    description: "Currently high heat",
    priority: 35,
    check: (agent) => agent.heat >= 60,
  },
  {
    title: "Wanted",
    description: "Moderate heat level",
    priority: 30,
    check: (agent) => agent.heat >= 40,
  },
  {
    title: "Survivor",
    description: "Long time in the game",
    priority: 25,
    check: (agent) => agent.stats.daysSurvived >= 100,
  },
  {
    title: "Mogul",
    description: "High lifetime earnings",
    priority: 20,
    check: (agent) => agent.stats.lifetimeEarnings >= 50000,
  },
  {
    title: "Entrepreneur",
    description: "Owns a business",
    priority: 15,
    check: (_, ctx) => ctx.ownsBusiness,
  },
  {
    title: "Property Owner",
    description: "Owns property",
    priority: 10,
    check: (agent) => agent.homePropertyId !== undefined,
  },
  {
    title: "Recruit",
    description: "New to the game",
    priority: 5,
    check: (agent) => agent.stats.daysSurvived < 10,
  },
  {
    title: "Citizen",
    description: "Default title",
    priority: 0,
    check: () => true, // Always matches as fallback
  },
];

/**
 * Context needed for some title checks
 */
export type TitleContext = {
  isGangLeader: boolean;
  territoryCount: number;
  ownsBusiness: boolean;
};

/**
 * Compute the most appropriate title for an agent
 */
export function computeAgentTitle(
  agent: Doc<"agents">,
  context: TitleContext
): AgentTitle {
  // Find the highest priority matching title
  const matchingTitles = TITLES.filter((t) => t.check(agent, context));

  // Sort by priority descending
  matchingTitles.sort((a, b) => b.priority - a.priority);

  const bestTitle = matchingTitles[0];

  return {
    title: bestTitle.title,
    description: bestTitle.description,
    priority: bestTitle.priority,
  };
}

/**
 * Get all titles that apply to an agent
 */
export function getAllAgentTitles(
  agent: Doc<"agents">,
  context: TitleContext
): AgentTitle[] {
  return TITLES.filter((t) => t.check(agent, context))
    .sort((a, b) => b.priority - a.priority)
    .map((t) => ({
      title: t.title,
      description: t.description,
      priority: t.priority,
    }));
}

/**
 * Get title color class based on priority
 */
export function getTitleColorClass(priority: number): string {
  if (priority >= 90) return "text-yellow-500"; // Gold for leaders
  if (priority >= 70) return "text-purple-500"; // Purple for elite
  if (priority >= 50) return "text-blue-500"; // Blue for specialists
  if (priority >= 30) return "text-green-500"; // Green for common
  return "text-muted-foreground"; // Gray for basic
}
