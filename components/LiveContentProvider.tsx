'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import originalContent from '@/lib/landing-content.json';
import { createLiveClient, LIVE_ID, LIVE_TABLE, type LiveConfig, type LiveRow } from './admin/live';
import { validateDocument, type Appearance, type SiteDocument } from './admin/model';

type LiveContent = { copy: typeof originalContent; appearance: Appearance };
const fallback: LiveContent = { copy: originalContent, appearance: {} };
const LiveContentContext = createContext<LiveContent>(fallback);
const STORAGE_KEY = 'irex-content-studio-v1';

export function useSiteContent() {
  return useContext(LiveContentContext);
}

export default function LiveContentProvider({
  config,
  initialDocument,
  children,
}: {
  config: LiveConfig;
  initialDocument?: SiteDocument;
  children: ReactNode;
}) {
  const [content, setContent] = useState<LiveContent>(() =>
    initialDocument
      ? { copy: initialDocument.content as typeof originalContent, appearance: initialDocument.appearance }
      : fallback,
  );
  const [draftPreview, setDraftPreview] = useState(false);
  const latestRevision = useRef(0);
  const { url, anonKey } = config;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('preview') === 'draft') {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as { content?: unknown; appearance?: unknown };
          const doc = validateDocument({ content: parsed.content, appearance: parsed.appearance }, originalContent);
          if (doc) {
            setContent({ copy: doc.content as typeof originalContent, appearance: doc.appearance });
            setDraftPreview(true);
            return;
          }
        }
      } catch {
        // Ignore invalid local draft
      }
    }

    const client = createLiveClient({ url, anonKey });
    let active = true;

    if (!client) {
      const refreshApi = async () => {
        try {
          const res = await fetch('/api/content', { cache: 'no-store' });
          if (!res.ok || !active) return;
          const data = (await res.json()) as { document?: unknown; revision?: number };
          const doc = validateDocument(data.document, originalContent);
          if (!doc || !active) return;
          setContent({ copy: doc.content as typeof originalContent, appearance: doc.appearance });
        } catch {
          // Ignore transient network errors
        }
      };
      const interval = window.setInterval(refreshApi, 30000);
      return () => {
        active = false;
        window.clearInterval(interval);
      };
    }

    const apply = (row: LiveRow | null) => {
      if (!active || !row || !Number.isSafeInteger(row.revision) || row.revision < latestRevision.current) return;
      const document = validateDocument(row.document, originalContent);
      if (!document) return;
      latestRevision.current = row.revision;
      setContent({ copy: document.content as typeof originalContent, appearance: document.appearance });
    };

    const refresh = async () => {
      const { data } = await client.from(LIVE_TABLE).select('id,document,revision').eq('id', LIVE_ID).maybeSingle();
      apply(data as LiveRow | null);
    };

    const channel = client
      .channel('irex-landing-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: LIVE_TABLE, filter: `id=eq.${LIVE_ID}` },
        (payload) => apply(payload.new as LiveRow),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void refresh();
      });
    void refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
      void client.removeChannel(channel);
    };
  }, [url, anonKey]);

  return (
    <LiveContentContext.Provider value={content}>
      {children}
      {draftPreview && (
        <div
          style={{
            position: 'fixed',
            left: 20,
            bottom: 20,
            zIndex: 150,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 999,
            border: '1px solid rgba(201, 122, 50, 0.55)',
            background: 'rgba(16, 25, 35, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#F5F7FA',
            fontFamily: "'DM Mono', monospace",
            fontSize: 12,
            letterSpacing: '0.04em',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)',
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#D48B48' }} />
          <span>DRAFT PREVIEW — NOT YET PUBLISHED</span>
        </div>
      )}
    </LiveContentContext.Provider>
  );
}
