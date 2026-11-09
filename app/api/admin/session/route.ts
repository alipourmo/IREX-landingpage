import { NextResponse } from 'next/server';
import {
  SUPABASE_TOKEN_COOKIE,
  cookieOptions,
  getAdminAuthCapabilities,
  getVerifiedAdminFromRequest,
  verifySupabaseAccessToken,
} from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const capabilities = getAdminAuthCapabilities();
  const admin = await getVerifiedAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ authenticated: false, capabilities });
  }
  return NextResponse.json({
    authenticated: true,
    user: { email: admin.email, id: admin.userId, mode: admin.mode },
    capabilities,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { accessToken?: unknown } | null;
  const token = typeof body?.accessToken === 'string' ? body.accessToken.trim() : '';
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const verified = await verifySupabaseAccessToken(token);
  if (!verified) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const response = NextResponse.json({
    authenticated: true,
    user: { email: verified.email, id: verified.userId, mode: verified.mode },
  });
  response.cookies.set(SUPABASE_TOKEN_COOKIE, token, cookieOptions(request));
  return response;
}
