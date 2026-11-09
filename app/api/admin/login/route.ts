import { NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  SUPABASE_TOKEN_COOKIE,
  cookieOptions,
  getAdminAuthCapabilities,
  signEnvSessionToken,
  signInWithSupabaseCredentials,
  verifyEnvCredentials,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const bucket = attempts.get(ip);
  if (!bucket || bucket.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + 60_000 });
  else {
    bucket.count += 1;
    if (bucket.count > 12) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait a minute.' }, { status: 429 });
    }
  }

  const capabilities = getAdminAuthCapabilities();
  if (!capabilities.configured) {
    return NextResponse.json(
      {
        error:
          'Dashboard authentication is not configured. Configure Supabase Auth or ADMIN_EMAIL + ADMIN_PASSWORD_HASH in environment variables.',
        capabilities,
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === 'string' ? body.email.trim() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // 1. Try Supabase Auth first if configured
  let sbError = '';
  if (capabilities.supabaseConfigured) {
    const sbResult = await signInWithSupabaseCredentials(email, password);
    if (sbResult.admin && sbResult.accessToken && sbResult.refreshToken) {
      const response = NextResponse.json({
        ok: true,
        user: { email: sbResult.admin.email, id: sbResult.admin.userId, mode: 'supabase' },
        session: {
          access_token: sbResult.accessToken,
          refresh_token: sbResult.refreshToken,
        },
      });
      response.cookies.set(SUPABASE_TOKEN_COOKIE, sbResult.accessToken, cookieOptions(request));
      const signed = signEnvSessionToken(sbResult.admin);
      if (signed) response.cookies.set(ADMIN_SESSION_COOKIE, signed, cookieOptions(request));
      return response;
    }
    sbError = sbResult.error || 'Unable to sign in with Supabase.';
  }

  // 2. Try env-configured admin credentials
  if (capabilities.envConfigured) {
    const envAdmin = verifyEnvCredentials(email, password);
    if (envAdmin) {
      const signed = signEnvSessionToken(envAdmin);
      if (!signed) {
        return NextResponse.json({ error: 'Server session signing is unavailable.' }, { status: 500 });
      }
      const response = NextResponse.json({
        ok: true,
        user: { email: envAdmin.email, mode: 'env' },
      });
      response.cookies.set(ADMIN_SESSION_COOKIE, signed, cookieOptions(request));
      response.cookies.delete(SUPABASE_TOKEN_COOKIE);
      return response;
    }
  }

  return NextResponse.json(
    { error: sbError || 'Invalid email or password.' },
    { status: 401 },
  );
}
