import test from 'node:test';
import assert from 'node:assert/strict';

import { executeUpsertBean } from '../dist/src/tools/upsertBean.js';
import { executeUpsertNote } from '../dist/src/tools/upsertNote.js';
import { executeDeleteRecords } from '../dist/src/tools/deleteRecords.js';
import { executeListRecent } from '../dist/src/tools/listRecent.js';

const config = {
  supabaseUrl: 'https://example.supabase.co',
  supabaseServiceRoleKey: 'service-role-key',
  brewGuideUserId: 'default_user',
};

test('executeUpsertBean returns a tool error instead of throwing when params are missing', async () => {
  const supabase = {
    from() {
      throw new Error('should not reach database');
    },
  };

  const result = await executeUpsertBean(supabase, config, undefined);

  assert.match(result.content[0].text, /Invalid params/i);
});

test('executeUpsertNote returns a tool error instead of throwing when params are missing', async () => {
  const supabase = {
    from() {
      throw new Error('should not reach database');
    },
  };

  const result = await executeUpsertNote(supabase, config, undefined);

  assert.match(result.content[0].text, /Invalid params/i);
});

test('executeUpsertNote converts unexpected Supabase exceptions into tool errors', async () => {
  const supabase = {
    from() {
      return {
        upsert: async () => {
          throw new Error('network down');
        },
      };
    },
  };

  const result = await executeUpsertNote(supabase, config, {
    note: { method: 'V60' },
  });

  assert.match(result.content[0].text, /Failed to upsert note: network down/);
});

test('executeDeleteRecords does not invent a deleted count when Supabase returns no count', async () => {
  const supabase = {
    from() {
      return {
        update() {
          return {
            eq() {
              return {
                in: async () => ({ error: null, count: null }),
              };
            },
          };
        },
      };
    },
  };

  const result = await executeDeleteRecords(supabase, config, {
    table: 'coffee_beans',
    ids: ['bean_1', 'bean_2'],
  });

  assert.match(result.content[0].text, /unable to confirm/i);
});

test('executeDeleteRecords reports the exact matched row count when Supabase provides it', async () => {
  const supabase = {
    from() {
      return {
        update(values, options) {
          assert.equal(values.deleted_at !== undefined, true);
          assert.deepEqual(options, { count: 'exact' });
          return {
            eq() {
              return {
                in: async () => ({ error: null, count: 1 }),
              };
            },
          };
        },
      };
    },
  };

  const result = await executeDeleteRecords(supabase, config, {
    table: 'coffee_beans',
    ids: ['bean_1', 'bean_2'],
  });

  assert.match(result.content[0].text, /Soft-deleted 1 record\(s\)/);
});

test('executeUpsertBean succeeds and returns the upserted bean id', async () => {
  let capturedRow = null;
  const supabase = {
    from(table) {
      assert.equal(table, 'coffee_beans');
      return {
        upsert(row, opts) {
          capturedRow = row;
          assert.deepEqual(opts, { onConflict: 'id,user_id' });
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  const result = await executeUpsertBean(supabase, config, {
    bean: { name: 'Ethiopia Yirgacheffe', origin: 'Ethiopia' },
  });

  assert.match(result.content[0].text, /Upserted coffee bean bean_/);
  assert.equal(capturedRow.user_id, 'default_user');
  assert.equal(capturedRow.data.name, 'Ethiopia Yirgacheffe');
  assert.equal(capturedRow.deleted_at, null);
});

test('executeUpsertNote succeeds and returns the upserted note id', async () => {
  let capturedRow = null;
  const supabase = {
    from(table) {
      assert.equal(table, 'brewing_notes');
      return {
        upsert(row, opts) {
          capturedRow = row;
          assert.deepEqual(opts, { onConflict: 'id,user_id' });
          return Promise.resolve({ error: null });
        },
      };
    },
  };

  const result = await executeUpsertNote(supabase, config, {
    note: { method: 'V60', score: 85 },
  });

  assert.match(result.content[0].text, /Upserted brewing note note_/);
  assert.equal(capturedRow.user_id, 'default_user');
  assert.equal(capturedRow.data.method, 'V60');
  assert.equal(capturedRow.deleted_at, null);
});

test('executeUpsertBean rejects data exceeding 64 KB', async () => {
  const supabase = {
    from() {
      throw new Error('should not reach database');
    },
  };

  const result = await executeUpsertBean(supabase, config, {
    bean: { name: 'huge', notes: 'x'.repeat(70_000) },
  });

  assert.match(result.content[0].text, /exceeds 64 KB limit/);
});

test('executeUpsertNote rejects data exceeding 64 KB', async () => {
  const supabase = {
    from() {
      throw new Error('should not reach database');
    },
  };

  const result = await executeUpsertNote(supabase, config, {
    note: { memo: 'x'.repeat(70_000) },
  });

  assert.match(result.content[0].text, /exceeds 64 KB limit/);
});

test('executeListRecent includes descriptive fields for custom equipment rows', async () => {
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                order() {
                  return {
                    limit() {
                      return {
                        is: async () => ({
                          error: null,
                          data: [
                            {
                              id: 'equipment_1',
                              data: {
                                brand: 'Comandante',
                                model: 'C40',
                              },
                              updated_at: '2026-03-31T10:00:00.000Z',
                              deleted_at: null,
                            },
                          ],
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await executeListRecent(supabase, config, {
    table: 'custom_equipments',
    limit: 10,
  });

  const summary = JSON.parse(result.content[0].text);
  assert.equal(summary[0].brand, 'Comandante');
  assert.equal(summary[0].model, 'C40');
});

test('executeListRecent includes method-specific summary fields for brewing notes', async () => {
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                order() {
                  return {
                    limit() {
                      return {
                        is: async () => ({
                          error: null,
                          data: [
                            {
                              id: 'note_1',
                              data: {
                                method: 'AeroPress',
                                beanId: 'bean_123',
                                score: 88,
                                flavor: 'citrus',
                              },
                              updated_at: '2026-03-31T11:00:00.000Z',
                              deleted_at: null,
                            },
                          ],
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await executeListRecent(supabase, config, {
    table: 'brewing_notes',
    limit: 10,
  });

  const summary = JSON.parse(result.content[0].text);
  assert.equal(summary[0].method, 'AeroPress');
  assert.equal(summary[0].beanId, 'bean_123');
  assert.equal(summary[0].score, 88);
});

test('executeListRecent falls back to generic fields for custom methods', async () => {
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                order() {
                  return {
                    limit() {
                      return {
                        is: async () => ({
                          error: null,
                          data: [
                            {
                              id: 'method_1',
                              data: {
                                title: 'Iced Flash Brew',
                                description: 'Fast chilled pour-over recipe',
                              },
                              updated_at: '2026-03-31T12:00:00.000Z',
                              deleted_at: null,
                            },
                          ],
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await executeListRecent(supabase, config, {
    table: 'custom_methods',
    limit: 10,
  });

  const summary = JSON.parse(result.content[0].text);
  assert.equal(summary[0].title, 'Iced Flash Brew');
  assert.equal(summary[0].description, 'Fast chilled pour-over recipe');
});

test('executeListRecent returns a tool error instead of throwing when params are missing', async () => {
  const supabase = {
    from() {
      throw new Error('should not reach database');
    },
  };

  const result = await executeListRecent(supabase, config, undefined);

  assert.match(result.content[0].text, /Invalid params/i);
});

test('executeListRecent converts query failures into tool errors', async () => {
  const supabase = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                order() {
                  return {
                    limit() {
                      return {
                        is: async () => ({
                          error: { message: 'permission denied' },
                          data: null,
                        }),
                      };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const result = await executeListRecent(supabase, config, {
    table: 'coffee_beans',
    limit: 5,
  });

  assert.match(result.content[0].text, /Failed to list records: permission denied/);
});
