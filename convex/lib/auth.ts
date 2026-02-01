/**
 * Authentication utilities for ClawCity agent authentication.
 * Uses Web Crypto API for cryptographic operations.
 */

// Type definitions for auth-related data
export interface AgentAuth {
  agentId: string;
  keyHash: string;
  createdAt: number;
  lastUsedAt?: number;
}

export interface AuthResult {
  success: boolean;
  agentId?: string;
  error?: string;
}

export interface ApiKeyData {
  key: string;
  prefix: string;
}

/**
 * Generates a new agent API key.
 * Creates a random 32-character string using crypto.getRandomValues().
 * @returns A random 32-character API key string
 */
export function generateAgentKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);

  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars[randomValues[i] % chars.length];
  }

  return key;
}

/**
 * Hashes an API key using SHA-256 for secure storage.
 * @param key - The plain text API key to hash
 * @returns A promise that resolves to the hex-encoded hash string
 */
export async function hashAgentKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Verifies an API key against a stored hash.
 * @param key - The plain text API key to verify
 * @param hash - The stored hash to compare against
 * @returns A promise that resolves to true if the key matches the hash
 */
export async function verifyAgentKey(key: string, hash: string): Promise<boolean> {
  const keyHash = await hashAgentKey(key);
  // Use constant-time comparison to prevent timing attacks
  if (keyHash.length !== hash.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < keyHash.length; i++) {
    result |= keyHash.charCodeAt(i) ^ hash.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validates an admin key against the stored admin key hash.
 * The admin key should be set as an environment variable ADMIN_KEY_HASH.
 * @param adminKey - The plain text admin key to verify
 * @returns A promise that resolves to true if the key is valid
 */
export async function validateAdminKey(adminKey: string): Promise<boolean> {
  const storedHash = process.env.ADMIN_KEY_HASH;
  if (!storedHash) {
    // No admin key configured - reject all admin requests
    console.error("ADMIN_KEY_HASH environment variable not set");
    return false;
  }

  return verifyAgentKey(adminKey, storedHash);
}
