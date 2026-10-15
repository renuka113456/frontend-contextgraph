import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { api, authStore } from './api.js'

const navItems = [
  ['Overview', '⌂', 'dashboard'], ['Documents', '▤', 'documents'], ['Search', '⌕', 'search'],
  ['Knowledge graph', '◎', 'graph'], ['Timeline', '◷', 'timeline'], ['Collections', '▦', 'collections'],
  ['Search history', '↺', 'history'], ['Settings', '⚙', 'settings']
]
const initials = value => (value || 'CG').trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join('') || 'CG'
const dateLabel = value => {
  if (!value) return 'Date unavailable'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
const docName = d => d?.title || d?.fileName || d?.filename || d?.name || 'Untitled document'
const docId = d => d?.id ?? d?.documentId ?? d?.uuid
const docDate = d => d?.createdAt || d?.uploadedAt || d?.created_at || d?.updatedAt

function Icon({ children }) { return <span className="nav-icon" aria-hidden="true">{children}</span> }
function Notice({ notice, onClose }) {
  if (!notice) return null
  return <div className={`notice ${notice.type || 'info'}`} role="status"><span>{notice.message}</span><button onClick={onClose} aria-label="Dismiss message">×</button></div>
}
function Loading({ label = 'Loading your workspace…' }) { return <div className="loading"><span className="spinner" />{label}</div> }
function Empty({ icon = '◇', title, text, action }) {
  return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>
}
function AuthPage({ onAuthenticated, setNotice }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault(); setError('')
    if (mode === 'register' && name.trim().length < 2) return setError('Please enter your name.')
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.')
    if (password.length < 6) return setError('Password must contain at least 6 characters.')
    setBusy(true)
    try {
      if (mode === 'register') {
        await api.register(name.trim(), email.trim(), password)
        setNotice({ type: 'success', message: 'Account created. Sign in with your new credentials.' })
        setMode('login')
      } else {
        const result = await api.login(email.trim(), password)
        onAuthenticated(result.user)
      }
    } catch (err) { setError(err.message || 'Something went wrong. Please try again.') }
    finally { setBusy(false) }
  }
  return <main className="auth-layout">
    <section className="auth-brand">
      <div className="brand-lockup"><div className="brand-mark">C<span>·</span>G</div><span>ContextGraph</span></div>
      <div className="brand-message">
        <div className="eyebrow light">YOUR DIGITAL MEMORY</div>
        <h1>Every thought.<br />Connected.</h1>
        <p>A calm, searchable home for your documents, ideas, and the context you never want to lose.</p>
        <div className="memory-preview">
          <div className="preview-node node-a">Research notes</div><div className="preview-line line-a" />
          <div className="preview-node node-b">Project ideas</div><div className="preview-line line-b" />
          <div className="preview-node node-c">Meeting notes</div><div className="preview-center">CG</div>
        </div>
      </div>
      <div className="brand-foot">A little more clarity, every day.</div>
    </section>
    <section className="auth-form-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="mobile-brand brand-lockup"><div className="brand-mark">C<span>·</span>G</div><span>ContextGraph</span></div>
        <div className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</div>
        <h2>{mode === 'login' ? 'Sign in to your space' : 'Create your account'}</h2>
        <p className="muted">{mode === 'login' ? 'Pick up right where your mind left off.' : 'Start building your personal knowledge space.'}</p>
        {error && <div className="form-error">{error}</div>}
        {mode === 'register' && <label>Full name<input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required /></label>}
        <label>Email address<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required /></label>
        <label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} /></label>
        <button className="button primary wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <span>→</span></button>
        <div className="auth-switch">{mode === 'login' ? 'New to ContextGraph?' : 'Already have an account?'} <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></div>
        <p className="auth-privacy">Your documents belong to you. Keep your knowledge connected and private.</p>
      </form>
    </section>
  </main>
}

function App() {
  const [user, setUser] = useState(() => authStore.user())
  const [page, setPage] = useState('dashboard')
  const [notice, setNotice] = useState(null)
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState([])
  const [stats, setStats] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchBusy, setSearchBusy] = useState(false)
  const [history, setHistory] = useState([])
  const [collections, setCollections] = useState([])
  const [timeline, setTimeline] = useState([])
  const [graph, setGraph] = useState(null)
  const [profile, setProfile] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [collectionName, setCollectionName] = useState('')
  const [collectionDescription, setCollectionDescription] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileBusy, setProfileBusy] = useState(false)

  const showNotice = useCallback((message, type = 'error') => setNotice({ message, type }), [])
  const loadDocuments = useCallback(async () => {
    const list = await api.documents()
    setDocuments(list)
    return list
  }, [])
  const loadPage = useCallback(async (target = page) => {
    if (!authStore.token()) return
    setLoading(true)
    try {
      if (target === 'dashboard' || target === 'documents') {
        const tasks = [loadDocuments()]
        if (target === 'dashboard') tasks.push(api.dashboard().then(setStats).catch(() => setStats(null)))
        await Promise.all(tasks)
      } else if (target === 'collections') setCollections(await api.collections())
      else if (target === 'timeline') setTimeline(await api.timeline())
      else if (target === 'history') setHistory(await api.searchHistory())
      else if (target === 'graph') setGraph(await api.graph())
      else if (target === 'settings') {
        const result = await api.profile()
        setProfile(result || {})
        setProfileName(result?.name || result?.fullName || user?.name || '')
        setProfileEmail(result?.email || user?.email || '')
      }
    } catch (err) { showNotice(err.message || 'Could not load this section.') }
    finally { setLoading(false) }
  }, [page, loadDocuments, showNotice, user])
  useEffect(() => {
    const onUnauthorized = () => { setUser(null); setNotice({ type: 'error', message: 'Your session expired. Please sign in again.' }) }
    window.addEventListener('contextgraph:unauthorized', onUnauthorized)
    return () => window.removeEventListener('contextgraph:unauthorized', onUnauthorized)
  }, [])
  useEffect(() => { if (user && authStore.token()) loadPage(page) }, [user, page, loadPage])
  const displayName = user?.name || user?.fullName || user?.email?.split('@')[0] || 'Your workspace'
  const filteredDocuments = useMemo(() => documents, [documents])

  function logout() { authStore.clear(); setUser(null); setDocuments([]); setPage('dashboard'); setNotice(null) }
  async function uploadFile(file) {
    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return showNotice('Please choose a PDF file.', 'error')
    if (file.size > 15 * 1024 * 1024) return showNotice('This PDF is larger than 15 MB. Choose a smaller file.', 'error')
    setUploadBusy(true)
    try {
      await api.upload(file)
      showNotice('PDF uploaded successfully.', 'success')
      await loadDocuments()
      setPage('documents')
    } catch (err) { showNotice(err.message || 'Upload failed.') }
    finally { setUploadBusy(false) }
  }
  async function runSearch(e) {
    e?.preventDefault()
    const q = searchText.trim()
    if (!q) return showNotice('Enter a word or phrase to search.', 'info')
    setSearchBusy(true); setPage('search')
    try { setSearchResults(await api.search(q)); }
    catch (err) { showNotice(err.message || 'Search failed.') }
    finally { setSearchBusy(false) }
  }
  async function deleteDoc(doc) {
    const id = docId(doc)
    if (id == null) return showNotice('This document does not include an ID, so it cannot be deleted.')
    if (!window.confirm(`Delete “${docName(doc)}”? This cannot be undone.`)) return
    try {
      await api.deleteDocument(id)
      setDocuments(current => current.filter(d => String(docId(d)) !== String(id)))
      setSelectedDoc(null)
      showNotice('Document deleted.', 'success')
    } catch (err) { showNotice(err.message || 'Could not delete this document.') }
  }
  async function openDoc(doc) {
    const id = docId(doc)
    if (id == null) { setSelectedDoc(doc); return }
    try { setSelectedDoc(await api.document(id)) }
    catch (err) { showNotice(err.message || 'Could not open document.'); setSelectedDoc(doc) }
  }
  async function createCollection(e) {
    e.preventDefault()
    if (!collectionName.trim()) return
    try {
      await api.createCollection({ name: collectionName.trim(), description: collectionDescription.trim() })
      setCollectionName(''); setCollectionDescription('')
      setCollections(await api.collections())
      showNotice('Collection created.', 'success')
    } catch (err) { showNotice(err.message || 'Could not create collection.') }
  }
  async function saveProfile(e) {
    e.preventDefault(); setProfileBusy(true)
    try {
      const updated = await api.updateProfile({ ...profile, name: profileName.trim(), email: profileEmail.trim() })
      const nextUser = { ...user, ...(updated || {}), name: updated?.name || profileName.trim(), email: updated?.email || profileEmail.trim() }
      authStore.save(authStore.token(), nextUser); setUser(nextUser); setProfile(updated || nextUser)
      showNotice('Profile updated.', 'success')
    } catch (err) { showNotice(err.message || 'Could not save profile.') }
    finally { setProfileBusy(false) }
  }

  if (!user || !authStore.token()) return <><AuthPage onAuthenticated={u => { setUser(u); setNotice(null) }} setNotice={setNotice} /><Notice notice={notice} onClose={() => setNotice(null)} /></>

  const title = navItems.find(item => item[2] === page)?.[0] || 'Overview'
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand-lockup sidebar-brand"><div className="brand-mark">C<span>·</span>G</div><span>ContextGraph</span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{navItems.map(([label, icon, key]) => <button key={key} className={`nav-item ${page === key ? 'active' : ''}`} onClick={() => { setPage(key); setSelectedDoc(null) }}><Icon>{icon}</Icon><span>{label}</span>{key === 'documents' && documents.length > 0 && <small>{documents.length}</small>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="storage-card"><div className="storage-icon">✦</div><strong>Your mind, organized.</strong><p>Bring scattered notes together into one connected memory.</p><button onClick={() => setPage('documents')}>Explore documents <span>↗</span></button></div>
        <button className="profile-chip" onClick={() => setPage('settings')}><div className="avatar">{initials(displayName)}</div><div className="profile-chip-text"><strong>{displayName}</strong><span>{user?.email || 'Personal workspace'}</span></div><span className="more">···</span></button>
      </div>
    </aside>
    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{title}</strong></div>
        <div className="top-actions"><span className="connection-dot" title="Backend connection is checked when you load data" /> <span className="top-user">{user?.email || displayName}</span><button className="icon-button" title="Settings" onClick={() => setPage('settings')}>⚙</button><button className="button ghost small" onClick={logout}>Log out</button></div>
      </header>
      <div className="content">
        <Notice notice={notice} onClose={() => setNotice(null)} />
        {page === 'dashboard' && <Dashboard displayName={displayName} documents={documents} stats={stats} onNavigate={setPage} onUpload={uploadFile} uploadBusy={uploadBusy} onOpen={openDoc} />}
        {page === 'documents' && <Documents documents={filteredDocuments} loading={loading} onUpload={uploadFile} uploadBusy={uploadBusy} onOpen={openDoc} onDelete={deleteDoc} selectedDoc={selectedDoc} onCloseDoc={() => setSelectedDoc(null)} />}
        {page === 'search' && <SearchView value={searchText} onChange={setSearchText} onSearch={runSearch} busy={searchBusy} results={searchResults} onOpen={openDoc} />}
        {page === 'graph' && <GraphView graph={graph} loading={loading} documents={documents} onOpen={openDoc} />}
        {page === 'timeline' && <TimelineView items={timeline} loading={loading} onOpen={openDoc} />}
        {page === 'collections' && <CollectionsView items={collections} loading={loading} name={collectionName} setName={setCollectionName} description={collectionDescription} setDescription={setCollectionDescription} onCreate={createCollection} onDelete={async item => { if (!window.confirm(`Delete collection “${item.name || 'this collection'}”?`)) return; try { await api.deleteCollection(item.id); setCollections(await api.collections()); showNotice('Collection deleted.', 'success') } catch (e) { showNotice(e.message) } }} />}
        {page === 'history' && <HistoryView items={history} loading={loading} onRepeat={item => { setSearchText(item.query || item.searchQuery || item.term || String(item)); setPage('search') }} />}
        {page === 'settings' && <SettingsView name={profileName} setName={setProfileName} email={profileEmail} setEmail={setProfileEmail} onSave={saveProfile} busy={profileBusy} />}
      </div>
      <footer className="footer"><span>ContextGraph <span className="footer-dot">•</span> Your digital memory, connected.</span><span>Made for clarity.</span></footer>
    </main>
  </div>
}

function PageHeading({ eyebrow, title, subtitle, children }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{children && <div className="heading-actions">{children}</div>}</div>
}
function UploadButton({ onUpload, busy, compact = false }) {
  return <label className={`button primary upload-button ${compact ? 'small' : ''} ${busy ? 'disabled' : ''}`}>{busy ? 'Uploading…' : <>{compact ? '＋ Add PDF' : '＋ Upload a PDF'}</>}<input type="file" accept="application/pdf,.pdf" disabled={busy} onChange={e => { onUpload(e.target.files?.[0]); e.target.value = '' }} /></label>
}
function Dashboard({ displayName, documents, stats, onNavigate, onUpload, uploadBusy, onOpen }) {
  const recent = [...documents].sort((a,b) => new Date(docDate(b) || 0) - new Date(docDate(a) || 0)).slice(0, 5)
  const count = stats?.documentCount ?? stats?.totalDocuments ?? stats?.documentsCount ?? documents.length
  return <>
    <PageHeading eyebrow="YOUR PERSONAL KNOWLEDGE SPACE" title={`Good to have you here, ${displayName.split(' ')[0]}.`} subtitle="A clear view of everything you've saved and the ideas connected to it."><UploadButton onUpload={onUpload} busy={uploadBusy} /></PageHeading>
    <section className="welcome-banner"><div className="welcome-copy"><div className="welcome-tag"><span>✦</span> YOUR MEMORY, IN ONE PLACE</div><h2>Keep the context.<br /><em>Find the connection.</em></h2><p>Save the things that matter. ContextGraph helps you bring them back when you need them.</p><button className="button light-button" onClick={() => onNavigate('documents')}>Explore your library <span>→</span></button></div><div className="welcome-art"><div className="art-orbit orbit-1" /><div className="art-orbit orbit-2" /><div className="art-orbit orbit-3" /><div className="art-core">C<span>·</span>G</div><div className="art-pill pill-1">Notes</div><div className="art-pill pill-2">Ideas</div><div className="art-pill pill-3">Research</div><div className="art-pill pill-4">Projects</div></div></section>
    <div className="section-title-row"><div><h2>Your workspace at a glance</h2><p>Everything you have collected so far.</p></div><button className="text-button" onClick={() => onNavigate('documents')}>View all documents <span>→</span></button></div>
    <div className="stats-grid">
      <div className="stat-card"><div className="stat-icon violet">▤</div><span className="stat-label">Total documents</span><strong>{count}</strong><small>Stored in your library</small></div>
      <div className="stat-card"><div className="stat-icon peach">⌕</div><span className="stat-label">Search & discover</span><strong className="stat-word">Find context</strong><small>Search across saved content</small><button className="stat-link" onClick={() => onNavigate('search')}>Start searching ↗</button></div>
      <div className="stat-card"><div className="stat-icon mint">◎</div><span className="stat-label">Knowledge graph</span><strong className="stat-word">See links</strong><small>Explore related information</small><button className="stat-link" onClick={() => onNavigate('graph')}>Explore graph ↗</button></div>
      <div className="stat-card"><div className="stat-icon blue">◷</div><span className="stat-label">Memory timeline</span><strong className="stat-word">Look back</strong><small>Revisit your knowledge over time</small><button className="stat-link" onClick={() => onNavigate('timeline')}>Open timeline ↗</button></div>
    </div>
    <div className="section-title-row recent-title"><div><h2>Recently added</h2><p>Your latest additions to ContextGraph.</p></div><button className="text-button" onClick={() => onNavigate('documents')}>All documents <span>→</span></button></div>
    <div className="panel recent-panel">
      {recent.length ? <div className="document-list">{recent.map((doc, i) => <DocumentRow key={docId(doc) ?? i} doc={doc} onOpen={() => onOpen(doc)} />)}</div> : <Empty icon="▤" title="Your library starts here" text="Upload a PDF to begin building your searchable digital memory." action={<UploadButton onUpload={onUpload} busy={uploadBusy} compact />} />}
    </div>
  </>
}
function DocumentRow({ doc, onOpen, onDelete, compact = false }) {
  const name = docName(doc)
  return <div className="document-row"><button className="file-icon" onClick={onOpen} aria-label={`Open ${name}`}>PDF</button><button className="document-info" onClick={onOpen}><strong>{name}</strong><span>{doc?.description || doc?.originalFilename || 'PDF document'} <i>·</i> {dateLabel(docDate(doc))}</span></button><div className="document-meta">{doc?.size ? `${(doc.size / 1024 / 1024).toFixed(1)} MB` : <span className="status-pill">Saved</span>}</div>{onDelete && <button className="row-more" title="Delete document" onClick={onDelete}>···</button>}</div>
}
function Documents({ documents, loading, onUpload, uploadBusy, onOpen, onDelete, selectedDoc, onCloseDoc }) {
  const [query, setQuery] = useState('')
  const filtered = documents.filter(d => docName(d).toLowerCase().includes(query.toLowerCase()))
  return <>
    <PageHeading eyebrow="YOUR LIBRARY" title="Documents" subtitle="All the notes, research, and files you've chosen to keep."><UploadButton onUpload={onUpload} busy={uploadBusy} /></PageHeading>
    <div className="toolbar"><div className="search-field"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter your documents…" aria-label="Filter documents" /></div><span className="result-count">{filtered.length} {filtered.length === 1 ? 'document' : 'documents'}</span></div>
    {selectedDoc && <div className="panel detail-panel"><button className="close-detail" onClick={onCloseDoc}>×</button><div className="detail-label">DOCUMENT PREVIEW</div><h2>{docName(selectedDoc)}</h2><p className="muted">{selectedDoc?.description || selectedDoc?.originalFilename || 'Document details returned by the backend.'}</p><div className="detail-body">{selectedDoc?.extractedText || selectedDoc?.content || selectedDoc?.text || selectedDoc?.summary || 'No extracted text was returned for this document.'}</div></div>}
    <div className="panel">
      {loading ? <Loading label="Loading documents…" /> : filtered.length ? <div className="document-list">{filtered.map((doc, i) => <DocumentRow key={docId(doc) ?? i} doc={doc} onOpen={() => onOpen(doc)} onDelete={() => onDelete(doc)} />)}</div> : <Empty icon="▤" title={query ? 'No matching documents' : 'Nothing saved yet'} text={query ? 'Try a different title or clear the filter.' : 'Upload your first PDF to start collecting useful context.'}><UploadButton onUpload={onUpload} busy={uploadBusy} compact /></Empty>}
    </div>
  </>
}
function SearchView({ value, onChange, onSearch, busy, results, onOpen }) {
  return <>
    <PageHeading eyebrow="RECALL WHAT MATTERS" title="Search your memory" subtitle="Find details across your saved documents, without digging through every file." />
    <form className="search-hero" onSubmit={onSearch}><div className="big-search-icon">⌕</div><input value={value} onChange={e => onChange(e.target.value)} placeholder="Try a project name, a concept, or a phrase…" aria-label="Search documents" /><button className="button primary" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button><div className="search-hint">Search is performed by your connected ContextGraph backend.</div></form>
    <div className="section-title-row results-heading"><div><h2>Search results</h2><p>{results.length ? `${results.length} result${results.length === 1 ? '' : 's'} returned` : 'Your matching documents will appear here.'}</p></div></div>
    <div className="panel">{busy ? <Loading label="Searching your documents…" /> : results.length ? <div className="document-list">{results.map((r, i) => <div className="search-result" key={docId(r) ?? r.id ?? i}><div className="result-mark">⌕</div><div className="result-copy"><button onClick={() => onOpen(r)}>{docName(r)}</button><p>{r.snippet || r.matchingText || r.excerpt || r.contentSnippet || r.description || 'Open this result to inspect the document details.'}</p><span>{dateLabel(docDate(r))}</span></div><button className="open-arrow" onClick={() => onOpen(r)}>↗</button></div>)}</div> : <Empty icon="⌕" title="Ready when you are" text="Enter a search above to retrieve information from your saved documents." />}</div>
  </>
}
function GraphView({ graph, loading, documents, onOpen }) {
  const nodes = Array.isArray(graph) ? graph : (graph?.nodes || graph?.items || graph?.data?.nodes || [])
  const edges = graph?.edges || graph?.links || graph?.data?.edges || []
  return <>
    <PageHeading eyebrow="SEE THE BIGGER PICTURE" title="Knowledge graph" subtitle="Explore how your saved information connects across topics and documents." />
    <div className="graph-summary"><div><div className="stat-icon violet">◎</div><strong>{nodes.length}</strong><span>Connected nodes</span></div><div><div className="stat-icon mint">↗</div><strong>{edges.length}</strong><span>Relationships</span></div><div className="graph-note"><strong>Connections grow with your library</strong><p>As you save more information, this view can reveal how your knowledge fits together.</p></div></div>
    <div className="panel graph-panel">{loading ? <Loading label="Building your graph…" /> : nodes.length ? <div className="graph-canvas"><div className="graph-decoration graph-ring-one" /><div className="graph-decoration graph-ring-two" /><svg className="graph-lines" viewBox="0 0 800 360" preserveAspectRatio="none" aria-hidden="true">{edges.map((edge, i) => <line key={i} x1={120 + ((i * 97) % 520)} y1={65 + ((i * 53) % 220)} x2={220 + ((i * 79) % 480)} y2={80 + ((i * 71) % 220)} />)}</svg>{nodes.slice(0, 12).map((node, i) => { const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2; const x = 50 + 35 * Math.cos(angle); const y = 50 + 32 * Math.sin(angle); return <button key={node.id ?? i} className={`graph-node node-${i % 5}`} style={{ left: `${x}%`, top: `${y}%` }} title={node.label || node.title || node.name} onClick={() => { const found = documents.find(d => String(docId(d)) === String(node.documentId ?? node.id) || docName(d) === (node.label || node.title || node.name)); if (found) onOpen(found) }}><span>{(node.label || node.title || node.name || 'Document').slice(0, 28)}</span></button> })}<div className="graph-center">Context<br /><b>Graph</b></div></div> : <Empty icon="◎" title="Your graph is waiting to grow" text="There isn't enough relationship data yet. Add documents first; the graph will display nodes and links returned by the backend." action={<span className="inline-link">{documents.length} document{documents.length === 1 ? '' : 's'} in your library</span>} />}</div>
  </>
}
function TimelineView({ items, loading, onOpen }) {
  const sorted = [...items].sort((a,b) => new Date(docDate(b) || b.date || 0) - new Date(docDate(a) || a.date || 0))
  return <>
    <PageHeading eyebrow="YOUR KNOWLEDGE, OVER TIME" title="Memory timeline" subtitle="Revisit the moments and documents that shaped your growing knowledge." />
    <div className="panel timeline-panel">{loading ? <Loading label="Loading your timeline…" /> : sorted.length ? <div className="timeline-list">{sorted.map((item, i) => <div className="timeline-entry" key={docId(item) ?? i}><div className="timeline-marker"><span /></div><div className="timeline-date">{dateLabel(docDate(item) || item.date || item.timestamp)}</div><div className="timeline-card"><div className="timeline-file">PDF</div><div><button onClick={() => onOpen(item)}>{docName(item)}</button><p>{item.description || item.summary || item.activity || 'Added to your knowledge space'}</p></div><span className="timeline-arrow">↗</span></div></div>)}</div> : <Empty icon="◷" title="Your story starts here" text="When your documents and knowledge activity are available, you'll see them arranged in chronological order." />}</div>
  </>
}
function CollectionsView({ items, loading, name, setName, description, setDescription, onCreate, onDelete }) {
  return <>
    <PageHeading eyebrow="GROUP WHAT BELONGS TOGETHER" title="Collections" subtitle="Create focused spaces for projects, research, or anything you want to keep together." />
    <form className="panel create-collection" onSubmit={onCreate}><div className="create-icon">＋</div><div className="create-fields"><h3>Create a collection</h3><div className="form-grid"><label>Collection name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Final year project" required /></label><label>Description <span className="optional">(optional)</span><input value={description} onChange={e => setDescription(e.target.value)} placeholder="What belongs in this collection?" /></label></div></div><button className="button primary" type="submit">Create collection</button></form>
    <div className="section-title-row"><div><h2>Your collections</h2><p>Keep related documents easy to find.</p></div></div>
    <div className="collection-grid">{loading ? <div className="panel"><Loading /></div> : items.length ? items.map((item, i) => <div className="collection-card" key={item.id ?? i}><div className={`collection-art art-${i % 4}`}><span>{['▦','✧','◈','⌘'][i % 4]}</span><i /><i /><i /></div><div className="collection-card-body"><div className="collection-title-row"><h3>{item.name || item.title || 'Untitled collection'}</h3><button className="row-more" title="Delete collection" onClick={() => onDelete(item)}>···</button></div><p>{item.description || 'A place for related ideas and documents.'}</p><span className="collection-count">{item.documentCount ?? item.documents?.length ?? 0} documents</span></div></div>) : <div className="panel collection-empty"><Empty icon="▦" title="No collections yet" text="Create your first collection above to group related knowledge." /></div>}</div>
  </>
}
function HistoryView({ items, loading, onRepeat }) {
  return <>
    <PageHeading eyebrow="PICK UP WHERE YOU LEFT OFF" title="Search history" subtitle="Return to previous questions and searches in a single click." />
    <div className="panel history-panel">{loading ? <Loading /> : items.length ? <div className="history-list">{items.map((item, i) => <div className="history-row" key={item.id ?? i}><div className="history-icon">⌕</div><div className="history-copy"><strong>{item.query || item.searchQuery || item.term || String(item)}</strong><span>{dateLabel(item.createdAt || item.searchedAt || item.timestamp || item.date)}</span></div><button className="button ghost small" onClick={() => onRepeat(item)}>Search again ↗</button></div>)}</div> : <Empty icon="↺" title="No searches saved yet" text="Your recent searches will appear here when search history is enabled on the backend." />}</div>
  </>
}
function SettingsView({ name, setName, email, setEmail, onSave, busy }) {
  return <>
    <PageHeading eyebrow="MAKE IT YOURS" title="Settings" subtitle="Manage your profile and the details associated with your workspace." />
    <div className="settings-layout"><div className="settings-nav"><div className="settings-nav-item active">◉ <span>Profile information</span></div><div className="settings-nav-item">♧ <span>Account & security</span></div></div><form className="panel settings-card" onSubmit={onSave}><div className="settings-card-heading"><div className="avatar large">{initials(name || email)}</div><div><h2>Profile information</h2><p>Update the details shown in your workspace.</p></div></div><label>Full name<input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required /></label><label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required /></label><div className="settings-actions"><span className="muted">Changes are saved to your account.</span><button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button></div></form></div>
  </>
}

export default App
