import { createClient } from '@supabase/supabase-js';
import { createHash, createHmac, scryptSync, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'irex_admin_session';
export const SUPABASE_TOKEN_COOKIE = 'irex_sb_access_token';
const SESSION_TTL_SEC = 60 * 60 * 12; // 12 hours

type EnvAdminUser = {
  email: string;
  passwordHash?: string;
  password?: string;
};

export type VerifiedAdmin = {
  email: string;
  userId?: string;
  mode: 'supabase' | 'env';
  supabaseAccessToken?: string;
};

function getSupabasePublicConfig() {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !anonKey) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return null;
    return { url: parsed.toString(), anonKey };
  } catch {
    return null;
  }
}

function getEnvAdminUsers(): EnvAdminUser[] {
  const users: EnvAdminUser[] = [];
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const passwordHash = (process.env.ADMIN_PASSWORD_HASH || '').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (email && (passwordHash || password)) {
    users.push({ email, passwordHash: passwordHash || undefined, password: password || undefined });
  }

  const rawJson = (process.env.ADMIN_USERS_JSON || '').trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as Array<{ email?: unknown; passwordHash?: unknown; password?: unknown }>;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item?.email === 'string' && item.email.trim()) {
            users.push({
              email: item.email.trim().toLowerCase(),
              passwordHash: typeof item.passwordHash === 'string' ? item.passwordHash.trim() : undefined,
              password: typeof item.password === 'string' ? item.password : undefined,
            });
          }
        }
      }
    } catch {
      // Ignore malformed JSON
    }
  }

  return users;
}

function getEnvSessionSecret(): string | null {
  const explicit = (process.env.ADMIN_SESSION_SECRET || '').trim();
  if (explicit) return explicit;
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (serviceKey) return createHash('sha256').update(`irex-session:${serviceKey}`).digest('hex');
  const envUsers = getEnvAdminUsers();
  if (envUsers.length > 0) {
    const seed = envUsers.map((u) => `${u.email}:${u.passwordHash || u.password || ''}`).join('|');
    return createHash('sha256').update(`irex-env-session:${seed}`).digest('hex');
  }
  return null;
}

export function getAdminAuthCapabilities() {
  const supabaseConfigured = Boolean(getSupabasePublicConfig());
  const envConfigured = getEnvAdminUsers().length > 0;
  return {
    configured: supabaseConfigured || envConfigured,
    supabaseConfigured,
    envConfigured,
  };
}

function safeEqualText(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

function verifyPasswordAgainstUser(password: string, user: EnvAdminUser): boolean {
  if (user.passwordHash && user.passwordHash.startsWith('scrypt:')) {
    const parts = user.passwordHash.split(':');
    if (parts.length !== 3) return false;
    const [, salt, hex] = parts;
    if (!salt || !hex) return false;
    try {
      const expected = Buffer.from(hex, 'hex');
      const actual = scryptSync(password, salt, expected.length);
      return actual.length === expected.length && timingSafeEqual(actual, expected);
    } catch {
      return false;
    }
  }
  if (user.password) {
    return safeEqualText(password, user.password);
  }
  return false;
}

export function verifyEnvCredentials(email: string, password: string): VerifiedAdmin | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return null;
  const users = getEnvAdminUsers();
  const match = users.find((u) => u.email === normalizedEmail);
  if (!match) return null;
  if (!verifyPasswordAgainstUser(password, match)) return null;
  return { email: match.email, mode: 'env' };
}

export function signEnvSessionToken(admin: VerifiedAdmin): string | null {
  const secret = getEnvSessionSecret();
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      email: admin.email,
      userId: admin.userId,
      mode: admin.mode,
      iat: now,
      exp: now + SESSION_TTL_SEC,
    }),
  ).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyEnvSessionToken(token: string): VerifiedAdmin | null {
  const secret = getEnvSessionSecret();
  if (!secret || !token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;
  const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqualText(signature, expectedSig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      email?: unknown;
      userId?: unknown;
      mode?: unknown;
      exp?: unknown;
    };
    const now = Math.floor(Date.now() / 1000);
    if (typeof parsed.exp !== 'number' || parsed.exp < now) return null;
    if (typeof parsed.email !== 'string' || !parsed.email) return null;
    return {
      email: parsed.email,
      userId: typeof parsed.userId === 'string' ? parsed.userId : undefined,
      mode: parsed.mode === 'supabase' ? 'supabase' : 'env',
    };
  } catch {
    return null;
  }
}

export async function verifySupabaseAccessToken(accessToken: string): Promise<VerifiedAdmin | null> {
  const config = getSupabasePublicConfig();
  if (!config || !accessToken) return null;

  const client = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userData, error: userError } = await client.auth.getUser(accessToken);
  if (userError || !userData.user) return null;

  const { data: editorRow, error: editorError } = await client
    .from('irex_content_editors')
    .select('user_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (editorError || !editorRow) return null;

  return {
    email: userData.user.email || 'editor@irex',
    userId: userData.user.id,
    mode: 'supabase',
    supabaseAccessToken: accessToken,
  };
}

export async function signInWithSupabaseCredentials(email: string, password: string): Promise<{
  admin: VerifiedAdmin | null;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}> {
  const config = getSupabasePublicConfig();
  if (!config) return { admin: null, error: 'Supabase is not configured' };

  const client = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.user || !data.session) {
    return { admin: null, error: 'Invalid email or password.' };
  }

  const authedClient = createClient(config.url, config.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });

  const { data: membership, error: membershipError } = await authedClient
    .from('irex_content_editors')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { admin: null, error: 'This account is not authorized as an IREX editor.' };
  }

  return {
    admin: {
      email: data.user.email || email.trim().toLowerCase(),
      userId: data.user.id,
      mode: 'supabase',
      supabaseAccessToken: data.session.access_token,
    },
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  };
}

export async function getVerifiedAdminFromRequest(request?: Request): Promise<VerifiedAdmin | null> {
  // 1. Check Authorization Bearer token (preferred for Supabase client requests)
  if (request) {
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      const sbAdmin = await verifySupabaseAccessToken(token);
      if (sbAdmin) return sbAdmin;
    }
  }

  // 2. Check cookies
  const cookieStore = await cookies();
  const sbCookie = cookieStore.get(SUPABASE_TOKEN_COOKIE)?.value;
  if (sbCookie) {
    const sbAdmin = await verifySupabaseAccessToken(sbCookie);
    if (sbAdmin) return sbAdmin;
  }

  const envCookie = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (envCookie) {
    const envAdmin = verifyEnvSessionToken(envCookie);
    if (envAdmin) return envAdmin;
  }

  return null;
}

export function cookieOptions(request?: Request, maxAge = SESSION_TTL_SEC) {
  const forwardedProto = request?.headers.get('x-forwarded-proto');
  const isHttps =
    forwardedProto === 'https' ||
    Boolean(request?.url.startsWith('https://')) ||
    process.env.VERCEL === '1';

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isHttps,
    path: '/',
    maxAge,
  };
}
