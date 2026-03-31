import { Type } from '@sinclair/typebox';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrewGuideConfig } from '../config.js';
import { generateId } from '../lib/ids.js';
import { now } from '../lib/timestamps.js';
import { getErrorMessage, invalidParamsResult, isRecord, textResult } from '../lib/toolResults.js';

/**
 * brew_guide_upsert_bean 工具的参数 schema。
 * 定义具体字段但允许额外属性，兼顾校验和灵活性。
 */
export const upsertBeanParameters = Type.Object({
  bean: Type.Object(
    {
      id: Type.Optional(Type.String({ description: 'Bean record ID. Auto-generated if omitted.' })),
      name: Type.String({ description: 'Coffee bean name.' }),
      origin: Type.Optional(Type.String({ description: 'Country or region of origin.' })),
      roaster: Type.Optional(Type.String({ description: 'Roaster name.' })),
      process: Type.Optional(Type.String({ description: 'Processing method (e.g. washed, natural).' })),
      variety: Type.Optional(Type.String({ description: 'Coffee variety (e.g. Gesha, Typica).' })),
      roastLevel: Type.Optional(Type.String({ description: 'Roast level (e.g. light, medium, dark).' })),
      purchaseDate: Type.Optional(Type.String({ description: 'Purchase date (ISO string).' })),
      roastDate: Type.Optional(Type.String({ description: 'Roast date (ISO string).' })),
      notes: Type.Optional(Type.String({ description: 'Free-form notes about this bean.' })),
    },
    { additionalProperties: true },
  ),
});

/**
 * 执行咖啡豆 upsert 操作。
 */
export async function executeUpsertBean(
  supabase: SupabaseClient,
  config: BrewGuideConfig,
  params: { bean: Record<string, unknown> } | undefined,
) {
  if (!isRecord(params) || !isRecord(params.bean)) {
    return invalidParamsResult('brew_guide_upsert_bean', '{ bean: object }');
  }

  const bean = params.bean;
  const id = (bean.id as string) || generateId('bean');
  const ts = now();

  try {
    const { error } = await supabase
      .from('coffee_beans')
      .upsert(
        {
          id,
          user_id: config.brewGuideUserId,
          data: { ...bean, id },
          updated_at: ts,
          deleted_at: null,
        },
        { onConflict: 'id,user_id' },
      );

    if (error) {
      return textResult(`Failed to upsert bean: ${error.message}`);
    }

    return textResult(`Upserted coffee bean ${id} at ${ts}.`);
  } catch (error) {
    return textResult(`Failed to upsert bean: ${getErrorMessage(error)}`);
  }
}
