import crypto from 'node:crypto';

/**
 * 生成带前缀的 UUID。
 * @example generateId('bean') => 'bean_a1b2c3d4-...'
 */
export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
