'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Eye,
  FileClock,
  FileText,
  Globe2,
  History,
  LayoutPanelTop,
  LockKeyhole,
  Menu,
  Monitor,
  MoreHorizontal,
  Palette,
  PanelTop,
  Radio,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { sections, type Content, type SectionDefinition } from './sections';
import { cloneDocument, colorOptions, fontOptions, stableSerialize, textAppearance, typeScale, validateDocument, type Appearance, type SiteDocument, type TextAppearance } from './model';
import { createLiveClient, LIVE_ID, LIVE_TABLE, type LiveConfig, type LiveRow } from './live';
import './admin.css';

type Revision = { id: string; savedAt: string; content: Content; appearance: Appearance };
type Dialog = 'preview' | 'backups' | 'history' | 'publish' | null;
type Device = 'desktop' | 'mobile';

const STORAGE_KEY = 'irex-content-studio-v1';
const WEBSITE_URL = 'https://irex-kappa.vercel.app';

function formatSavedAt(value: string | null): string {
  if (!value) return 'Original website copy';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved in this browser';
  return `Saved ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function DeviceToggle({ device, onChange }: { device: Device; onChange: (device: Device) => void }) {
  return (
    <div className="ad-device-toggle" aria-label="Preview size">
      <button className={device === 'desktop' ? 'is-active' : ''} onClick={() => onChange('desktop')} aria-label="Desktop preview" aria-pressed={device === 'desktop'} title="Desktop preview"><Monitor size={15} /></button>
      <button className={device === 'mobile' ? 'is-active' : ''} onClick={() => onChange('mobile')} aria-label="Mobile preview" aria-pressed={device === 'mobile'} title="Mobile preview"><Smartphone size={15} /></button>
    </div>
  );
}

function SitePreview({ content, appearance, section, device, large = false }: { content: Content; appearance: Appearance; section: SectionDefinition; device: Device; large?: boolean }) {
  const values = content[section.id];
  const eyebrow = values.eyebrow || values.label || section.title;
  const eyebrowKey = values.eyebrow ? 'eyebrow' : 'label';
  const headingKey = values.heading ? 'heading' : values.headingFirst ? 'headingFirst' : values.intro ? 'intro' : values.body ? 'body' : 'headerStatement';
  const heading = values.heading || (values.headingFirst ? `${values.headingFirst}\n${values.headingSecond}` : '') || values.intro || values.body || values.headerStatement || section.title;
  const bodyKey = values.heading || values.headingFirst ? 'body' : values.supporting ? 'supporting' : 'footerTagline';
  const body = values.heading ? values.body : values.supporting || (values.headingFirst ? values.body : '') || values.footerTagline || '';
  const previewStyle = (key: string) => textAppearance(appearance, section.id, key, large ? 0.8 : 0.55);
  const primaryKeys = new Set(['eyebrow', 'label', 'heading', 'headingFirst', 'headingSecond', 'body', 'supporting', 'button', 'note', 'headerStatement', 'footerTagline']);
  const extraFields = section.fields.filter((field) => !primaryKeys.has(field.key) && field.key !== headingKey && values[field.key]);

  return (
    <div className={`ad-browser ${large ? 'ad-browser--large' : ''} ${device === 'mobile' ? 'ad-browser--mobile' : ''}`}>
      <div className="ad-browser-bar">
        <div className="ad-browser-dots"><i /><i /><i /></div>
        <div className="ad-browser-address"><span className="ad-address-lock" />irex-kappa.vercel.app</div>
        <MoreHorizontal size={15} />
      </div>
      <div className="ad-site-preview">
        <div className="ad-preview-site-header">
          <img src="/brand/irex-logo-dark.png" alt="IREX" />
          <span style={textAppearance(appearance, 'site', 'headerStatement', large ? 0.8 : 0.55)}>{content.site.headerStatement}</span>
        </div>
        <div className="ad-preview-content">
          <span className="ad-preview-kicker" style={previewStyle(eyebrowKey)}>{eyebrow}</span>
          <h4 style={values.headingFirst ? undefined : previewStyle(headingKey)}>{values.headingFirst ? <><span style={previewStyle('headingFirst')}>{values.headingFirst}</span><br /><span style={previewStyle('headingSecond')}>{values.headingSecond}</span></> : heading}</h4>
          {body && <p className="ad-preview-lead" style={previewStyle(bodyKey)}>{body}</p>}
          {extraFields.length > 0 && <div className="ad-preview-extra">{extraFields.map((field) => <p key={field.key} style={previewStyle(field.key)}>{values[field.key]}</p>)}</div>}
          {values.button && <div className="ad-preview-cta" style={previewStyle('button')}>{values.button}<ArrowUpRight size={12} /></div>}
          {values.note && <span className="ad-preview-microcopy" style={previewStyle('note')}>{values.note}</span>}
        </div>
        <div className="ad-preview-rail" aria-hidden="true"><span /><span /><span /><span /><span /></div>
        <div className="ad-preview-counter">{String(sections.indexOf(section) + 1).padStart(2, '0')} <span>/</span> {String(sections.length).padStart(2, '0')}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard({ initialContent, liveConfig }: { initialContent: Content; liveConfig?: LiveConfig }) {
  const original = useMemo<SiteDocument>(() => ({ content: initialContent, appearance: {} }), [initialContent]);
  const [draft, setDraft] = useState<Content>(() => cloneDocument(original).content);
  const [appearance, setAppearance] = useState<Appearance>({});
  const [saved, setSaved] = useState<Content>(() => cloneDocument(original).content);
  const [savedAppearance, setSavedAppearance] = useState<Appearance>({});
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [history, setHistory] = useState<Revision[]>([]);
  const [selectedId, setSelectedId] = useState('hero');
  const [selectedField, setSelectedField] = useState('heading');
  const [editorTab, setEditorTab] = useState<'content' | 'appearance'>('appearance');
  const [device, setDevice] = useState<Device>('desktop');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveState, setLiveState] = useState<'offline' | 'saving' | 'synced' | 'error'>('offline');
  const [liveError, setLiveError] = useState('');
  const [syncTick, setSyncTick] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const editorTop = useRef<HTMLDivElement>(null);
  const historyRef = useRef<Revision[]>([]);
  const liveRevision = useRef(0);
  const liveSnapshot = useRef('');
  const liveWriteInFlight = useRef(false);
  const liveGeneration = useRef(0);
  const liveUrl = liveConfig?.url;
  const liveAnonKey = liveConfig?.anonKey;
  const liveClient = useMemo(() => createLiveClient({ url: liveUrl, anonKey: liveAnonKey }), [liveUrl, liveAnonKey]);

  const selected = sections.find((section) => section.id === selectedId) || sections[0];
  const field = selected.fields.find((item) => item.key === selectedField) || selected.fields[0];
  const fieldStyle = appearance[selected.id]?.[field.key] || {};
  const sectionNumber = sections.findIndex((section) => section.id === selected.id) + 1;
  const isDirty = useMemo(() => stableSerialize({ content: draft, appearance }) !== stableSerialize({ content: saved, appearance: savedAppearance }), [draft, appearance, saved, savedAppearance]);
  const sectionIsDirty = stableSerialize(draft[selected.id]) !== stableSerialize(saved[selected.id]) || stableSerialize(appearance[selected.id] || {}) !== stableSerialize(savedAppearance[selected.id] || {});
  const changedCount = sections.filter((section) => stableSerialize(draft[section.id]) !== stableSerialize(saved[section.id]) || stableSerialize(appearance[section.id] || {}) !== stableSerialize(savedAppearance[section.id] || {})).length;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as { content?: unknown; appearance?: unknown; savedAt?: unknown; history?: unknown };
      const document = validateDocument({ content: parsed.content, appearance: parsed.appearance }, initialContent);
      if (!document) return;
      setDraft(document.content);
      setAppearance(document.appearance);
      setSaved(cloneDocument(document).content);
      setSavedAppearance(cloneDocument(document).appearance);
      setSavedAt(typeof parsed.savedAt === 'string' ? parsed.savedAt : null);
      if (Array.isArray(parsed.history)) {
        const validHistory = parsed.history.flatMap((entry: { id?: unknown; savedAt?: unknown; content?: unknown; appearance?: unknown }) => {
          const version = validateDocument({ content: entry?.content, appearance: entry?.appearance }, initialContent);
          return version && typeof entry.id === 'string' && typeof entry.savedAt === 'string'
            ? [{ id: entry.id, savedAt: entry.savedAt, ...version }]
            : [];
        }).slice(0, 8);
        historyRef.current = validHistory;
        setHistory(validHistory);
      }
    } catch {
      setToast('Your saved draft could not be loaded. Original copy is shown.');
    }
  }, [initialContent]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3500);
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
    if (dialog !== 'publish') {
      setPassword('');
      if (liveState !== 'error') setLiveError('');
    }
  }, [dialog, liveState]);

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

  useEffect(() => {
    if (!liveConnected || !liveClient) return;
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
        const mutation = revision === 0
          ? liveClient.from(LIVE_TABLE).insert({ id: LIVE_ID, document, revision: 1 })
          : liveClient.from(LIVE_TABLE).update({ document, revision: revision + 1, updated_at: new Date().toISOString() }).eq('id', LIVE_ID).eq('revision', revision);
        const { data, error } = await mutation.select('revision').maybeSingle();
        if (error) throw new Error(error.code === '23505' ? 'Another editor changed the live page. Reconnect to review the latest version.' : error.message);
        if (!data || typeof data.revision !== 'number') throw new Error('The live page changed elsewhere or this account cannot update it. Reconnect to review the latest version.');
        if (generation !== liveGeneration.current) return;
        liveRevision.current = data.revision;
        liveSnapshot.current = snapshot;
        if (!persistDraft(document)) {
          setSaved(document.content);
          setSavedAppearance(document.appearance);
          setToast('The live site was updated, but a local backup could not be saved.');
        }
        setLiveState('synced');
      } catch (error) {
        if (generation !== liveGeneration.current) return;
        setLiveConnected(false);
        setLiveState('error');
        setLiveError(error instanceof Error ? error.message : 'Live sync stopped. Your draft is still available here.');
        setDialog('publish');
      } finally {
        liveWriteInFlight.current = false;
        if (generation === liveGeneration.current) setSyncTick((value) => value + 1);
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [draft, appearance, liveConnected, liveClient, persistDraft, syncTick]);

  useEffect(() => () => { liveGeneration.current += 1; void liveClient?.auth.signOut({ scope: 'local' }); }, [liveClient]);

  function updateField(key: string, value: string) {
    setDraft((current) => ({ ...current, [selected.id]: { ...current[selected.id], [key]: value } }));
  }

  function updateAppearance(patch: Partial<TextAppearance>) {
    setAppearance((current) => {
      const next = { ...current };
      const section = { ...(next[selected.id] || {}) };
      const style = { ...(section[field.key] || {}), ...patch };
      for (const key of Object.keys(style) as Array<keyof TextAppearance>) if (style[key] === undefined) delete style[key];
      if (Object.keys(style).length) section[field.key] = style;
      else delete section[field.key];
      if (Object.keys(section).length) next[selected.id] = section;
      else delete next[selected.id];
      return next;
    });
  }

  function saveDraft() {
    if (!isDirty) return;
    setToast(persistDraft({ content: draft, appearance }) ? (liveConnected ? 'Draft saved. Live sync is applying your changes.' : 'Draft saved in this browser.') : 'Could not save the draft. Check your browser storage and try again.');
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
    if (!window.confirm(`Discard unsaved changes to ${selected.title}?${liveConnected ? ' The restored version will also be applied live.' : ''}`)) return;
    setDraft((current) => ({ ...current, [selected.id]: { ...saved[selected.id] } }));
    setAppearance((current) => {
      const next = { ...current };
      if (savedAppearance[selected.id]) next[selected.id] = { ...savedAppearance[selected.id] };
      else delete next[selected.id];
      return next;
    });
    setToast('Section restored to your last saved version.');
  }

  function exportContent() {
    const blob = new Blob([`${JSON.stringify({ content: draft, appearance }, null, 2)}\n`], { type: 'application/json' });
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
    if ((isDirty || liveConnected) && !window.confirm(`Importing will replace your current draft.${liveConnected ? ' It will also update the live site.' : ''} Continue?`)) return;
    try {
      const document = validateDocument(JSON.parse(await file.text()), initialContent);
      if (!document) throw new Error('Invalid content');
      setDraft(document.content);
      setAppearance(document.appearance);
      setDialog(null);
      setSelectedId('hero');
      setSelectedField('heading');
      setToast(liveConnected ? 'Content imported. Live sync will apply it.' : 'Content imported. Save your draft to keep it here.');
    } catch {
      setToast('This is not a valid IREX content file.');
    }
  }

  function restoreRevision(revision: Revision) {
    if ((isDirty || liveConnected) && !window.confirm(`Restore this version?${liveConnected ? ' It will also update the live site.' : ' Unsaved changes will be replaced.'}`)) return;
    const document = cloneDocument(revision);
    setDraft(document.content);
    setAppearance(document.appearance);
    setDialog(null);
    setToast(liveConnected ? 'Version restored and syncing live.' : 'Version restored. Save your draft to keep it.');
  }

  function restoreOriginal() {
    if (!window.confirm(`Replace the current draft with the original website copy?${liveConnected ? ' This will also update the live site.' : ''}`)) return;
    const document = cloneDocument(original);
    setDraft(document.content);
    setAppearance(document.appearance);
    setDialog(null);
    setToast(liveConnected ? 'Original copy restored and syncing live.' : 'Original copy restored. Save your draft to keep it.');
  }

  async function connectLive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!liveClient || connecting) return;
    setConnecting(true);
    setLiveError('');
    try {
      const { data: auth, error: authError } = await liveClient.auth.signInWithPassword({ email: email.trim(), password });
      if (authError || !auth.user) throw new Error('Unable to sign in. Check your editor email and password.');
      const { data: membership, error: membershipError } = await liveClient.from('irex_content_editors').select('user_id').eq('user_id', auth.user.id).maybeSingle();
      if (membershipError || !membership) throw new Error('This account is not authorized to edit the IREX site.');
      const { data: row, error: readError } = await liveClient.from(LIVE_TABLE).select('id,document,revision').eq('id', LIVE_ID).maybeSingle();
      if (readError) throw new Error('Unable to load live content. Check the database setup and permissions.');
      const existing = row as LiveRow | null;
      const current = { content: draft, appearance };
      let needsWrite = false;
      if (existing) {
        const remote = validateDocument(existing.document, initialContent);
        if (!remote || !Number.isSafeInteger(existing.revision) || existing.revision < 1) throw new Error('The live content has an incompatible format.');
        liveRevision.current = existing.revision;
        liveSnapshot.current = stableSerialize(remote);
        if (stableSerialize(remote) !== stableSerialize(current)) {
          const keepDraft = window.confirm('The live website has different content. Select OK to publish this draft, or Cancel to load the current live version instead.');
          if (keepDraft) needsWrite = true;
          else {
            setDraft(remote.content);
            setAppearance(remote.appearance);
            persistDraft(remote);
          }
        }
      } else {
        liveRevision.current = 0;
        liveSnapshot.current = '';
        needsWrite = true;
      }
      liveGeneration.current += 1;
      setPassword('');
      setLiveConnected(true);
      setLiveState(needsWrite ? 'saving' : 'synced');
      setDialog(null);
      setToast('Live sync is on. Edits will appear on the website automatically.');
    } catch (error) {
      await liveClient.auth.signOut({ scope: 'local' });
      setLiveState('error');
      setLiveError(error instanceof Error ? error.message : 'Could not connect live sync.');
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
    setToast('Live sync is off. Changes will stay in this browser until you reconnect.');
  }

  return (
    <div className="ad-app">
      {sidebarOpen && <button className="ad-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <aside className={`ad-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="ad-brand">
          <img src="/brand/irex-logo-dark.png" alt="IREX" />
          <span>CONTENT STUDIO</span>
        </div>

        <div className="ad-workspace">
          <div className="ad-workspace-mark"><Globe2 size={17} /></div>
          <div><strong>IREX Website</strong><span>Content workspace</span></div>
          <ChevronRight size={15} className="ad-workspace-chevron" />
        </div>

        <nav className="ad-primary-nav" aria-label="Workspace navigation">
          <p>WORKSPACE</p>
          <button className="is-active" onClick={() => { setDialog(null); setSidebarOpen(false); }}><LayoutPanelTop size={17} /><span>Landing page</span><ChevronRight className="ad-nav-chevron" size={15} /></button>
          <button onClick={() => { setDialog('preview'); setSidebarOpen(false); }}><Eye size={17} /><span>Preview site</span></button>
          <button onClick={() => { setDialog('history'); setSidebarOpen(false); }}><History size={17} /><span>Version history</span></button>
          <p className="ad-nav-group">CONTENT</p>
          <button onClick={() => { setDialog('publish'); setSidebarOpen(false); }}><Radio size={17} /><span>Live sync</span></button>
          <button onClick={() => { setDialog('backups'); setSidebarOpen(false); }}><FileText size={17} /><span>Import &amp; export</span></button>
        </nav>

        <div className="ad-sidebar-bottom">
          <div className="ad-site-card">
            <span className="ad-site-card-label"><i /> YOUR WEBSITE</span>
            <strong>Built for reasoning.</strong>
            <p>Your IREX website, all in one place.</p>
            <a href={WEBSITE_URL} target="_blank" rel="noreferrer">Visit live site <ArrowUpRight size={14} /></a>
          </div>
          <div className="ad-sidebar-profile">
            <div className="ad-profile-avatar">IR</div>
            <div><strong>IREX workspace</strong><span>Content editor</span></div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>

      <div className="ad-workspace-main">
        <header className="ad-topbar">
          <button className="ad-mobile-menu ad-icon-button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
          <div className="ad-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>Landing page</strong></div>
          <div className="ad-topbar-right">
            <span className={`ad-workspace-status ${liveConnected ? 'is-live' : 'is-offline'}`}><i /> {liveConnected ? (liveState === 'saving' ? 'Syncing changes' : 'Live sync on') : 'Draft mode'}</span>
            <a className="ad-top-link" href={WEBSITE_URL} target="_blank" rel="noreferrer">View website <ArrowUpRight size={14} /></a>
            <div className="ad-top-avatar" aria-label="IREX workspace">I</div>
          </div>
        </header>

        <main className="ad-main">
          <div className="ad-page-heading">
            <div>
              <div className="ad-overline"><span /> WEBSITE CONTENT</div>
              <h1>Landing page</h1>
              <p>Shape the words and details that tell your story.</p>
            </div>
            <div className="ad-page-actions">
              <button className="ad-button ad-button--secondary" onClick={() => setDialog('preview')}><Eye size={16} /> Preview</button>
              <button className="ad-button ad-button--secondary" onClick={saveDraft} disabled={!isDirty}><Save size={16} /> Save draft</button>
              <button className="ad-button ad-button--primary" onClick={() => setDialog('publish')}><Radio size={16} /> {liveConnected ? 'Live sync on' : 'Connect live'}</button>
            </div>
          </div>

          <div className="ad-tabs-row">
            <div className="ad-active-tab"><FileText size={15} /> Page content</div>
            <div className={`ad-save-status ${isDirty && !liveConnected ? 'has-changes' : ''}`}><span />{liveConnected ? (liveState === 'saving' || isDirty ? 'Syncing to the live website' : 'All changes live') : isDirty ? `${changedCount} ${changedCount === 1 ? 'section has' : 'sections have'} unsaved changes` : formatSavedAt(savedAt)}</div>
          </div>

          <div className="ad-content-grid" ref={editorTop}>
            <section className="ad-sections-panel" aria-label="Page sections">
              <div className="ad-panel-heading">
                <div><h2>Page sections</h2><p>Choose a section to edit</p></div>
                <span>{sections.length}</span>
              </div>
              <div className="ad-sections-list">
                {sections.map((section, index) => {
                  const active = selected.id === section.id;
                  const changed = stableSerialize(draft[section.id]) !== stableSerialize(saved[section.id]) || stableSerialize(appearance[section.id] || {}) !== stableSerialize(savedAppearance[section.id] || {});
                  return (
                    <button key={section.id} onClick={() => selectSection(section.id)} className={`ad-section-link ${active ? 'is-active' : ''}`} aria-current={active ? 'true' : undefined}>
                      <span className="ad-section-number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="ad-section-name">{section.shortTitle || section.title}</span>
                      {changed ? <span className="ad-section-dirty" title="Unsaved changes" /> : active ? <ChevronRight size={15} /> : null}
                    </button>
                  );
                })}
              </div>
              <div className="ad-sections-footer"><Sparkles size={15} /><span>Every detail tells your story.</span></div>
            </section>

            <section className="ad-editor-panel" aria-label={`${selected.title} editor`}>
              <div className="ad-editor-heading">
                <div className="ad-editor-title-icon"><PanelTop size={19} /></div>
                <div className="ad-editor-heading-copy"><div className="ad-editor-overline">SECTION {String(sectionNumber).padStart(2, '0')} <span>/</span> {String(sections.length).padStart(2, '0')}</div><h2>{selected.title}</h2><p>{selected.description}</p></div>
                <button className="ad-reset-button" onClick={resetSection} disabled={!sectionIsDirty} title="Discard unsaved changes to this section"><RotateCcw size={14} /><span>Reset</span></button>
              </div>
              <div className="ad-editor-tabs" role="tablist" aria-label="Editor mode">
                <button role="tab" aria-selected={editorTab === 'content'} className={editorTab === 'content' ? 'is-active' : ''} onClick={() => setEditorTab('content')}><Type size={15} /> Content</button>
                <button role="tab" aria-selected={editorTab === 'appearance'} className={editorTab === 'appearance' ? 'is-active' : ''} onClick={() => setEditorTab('appearance')}><Palette size={15} /> Appearance</button>
              </div>
              {editorTab === 'content' ? <div className="ad-editor-fields" key={selected.id}>
                {selected.fields.map((field) => {
                  const value = draft[selected.id][field.key];
                  const fieldId = `field-${selected.id}-${field.key}`;
                  return (
                    <div className="ad-field" key={field.key}>
                      <div className="ad-field-label-row"><label htmlFor={fieldId}>{field.label}</label>{field.key === 'heading' && <span>MAIN MESSAGE</span>}</div>
                      {field.rows ? <textarea id={fieldId} rows={field.rows} maxLength={10000} value={value} onChange={(event) => updateField(field.key, event.target.value)} /> : <input id={fieldId} maxLength={10000} value={value} onChange={(event) => updateField(field.key, event.target.value)} />}
                      <div className="ad-field-meta"><span>{field.hint || '\u00a0'}</span><span>{value.length} characters</span></div>
                    </div>
                  );
                })}
              </div> : <div className="ad-appearance-editor" key={selected.id}>
                <div className="ad-appearance-intro"><div><span>TYPOGRAPHY</span><h3>Style your text</h3><p>Customize each element using the IREX design system.</p><a className="ad-design-link" href="https://www.figma.com/design/8QRGpu4AGeA4X9zLmvAqUV/IREX-Design-System-v2" target="_blank" rel="noreferrer">View design system <ArrowUpRight size={11} /></a></div><div className="ad-appearance-glyph">Aa</div></div>
                <div className="ad-field ad-style-field"><div className="ad-field-label-row"><label htmlFor="ad-text-element">Text element</label><span>EDITING</span></div><select id="ad-text-element" value={field.key} onChange={(event) => setSelectedField(event.target.value)}>{selected.fields.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select><div className="ad-field-meta"><span>Choose the text you want to style.</span></div></div>
                <div className="ad-style-divider" />
                <div className="ad-field ad-style-field"><div className="ad-field-label-row"><label htmlFor="ad-font-family">Font family</label><span>IREX FONTS</span></div><select id="ad-font-family" value={fieldStyle.font || ''} onChange={(event) => updateAppearance({ font: (event.target.value || undefined) as TextAppearance['font'] })}><option value="">Original font</option>{fontOptions.map((font) => <option key={font} value={font}>{font}</option>)}</select><div className="ad-field-meta"><span>Display serif or the IREX monospace.</span></div></div>
                <div className="ad-field ad-style-field"><div className="ad-field-label-row"><label htmlFor="ad-font-size">Text size</label><span>DESIGN SCALE</span></div><select id="ad-font-size" value={fieldStyle.size || ''} onChange={(event) => updateAppearance({ size: event.target.value ? Number(event.target.value) : undefined })}><option value="">Original size</option>{typeScale.map((option) => <option key={option.size} value={option.size}>{option.label} &nbsp; / &nbsp; {option.size} px</option>)}</select><div className="ad-field-meta"><span>Sizes follow the IREX type scale.</span></div></div>
                <div className="ad-field ad-style-field ad-color-field"><div className="ad-field-label-row"><label htmlFor="ad-custom-color">Text color</label><span>BRAND PALETTE</span></div><div className="ad-color-options"><button type="button" className={`ad-color-default ${!fieldStyle.color ? 'is-selected' : ''}`} onClick={() => updateAppearance({ color: undefined })} aria-label="Use original text color" title="Original color"><RotateCcw size={14} /></button>{colorOptions.map((color) => <button type="button" key={color.value} className={`ad-color-swatch ${fieldStyle.color === color.value ? 'is-selected' : ''}`} onClick={() => updateAppearance({ color: color.value })} aria-label={`${color.label} ${color.value}`} aria-pressed={fieldStyle.color === color.value} title={`${color.label} ${color.value}`}><span style={{ background: color.value }} /></button>)}<label className="ad-custom-color" title="Choose a custom color"><input id="ad-custom-color" type="color" value={fieldStyle.color || '#F5F7FA'} onChange={(event) => updateAppearance({ color: event.target.value.toUpperCase() })} /><span>+</span></label></div><div className="ad-color-meta"><span>{fieldStyle.color || 'Original color'}</span><span>Custom colors available</span></div></div>
                <div className="ad-style-sample"><div className="ad-style-sample-label"><span>TEXT SAMPLE</span><button onClick={() => updateAppearance({ font: undefined, size: undefined, color: undefined })}>Reset style</button></div><p style={{ fontFamily: /heading|title|standout/i.test(field.key) ? "'Instrument Serif', serif" : "'DM Mono', monospace", ...textAppearance(appearance, selected.id, field.key, 0.65) }}>{draft[selected.id][field.key] || 'Your text appears here.'}</p></div>
              </div>}
              <div className="ad-editor-bottom"><div><CheckCircle2 size={15} /><span>{liveConnected ? 'Changes sync to your live website' : 'Changes are a private draft'}</span></div><button onClick={() => setDialog('publish')}>{liveConnected ? 'Live settings' : 'Set up live sync'} <ArrowRight size={14} /></button></div>
            </section>

            <aside className="ad-preview-column" aria-label="Draft preview">
              <div className="ad-preview-heading"><div><div className="ad-preview-title"><h2>Live preview</h2><span><i /> LIVE</span></div><p>See your changes as you type</p></div><DeviceToggle device={device} onChange={setDevice} /></div>
              <div className="ad-preview-stage"><SitePreview content={draft} appearance={appearance} section={selected} device={device} /></div>
              <div className="ad-preview-caption"><span><span className="ad-caption-dot" /> {selected.title}</span><button onClick={() => setDialog('preview')}>Expand preview <ArrowUpRight size={14} /></button></div>
              <div className="ad-preview-help"><div className="ad-help-icon"><Sparkles size={16} /></div><div><strong>{liveConnected ? 'Your site is connected' : 'Ready to go live?'}</strong><p>{liveConnected ? 'Text and appearance changes sync automatically.' : 'Connect live sync to apply your changes without a redeploy.'}</p><button onClick={() => setDialog('publish')}>{liveConnected ? 'Manage connection' : 'Connect live sync'} <ArrowRight size={14} /></button></div></div>
            </aside>
          </div>
          <div className="ad-page-footer"><span>IREX CONTENT STUDIO</span><span>Thoughtful words. Better decisions.</span></div>
        </main>
      </div>

      {toast && <div className="ad-toast" role="status"><Check size={16} />{toast}</div>}
      <input ref={fileInput} className="ad-visually-hidden" type="file" accept="application/json,.json" onChange={importContent} aria-label="Import content JSON" />

      {dialog && <div className="ad-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !connecting) setDialog(null); }}>
        <div className={`ad-modal ${dialog === 'preview' ? 'ad-modal--preview' : ''}`} role="dialog" aria-modal="true" aria-labelledby="ad-dialog-title">
          <div className="ad-modal-header"><div><span className="ad-modal-overline">IREX CONTENT STUDIO</span><h2 id="ad-dialog-title">{dialog === 'preview' ? 'Preview your draft' : dialog === 'backups' ? 'Import & export' : dialog === 'publish' ? 'Live sync' : 'Version history'}</h2><p>{dialog === 'preview' ? 'A visual preview of your current section.' : dialog === 'backups' ? 'Keep a backup of your content and appearance.' : dialog === 'publish' ? 'Keep the online website in sync as you edit.' : 'Restore a draft saved in this browser.'}</p></div><button className="ad-icon-button" onClick={() => setDialog(null)} disabled={connecting} aria-label="Close dialog"><X size={19} /></button></div>
          {dialog === 'preview' && <div className="ad-modal-preview-body"><div className="ad-modal-preview-toolbar"><span><span className="ad-caption-dot" /> {selected.title}</span><DeviceToggle device={device} onChange={setDevice} /></div><div className="ad-modal-preview-stage"><SitePreview content={draft} appearance={appearance} section={selected} device={device} large /></div><p className="ad-modal-footnote"><Eye size={15} /> This preview reflects your current editor state.</p></div>}
          {dialog === 'backups' && <div className="ad-backup-body"><div className="ad-backup-action"><div className="ad-backup-icon"><ArrowDownToLine size={19} /></div><div><strong>Export a backup</strong><p>Download text and appearance as a JSON file.</p></div><button className="ad-button ad-button--secondary" onClick={exportContent}>Export</button></div><div className="ad-backup-action"><div className="ad-backup-icon"><Upload size={19} /></div><div><strong>Import a backup</strong><p>Continue editing a previously exported file.</p></div><button className="ad-button ad-button--secondary" onClick={() => fileInput.current?.click()}>Choose file</button></div><div className="ad-publish-instructions"><CircleHelp size={18} /><div><strong>Publishing your changes</strong><p>Connect live sync to save changes directly to the online site. Backups stay on your device until imported.</p></div></div></div>}
          {dialog === 'publish' && <div className="ad-publish-form">
            <div className="ad-repository-summary"><div className="ad-backup-icon"><Radio size={19} /></div><div><strong>{liveConnected ? 'Live sync is connected' : 'Instant website updates'}</strong><p>{liveConnected ? `Signed in as ${email}` : 'Powered by a protected Supabase content store.'}</p></div><span className={`ad-connection-badge ${liveConnected ? 'is-live' : ''}`}><i />{liveConnected ? 'LIVE' : 'OFFLINE'}</span></div>
            {liveConnected ? <><p className="ad-publish-copy">Your text and typography changes are saved automatically and sent to visitors without a redeployment.</p><div className="ad-token-notice"><LockKeyhole size={15} /><span>Only authorized editor accounts can change the live content.</span></div><div className="ad-publish-actions"><button type="button" className="ad-button ad-button--secondary" onClick={() => setDialog(null)}>Close</button><button type="button" className="ad-button ad-button--primary" onClick={disconnectLive} disabled={liveState === 'saving'}>Disconnect</button></div></> : !liveClient ? <><div className="ad-publish-instructions"><CircleHelp size={18} /><div><strong>Live sync is not configured yet</strong><p>Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, run the supplied database setup, and deploy the updated site. See the repository README for the steps.</p></div></div><div className="ad-publish-actions"><button type="button" className="ad-button ad-button--secondary" onClick={() => setDialog(null)}>Close</button></div></> : <form onSubmit={connectLive} className="ad-live-login"><p className="ad-publish-copy">Sign in with an authorized editor account. Once connected, changes will sync automatically.</p><label htmlFor="ad-live-email">Editor email</label><input id="ad-live-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="username" required disabled={connecting} /><label htmlFor="ad-live-password">Password</label><input id="ad-live-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required disabled={connecting} /><div className="ad-token-notice"><LockKeyhole size={15} /><span>Your session stays in memory and ends when you leave the editor.</span></div>{liveError && <p className="ad-publish-error" role="alert">{liveError}</p>}<div className="ad-publish-actions"><button type="button" className="ad-button ad-button--secondary" onClick={() => setDialog(null)} disabled={connecting}>Cancel</button><button type="submit" className="ad-button ad-button--primary" disabled={connecting || !email.trim() || !password}>{connecting ? 'Connecting...' : 'Start live sync'} <ArrowRight size={15} /></button></div></form>}
          </div>}
          {dialog === 'history' && <div className="ad-history-body">{history.length === 0 ? <div className="ad-empty-history"><FileClock size={26} /><strong>No saved versions yet</strong><p>When you save a draft, it will appear here.</p></div> : history.map((revision, index) => <div className="ad-history-row" key={revision.id}><div className="ad-history-icon"><Clock3 size={17} /></div><div><strong>{index === 0 ? 'Latest saved version' : `Saved version ${history.length - index}`}</strong><p>{formatSavedAt(revision.savedAt)}</p></div><button className="ad-button ad-button--secondary" onClick={() => restoreRevision(revision)}>Restore</button></div>)}<div className="ad-history-row"><div className="ad-history-icon"><FileText size={17} /></div><div><strong>Original website copy</strong><p>Content included with this version of the site.</p></div><button className="ad-button ad-button--secondary" onClick={restoreOriginal}>Restore</button></div><p className="ad-modal-footnote">History is stored only in this browser, with up to eight saved versions.</p></div>}
        </div>
      </div>}
    </div>
  );
}