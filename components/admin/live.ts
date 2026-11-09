import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type LiveConfig = { url?: string; anonKey?: string };
export type LiveRow = { id: string; document: unknown; revision: number; updated_at?: string };

export const LIVE_TABLE = 'irex_live_content';
export const LIVE_ID = 'main';

export function createLiveClient(config?: LiveConfig): SupabaseClient | null {
  if (!config?.url || !config.anonKey) return null;
  try {
    const url = new URL(config.url);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return null;
    return createClient(url.toString(), config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
    });
  } catch {
    return null;
  }
}