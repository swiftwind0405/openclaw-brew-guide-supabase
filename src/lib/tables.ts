/**
 * brew-guide 的合法 Supabase 表名。
 */
export const VALID_TABLES = [
  'coffee_beans',
  'brewing_notes',
  'custom_equipments',
  'custom_methods',
] as const;

export type ValidTable = (typeof VALID_TABLES)[number];

/**
 * 校验表名是否合法。
 */
export function isValidTable(name: string): name is ValidTable {
  return (VALID_TABLES as readonly string[]).includes(name);
}
