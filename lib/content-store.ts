import { createClient } from '@supabase/supabase-js';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import originalContent from '@/lib/landing-content.json';
import { validateDocument, type SiteDocument } from '@/components/admin/model';
import { LIVE_ID, LIVE_TABLE } from '@/components/admin/live';
import type { VerifiedAdmin } from './admin-auth';

const LOCAL_FILE = path.join(process.cwd(), '.data', 'live-content.json');

export type StoredLiveDocument = {
  document: SiteDocument;
  revision: number;
  updatedAt: string | null;
  source: 'supabase' | 'local' | 'default';
};

function getSupabaseEnv() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !anonKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return null;
    return { url: parsed.toString(), anonKey, serviceKey };
  } catch {
    return null;
  }
}

export async function getLiveSiteDocument(): Promise<StoredLiveDocument> {
  const fallback: StoredLiveDocument = {
    document: { content: originalContent, appearance: {} },
    revision: 0,
    updatedAt: null,
    source: 'default',
  };

  const sb = getSupabaseEnv();
  if (sb) {
    try {
      const client = createClient(sb.url, sb.anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await client
        .from(LIVE_TABLE)
        .select('id,document,revision,updated_at')
        .eq('id', LIVE_ID)
        .maybeSingle();

      if (!error && data) {
        const doc = validateDocument(data.document, originalContent);
        if (doc) {
          return {
            document: doc,
            revision: typeof data.revision === 'number' ? data.revision : 1,
            updatedAt: typeof data.updated_at === 'string' ? data.updated_at : null,
            source: 'supabase',
          };
        }
      }
    } catch {
      // Fall back to default
    }
    return fallback;
  }

  try {
    const raw = await readFile(LOCAL_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { document?: unknown; revision?: unknown; updatedAt?: unknown };
    const doc = validateDocument(parsed.document ?? parsed, originalContent);
    if (doc) {
      return {
        document: doc,
        revision: typeof parsed.revision === 'number' ? parsed.revision : 1,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
        source: 'local',
      };
    }
  } catch {
    // No local file yet
  }

  return fallback;
}

export async function saveLiveSiteDocument(
  rawDocument: unknown,
  admin: VerifiedAdmin,
  expectedRevision?: number,
): Promise<{
  ok: boolean;
  revision?: number;
  updatedAt?: string;
  source?: 'supabase' | 'local';
  error?: string;
  conflict?: boolean;
}> {
  const clean = validateDocument(rawDocument, originalContent);
  if (!clean) {
    return { ok: false, error: 'Invalid content document structure.' };
  }

  const now = new Date().toISOString();
  const sb = getSupabaseEnv();

  if (sb) {
    const key = sb.serviceKey || sb.anonKey;
    const headers = !sb.serviceKey && admin.supabaseAccessToken
      ? { Authorization: `Bearer ${admin.supabaseAccessToken}` }
      : undefined;

    if (!sb.serviceKey && !admin.supabaseAccessToken) {
      return {
        ok: false,
        error: 'Live Supabase updates require signing in with a Supabase editor account or configuring SUPABASE_SERVICE_ROLE_KEY.',
      };
    }

    const client = createClient(sb.url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
      ...(headers ? { global: { headers } } : {}),
    });

    const { data: existing, error: readErr } = await client
      .from(LIVE_TABLE)
      .select('revision')
      .eq('id', LIVE_ID)
      .maybeSingle();

    if (readErr) {
      return { ok: false, error: readErr.message };
    }

    if (!existing) {
      const { data, error } = await client
        .from(LIVE_TABLE)
        .insert({ id: LIVE_ID, document: clean, revision: 1, updated_at: now })
        .select('revision,updated_at')
        .maybeSingle();

      if (error || !data) {
        return { ok: false, error: error?.message || 'Failed to save live content.' };
      }
      return { ok: true, revision: data.revision, updatedAt: data.updated_at || now, source: 'supabase' };
    }

    const currentRevision = existing.revision as number;
    if (typeof expectedRevision === 'number' && expectedRevision > 0 && expectedRevision !== currentRevision) {
      return {
        ok: false,
        conflict: true,
        error: 'Another editor changed the live page. Refresh to review the latest version.',
      };
    }

    const { data, error } = await client
      .from(LIVE_TABLE)
      .update({ document: clean, revision: currentRevision + 1, updated_at: now })
      .eq('id', LIVE_ID)
      .eq('revision', currentRevision)
      .select('revision,updated_at')
      .maybeSingle();

    if (error || !data) {
      return {
        ok: false,
        conflict: error?.code === '23505' || !data,
        error: error?.message || 'Revision conflict while updating live content.',
      };
    }

    return { ok: true, revision: data.revision, updatedAt: data.updated_at || now, source: 'supabase' };
  }

  // Local Node fallback
  try {
    let nextRevision = 1;
    try {
      const raw = await readFile(LOCAL_FILE, 'utf8');
      const existing = JSON.parse(raw) as { revision?: unknown };
      if (typeof existing.revision === 'number') nextRevision = existing.revision + 1;
    } catch {
      // ignore
    }

    await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await writeFile(
      LOCAL_FILE,
      `${JSON.stringify({ document: clean, revision: nextRevision, updatedAt: now }, null, 2)}\n`,
      'utf8',
    );
    return { ok: true, revision: nextRevision, updatedAt: now, source: 'local' };
  } catch {
    return {
      ok: false,
      error: 'Server filesystem is read-only. Configure Supabase to persist live website updates in production.',
    };
  }
}
