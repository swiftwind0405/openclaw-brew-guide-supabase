import { definePluginEntry } from 'openclaw/plugin-sdk/plugin-entry';
import { resolveConfig } from './src/config.js';
import { createSupabaseClient } from './src/client.js';
import { upsertBeanParameters, executeUpsertBean } from './src/tools/upsertBean.js';
import { upsertNoteParameters, executeUpsertNote } from './src/tools/upsertNote.js';
import { deleteRecordsParameters, executeDeleteRecords } from './src/tools/deleteRecords.js';
import { listRecentParameters, executeListRecent } from './src/tools/listRecent.js';

export default definePluginEntry({
  id: 'brew-guide-supabase',
  name: 'Brew Guide Supabase',
  description: 'Agent tools for brew-guide Supabase sync tables.',

  register(api) {
    // ── upsert bean ──────────────────────────────────────────────
    api.registerTool(
      {
        name: 'brew_guide_upsert_bean',
        description:
          'Create or update a coffee bean record in brew-guide. ' +
          'Writes to the coffee_beans table using (id, user_id) upsert. ' +
          'If id is omitted, a new UUID is generated.',
        parameters: upsertBeanParameters,
        async execute(_id, params) {
          const config = resolveConfig(api.pluginConfig);
          const supabase = createSupabaseClient(config);
          return executeUpsertBean(supabase, config, params as { bean: Record<string, unknown> });
        },
      },
      { optional: true },
    );

    // ── upsert note ──────────────────────────────────────────────
    api.registerTool(
      {
        name: 'brew_guide_upsert_note',
        description:
          'Create or update a brewing note record in brew-guide. ' +
          'Writes to the brewing_notes table using (id, user_id) upsert. ' +
          'If id is omitted, a new UUID is generated.',
        parameters: upsertNoteParameters,
        async execute(_id, params) {
          const config = resolveConfig(api.pluginConfig);
          const supabase = createSupabaseClient(config);
          return executeUpsertNote(supabase, config, params as { note: Record<string, unknown> });
        },
      },
      { optional: true },
    );

    // ── delete records ───────────────────────────────────────────
    api.registerTool(
      {
        name: 'brew_guide_delete_records',
        description:
          'Soft-delete records from a brew-guide table. ' +
          'Sets deleted_at and updated_at to now. Does NOT physically delete rows.',
        parameters: deleteRecordsParameters,
        async execute(_id, params) {
          const config = resolveConfig(api.pluginConfig);
          const supabase = createSupabaseClient(config);
          return executeDeleteRecords(supabase, config, params as { table: string; ids: string[] });
        },
      },
      { optional: true },
    );

    // ── list recent ──────────────────────────────────────────────
    // list_recent 是纯读取工具，无副作用，不标记 optional
    api.registerTool({
      name: 'brew_guide_list_recent',
      description:
        'List recent records from a brew-guide table, ordered by updated_at descending. ' +
        'Returns summary fields only. Use this to check context before writing.',
      parameters: listRecentParameters,
      async execute(_id, params) {
        const config = resolveConfig(api.pluginConfig);
        const supabase = createSupabaseClient(config);
        return executeListRecent(supabase, config, params as { table: string; limit?: number; includeDeleted?: boolean });
      },
    });
  },
});
