import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, SUPABASE_TOKEN_COOKIE } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ADMIN_SESSION_COOKIE);
  response.cookies.delete(SUPABASE_TOKEN_COOKIE);
  return response;
}
