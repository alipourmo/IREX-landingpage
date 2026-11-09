import { NextResponse } from 'next/server';
import { getVerifiedAdminFromRequest } from '@/lib/admin-auth';
import { getLiveSiteDocument, saveLiveSiteDocument } from '@/lib/content-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await getLiveSiteDocument();
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const admin = await getVerifiedAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    document?: unknown;
    revision?: unknown;
  } | null;

  if (!body || !('document' in body)) {
    return NextResponse.json({ error: 'Missing document payload.' }, { status: 400 });
  }

  const expectedRevision = typeof body.revision === 'number' ? body.revision : undefined;
  const saved = await saveLiveSiteDocument(body.document, admin, expectedRevision);

  if (!saved.ok) {
    return NextResponse.json(
      { error: saved.error || 'Failed to save live content.', conflict: Boolean(saved.conflict) },
      { status: saved.conflict ? 409 : 400 },
    );
  }

  return NextResponse.json(saved);
}
