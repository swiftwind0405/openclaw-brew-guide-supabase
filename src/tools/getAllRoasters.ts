import type { SupabaseClient } from '@supabase/supabase-js';
import { getErrorMessage, textResult } from '../lib/toolResults.js';

/**
 * 执行获取所有烘焙商操作。
 * 调用 Supabase RPC `get_all_roasters`，返回去重的烘焙商列表。
 */
export async function executeGetAllRoasters(supabase: SupabaseClient) {
  try {
    const { data, error } = await supabase.rpc('get_all_roasters');

    if (error) {
      return textResult(`Failed to get roasters: ${error.message}`);
    }

    const roasters: string[] = (data ?? []).map((r: { roaster: string }) => r.roaster);

    if (roasters.length === 0) {
      return textResult('No roasters found.');
    }

    return textResult(`Found ${roasters.length} roaster(s):\n${roasters.join('\n')}`);
  } catch (error) {
    return textResult(`Failed to get roasters: ${getErrorMessage(error)}`);
  }
}
