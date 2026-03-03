import { useState } from 'react';
import { useAuth } from '@starkbase/sdk';
import PlatformView from './views/PlatformView';
import AuthView from './views/AuthView';
import SchemasView from './views/SchemasView';
import DocumentsView from './views/DocumentsView';
import BlobsView from './views/BlobsView';
import EventsView from './views/EventsView';
import TokensView from './views/TokensView';

type Tab = 'platform' | 'auth' | 'schemas' | 'docs' | 'blobs' | 'events' | 'tokens';

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'platform', label: 'Platform',  icon: '⬡' },
  { id: 'auth',     label: 'Auth',      icon: '⎆' },
  { id: 'schemas',  label: 'Schemas',   icon: '◈' },
  { id: 'docs',     label: 'Documents', icon: '▦' },
  { id: 'blobs',    label: 'Blobs',     icon: '⊞' },
  { id: 'events',   label: 'Events',    icon: '◎' },
  { id: 'tokens',   label: 'Tokens',    icon: '◈' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('platform');
  const { user, isAuthenticated } = useAuth();
  const platformId = localStorage.getItem('sb_platform_id');

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sb-head">
          <div className="sb-logo">
            <div className="sb-mark">SB</div>
            <span className="sb-name">starkbase</span>
          </div>
        </div>

        <nav>
          {NAV.map(({ id, label, icon }) => (
            <button
              key={id}
              className={`nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              <span className="nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="sb-foot">
          <div className="status-pill">
            <div className={`dot ${isAuthenticated ? 'dot-on' : 'dot-off'}`} />
            <span className="label">
              {isAuthenticated && user ? user.username : 'not connected'}
            </span>
          </div>
          {platformId && (
            <div className="status-pill">
              <div className="dot dot-on" />
              <span className="label">{platformId.slice(0, 14)}…</span>
            </div>
          )}
        </div>
      </aside>

      <main className="main">
        {tab === 'platform' && <PlatformView />}
        {tab === 'auth'     && <AuthView />}
        {tab === 'schemas'  && <SchemasView />}
        {tab === 'docs'     && <DocumentsView />}
        {tab === 'blobs'    && <BlobsView />}
        {tab === 'events'   && <EventsView />}
        {tab === 'tokens'   && <TokensView />}
      </main>
    </div>
  );
}
