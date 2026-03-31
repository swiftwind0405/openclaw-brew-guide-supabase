/**
 * 返回当前时间的 ISO 字符串，用于 updated_at / deleted_at 字段。
 */
export function now(): string {
  return new Date().toISOString();
}
