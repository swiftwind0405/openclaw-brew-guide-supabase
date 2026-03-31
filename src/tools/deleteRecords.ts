import { Type } from '@sinclair/typebox';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrewGuideConfig } from '../config.js';
import { isValidTable, VALID_TABLES } from '../lib/tables.js';
import { now } from '../lib/timestamps.js';

/**
 * brew_guide_delete_records 工具的参数 schema。
 */
export const deleteRecordsParameters = Type.Object({
  table: Type.Union(
    VALID_TABLES.map((t) => Type.Literal(t)),
    { description: 'Target table name.' },
  ),
  ids: Type.Array(Type.String({ minLength: 1 }), {
    minItems: 1,
    description: 'Record IDs to soft-delete.',
  }),
});

/**
 * 执行软删除操作（设置 deleted_at 和 updated_at）。
 */
export async function executeDeleteRecords(
  supabase: SupabaseClient,
  config: BrewGuideConfig,
  params: { table: string; ids: string[] },
) {
  const { table, ids } = params;

  if (!isValidTable(table)) {
    return { content: [{ type: 'text' as const, text: `Invalid table: ${table}. Must be one of: ${VALID_TABLES.join(', ')}` }] };
  }

  if (!ids || ids.length === 0) {
    return { content: [{ type: 'text' as const, text: 'No IDs provided for deletion.' }] };
  }

  const ts = now();

  const { error, count } = await supabase
    .from(table)
    .update({ deleted_at: ts, updated_at: ts })
    .eq('user_id', config.brewGuideUserId)
    .in('id', ids);

  if (error) {
    return { content: [{ type: 'text' as const, text: `Failed to delete records: ${error.message}` }] };
  }

  return {
    content: [{ type: 'text' as const, text: `Soft-deleted ${count ?? ids.length} record(s) from ${table} at ${ts}.` }],
  };
}
