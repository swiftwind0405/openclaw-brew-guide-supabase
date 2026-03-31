import { Type } from '@sinclair/typebox';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrewGuideConfig } from '../config.js';
import { isValidTable, VALID_TABLES } from '../lib/tables.js';
import { getErrorMessage, invalidParamsResult, isRecord, textResult } from '../lib/toolResults.js';

const SUMMARY_FIELDS: Record<string, string[]> = {
  coffee_beans: ['name', 'roaster', 'origin', 'process', 'variety', 'roastLevel'],
  brewing_notes: ['method', 'beanId', 'score', 'flavor', 'ratio', 'brewTime'],
  custom_equipments: ['brand', 'model', 'name', 'equipmentType', 'category'],
  custom_methods: ['name', 'title', 'category', 'description', 'method'],
};

const FALLBACK_FIELDS = ['name', 'title', 'label', 'brand', 'model', 'category', 'type', 'method'];

function pickSummaryFields(table: string, data: Record<string, unknown>) {
  const summary: Record<string, unknown> = {};
  const candidates = [...(SUMMARY_FIELDS[table] ?? []), ...FALLBACK_FIELDS];

  for (const key of candidates) {
    const value = data[key];
    if (value !== undefined && (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
      summary[key] = value;
    }
  }

  return summary;
}

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
  params: { table: string; limit?: number; includeDeleted?: boolean } | undefined,
) {
  if (!isRecord(params) || typeof params.table !== 'string') {
    return invalidParamsResult('brew_guide_list_recent', '{ table: string, limit?: number, includeDeleted?: boolean }');
  }

  const { table, limit = 20, includeDeleted = false } = params;

  if (!isValidTable(table)) {
    return textResult(`Invalid table: ${table}. Must be one of: ${VALID_TABLES.join(', ')}`);
  }

  try {
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
      return textResult(`Failed to list records: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return textResult(`No records found in ${table}.`);
    }

    // 构造摘要：按表提取描述性字段，避免 custom_* 表只剩 id。
    const summary = data.map((row) => {
      const d = isRecord(row.data) ? row.data : {};
      return {
        id: row.id,
        ...pickSummaryFields(table, d),
        updated_at: row.updated_at,
        ...(row.deleted_at ? { deleted_at: row.deleted_at } : {}),
      };
    });

    return textResult(JSON.stringify(summary, null, 2));
  } catch (error) {
    return textResult(`Failed to list records: ${getErrorMessage(error)}`);
  }
}
