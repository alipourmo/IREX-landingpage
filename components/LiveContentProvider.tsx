'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import originalContent from '@/lib/landing-content.json';
import { createLiveClient, LIVE_ID, LIVE_TABLE, type LiveConfig, type LiveRow } from './admin/live';
import { validateDocument, type Appearance } from './admin/model';

type LiveContent = { copy: typeof originalContent; appearance: Appearance };
const fallback: LiveContent = { copy: originalContent, appearance: {} };
const LiveContentContext = createContext<LiveContent>(fallback);

export function useSiteContent() {
  return useContext(LiveContentContext);
}

export default function LiveContentProvider({ config, children }: { config: LiveConfig; children: ReactNode }) {
  const [content, setContent] = useState<LiveContent>(fallback);
  const latestRevision = useRef(0);
  const { url, anonKey } = config;

  useEffect(() => {
    const client = createLiveClient({ url, anonKey });
    if (!client) return;
    let active = true;

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

    const channel = client.channel('irex-landing-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: LIVE_TABLE, filter: `id=eq.${LIVE_ID}` }, (payload) => apply(payload.new as LiveRow))
      .subscribe((status) => { if (status === 'SUBSCRIBED') void refresh(); });
    void refresh();
    const interval = window.setInterval(refresh, 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
      void client.removeChannel(channel);
    };
  }, [url, anonKey]);

  return <LiveContentContext.Provider value={content}>{children}</LiveContentContext.Provider>;
}