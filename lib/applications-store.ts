import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { VerifiedAdmin } from './admin-auth';

export const APPLICATIONS_TABLE = 'irex_applications';
const LOCAL_FILE = path.join(process.cwd(), '.data', 'applications.json');

export type ApplicationStatus = 'new' | 'reviewed' | 'contacted' | 'archived';
export type EmailDeliveryStatus = 'pending' | 'sent' | 'logged' | 'failed' | 'not_configured';

export type ApplicationRecord = {
  id: string;
  name: string;
  company: string;
  email: string;
  message: string;
  status: ApplicationStatus;
  notes: string;
  emailStatus: EmailDeliveryStatus;
  emailId: string | null;
  emailError: string | null;
  createdAt: string;
  updatedAt: string;
};

type SupabaseRow = {
  id: string;
  name: string;
  company: string;
  email: string;
  message: string;
  status: ApplicationStatus;
  notes: string;
  email_status: EmailDeliveryStatus;
  email_id: string | null;
  email_error: string | null;
  created_at: string;
  updated_at: string;
};

export function isValidApplicationStatus(value: unknown): value is ApplicationStatus {
  return value === 'new' || value === 'reviewed' || value === 'contacted' || value === 'archived';
}

function mapRow(row: SupabaseRow): ApplicationRecord {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    message: row.message || '',
    status: isValidApplicationStatus(row.status) ? row.status : 'new',
    notes: row.notes || '',
    emailStatus: row.email_status || 'pending',
    emailId: row.email_id || null,
    emailError: row.email_error || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at,
  };
}

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

function getAdminSupabaseClient(admin?: VerifiedAdmin): { client: SupabaseClient; error?: string } | null {
  const sb = getSupabaseEnv();
  if (!sb) return null;

  if (sb.serviceKey) {
    return {
      client: createClient(sb.url, sb.serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      }),
    };
  }

  if (admin?.supabaseAccessToken) {
    return {
      client: createClient(sb.url, sb.anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${admin.supabaseAccessToken}` } },
      }),
    };
  }

  return {
    client: createClient(sb.url, sb.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }),
    error: 'Reading application records from Supabase requires signing in with a Supabase editor account or configuring SUPABASE_SERVICE_ROLE_KEY.',
  };
}

function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205' || Boolean(error.message?.includes(APPLICATIONS_TABLE));
}

async function readLocalRecords(): Promise<ApplicationRecord[]> {
  try {
    const raw = await readFile(LOCAL_FILE, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ApplicationRecord[]) : [];
  } catch {
    return [];
  }
}

async function writeLocalRecords(records: ApplicationRecord[]): Promise<boolean> {
  try {
    await mkdir(path.dirname(LOCAL_FILE), { recursive: true });
    await writeFile(LOCAL_FILE, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

export function getApplicationsStorageHealth() {
  const sb = getSupabaseEnv();
  return {
    storageMode: sb ? ('supabase' as const) : ('local' as const),
    storageConfigured: Boolean(sb) || process.env.VERCEL !== '1',
  };
}

export async function createApplicationRecord(input: {
  name: string;
  company: string;
  email: string;
  message: string;
  emailStatus: EmailDeliveryStatus;
  emailId?: string;
  emailError?: string;
}): Promise<{
  ok: boolean;
  record?: ApplicationRecord;
  storageMode: 'supabase' | 'local' | 'none';
  error?: string;
}> {
  const now = new Date().toISOString();
  const sb = getSupabaseEnv();

  if (sb) {
    const client = createClient(sb.url, sb.serviceKey || sb.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Insert without .select() when using anon key because anon does not have SELECT RLS permission
    const id = randomUUID();
    const row = {
      id,
      name: input.name,
      company: input.company,
      email: input.email,
      message: input.message,
      status: 'new' as const,
      notes: '',
      email_status: input.emailStatus,
      email_id: input.emailId || null,
      email_error: input.emailError || null,
      created_at: now,
      updated_at: now,
    };

    const { error } = await client.from(APPLICATIONS_TABLE).insert(row);
    if (error) {
      return {
        ok: false,
        storageMode: 'supabase',
        error: isMissingTableError(error)
          ? 'irex_applications table is missing in Supabase. Run supabase/live-content.sql.'
          : error.message,
      };
    }

    return {
      ok: true,
      storageMode: 'supabase',
      record: mapRow(row),
    };
  }

  const record: ApplicationRecord = {
    id: randomUUID(),
    name: input.name,
    company: input.company,
    email: input.email,
    message: input.message,
    status: 'new',
    notes: '',
    emailStatus: input.emailStatus,
    emailId: input.emailId || null,
    emailError: input.emailError || null,
    createdAt: now,
    updatedAt: now,
  };

  const existing = await readLocalRecords();
  const saved = await writeLocalRecords([record, ...existing]);
  if (!saved) {
    return { ok: false, storageMode: 'none', error: 'Unable to persist application record on read-only filesystem.' };
  }
  return { ok: true, storageMode: 'local', record };
}

export async function listApplicationRecords(admin: VerifiedAdmin): Promise<{
  ok: boolean;
  records: ApplicationRecord[];
  storageMode: 'supabase' | 'local';
  tableMissing?: boolean;
  error?: string;
}> {
  const sbBundle = getAdminSupabaseClient(admin);
  if (sbBundle) {
    if (sbBundle.error) {
      return { ok: false, records: [], storageMode: 'supabase', error: sbBundle.error };
    }

    const { data, error } = await sbBundle.client
      .from(APPLICATIONS_TABLE)
      .select('id,name,company,email,message,status,notes,email_status,email_id,email_error,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      return {
        ok: false,
        records: [],
        storageMode: 'supabase',
        tableMissing: isMissingTableError(error),
        error: isMissingTableError(error)
          ? 'The irex_applications table has not been created in Supabase yet. Run the updated supabase/live-content.sql script.'
          : error.message,
      };
    }

    return {
      ok: true,
      records: ((data || []) as SupabaseRow[]).map(mapRow),
      storageMode: 'supabase',
    };
  }

  const records = await readLocalRecords();
  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ok: true, records, storageMode: 'local' };
}

export async function updateApplicationRecord(
  id: string,
  patch: { status?: ApplicationStatus; notes?: string },
  admin: VerifiedAdmin,
): Promise<{ ok: boolean; record?: ApplicationRecord; error?: string }> {
  const now = new Date().toISOString();
  const sbBundle = getAdminSupabaseClient(admin);

  if (sbBundle) {
    if (sbBundle.error) return { ok: false, error: sbBundle.error };
    const updates: Record<string, unknown> = { updated_at: now };
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.notes !== undefined) updates.notes = patch.notes.slice(0, 5000);

    const { data, error } = await sbBundle.client
      .from(APPLICATIONS_TABLE)
      .update(updates)
      .eq('id', id)
      .select('id,name,company,email,message,status,notes,email_status,email_id,email_error,created_at,updated_at')
      .maybeSingle();

    if (error || !data) {
      return { ok: false, error: error?.message || 'Application record not found.' };
    }
    return { ok: true, record: mapRow(data as SupabaseRow) };
  }

  const records = await readLocalRecords();
  const idx = records.findIndex((item) => item.id === id);
  if (idx === -1) return { ok: false, error: 'Application record not found.' };
  const current = records[idx];
  const updated: ApplicationRecord = {
    ...current,
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes.slice(0, 5000) } : {}),
    updatedAt: now,
  };
  records[idx] = updated;
  const saved = await writeLocalRecords(records);
  if (!saved) return { ok: false, error: 'Unable to update application record on disk.' };
  return { ok: true, record: updated };
}

export async function deleteApplicationRecord(
  id: string,
  admin: VerifiedAdmin,
): Promise<{ ok: boolean; error?: string }> {
  const sbBundle = getAdminSupabaseClient(admin);
  if (sbBundle) {
    if (sbBundle.error) return { ok: false, error: sbBundle.error };
    const { error } = await sbBundle.client.from(APPLICATIONS_TABLE).delete().eq('id', id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  const records = await readLocalRecords();
  const next = records.filter((item) => item.id !== id);
  if (next.length === records.length) return { ok: false, error: 'Application record not found.' };
  const saved = await writeLocalRecords(next);
  if (!saved) return { ok: false, error: 'Unable to delete application record on disk.' };
  return { ok: true };
}
