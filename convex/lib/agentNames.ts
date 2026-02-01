/**
 * Agent Name Generator for ClawCity
 * Generates varied names for batch-spawned agents
 */

const PREFIXES = [
  "Shadow",
  "Street",
  "Lucky",
  "Slick",
  "Quick",
  "Mean",
  "Big",
  "Little",
  "Old",
  "Young",
  "Silent",
  "Fast",
  "Steady",
  "Wild",
  "Smooth",
  "Cool",
  "Hot",
  "Cold",
  "Dark",
  "Crazy",
] as const;

const NAMES = [
  "Mike",
  "Tony",
  "Vito",
  "Marco",
  "Rico",
  "Danny",
  "Sal",
  "Joey",
  "Vinnie",
  "Lou",
  "Frank",
  "Eddie",
  "Nick",
  "Paulie",
  "Jimmy",
  "Tommy",
  "Rocco",
  "Carlo",
  "Enzo",
  "Gino",
] as const;

const SUFFIXES = [
  "",
  "",
  "",
  " Jr",
  " III",
  " the Kid",
  " Two-Times",
  " Bones",
  " the Rat",
  " the Snake",
] as const;

/**
 * Generate a random agent name with prefix, name, and optional suffix
 */
export function generateAgentName(): string {
  const prefix = PREFIXES[Math.floor(Math.random() * PREFIXES.length)];
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const suffix = SUFFIXES[Math.floor(Math.random() * SUFFIXES.length)];
  return `${prefix}${name}${suffix}`;
}

/**
 * Generate a unique agent name by checking against existing names
 */
export function generateUniqueAgentName(existingNames: Set<string>): string {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const name = generateAgentName();
    if (!existingNames.has(name)) {
      return name;
    }
    attempts++;
  }

  // Fallback: add a random number
  const baseName = generateAgentName();
  return `${baseName}${Math.floor(Math.random() * 1000)}`;
}
