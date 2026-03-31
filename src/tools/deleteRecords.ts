import { Type } from '@sinclair/typebox';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrewGuideConfig } from '../config.js';
import { isValidTable, VALID_TABLES } from '../lib/tables.js';
import { now } from '../lib/timestamps.js';
import { getErrorMessage, invalidParamsResult, isRecord, textResult } from '../lib/toolResults.js';

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
  params: { table: string; ids: string[] } | undefined,
) {
  if (!isRecord(params) || typeof params.table !== 'string' || !Array.isArray(params.ids)) {
    return invalidParamsResult('brew_guide_delete_records', '{ table: string, ids: string[] }');
  }

  const { table, ids } = params;

  if (!isValidTable(table)) {
    return textResult(`Invalid table: ${table}. Must be one of: ${VALID_TABLES.join(', ')}`);
  }

  const ts = now();

  try {
    const { error, count } = await supabase
      .from(table)
      .update({ deleted_at: ts, updated_at: ts }, { count: 'exact' })
      .eq('user_id', config.brewGuideUserId)
      .in('id', ids);

    if (error) {
      return textResult(`Failed to delete records: ${error.message}`);
    }

    if (count === null) {
      return textResult(
        `Soft-delete request completed for ${table} at ${ts}, but Supabase did not return a row count, so the matched record count is unable to confirm.`,
      );
    }

    return textResult(`Soft-deleted ${count} record(s) from ${table} at ${ts}.`);
  } catch (error) {
    return textResult(`Failed to delete records: ${getErrorMessage(error)}`);
  }
}
