'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  Eye,
  EyeOff,
  FileClock,
  FileText,
  Globe2,
  History,
  Inbox,
  LayoutPanelTop,
  LockKeyhole,
  LogOut,
  Menu,
  Monitor,
  Palette,
  PanelTop,
  Radio,
  RotateCcw,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { sections, type Content } from './sections';
import {
  cloneDocument,
  colorOptions,
  fontOptions,
  stableSerialize,
  textAppearance,
  typeScale,
  validateDocument,
  type Appearance,
  type SiteDocument,
  type TextAppearance,
} from './model';
import { createLiveClient, LIVE_ID, LIVE_TABLE, type LiveConfig, type LiveRow } from './live';
import { SitePreview, type PreviewDevice } from './SitePreview';
import { ApplicationsView } from './ApplicationsView';
import './admin.css';

type Revision = { id: string; savedAt: string; content: Content; appearance: Appearance };
type Dialog = 'preview' | 'backups' | 'history' | 'publish' | 'conflict' | null;
type WorkspaceView = 'editor' | 'applications';

export type AdminUserInfo = {
  email: string;
  id?: string;
  mode: 'supabase' | 'env';
};

export type AuthCapabilities = {
  configured: boolean;
  supabaseConfigured: boolean;
  envConfigured: boolean;
};

type InitialLiveDocument = {
  document: SiteDocument;
  revision: number;
  updatedAt: string | null;
  source: string;
};

const STORAGE_KEY = 'irex-content-studio-v1';

function formatSavedAt(value: string | null): string {
  if (!value) return 'Original website copy';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved in this browser';
  return `Saved ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function DeviceToggle({ device, onChange }: { device: PreviewDevice; onChange: (device: PreviewDevice) => void }) {
  return (
    <div className="ad-device-toggle" aria-label="Preview size">
      <button
        type="button"
        className={device === 'desktop' ? 'is-active' : ''}
        onClick={() => onChange('desktop')}
        aria-label="Desktop preview"
        aria-pressed={device === 'desktop'}
        title="Desktop preview"
      >
        <Monitor size={15} />
      </button>
      <button
        type="button"
        className={device === 'mobile' ? 'is-active' : ''}
        onClick={() => onChange('mobile')}
        aria-label="Mobile preview"
        aria-pressed={device === 'mobile'}
        title="Mobile preview"
      >
        <Smartphone size={15} />
      </button>
    </div>
  );
}

export default function AdminDashboard({
  initialContent,
  initialLiveDocument,
  initialUser,
  authCapabilities,
  liveConfig,
}: {
  initialContent: Content;
  initialLiveDocument?: InitialLiveDocument;
  initialUser: AdminUserInfo | null;
  authCapabilities: AuthCapabilities;
  liveConfig?: LiveConfig;
}) {
  const original = useMemo<SiteDocument>(() => ({ content: initialContent, appearance: {} }), [initialContent]);
  const baseline = useMemo<SiteDocument>(
    () => (initialLiveDocument?.document ? cloneDocument(initialLiveDocument.document) : cloneDocument(original)),
    [initialLiveDocument, original],
  );

  const [user, setUser] = useState<AdminUserInfo | null>(initialUser);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeView, setActiveView] = useState<WorkspaceView>('editor');
  const [newApplicationsCount, setNewApplicationsCount] = useState<number | null>(null);
  const [appsRefreshTick, setAppsRefreshTick] = useState(0);

  const [draft, setDraft] = useState<Content>(() => cloneDocument(baseline).content);
  const [appearance, setAppearance] = useState<Appearance>(() => cloneDocument(baseline).appearance);
  const [saved, setSaved] = useState<Content>(() => cloneDocument(baseline).content);
  const [savedAppearance, setSavedAppearance] = useState<Appearance>(() => cloneDocument(baseline).appearance);
  const [savedAt, setSavedAt] = useState<string | null>(initialLiveDocument?.updatedAt || null);
  const [history, setHistory] = useState<Revision[]>([]);

  const [selectedId, setSelectedId] = useState('hero');
  const [selectedField, setSelectedField] = useState('heading');
  const [editorTab, setEditorTab] = useState<'content' | 'appearance'>('content');
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [conflictRemote, setConflictRemote] = useState<{ document: SiteDocument; revision: number } | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveState, setLiveState] = useState<'offline' | 'saving' | 'synced' | 'error'>('offline');
  const [liveError, setLiveError] = useState('');
  const [publishingServer, setPublishingServer] = useState(false);
  const [syncTick, setSyncTick] = useState(0);
  const [liveRevNumber, setLiveRevNumber] = useState<number>(initialLiveDocument?.revision || 0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');

  const fileInput = useRef<HTMLInputElement>(null);
  const editorTop = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Revision[]>([]);
  const liveRevision = useRef(initialLiveDocument?.revision || 0);
  const liveSnapshot = useRef(
    initialLiveDocument?.document ? stableSerialize(initialLiveDocument.document) : '',
  );
  const liveWriteInFlight = useRef(false);
  const liveGeneration = useRef(0);

  const liveUrl = liveConfig?.url;
  const liveAnonKey = liveConfig?.anonKey;
  const liveClient = useMemo(() => createLiveClient({ url: liveUrl, anonKey: liveAnonKey }), [liveUrl, liveAnonKey]);

  const selected = sections.find((section) => section.id === selectedId) || sections[0];
  const field = selected.fields.find((item) => item.key === selectedField) || selected.fields[0];
  const fieldStyle = appearance[selected.id]?.[field.key] || {};
  const sectionNumber = sections.findIndex((section) => section.id === selected.id) + 1;

  const isDirty = useMemo(
    () =>
      stableSerialize({ content: draft, appearance }) !==
      stableSerialize({ content: saved, appearance: savedAppearance }),
    [draft, appearance, saved, savedAppearance],
  );

  const sectionIsDirty =
    stableSerialize(draft[selected.id]) !== stableSerialize(saved[selected.id]) ||
    stableSerialize(appearance[selected.id] || {}) !== stableSerialize(savedAppearance[selected.id] || {});

  const changedCount = sections.filter(
    (section) =>
      stableSerialize(draft[section.id]) !== stableSerialize(saved[section.id]) ||
      stableSerialize(appearance[section.id] || {}) !== stableSerialize(savedAppearance[section.id] || {}),
  ).length;

  const hasLiveUnpublishedChanges = useMemo(() => {
    if (!liveSnapshot.current) return stableSerialize({ content: draft, appearance }) !== stableSerialize(original);
    return stableSerialize({ content: draft, appearance }) !== liveSnapshot.current;
  }, [draft, appearance, original]);

  // Load local browser drafts/history on mount
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { content?: unknown; appearance?: unknown; savedAt?: unknown; history?: unknown };
      const document = validateDocument({ content: parsed.content, appearance: parsed.appearance }, initialContent);
      if (!document) return;

      const localHasChangesVsOriginal = stableSerialize(document) !== stableSerialize(original);
      const liveExists = Boolean(initialLiveDocument?.document);
      const localMatchesLive = liveExists && stableSerialize(document) === stableSerialize(initialLiveDocument!.document);

      // Prefer live document if local storage just mirrors stale original copy
      if (liveExists && !localHasChangesVsOriginal && !localMatchesLive) {
        setDraft(cloneDocument(initialLiveDocument!.document).content);
        setAppearance(cloneDocument(initialLiveDocument!.document).appearance);
      } else {
        setDraft(document.content);
        setAppearance(document.appearance);
        setSaved(cloneDocument(document).content);
        setSavedAppearance(cloneDocument(document).appearance);
        setSavedAt(typeof parsed.savedAt === 'string' ? parsed.savedAt : null);
      }

      if (Array.isArray(parsed.history)) {
        const validHistory = parsed.history
          .flatMap((entry: { id?: unknown; savedAt?: unknown; content?: unknown; appearance?: unknown }) => {
            const version = validateDocument({ content: entry?.content, appearance: entry?.appearance }, initialContent);
            return version && typeof entry.id === 'string' && typeof entry.savedAt === 'string'
              ? [{ id: entry.id, savedAt: entry.savedAt, ...version }]
              : [];
          })
          .slice(0, 8);
        historyRef.current = validHistory;
        setHistory(validHistory);
      }
    } catch {
      setToast('Your saved draft could not be loaded. Live copy is shown.');
    }
  }, [initialContent, initialLiveDocument, original]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !connecting) {
        setDialog(null);
        setSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [connecting]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty || liveState === 'saving') event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty, liveState]);

  const persistDraft = useCallback((document: SiteDocument): boolean => {
    const now = new Date().toISOString();
    const clean = cloneDocument(document);
    const nextHistory = [{ id: `${Date.now()}`, savedAt: now, ...clean }, ...historyRef.current].slice(0, 8);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...clean, savedAt: now, history: nextHistory }));
      historyRef.current = nextHistory;
      setSaved(clean.content);
      setSavedAppearance(clean.appearance);
      setSavedAt(now);
      setHistory(nextHistory);
      return true;
    } catch {
      return false;
    }
  }, []);

  // Load initial application count badge when authenticated
  useEffect(() => {
    if (!user) return;
    let active = true;
    const headers: Record<string, string> = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
    fetch('/api/applications', { headers, cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { counts?: { new?: number } } | null) => {
        if (active && typeof data?.counts?.new === 'number') {
          setNewApplicationsCount(data.counts.new);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, accessToken]);

  // Keep Supabase token refreshed and subscribe to new applications if liveClient is connected
  useEffect(() => {
    if (!liveClient || !liveConnected) return;
    const { data: authSub } = liveClient.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        setAccessToken(session.access_token);
        void fetch('/api/admin/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: session.access_token }),
        }).catch(() => {});
      }
    });

    const appChannel = liveClient
      .channel('irex-admin-applications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'irex_applications' }, () => {
        setAppsRefreshTick((t) => t + 1);
      })
      .subscribe();

    return () => {
      authSub.subscription.unsubscribe();
      void liveClient.removeChannel(appChannel);
    };
  }, [liveClient, liveConnected]);

  // Live Supabase auto-sync when connected directly with liveClient
  useEffect(() => {
    if (!liveConnected || !liveClient || !user) return;
    const document = cloneDocument({ content: draft, appearance });
    const snapshot = stableSerialize(document);
    if (snapshot === liveSnapshot.current) return;
    const generation = liveGeneration.current;

    const timer = window.setTimeout(async () => {
      if (liveWriteInFlight.current) return;
      liveWriteInFlight.current = true;
      setLiveState('saving');
      try {
        const revision = liveRevision.current;
        const now = new Date().toISOString();
        const mutation =
          revision === 0
            ? liveClient.from(LIVE_TABLE).insert({ id: LIVE_ID, document, revision: 1, updated_at: now })
            : liveClient
                .from(LIVE_TABLE)
                .update({ document, revision: revision + 1, updated_at: now })
                .eq('id', LIVE_ID)
                .eq('revision', revision);

        const { data, error } = await mutation.select('revision').maybeSingle();
        if (error) {
          throw new Error(
            error.code === '23505'
              ? 'Another editor changed the live page. Reconnect to review the latest version.'
              : error.message,
          );
        }
        if (!data || typeof data.revision !== 'number') {
          throw new Error('The live page changed elsewhere or this account cannot update it. Reconnect to review the latest version.');
        }
        if (generation !== liveGeneration.current) return;
        liveRevision.current = data.revision;
        setLiveRevNumber(data.revision);
        liveSnapshot.current = snapshot;
        if (!persistDraft(document)) {
          setSaved(document.content);
          setSavedAppearance(document.appearance);
          setSavedAt(now);
          setToast('The live site was updated, but a local backup could not be saved.');
        }
        setLiveState('synced');
      } catch (error) {
        if (generation !== liveGeneration.current) return;
        setLiveConnected(false);
        setLiveState('error');
        setLiveError(error instanceof Error ? error.message : 'Live sync stopped. Your draft is still saved locally.');
        setDialog('publish');
      } finally {
        liveWriteInFlight.current = false;
        if (generation === liveGeneration.current) setSyncTick((value) => value + 1);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [draft, appearance, liveConnected, liveClient, persistDraft, syncTick, user]);

  useEffect(() => () => {
    liveGeneration.current += 1;
    void liveClient?.auth.signOut({ scope: 'local' });
  }, [liveClient]);

  const hydrateLiveAfterAuth = useCallback(
    async (client: NonNullable<typeof liveClient>) => {
      const { data: row, error: readError } = await client
        .from(LIVE_TABLE)
        .select('id,document,revision')
        .eq('id', LIVE_ID)
        .maybeSingle();

      if (readError) throw new Error('Unable to load live content. Check database setup and permissions.');

      const existing = row as LiveRow | null;
      const currentDoc: SiteDocument = { content: draft, appearance };
      const currentSerialized = stableSerialize(currentDoc);
      const originalSerialized = stableSerialize(original);

      if (existing) {
        const remote = validateDocument(existing.document, initialContent);
        if (!remote || !Number.isSafeInteger(existing.revision) || existing.revision < 1) {
          throw new Error('The live content has an incompatible format.');
        }

        liveRevision.current = existing.revision;
        setLiveRevNumber(existing.revision);
        liveSnapshot.current = stableSerialize(remote);

        if (stableSerialize(remote) !== currentSerialized) {
          const userActuallyModifiedLocal = currentSerialized !== originalSerialized && currentSerialized !== stableSerialize(baseline);
          if (!userActuallyModifiedLocal) {
            // Safe: user has not made local edits, load live website copy cleanly
            setDraft(remote.content);
            setAppearance(remote.appearance);
            persistDraft(remote);
          } else {
            // Show non-destructive conflict resolution modal instead of window.confirm
            setConflictRemote({ document: remote, revision: existing.revision });
            setDialog('conflict');
            return false;
          }
        }
      } else {
        liveRevision.current = 0;
        setLiveRevNumber(0);
        liveSnapshot.current = '';
      }

      liveGeneration.current += 1;
      setLiveConnected(true);
      setLiveState(existing ? 'synced' : 'saving');
      return true;
    },
    [appearance, baseline, draft, initialContent, original, persistDraft],
  );

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true);
    setLoginError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        user?: AdminUserInfo;
        session?: { access_token: string; refresh_token: string };
      };

      if (!res.ok || !data.ok || !data.user) {
        throw new Error(data.error || 'Unable to sign in.');
      }

      setLoginPassword('');
      setUser(data.user);

      if (data.user.mode === 'supabase' && data.session && liveClient) {
        setAccessToken(data.session.access_token);
        const { error: sessionError } = await liveClient.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (!sessionError) {
          try {
            const connected = await hydrateLiveAfterAuth(liveClient);
            if (connected) setToast('Signed in. Live sync is active.');
          } catch (syncErr) {
            setLiveError(syncErr instanceof Error ? syncErr.message : 'Live sync unavailable.');
            setLiveState('error');
          }
        }
      } else {
        setToast(`Signed in as ${data.user.email}`);
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleSignOut() {
    liveGeneration.current += 1;
    setLiveConnected(false);
    setLiveState('offline');
    setAccessToken(null);
    await liveClient?.auth.signOut({ scope: 'local' });
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
    setDialog(null);
  }

  async function reconnectLiveStream(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!liveClient || connecting) return;
    setConnecting(true);
    setLiveError('');

    try {
      const { data: auth, error: authError } = await liveClient.auth.signInWithPassword({
        email: (loginEmail || user?.email || '').trim(),
        password: loginPassword,
      });
      if (authError || !auth.user || !auth.session) {
        throw new Error('Unable to sign in. Check your editor email and password.');
      }
      const { data: membership, error: membershipError } = await liveClient
        .from('irex_content_editors')
        .select('user_id')
        .eq('user_id', auth.user.id)
        .maybeSingle();

      if (membershipError || !membership) {
        throw new Error('This account is not authorized to edit the IREX site.');
      }

      setAccessToken(auth.session.access_token);
      await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: auth.session.access_token }),
      }).catch(() => {});

      const connected = await hydrateLiveAfterAuth(liveClient);
      setLoginPassword('');
      if (connected) {
        setDialog(null);
        setToast('Live sync reconnected.');
      }
    } catch (err) {
      await liveClient.auth.signOut({ scope: 'local' });
      setLiveState('error');
      setLiveError(err instanceof Error ? err.message : 'Could not connect live sync.');
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectLive() {
    if (liveState === 'saving') return;
    liveGeneration.current += 1;
    setLiveConnected(false);
    setLiveState('offline');
    setLiveError('');
    await liveClient?.auth.signOut({ scope: 'local' });
    setDialog(null);
    setToast('Live sync paused. Drafts remain saved in this browser.');
  }

  async function publishViaServer() {
    if (publishingServer) return;
    setPublishingServer(true);
    setLiveError('');
    try {
      const document = cloneDocument({ content: draft, appearance });
      const res = await fetch('/api/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ document, revision: liveRevision.current || undefined }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        revision?: number;
        updatedAt?: string;
        source?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Unable to publish changes.');
      }
      if (typeof data.revision === 'number') {
        liveRevision.current = data.revision;
        setLiveRevNumber(data.revision);
      }
      liveSnapshot.current = stableSerialize(document);
      persistDraft(document);
      setLiveState('synced');
      setToast(`Published to live site${data.revision ? ` (rev ${data.revision})` : ''}.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publish failed.';
      setLiveError(message);
      setToast(message);
    } finally {
      setPublishingServer(false);
    }
  }

  function updateField(key: string, value: string) {
    setDraft((current) => ({ ...current, [selected.id]: { ...current[selected.id], [key]: value } }));
  }

  function updateAppearance(patch: Partial<TextAppearance>) {
    setAppearance((current) => {
      const next = { ...current };
      const section = { ...(next[selected.id] || {}) };
      const style = { ...(section[field.key] || {}), ...patch };
      for (const key of Object.keys(style) as Array<keyof TextAppearance>) {
        if (style[key] === undefined) delete style[key];
      }
      if (Object.keys(style).length) section[field.key] = style;
      else delete section[field.key];
      if (Object.keys(section).length) next[selected.id] = section;
      else delete next[selected.id];
      return next;
    });
  }

  function saveDraft() {
    if (!isDirty) return;
    setToast(
      persistDraft({ content: draft, appearance })
        ? liveConnected
          ? 'Draft saved. Live sync is applying your changes.'
          : 'Draft saved in this browser.'
        : 'Could not save draft. Check browser storage settings.',
    );
  }

  function selectSection(id: string) {
    const section = sections.find((item) => item.id === id);
    setSelectedId(id);
    setSelectedField(section?.fields.find((item) => item.key === 'heading')?.key || section?.fields[0].key || '');
    setSidebarOpen(false);
    editorTop.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function resetSection() {
    if (!sectionIsDirty) return;
    setDraft((current) => ({ ...current, [selected.id]: { ...saved[selected.id] } }));
    setAppearance((current) => {
      const next = { ...current };
      if (savedAppearance[selected.id]) next[selected.id] = { ...savedAppearance[selected.id] };
      else delete next[selected.id];
      return next;
    });
    setToast('Section restored to last saved state.');
  }

  function exportContent() {
    const blob = new Blob([`${JSON.stringify({ content: draft, appearance }, null, 2)}\n`], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'irex-site-content.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Content and appearance exported.');
  }

  async function importContent(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const document = validateDocument(JSON.parse(await file.text()), initialContent);
      if (!document) throw new Error('Invalid content');
      setDraft(document.content);
      setAppearance(document.appearance);
      setDialog(null);
      setSelectedId('hero');
      setSelectedField('heading');
      setToast(liveConnected ? 'Content imported. Live sync will apply it.' : 'Content imported into draft.');
    } catch {
      setToast('This is not a valid IREX content file.');
    }
  }

  function restoreRevision(revision: Revision) {
    const document = cloneDocument(revision);
    setDraft(document.content);
    setAppearance(document.appearance);
    setDialog(null);
    setToast(liveConnected ? 'Version restored and syncing live.' : 'Version restored into draft.');
  }

  function restoreOriginal() {
    const document = cloneDocument(original);
    setDraft(document.content);
    setAppearance(document.appearance);
    setDialog(null);
    setToast(liveConnected ? 'Original copy restored and syncing live.' : 'Original copy restored into draft.');
  }

  function resolveConflict(choice: 'load-live' | 'publish-draft') {
    if (!conflictRemote) return;
    if (choice === 'load-live') {
      const clean = cloneDocument(conflictRemote.document);
      setDraft(clean.content);
      setAppearance(clean.appearance);
      persistDraft(clean);
      liveRevision.current = conflictRemote.revision;
      setLiveRevNumber(conflictRemote.revision);
      liveSnapshot.current = stableSerialize(clean);
      liveGeneration.current += 1;
      setLiveConnected(true);
      setLiveState('synced');
      setToast('Loaded latest live website copy.');
    } else {
      liveRevision.current = conflictRemote.revision;
      setLiveRevNumber(conflictRemote.revision);
      liveSnapshot.current = stableSerialize(conflictRemote.document);
      liveGeneration.current += 1;
      setLiveConnected(true);
      setLiveState('saving');
      setToast('Publishing your local draft to the live site…');
    }
    setConflictRemote(null);
    setDialog(null);
  }

  // =========================================================================
  // LOGIN GATE (Unauthenticated)
  // =========================================================================
  if (!user) {
    return (
      <div className="ad-login-shell">
        <div className="ad-login-glow" aria-hidden="true" />
        <div className="ad-login-card">
          <div className="ad-login-brand">
            <img src="/brand/irex-logo-dark.png" alt="IREX" />
            <span className="ad-tag ad-tag--teal">CONTENT STUDIO</span>
          </div>

          <div className="ad-login-copy">
            <h1>
              Decision Intelligence <br />
              <span>Workspace.</span>
            </h1>
            <p>
              Sign in with an authorized IREX editor account to update live website copy, typography, and Early Adopter
              application records.
            </p>
          </div>

          {!authCapabilities.configured && (
            <div className="ad-banner ad-banner--warning">
              <AlertTriangle size={17} />
              <div>
                <strong>Authentication setup required</strong>
                <p>
                  Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> + <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (with{' '}
                  <code>supabase/live-content.sql</code>) or set <code>ADMIN_EMAIL</code> +{' '}
                  <code>ADMIN_PASSWORD_HASH</code> in environment variables.
                </p>
              </div>
            </div>
          )}

          <form className="ad-login-form" onSubmit={handleLoginSubmit}>
            <div className="ad-field">
              <div className="ad-field-label-row">
                <label htmlFor="ad-login-email">Editor email</label>
                <span>AUTHORIZED ACCOUNT</span>
              </div>
              <input
                id="ad-login-email"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                disabled={loggingIn || !authCapabilities.configured}
              />
            </div>

            <div className="ad-field">
              <div className="ad-field-label-row">
                <label htmlFor="ad-login-password">Password</label>
                <span>ENCRYPTED SESSION</span>
              </div>
              <div className="ad-password-wrap">
                <input
                  id="ad-login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={loggingIn || !authCapabilities.configured}
                />
                <button
                  type="button"
                  className="ad-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="ad-login-error" role="alert">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="ad-button ad-button--primary ad-button--lg ad-login-submit"
              disabled={loggingIn || !authCapabilities.configured || !loginEmail.trim() || !loginPassword}
            >
              <ShieldCheck size={16} />
              {loggingIn ? 'Verifying credentials…' : 'Sign in to workspace'}
              <ArrowRight size={15} />
            </button>
          </form>

          <div className="ad-login-footer">
            <span>
              <LockKeyhole size={13} /> Protected by IREX access policy
            </span>
            <Link href="/">
              Return to website <ArrowUpRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // AUTHENTICATED WORKSPACE
  // =========================================================================
  const initials = user.email.slice(0, 2).toUpperCase();

  return (
    <div className="ad-app">
      {sidebarOpen && (
        <button className="ad-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />
      )}

      <aside className={`ad-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="ad-brand">
          <img src="/brand/irex-logo-dark.png" alt="IREX" />
          <span>STUDIO v2</span>
        </div>

        <div className="ad-workspace">
          <div className="ad-workspace-mark">
            <Globe2 size={16} />
          </div>
          <div>
            <strong>IREX Platform</strong>
            <span>{user.mode === 'supabase' ? 'Supabase connected' : 'Workspace mode'}</span>
          </div>
        </div>

        <nav className="ad-primary-nav" aria-label="Workspace navigation">
          <p>WORKSPACE</p>
          <button
            type="button"
            className={activeView === 'editor' ? 'is-active' : ''}
            onClick={() => {
              setActiveView('editor');
              setDialog(null);
              setSidebarOpen(false);
            }}
          >
            <LayoutPanelTop size={16} />
            <span>Landing page</span>
            {activeView === 'editor' && <ChevronRight className="ad-nav-chevron" size={15} />}
          </button>

          <button
            type="button"
            className={activeView === 'applications' ? 'is-active' : ''}
            onClick={() => {
              setActiveView('applications');
              setDialog(null);
              setSidebarOpen(false);
            }}
          >
            <Inbox size={16} />
            <span>Application records</span>
            {typeof newApplicationsCount === 'number' && newApplicationsCount > 0 && (
              <span className="ad-nav-badge">{newApplicationsCount}</span>
            )}
          </button>

          <p className="ad-nav-group">TOOLS</p>
          <button
            type="button"
            onClick={() => {
              setActiveView('editor');
              setDialog('preview');
              setSidebarOpen(false);
            }}
          >
            <Eye size={16} />
            <span>Preview section</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDialog('history');
              setSidebarOpen(false);
            }}
          >
            <History size={16} />
            <span>Version history</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDialog('publish');
              setSidebarOpen(false);
            }}
          >
            <Radio size={16} />
            <span>Live sync</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setDialog('backups');
              setSidebarOpen(false);
            }}
          >
            <FileText size={16} />
            <span>Import &amp; export</span>
          </button>
        </nav>

        <div className="ad-sidebar-bottom">
          <div className="ad-site-card">
            <span className="ad-site-card-label">
              <i /> REASONING FIRST
            </span>
            <strong>Computational Geological Reasoning™</strong>
            <p>Inspect live production copy and early adopter submissions.</p>
            <a href="/" target="_blank" rel="noreferrer">
              Open live site <ArrowUpRight size={13} />
            </a>
          </div>

          <div className="ad-sidebar-profile">
            <div className="ad-profile-avatar">{initials}</div>
            <div className="ad-profile-info">
              <strong title={user.email}>{user.email}</strong>
              <span>Authorized editor</span>
            </div>
            <button
              type="button"
              className="ad-icon-button"
              onClick={() => void handleSignOut()}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="ad-workspace-main">
        <header className="ad-topbar">
          <button
            type="button"
            className="ad-mobile-menu ad-icon-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={19} />
          </button>

          <div className="ad-breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{activeView === 'editor' ? 'Landing page' : 'Application records'}</strong>
          </div>

          <div className="ad-topbar-right">
            <span className={`ad-tag ${liveConnected ? 'ad-tag--teal' : liveState === 'error' ? 'ad-tag--coral' : 'ad-tag--copper'}`}>
              {liveConnected
                ? liveState === 'saving'
                  ? 'Syncing live'
                  : `Live sync${liveRevNumber ? ` · rev ${liveRevNumber}` : ''}`
                : user.mode === 'supabase'
                  ? 'Authenticated'
                  : 'Server mode'}
            </span>

            <a className="ad-top-link" href="/?preview=draft" target="_blank" rel="noreferrer">
              Draft preview <ExternalLink size={13} />
            </a>
            <a className="ad-top-link" href="/" target="_blank" rel="noreferrer">
              Live site <ArrowUpRight size={13} />
            </a>
          </div>
        </header>

        <main className="ad-main">
          {activeView === 'applications' ? (
            <>
              <div className="ad-page-heading">
                <div>
                  <span className="ad-tag ad-tag--copper">EARLY ADOPTER PIPELINE</span>
                  <h1>Application records</h1>
                  <p>Review incoming Foundation Partner applications, update status, and record assessment notes.</p>
                </div>
              </div>
              <ApplicationsView
                accessToken={accessToken}
                onToast={setToast}
                onCountsChange={(c) => setNewApplicationsCount(c.new)}
                refreshTrigger={appsRefreshTick}
              />
            </>
          ) : (
            <>
              <div className="ad-page-heading">
                <div>
                  <span className="ad-tag ad-tag--teal">WEBSITE CONTENT</span>
                  <h1>Landing page</h1>
                  <p>Edit copy, typography, and Design System v2 styling across all 15 sections.</p>
                </div>

                <div className="ad-page-actions">
                  <button type="button" className="ad-button ad-button--secondary" onClick={() => setDialog('preview')}>
                    <Eye size={15} /> Preview
                  </button>
                  <button type="button" className="ad-button ad-button--secondary" onClick={saveDraft} disabled={!isDirty}>
                    <Save size={15} /> Save draft
                  </button>
                  {liveConnected ? (
                    <button type="button" className="ad-button ad-button--primary" onClick={() => setDialog('publish')}>
                      <Radio size={15} /> {liveState === 'saving' ? 'Syncing…' : 'Live sync on'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ad-button ad-button--primary"
                      onClick={() => void publishViaServer()}
                      disabled={publishingServer || !hasLiveUnpublishedChanges}
                    >
                      <Radio size={15} /> {publishingServer ? 'Publishing…' : 'Publish live'}
                    </button>
                  )}
                </div>
              </div>

              <div className="ad-tabs-row">
                <div className="ad-active-tab">
                  <FileText size={14} /> Page content studio
                </div>
                <div className={`ad-save-status ${isDirty && !liveConnected ? 'has-changes' : ''}`}>
                  <span />
                  {liveConnected
                    ? liveState === 'saving' || isDirty
                      ? 'Syncing changes to the live website…'
                      : `All changes live · Revision ${liveRevNumber || 1}`
                    : isDirty
                      ? `${changedCount} ${changedCount === 1 ? 'section has' : 'sections have'} unsaved local changes`
                      : formatSavedAt(savedAt)}
                </div>
              </div>

              <div className="ad-content-grid" ref={editorTop}>
                <section className="ad-sections-panel" aria-label="Page sections">
                  <div className="ad-panel-heading">
                    <div>
                      <h2>Page sections</h2>
                      <p>Choose a section to edit</p>
                    </div>
                    <span>{sections.length}</span>
                  </div>
                  <div className="ad-sections-list">
                    {sections.map((section, index) => {
                      const active = selected.id === section.id;
                      const changed =
                        stableSerialize(draft[section.id]) !== stableSerialize(saved[section.id]) ||
                        stableSerialize(appearance[section.id] || {}) !==
                          stableSerialize(savedAppearance[section.id] || {});
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => selectSection(section.id)}
                          className={`ad-section-link ${active ? 'is-active' : ''}`}
                          aria-current={active ? 'true' : undefined}
                        >
                          <span className="ad-section-number">{String(index + 1).padStart(2, '0')}</span>
                          <span className="ad-section-name">{section.shortTitle || section.title}</span>
                          {changed ? (
                            <span className="ad-section-dirty" title="Unsaved changes" />
                          ) : active ? (
                            <ChevronRight size={14} />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="ad-sections-footer">
                    <Sparkles size={14} />
                    <span>Generate. Test. Reject.</span>
                  </div>
                </section>

                <section className="ad-editor-panel" aria-label={`${selected.title} editor`}>
                  <div className="ad-editor-heading">
                    <div className="ad-editor-title-icon">
                      <PanelTop size={18} />
                    </div>
                    <div className="ad-editor-heading-copy">
                      <div className="ad-editor-overline">
                        SECTION {String(sectionNumber).padStart(2, '0')} <span>/</span>{' '}
                        {String(sections.length).padStart(2, '0')}
                      </div>
                      <h2>{selected.title}</h2>
                      <p>{selected.description}</p>
                    </div>
                    <button
                      type="button"
                      className="ad-reset-button"
                      onClick={resetSection}
                      disabled={!sectionIsDirty}
                      title="Discard unsaved changes to this section"
                    >
                      <RotateCcw size={13} />
                      <span>Reset</span>
                    </button>
                  </div>

                  <div className="ad-editor-tabs" role="tablist" aria-label="Editor mode">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={editorTab === 'content'}
                      className={editorTab === 'content' ? 'is-active' : ''}
                      onClick={() => setEditorTab('content')}
                    >
                      <Type size={14} /> Content
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={editorTab === 'appearance'}
                      className={editorTab === 'appearance' ? 'is-active' : ''}
                      onClick={() => setEditorTab('appearance')}
                    >
                      <Palette size={14} /> Appearance
                    </button>
                  </div>

                  {editorTab === 'content' ? (
                    <div className="ad-editor-fields" key={selected.id}>
                      {selected.fields.map((f) => {
                        const value = draft[selected.id][f.key];
                        const fieldId = `field-${selected.id}-${f.key}`;
                        return (
                          <div className="ad-field" key={f.key}>
                            <div className="ad-field-label-row">
                              <label htmlFor={fieldId}>{f.label}</label>
                              {f.key === 'heading' && <span>MAIN MESSAGE</span>}
                            </div>
                            {f.rows ? (
                              <textarea
                                id={fieldId}
                                rows={f.rows}
                                maxLength={10000}
                                value={value}
                                onChange={(event) => updateField(f.key, event.target.value)}
                              />
                            ) : (
                              <input
                                id={fieldId}
                                maxLength={10000}
                                value={value}
                                onChange={(event) => updateField(f.key, event.target.value)}
                              />
                            )}
                            <div className="ad-field-meta">
                              <span>{f.hint || '\u00a0'}</span>
                              <span>{value.length} chars</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="ad-appearance-editor" key={selected.id}>
                      <div className="ad-appearance-intro">
                        <div>
                          <span>TYPOGRAPHY</span>
                          <h3>Style your text</h3>
                          <p>Customize font, type scale, and palette tokens from IREX Design System v2.</p>
                          <a
                            className="ad-design-link"
                            href="https://www.figma.com/design/8QRGpu4AGeA4X9zLmvAqUV/IREX-Design-System-v2"
                            target="_blank"
                            rel="noreferrer"
                          >
                            View design system <ArrowUpRight size={11} />
                          </a>
                        </div>
                        <div className="ad-appearance-glyph">Aa</div>
                      </div>

                      <div className="ad-field ad-style-field">
                        <div className="ad-field-label-row">
                          <label htmlFor="ad-text-element">Text element</label>
                          <span>EDITING</span>
                        </div>
                        <select
                          id="ad-text-element"
                          value={field.key}
                          onChange={(event) => setSelectedField(event.target.value)}
                        >
                          {selected.fields.map((item) => (
                            <option key={item.key} value={item.key}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                        <div className="ad-field-meta">
                          <span>Choose the element you want to style.</span>
                        </div>
                      </div>

                      <div className="ad-style-divider" />

                      <div className="ad-field ad-style-field">
                        <div className="ad-field-label-row">
                          <label htmlFor="ad-font-family">Font family</label>
                          <span>IREX FONTS</span>
                        </div>
                        <select
                          id="ad-font-family"
                          value={fieldStyle.font || ''}
                          onChange={(event) =>
                            updateAppearance({ font: (event.target.value || undefined) as TextAppearance['font'] })
                          }
                        >
                          <option value="">Original font</option>
                          {fontOptions.map((font) => (
                            <option key={font} value={font}>
                              {font}
                            </option>
                          ))}
                        </select>
                        <div className="ad-field-meta">
                          <span>Instrument Serif display or DM Mono precision.</span>
                        </div>
                      </div>

                      <div className="ad-field ad-style-field">
                        <div className="ad-field-label-row">
                          <label htmlFor="ad-font-size">Text size</label>
                          <span>DESIGN SCALE</span>
                        </div>
                        <select
                          id="ad-font-size"
                          value={fieldStyle.size || ''}
                          onChange={(event) =>
                            updateAppearance({ size: event.target.value ? Number(event.target.value) : undefined })
                          }
                        >
                          <option value="">Original size</option>
                          {typeScale.map((option) => (
                            <option key={option.size} value={option.size}>
                              {option.label} &nbsp;/&nbsp; {option.size} px
                            </option>
                          ))}
                        </select>
                        <div className="ad-field-meta">
                          <span>Sizes follow the IREX Design System v2 scale.</span>
                        </div>
                      </div>

                      <div className="ad-field ad-style-field ad-color-field">
                        <div className="ad-field-label-row">
                          <label htmlFor="ad-custom-color">Text color</label>
                          <span>BRAND PALETTE</span>
                        </div>
                        <div className="ad-color-options">
                          <button
                            type="button"
                            className={`ad-color-default ${!fieldStyle.color ? 'is-selected' : ''}`}
                            onClick={() => updateAppearance({ color: undefined })}
                            aria-label="Use original text color"
                            title="Original color"
                          >
                            <RotateCcw size={14} />
                          </button>
                          {colorOptions.map((color) => (
                            <button
                              type="button"
                              key={color.value}
                              className={`ad-color-swatch ${fieldStyle.color === color.value ? 'is-selected' : ''}`}
                              onClick={() => updateAppearance({ color: color.value })}
                              aria-label={`${color.label} ${color.value}`}
                              aria-pressed={fieldStyle.color === color.value}
                              title={`${color.label} ${color.value}`}
                            >
                              <span style={{ background: color.value }} />
                            </button>
                          ))}
                          <label className="ad-custom-color" title="Choose a custom color">
                            <input
                              id="ad-custom-color"
                              type="color"
                              value={fieldStyle.color || '#F5F7FA'}
                              onChange={(event) => updateAppearance({ color: event.target.value.toUpperCase() })}
                            />
                            <span>+</span>
                          </label>
                        </div>
                        <div className="ad-color-meta">
                          <span>{fieldStyle.color || 'Original color'}</span>
                          <span>Custom hex available</span>
                        </div>
                      </div>

                      <div className="ad-style-sample">
                        <div className="ad-style-sample-label">
                          <span>TEXT SAMPLE</span>
                          <button
                            type="button"
                            onClick={() => updateAppearance({ font: undefined, size: undefined, color: undefined })}
                          >
                            Reset style
                          </button>
                        </div>
                        <p
                          style={{
                            fontFamily: /heading|title|standout/i.test(field.key)
                              ? "'Instrument Serif', serif"
                              : "'DM Mono', monospace",
                            ...textAppearance(appearance, selected.id, field.key, 0.65),
                          }}
                        >
                          {draft[selected.id][field.key] || 'Your text appears here.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="ad-editor-bottom">
                    <div>
                      <CheckCircle2 size={15} />
                      <span>
                        {liveConnected
                          ? 'Changes auto-sync to your live website'
                          : 'Save draft locally or publish to live site'}
                      </span>
                    </div>
                    <button type="button" onClick={() => setDialog('publish')}>
                      {liveConnected ? 'Live sync settings' : 'Sync settings'} <ArrowRight size={13} />
                    </button>
                  </div>
                </section>

                <aside className="ad-preview-column" aria-label="Draft preview">
                  <div className="ad-preview-heading">
                    <div>
                      <div className="ad-preview-title">
                        <h2>Live preview</h2>
                        <span className="ad-tag ad-tag--teal">LIVE</span>
                      </div>
                      <p>Updates immediately as you edit</p>
                    </div>
                    <DeviceToggle device={device} onChange={setDevice} />
                  </div>

                  <div className="ad-preview-stage">
                    <SitePreview content={draft} appearance={appearance} section={selected} device={device} />
                  </div>

                  <div className="ad-preview-caption">
                    <span>
                      <span className="ad-caption-dot" /> {selected.title}
                    </span>
                    <button type="button" onClick={() => setDialog('preview')}>
                      Expand <ArrowUpRight size={13} />
                    </button>
                  </div>

                  <div className="ad-preview-help">
                    <div className="ad-help-icon">
                      <Sparkles size={15} />
                    </div>
                    <div>
                      <strong>{liveConnected ? 'Realtime sync active' : 'Test full landing page'}</strong>
                      <p>
                        {liveConnected
                          ? 'Every edit updates the production landing page via Supabase Realtime.'
                          : 'Open a full-page draft preview with WebGL & scroll choreography before publishing.'}
                      </p>
                      <a href="/?preview=draft" target="_blank" rel="noreferrer">
                        Open full-page draft preview <ArrowUpRight size={13} />
                      </a>
                    </div>
                  </div>
                </aside>
              </div>
            </>
          )}

          <div className="ad-page-footer">
            <span>IREX CONTENT STUDIO · DESIGN SYSTEM v2</span>
            <span>Computational Geological Reasoning™</span>
          </div>
        </main>
      </div>

      {toast && (
        <div className="ad-toast" role="status">
          <Check size={15} />
          <span>{toast}</span>
        </div>
      )}

      <input
        ref={fileInput}
        className="ad-visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={importContent}
        aria-label="Import content JSON"
      />

      {dialog && (
        <div
          className="ad-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !connecting) setDialog(null);
          }}
        >
          <div
            className={`ad-modal ${dialog === 'preview' ? 'ad-modal--preview' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ad-dialog-title"
          >
            <div className="ad-modal-header">
              <div>
                <span className="ad-modal-overline">IREX CONTENT STUDIO</span>
                <h2 id="ad-dialog-title">
                  {dialog === 'preview'
                    ? 'Preview section'
                    : dialog === 'backups'
                      ? 'Import & export'
                      : dialog === 'publish'
                        ? 'Live sync & publishing'
                        : dialog === 'conflict'
                          ? 'Resolve content conflict'
                          : 'Version history'}
                </h2>
                <p>
                  {dialog === 'preview'
                    ? 'Visual preview of your current section.'
                    : dialog === 'backups'
                      ? 'Back up or restore text and appearance JSON.'
                      : dialog === 'publish'
                        ? 'Synchronize changes with Supabase and the live website.'
                        : dialog === 'conflict'
                          ? 'Your browser draft differs from the current live website copy.'
                          : 'Restore a previous draft saved in this browser.'}
                </p>
              </div>
              <button
                type="button"
                className="ad-icon-button ad-modal-close"
                onClick={() => setDialog(null)}
                disabled={connecting}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {dialog === 'preview' && (
              <div className="ad-modal-preview-body">
                <div className="ad-modal-preview-toolbar">
                  <span>
                    <span className="ad-caption-dot" /> {selected.title}
                  </span>
                  <DeviceToggle device={device} onChange={setDevice} />
                </div>
                <div className="ad-modal-preview-stage">
                  <SitePreview content={draft} appearance={appearance} section={selected} device={device} large />
                </div>
                <p className="ad-modal-footnote">
                  <Eye size={14} /> Reflects current unsaved edits.{' '}
                  <a href="/?preview=draft" target="_blank" rel="noreferrer">
                    Open full landing page preview ↗
                  </a>
                </p>
              </div>
            )}

            {dialog === 'backups' && (
              <div className="ad-backup-body">
                <div className="ad-backup-action">
                  <div className="ad-backup-icon">
                    <ArrowDownToLine size={18} />
                  </div>
                  <div>
                    <strong>Export backup JSON</strong>
                    <p>Download all 15 sections and typography styles.</p>
                  </div>
                  <button type="button" className="ad-button ad-button--secondary" onClick={exportContent}>
                    Export
                  </button>
                </div>
                <div className="ad-backup-action">
                  <div className="ad-backup-icon">
                    <Upload size={18} />
                  </div>
                  <div>
                    <strong>Import backup JSON</strong>
                    <p>Load a previously exported IREX content file.</p>
                  </div>
                  <button
                    type="button"
                    className="ad-button ad-button--secondary"
                    onClick={() => fileInput.current?.click()}
                  >
                    Choose file
                  </button>
                </div>
                <div className="ad-publish-instructions">
                  <CircleHelp size={17} />
                  <div>
                    <strong>Publishing your backup</strong>
                    <p>Imported changes load into your draft first. Publish or sync live when ready.</p>
                  </div>
                </div>
              </div>
            )}

            {dialog === 'conflict' && conflictRemote && (
              <div className="ad-publish-form">
                <div className="ad-banner ad-banner--warning">
                  <AlertTriangle size={17} />
                  <div>
                    <strong>Live website is at revision {conflictRemote.revision}</strong>
                    <p>
                      Choose whether to load the live website copy into your editor (recommended) or overwrite the live
                      website with your local browser draft.
                    </p>
                  </div>
                </div>
                <div className="ad-publish-actions">
                  <button
                    type="button"
                    className="ad-button ad-button--secondary"
                    onClick={() => resolveConflict('publish-draft')}
                  >
                    Overwrite live with local draft
                  </button>
                  <button
                    type="button"
                    className="ad-button ad-button--primary"
                    onClick={() => resolveConflict('load-live')}
                  >
                    Load live website copy
                  </button>
                </div>
              </div>
            )}

            {dialog === 'publish' && (
              <div className="ad-publish-form">
                <div className="ad-repository-summary">
                  <div className="ad-backup-icon">
                    <Radio size={18} />
                  </div>
                  <div>
                    <strong>{liveConnected ? 'Live sync stream connected' : 'Publishing channel'}</strong>
                    <p>
                      {liveConnected
                        ? `Signed in as ${user.email}`
                        : liveClient
                          ? 'Supabase is configured. Publish via API or reconnect realtime stream.'
                          : 'Using server API / local storage mode.'}
                    </p>
                  </div>
                  <span className={`ad-tag ${liveConnected ? 'ad-tag--teal' : 'ad-tag--neutral'}`}>
                    {liveConnected ? 'LIVE' : 'STANDBY'}
                  </span>
                </div>

                {liveConnected ? (
                  <>
                    <p className="ad-publish-copy">
                      Text and typography changes save automatically after 700ms and broadcast to all visitors via
                      Supabase Realtime.
                    </p>
                    <div className="ad-token-notice">
                      <LockKeyhole size={15} />
                      <span>Only accounts in irex_content_editors can modify live website content.</span>
                    </div>
                    <div className="ad-publish-actions">
                      <button type="button" className="ad-button ad-button--secondary" onClick={() => setDialog(null)}>
                        Close
                      </button>
                      <button
                        type="button"
                        className="ad-button ad-button--primary"
                        onClick={() => void disconnectLive()}
                        disabled={liveState === 'saving'}
                      >
                        Pause live stream
                      </button>
                    </div>
                  </>
                ) : !liveClient ? (
                  <>
                    <div className="ad-publish-instructions">
                      <CircleHelp size={17} />
                      <div>
                        <strong>Supabase Realtime is not configured</strong>
                        <p>
                          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and
                          run <code>supabase/live-content.sql</code> to enable live cloud sync across Vercel
                          deployments. You can still publish to local server storage when running on a writable Node
                          host.
                        </p>
                      </div>
                    </div>
                    <div className="ad-publish-actions">
                      <button type="button" className="ad-button ad-button--secondary" onClick={() => setDialog(null)}>
                        Close
                      </button>
                      <button
                        type="button"
                        className="ad-button ad-button--primary"
                        onClick={() => void publishViaServer()}
                        disabled={publishingServer}
                      >
                        {publishingServer ? 'Publishing…' : 'Publish via server API'}
                      </button>
                    </div>
                  </>
                ) : (
                  <form onSubmit={reconnectLiveStream} className="ad-live-login">
                    <p className="ad-publish-copy">
                      Re-enter your Supabase editor password to re-attach the live Realtime autosync stream, or publish
                      directly using your current session.
                    </p>
                    <label htmlFor="ad-live-email">Editor email</label>
                    <input
                      id="ad-live-email"
                      type="email"
                      value={loginEmail || user.email}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      autoComplete="username"
                      required
                      disabled={connecting}
                    />
                    <label htmlFor="ad-live-password">Password</label>
                    <input
                      id="ad-live-password"
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      disabled={connecting}
                    />
                    {liveError && (
                      <p className="ad-publish-error" role="alert">
                        {liveError}
                      </p>
                    )}
                    <div className="ad-publish-actions">
                      <button
                        type="button"
                        className="ad-button ad-button--secondary"
                        onClick={() => void publishViaServer()}
                        disabled={connecting || publishingServer}
                      >
                        {publishingServer ? 'Publishing…' : 'Publish once'}
                      </button>
                      <button
                        type="submit"
                        className="ad-button ad-button--primary"
                        disabled={connecting || !loginPassword}
                      >
                        {connecting ? 'Connecting…' : 'Attach live stream'} <ArrowRight size={14} />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {dialog === 'history' && (
              <div className="ad-history-body">
                {history.length === 0 ? (
                  <div className="ad-empty-history">
                    <FileClock size={25} />
                    <strong>No saved versions yet</strong>
                    <p>When you save a draft or publish live, versions appear here.</p>
                  </div>
                ) : (
                  history.map((revision, index) => (
                    <div className="ad-history-row" key={revision.id}>
                      <div className="ad-history-icon">
                        <Clock3 size={16} />
                      </div>
                      <div>
                        <strong>{index === 0 ? 'Latest saved version' : `Saved version ${history.length - index}`}</strong>
                        <p>{formatSavedAt(revision.savedAt)}</p>
                      </div>
                      <button
                        type="button"
                        className="ad-button ad-button--secondary"
                        onClick={() => restoreRevision(revision)}
                      >
                        Restore
                      </button>
                    </div>
                  ))
                )}
                <div className="ad-history-row">
                  <div className="ad-history-icon">
                    <FileText size={16} />
                  </div>
                  <div>
                    <strong>Original website copy</strong>
                    <p>Default copy shipped with this release.</p>
                  </div>
                  <button type="button" className="ad-button ad-button--secondary" onClick={restoreOriginal}>
                    Restore
                  </button>
                </div>
                <p className="ad-modal-footnote">
                  Version history keeps up to eight snapshots locally in this browser.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
