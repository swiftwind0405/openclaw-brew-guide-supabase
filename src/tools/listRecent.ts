import { Type } from '@sinclair/typebox';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrewGuideConfig } from '../config.js';
import { isValidTable, VALID_TABLES } from '../lib/tables.js';

/**
 * brew_guide_list_recent 工具的参数 schema。
 */
export const listRecentParameters = Type.Object({
  table: Type.Union(
    VALID_TABLES.map((t) => Type.Literal(t)),
    { description: 'Target table name.' },
  ),
  limit: Type.Optional(
    Type.Number({ minimum: 1, maximum: 100, default: 20, description: 'Max records to return (1-100).' }),
  ),
  includeDeleted: Type.Optional(
    Type.Boolean({ default: false, description: 'Whether to include soft-deleted records.' }),
  ),
});

/**
 * 查询最近记录，按 updated_at desc 排序。
 * 只返回摘要字段（id + data 中的关键字段），不返回 user_id 等内部字段。
 */
export async function executeListRecent(
  supabase: SupabaseClient,
  config: BrewGuideConfig,
  params: { table: string; limit?: number; includeDeleted?: boolean },
) {
  const { table, limit = 20, includeDeleted = false } = params;

  if (!isValidTable(table)) {
    return { content: [{ type: 'text' as const, text: `Invalid table: ${table}. Must be one of: ${VALID_TABLES.join(', ')}` }] };
  }

  let query = supabase
    .from(table)
    .select('id, data, updated_at, deleted_at')
    .eq('user_id', config.brewGuideUserId)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (!includeDeleted) {
    query = query.is('deleted_at', null);
  }

  const { data, error } = await query;

  if (error) {
    return { content: [{ type: 'text' as const, text: `Failed to list records: ${error.message}` }] };
  }

  if (!data || data.length === 0) {
    return { content: [{ type: 'text' as const, text: `No records found in ${table}.` }] };
  }

  // 构造摘要：提取 data JSONB 中的关键字段，控制返回体积
  const summary = data.map((row) => {
    const d = (row.data ?? {}) as Record<string, unknown>;
    return {
      id: row.id,
      ...(d.name ? { name: d.name } : {}),
      ...(d.method ? { method: d.method } : {}),
      ...(d.beanId ? { beanId: d.beanId } : {}),
      ...(d.score !== undefined ? { score: d.score } : {}),
      updated_at: row.updated_at,
      ...(row.deleted_at ? { deleted_at: row.deleted_at } : {}),
    };
  });

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }],
  };
}
