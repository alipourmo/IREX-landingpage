import { NextResponse } from 'next/server';
import { getEmailHealth, sendApplicationEmail } from '@/lib/email';
import {
  createApplicationRecord,
  getApplicationsStorageHealth,
  type EmailDeliveryStatus,
} from '@/lib/applications-store';

const attempts = new Map<string, { count: number; resetAt: number }>();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    ...getEmailHealth(),
    ...getApplicationsStorageHealth(),
  });
}

async function verifyTurnstile(token: unknown, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY || TURNSTILE_TEST_SECRET;
  if (!token || typeof token !== 'string') return false;

  const formData = new FormData();
  formData.append('secret', secret);
  formData.append('response', token);
  if (ip !== 'unknown') formData.append('remoteip', ip);

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    body: formData,
  }).catch(() => null);

  if (!response?.ok) return false;
  const data = (await response.json().catch(() => null)) as { success?: boolean } | null;
  return Boolean(data?.success);
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const current = attempts.get(ip);
  if (!current || current.resetAt < now) attempts.set(ip, { count: 1, resetAt: now + 60_000 });
  else {
    current.count += 1;
    if (current.count > 5) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  if (String(body.website || '').trim()) return NextResponse.json({ ok: true });
  const turnstileOk = await verifyTurnstile(body['cf-turnstile-response'], ip);
  if (!turnstileOk) return NextResponse.json({ error: 'Invalid security check' }, { status: 400 });

  const name = String(body.name || '').trim();
  const company = String(body.company || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  if (
    !name ||
    !company ||
    !EMAIL_RE.test(email) ||
    name.length > 120 ||
    company.length > 160 ||
    email.length > 180 ||
    message.length > 3000
  ) {
    return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });
  }

  const result = await sendApplicationEmail({
    name,
    company,
    email,
    message,
  });

  const emailStatus: EmailDeliveryStatus = result.ok
    ? result.mode === 'log'
      ? 'logged'
      : 'sent'
    : result.error === 'Email service is not configured'
      ? 'not_configured'
      : 'failed';

  const recordResult = await createApplicationRecord({
    name,
    company,
    email,
    message,
    emailStatus,
    emailId: result.id,
    emailError: result.ok ? undefined : result.error,
  });

  if (!result.ok && !recordResult.ok) {
    return NextResponse.json(
      { error: result.error || 'Email delivery failed' },
      { status: result.error === 'Email service is not configured' ? 503 : 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    id: result.id,
    mode: result.mode,
    applicationId: recordResult.record?.id || null,
    recorded: recordResult.ok,
    emailStatus,
  });
}
