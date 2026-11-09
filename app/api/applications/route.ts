import { NextResponse } from 'next/server';
import { getVerifiedAdminFromRequest } from '@/lib/admin-auth';
import { listApplicationRecords } from '@/lib/applications-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const admin = await getVerifiedAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await listApplicationRecords(admin);
  const counts = {
    all: result.records.length,
    new: result.records.filter((r) => r.status === 'new').length,
    reviewed: result.records.filter((r) => r.status === 'reviewed').length,
    contacted: result.records.filter((r) => r.status === 'contacted').length,
    archived: result.records.filter((r) => r.status === 'archived').length,
  };

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status') || 'all';
  const query = (url.searchParams.get('q') || '').trim().toLowerCase();

  let filtered = result.records;
  if (statusFilter !== 'all') {
    filtered = filtered.filter((r) => r.status === statusFilter);
  }
  if (query) {
    filtered = filtered.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.company.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query) ||
        r.message.toLowerCase().includes(query) ||
        r.notes.toLowerCase().includes(query),
    );
  }

  return NextResponse.json({
    ok: result.ok,
    records: filtered,
    counts,
    storageMode: result.storageMode,
    tableMissing: Boolean(result.tableMissing),
    error: result.error,
  });
}
