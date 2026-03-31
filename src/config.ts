/**
 * 插件配置类型和读取逻辑。
 *
 * 配置通过 OpenClaw 的 plugins.entries.brew-guide-supabase.config 设置，
 * 运行时通过 api.pluginConfig 读取。
 */

export interface BrewGuideConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  brewGuideUserId: string;
}

/**
 * 从 api.pluginConfig 解析配置。
 * 如果必填字段缺失，抛出描述性错误。
 */
export function resolveConfig(pluginConfig: Record<string, unknown>): BrewGuideConfig {
  const cfg = pluginConfig ?? {};

  const supabaseUrl = cfg.supabaseUrl as string | undefined;
  const supabaseServiceRoleKey = cfg.supabaseServiceRoleKey as string | undefined;

  if (!supabaseUrl) {
    throw new Error(
      'Missing supabaseUrl in plugin config. ' +
      'Set it via plugins.entries.brew-guide-supabase.config.supabaseUrl in openclaw.json.',
    );
  }
  if (!supabaseServiceRoleKey) {
    throw new Error(
      'Missing supabaseServiceRoleKey in plugin config. ' +
      'Set it via plugins.entries.brew-guide-supabase.config.supabaseServiceRoleKey in openclaw.json.',
    );
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    brewGuideUserId: (cfg.brewGuideUserId as string) || 'default_user',
  };
}
