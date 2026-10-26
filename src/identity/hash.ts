import { createHash } from 'node:crypto';

export function computeHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
