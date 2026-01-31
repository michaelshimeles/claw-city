/**
 * Deterministic RNG utilities for ClawCity
 * Uses xorshift128+ algorithm for high-quality pseudorandom number generation
 * Same seed + tick combination will always produce the same sequence
 */

/**
 * Simple hash function to convert a string to a 32-bit integer
 * Uses djb2 algorithm - fast and provides good distribution
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    // hash * 33 + char
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    // Keep it as a 32-bit integer
    hash = hash >>> 0;
  }
  return hash;
}

/**
 * Mix two 32-bit values into two 64-bit state values
 * Ensures we have enough entropy for xorshift128+
 */
function initializeState(seed1: number, seed2: number): [bigint, bigint] {
  // Use different mixing constants to ensure state0 !== state1
  // This prevents the degenerate case where both states are equal
  const state0 = BigInt(seed1) | (BigInt(seed1 ^ 0x9e3779b9) << 32n);
  const state1 = BigInt(seed2) | (BigInt(seed2 ^ 0x6a09e667) << 32n);

  // Ensure states are non-zero (required for xorshift)
  const finalState0 = state0 === 0n ? 1n : state0;
  const finalState1 = state1 === 0n ? 2n : state1;

  return [finalState0, finalState1];
}

/**
 * Xorshift128+ PRNG implementation
 * Provides high-quality pseudorandom numbers with a period of 2^128 - 1
 */
class Xorshift128Plus {
  private state0: bigint;
  private state1: bigint;

  constructor(state0: bigint, state1: bigint) {
    this.state0 = state0;
    this.state1 = state1;
  }

  /**
   * Generate the next 64-bit random value
   */
  next(): bigint {
    let s1 = this.state0;
    const s0 = this.state1;

    this.state0 = s0;
    s1 ^= s1 << 23n;
    s1 ^= s1 >> 17n;
    s1 ^= s0;
    s1 ^= s0 >> 26n;
    this.state1 = s1;

    // Mask to 64 bits
    return (this.state0 + this.state1) & 0xffffffffffffffffn;
  }

  /**
   * Get a random number between 0 (inclusive) and 1 (exclusive)
   */
  random(): number {
    const value = this.next();
    // Convert to a number in [0, 1) by dividing by 2^64
    // We use the upper 53 bits for better precision (JS number precision)
    const upper53 = value >> 11n;
    return Number(upper53) / 0x20000000000000; // 2^53
  }
}

/**
 * RNG interface with helper methods
 */
export interface TickRng {
  /** Get a random number between 0 (inclusive) and 1 (exclusive) */
  random(): number;

  /** Get a random integer between min (inclusive) and max (inclusive) */
  randomInt(min: number, max: number): number;

  /** Pick a random element from an array */
  randomChoice<T>(array: readonly T[]): T;

  /** Return true with the given probability (0-1) */
  randomChance(probability: number): boolean;

  /** Shuffle an array in place (deterministically) and return it */
  shuffle<T>(array: T[]): T[];
}

/**
 * Create a deterministic RNG for a specific world and tick
 * The same worldSeed + tick combination will always produce the same sequence
 *
 * @param worldSeed - The world's unique seed string
 * @param tick - The current game tick number
 * @returns An RNG object with helper methods
 */
export function createTickRng(worldSeed: string, tick: number): TickRng {
  // Create a combined seed that incorporates both the world seed and tick
  // We hash them separately and combine to ensure good distribution
  const worldHash = hashString(worldSeed);
  const tickHash = hashString(`tick:${tick}`);

  // Additional mixing to ensure different ticks produce very different sequences
  const combinedHash1 = hashString(`${worldSeed}:${tick}:a`);
  const combinedHash2 = hashString(`${worldSeed}:${tick}:b`);

  // Mix all hashes together for the initial state
  const seed1 = (worldHash ^ tickHash ^ combinedHash1) >>> 0;
  const seed2 = (worldHash ^ (tickHash << 16) ^ combinedHash2) >>> 0;

  const [state0, state1] = initializeState(seed1, seed2);
  const prng = new Xorshift128Plus(state0, state1);

  // Warm up the generator by discarding the first few values
  // This helps ensure better randomness for early values
  for (let i = 0; i < 8; i++) {
    prng.next();
  }

  return {
    random(): number {
      return prng.random();
    },

    randomInt(min: number, max: number): number {
      if (min > max) {
        throw new Error(
          `randomInt: min (${min}) must be less than or equal to max (${max})`
        );
      }
      const range = max - min + 1;
      return Math.floor(prng.random() * range) + min;
    },

    randomChoice<T>(array: readonly T[]): T {
      if (array.length === 0) {
        throw new Error("randomChoice: cannot pick from an empty array");
      }
      const index = Math.floor(prng.random() * array.length);
      return array[index];
    },

    randomChance(probability: number): boolean {
      if (probability < 0 || probability > 1) {
        throw new Error(
          `randomChance: probability (${probability}) must be between 0 and 1`
        );
      }
      return prng.random() < probability;
    },

    shuffle<T>(array: T[]): T[] {
      // Fisher-Yates shuffle algorithm
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(prng.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    },
  };
}
