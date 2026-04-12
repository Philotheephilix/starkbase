import { randomUUID, createHash, randomBytes } from 'crypto';

/** Generate a new API key with `sb_` prefix and 48 hex chars. */
export function generateApiKey(): string {
  return `sb_${randomBytes(24).toString('hex')}`;
}

/** Hash an API key with SHA-256 for storage. */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/** Generate a UUID v4. */
export function newId(): string {
  return randomUUID();
}
