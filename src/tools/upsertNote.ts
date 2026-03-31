import { Type } from '@sinclair/typebox';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrewGuideConfig } from '../config.js';
import { generateId } from '../lib/ids.js';
import { now } from '../lib/timestamps.js';
import { getErrorMessage, invalidParamsResult, isRecord, textResult } from '../lib/toolResults.js';

/**
 * brew_guide_upsert_note 工具的参数 schema。
 */
export const upsertNoteParameters = Type.Object({
  note: Type.Object(
    {
      id: Type.Optional(Type.String({ description: 'Note record ID. Auto-generated if omitted.' })),
      beanId: Type.Optional(Type.String({ description: 'Associated coffee bean ID.' })),
      method: Type.Optional(Type.String({ description: 'Brewing method (e.g. V60, Espresso).' })),
      grindSize: Type.Optional(Type.String({ description: 'Grind size setting.' })),
      waterTemp: Type.Optional(Type.Number({ description: 'Water temperature in Celsius.' })),
      ratio: Type.Optional(Type.String({ description: 'Coffee to water ratio (e.g. 1:15).' })),
      brewTime: Type.Optional(Type.String({ description: 'Total brew time.' })),
      flavor: Type.Optional(Type.String({ description: 'Flavor description.' })),
      score: Type.Optional(Type.Number({ description: 'Overall score (0-100).' })),
      memo: Type.Optional(Type.String({ description: 'Additional notes.' })),
      brewedAt: Type.Optional(Type.String({ description: 'Brew timestamp (ISO string).' })),
    },
    { additionalProperties: true },
  ),
});

/**
 * 执行冲煮记录 upsert 操作。
 */
export async function executeUpsertNote(
  supabase: SupabaseClient,
  config: BrewGuideConfig,
  params: { note: Record<string, unknown> } | undefined,
) {
  if (!isRecord(params) || !isRecord(params.note)) {
    return invalidParamsResult('brew_guide_upsert_note', '{ note: object }');
  }

  const note = params.note;
  const id = (note.id as string) || generateId('note');
  const ts = now();

  try {
    const { error } = await supabase
      .from('brewing_notes')
      .upsert(
        {
          id,
          user_id: config.brewGuideUserId,
          data: { ...note, id },
          updated_at: ts,
          deleted_at: null,
        },
        { onConflict: 'id,user_id' },
      );

    if (error) {
      return textResult(`Failed to upsert note: ${error.message}`);
    }

    return textResult(`Upserted brewing note ${id} at ${ts}.`);
  } catch (error) {
    return textResult(`Failed to upsert note: ${getErrorMessage(error)}`);
  }
}
