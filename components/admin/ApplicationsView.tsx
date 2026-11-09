'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Inbox,
  Mail,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import type { ApplicationRecord, ApplicationStatus } from '@/lib/applications-store';

type Counts = {
  all: number;
  new: number;
  reviewed: number;
  contacted: number;
  archived: number;
};

const STATUS_OPTIONS: Array<{ value: ApplicationStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'archived', label: 'Archived' },
];

function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusTagClass(status: ApplicationStatus): string {
  if (status === 'new') return 'ad-tag ad-tag--copper';
  if (status === 'contacted') return 'ad-tag ad-tag--teal';
  if (status === 'reviewed') return 'ad-tag ad-tag--teal';
  return 'ad-tag ad-tag--neutral';
}

function emailTagClass(status: ApplicationRecord['emailStatus']): string {
  if (status === 'sent' || status === 'logged') return 'ad-tag ad-tag--teal';
  if (status === 'failed') return 'ad-tag ad-tag--coral';
  return 'ad-tag ad-tag--neutral';
}

function emailStatusLabel(status: ApplicationRecord['emailStatus']): string {
  switch (status) {
    case 'sent':
      return 'Email sent';
    case 'logged':
      return 'Email logged';
    case 'failed':
      return 'Email failed';
    case 'not_configured':
      return 'Email off';
    default:
      return 'Pending';
  }
}

export function ApplicationsView({
  accessToken,
  onToast,
  onCountsChange,
  refreshTrigger,
}: {
  accessToken?: string | null;
  onToast: (message: string) => void;
  onCountsChange?: (counts: Counts) => void;
  refreshTrigger?: number;
}) {
  const [records, setRecords] = useState<ApplicationRecord[]>([]);
  const [counts, setCounts] = useState<Counts>({ all: 0, new: 0, reviewed: 0, contacted: 0, archived: 0 });
  const [storageMode, setStorageMode] = useState<'supabase' | 'local'>('supabase');
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const authHeaders = useMemo((): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return headers;
  }, [accessToken]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/applications', {
        headers: authHeaders,
        cache: 'no-store',
      });
      const data = (await res.json()) as {
        ok?: boolean;
        records?: ApplicationRecord[];
        counts?: Counts;
        storageMode?: 'supabase' | 'local';
        tableMissing?: boolean;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Unable to load application records.');
      const nextRecords = data.records || [];
      const nextCounts = data.counts || {
        all: nextRecords.length,
        new: nextRecords.filter((r) => r.status === 'new').length,
        reviewed: nextRecords.filter((r) => r.status === 'reviewed').length,
        contacted: nextRecords.filter((r) => r.status === 'contacted').length,
        archived: nextRecords.filter((r) => r.status === 'archived').length,
      };
      setRecords(nextRecords);
      setCounts(nextCounts);
      onCountsChange?.(nextCounts);
      if (data.storageMode) setStorageMode(data.storageMode);
      setTableMissing(Boolean(data.tableMissing));
      if (data.error) setError(data.error);
      setSelectedId((prev) => (prev && nextRecords.some((r) => r.id === prev) ? prev : nextRecords[0]?.id || null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load application records.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, onCountsChange]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords, refreshTrigger]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((record) => {
      if (statusFilter !== 'all' && record.status !== statusFilter) return false;
      if (!q) return true;
      return (
        record.name.toLowerCase().includes(q) ||
        record.company.toLowerCase().includes(q) ||
        record.email.toLowerCase().includes(q) ||
        record.message.toLowerCase().includes(q) ||
        record.notes.toLowerCase().includes(q)
      );
    });
  }, [records, statusFilter, search]);

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) || records.find((r) => r.id === selectedId) || filtered[0] || null,
    [filtered, records, selectedId],
  );

  useEffect(() => {
    setNotesDraft(selected?.notes || '');
    setConfirmDeleteId(null);
    setCopiedEmail(false);
  }, [selected?.id, selected?.notes]);

  async function updateRecord(id: string, patch: { status?: ApplicationStatus; notes?: string }, successMsg: string) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { ok?: boolean; record?: ApplicationRecord; error?: string };
      if (!res.ok || !data.record) throw new Error(data.error || 'Failed to update record.');
      setRecords((prev) => {
        const next = prev.map((item) => (item.id === id ? data.record! : item));
        const nextCounts: Counts = {
          all: next.length,
          new: next.filter((r) => r.status === 'new').length,
          reviewed: next.filter((r) => r.status === 'reviewed').length,
          contacted: next.filter((r) => r.status === 'contacted').length,
          archived: next.filter((r) => r.status === 'archived').length,
        };
        setCounts(nextCounts);
        onCountsChange?.(nextCounts);
        return next;
      });
      onToast(successMsg);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to update application.');
    } finally {
      setSavingId(null);
    }
  }

  async function deleteRecord(id: string) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/applications/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to delete record.');
      setRecords((prev) => {
        const next = prev.filter((item) => item.id !== id);
        const nextCounts: Counts = {
          all: next.length,
          new: next.filter((r) => r.status === 'new').length,
          reviewed: next.filter((r) => r.status === 'reviewed').length,
          contacted: next.filter((r) => r.status === 'contacted').length,
          archived: next.filter((r) => r.status === 'archived').length,
        };
        setCounts(nextCounts);
        onCountsChange?.(nextCounts);
        setSelectedId(next[0]?.id || null);
        return next;
      });
      setConfirmDeleteId(null);
      onToast('Application record removed.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Unable to delete record.');
    } finally {
      setSavingId(null);
    }
  }

  function exportCsv() {
    if (filtered.length === 0) return;
    const header = ['Submitted At', 'Name', 'Company', 'Email', 'Status', 'Email Delivery', 'Message', 'Notes'];
    const lines = [
      header.map(csvCell).join(','),
      ...filtered.map((row) =>
        [
          row.createdAt,
          row.name,
          row.company,
          row.email,
          row.status,
          row.emailStatus,
          row.message,
          row.notes,
        ]
          .map(csvCell)
          .join(','),
      ),
    ];
    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `irex-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    onToast(`Exported ${filtered.length} application${filtered.length === 1 ? '' : 's'} to CSV.`);
  }

  async function copyEmail(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2000);
    } catch {
      onToast('Could not copy email address.');
    }
  }

  const deliveredCount = records.filter((r) => r.emailStatus === 'sent' || r.emailStatus === 'logged').length;

  return (
    <div className="ad-apps-view">
      <div className="ad-kpi-grid">
        <div className="ad-kpi-card">
          <span className="ad-kpi-label">TOTAL RECORDS</span>
          <strong className="ad-kpi-value">{String(counts.all).padStart(2, '0')}</strong>
          <span className="ad-kpi-sub">{storageMode === 'supabase' ? 'Supabase store' : 'Local dev store'}</span>
        </div>
        <div className="ad-kpi-card ad-kpi-card--copper">
          <span className="ad-kpi-label">NEW SUBMISSIONS</span>
          <strong className="ad-kpi-value">{String(counts.new).padStart(2, '0')}</strong>
          <span className="ad-kpi-sub">Awaiting review</span>
        </div>
        <div className="ad-kpi-card">
          <span className="ad-kpi-label">IN PROGRESS</span>
          <strong className="ad-kpi-value">{String(counts.reviewed + counts.contacted).padStart(2, '0')}</strong>
          <span className="ad-kpi-sub">{counts.contacted} contacted</span>
        </div>
        <div className="ad-kpi-card">
          <span className="ad-kpi-label">EMAIL DISPATCHED</span>
          <strong className="ad-kpi-value">{String(deliveredCount).padStart(2, '0')}</strong>
          <span className="ad-kpi-sub">Via Resend / log</span>
        </div>
      </div>

      {error && (
        <div className="ad-banner ad-banner--error" role="alert">
          <AlertCircle size={17} />
          <div>
            <strong>{tableMissing ? 'Database migration required' : 'Could not load application records'}</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!error && storageMode === 'local' && (
        <div className="ad-banner ad-banner--info">
          <Inbox size={17} />
          <div>
            <strong>Local storage active</strong>
            <p>
              Applications submitted on this host are stored in <code>.data/applications.json</code>. Configure Supabase and run{' '}
              <code>supabase/live-content.sql</code> for persistent cloud storage in production.
            </p>
          </div>
        </div>
      )}

      <div className="ad-apps-toolbar">
        <div className="ad-search-box">
          <Search size={15} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, email, or notes…"
            aria-label="Search application records"
          />
        </div>

        <div className="ad-filter-pills" role="group" aria-label="Filter by status">
          {(
            [
              ['all', `All (${counts.all})`],
              ['new', `New (${counts.new})`],
              ['reviewed', `Reviewed (${counts.reviewed})`],
              ['contacted', `Contacted (${counts.contacted})`],
              ['archived', `Archived (${counts.archived})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`ad-filter-pill ${statusFilter === key ? 'is-active' : ''}`}
              onClick={() => setStatusFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ad-toolbar-actions">
          <button type="button" className="ad-button ad-button--secondary" onClick={() => void loadRecords()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'ad-spin' : ''} /> Refresh
          </button>
          <button type="button" className="ad-button ad-button--secondary" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="ad-apps-workspace">
        <section className="ad-apps-list-panel" aria-label="Application submissions">
          <div className="ad-panel-heading">
            <div>
              <h2>Early Adopter Submissions</h2>
              <p>{filtered.length} matching {filtered.length === 1 ? 'record' : 'records'}</p>
            </div>
            <span>{String(filtered.length).padStart(2, '0')}</span>
          </div>

          {loading ? (
            <div className="ad-empty-state">
              <RefreshCw size={22} className="ad-spin" />
              <strong>Loading records…</strong>
              <p>Retrieving submitted applications.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="ad-empty-state">
              <Inbox size={26} />
              <strong>{records.length === 0 ? 'No applications yet' : 'No matching records'}</strong>
              <p>
                {records.length === 0
                  ? 'Submissions from the Early Adopter application modal will appear here automatically.'
                  : 'Try clearing the search query or switching the status filter.'}
              </p>
            </div>
          ) : (
            <div className="ad-apps-list">
              {filtered.map((record) => {
                const active = selected?.id === record.id;
                return (
                  <button
                    key={record.id}
                    type="button"
                    className={`ad-app-row ${active ? 'is-active' : ''}`}
                    onClick={() => setSelectedId(record.id)}
                  >
                    <div className="ad-app-row-top">
                      <strong>{record.name}</strong>
                      <span className={statusTagClass(record.status)}>{record.status}</span>
                    </div>
                    <div className="ad-app-row-meta">
                      <span><Building2 size={12} /> {record.company}</span>
                      <span><Clock size={12} /> {formatDateTime(record.createdAt)}</span>
                    </div>
                    <p className="ad-app-row-snippet">
                      {record.message || 'No message provided.'}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="ad-app-detail-panel" aria-label="Application details">
          {!selected ? (
            <div className="ad-empty-state ad-empty-state--tall">
              <Mail size={28} />
              <strong>Select an application</strong>
              <p>Choose a submission from the list to inspect details, update status, or save reviewer notes.</p>
            </div>
          ) : (
            <>
              <div className="ad-detail-header">
                <div>
                  <div className="ad-detail-tags">
                    <span className={statusTagClass(selected.status)}>{selected.status}</span>
                    <span className={emailTagClass(selected.emailStatus)}>{emailStatusLabel(selected.emailStatus)}</span>
                  </div>
                  <h3>{selected.name}</h3>
                  <p className="ad-detail-company">{selected.company}</p>
                </div>

                <div className="ad-detail-header-actions">
                  <a
                    className="ad-button ad-button--primary"
                    href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent(`IREX Early Adopter Program — ${selected.company}`)}`}
                  >
                    <Send size={14} /> Reply
                  </a>
                </div>
              </div>

              <div className="ad-detail-meta-grid">
                <div>
                  <span>APPLICANT EMAIL</span>
                  <div className="ad-email-copy-row">
                    <strong>{selected.email}</strong>
                    <button type="button" className="ad-inline-copy" onClick={() => void copyEmail(selected.email)}>
                      {copiedEmail ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                </div>
                <div>
                  <span>SUBMITTED</span>
                  <strong>{formatDateTime(selected.createdAt)}</strong>
                </div>
                <div>
                  <span>RECORD ID</span>
                  <strong className="ad-mono-dim">{selected.id}</strong>
                </div>
                <div>
                  <span>EMAIL DISPATCH</span>
                  <strong>{selected.emailId ? `ID: ${selected.emailId}` : selected.emailError || emailStatusLabel(selected.emailStatus)}</strong>
                </div>
              </div>

              <div className="ad-detail-section">
                <span className="ad-detail-section-label">APPLICATION MESSAGE</span>
                <div className="ad-message-box">
                  {selected.message ? selected.message : <span className="ad-muted">No message included with this submission.</span>}
                </div>
              </div>

              <div className="ad-detail-section">
                <span className="ad-detail-section-label">PIPELINE STATUS</span>
                <div className="ad-status-selector">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={savingId === selected.id}
                      className={`ad-status-btn ${selected.status === opt.value ? 'is-selected' : ''}`}
                      onClick={() => void updateRecord(selected.id, { status: opt.value }, `Marked as ${opt.label.toLowerCase()}.`)}
                    >
                      {opt.value === 'archived' ? <Archive size={13} /> : <CheckCircle2 size={13} />}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ad-detail-section">
                <div className="ad-field-label-row">
                  <label htmlFor="ad-record-notes">INTERNAL REVIEWER NOTES</label>
                  <span>{notesDraft.length} / 5000</span>
                </div>
                <textarea
                  id="ad-record-notes"
                  className="ad-notes-textarea"
                  rows={4}
                  maxLength={5000}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Add internal assessment, call notes, or follow-up dates…"
                />
                <div className="ad-detail-footer-actions">
                  <button
                    type="button"
                    className="ad-button ad-button--secondary"
                    disabled={savingId === selected.id || notesDraft === selected.notes}
                    onClick={() => void updateRecord(selected.id, { notes: notesDraft }, 'Reviewer notes saved.')}
                  >
                    Save notes
                  </button>

                  {confirmDeleteId === selected.id ? (
                    <div className="ad-confirm-delete">
                      <span>Delete permanently?</span>
                      <button
                        type="button"
                        className="ad-button ad-button--critical"
                        disabled={savingId === selected.id}
                        onClick={() => void deleteRecord(selected.id)}
                      >
                        Confirm delete
                      </button>
                      <button
                        type="button"
                        className="ad-button ad-button--ghost"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="ad-button ad-button--ghost-critical"
                      onClick={() => setConfirmDeleteId(selected.id)}
                    >
                      <Trash2 size={14} /> Delete record
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
