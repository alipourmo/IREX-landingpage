import { NextResponse } from 'next/server';
import { getVerifiedAdminFromRequest } from '@/lib/admin-auth';
import {
  deleteApplicationRecord,
  isValidApplicationStatus,
  updateApplicationRecord,
} from '@/lib/applications-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getVerifiedAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing application ID' }, { status: 400 });

  const body = (await request.json().catch(() => null)) as {
    status?: unknown;
    notes?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });

  const patch: { status?: 'new' | 'reviewed' | 'contacted' | 'archived'; notes?: string } = {};
  if (body.status !== undefined) {
    if (!isValidApplicationStatus(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (body.notes !== undefined) {
    if (typeof body.notes !== 'string' || body.notes.length > 5000) {
      return NextResponse.json({ error: 'Invalid notes' }, { status: 400 });
    }
    patch.notes = body.notes;
  }

  const result = await updateApplicationRecord(id, patch, admin);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Failed to update record' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, record: result.record });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await getVerifiedAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing application ID' }, { status: 400 });

  const result = await deleteApplicationRecord(id, admin);
  if (!result.ok) {
    return NextResponse.json({ error: result.error || 'Failed to delete record' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
