import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { BrewGuideConfig } from './config.js';

/**
 * 基于配置创建 Supabase 客户端。
 * 使用 service role key，绕过 RLS。
 */
export function createSupabaseClient(config: BrewGuideConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
}
