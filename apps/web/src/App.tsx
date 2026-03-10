import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, useStarkbase } from '@starkbase/sdk';
import { useNavigate, Link } from 'react-router-dom';
import type { Platform } from '@starkbase/sdk';
import PlatformView from './views/PlatformView';
import SchemasView from './views/SchemasView';
import BlobsView from './views/BlobsView';
import EventsView from './views/EventsView';
import TokensView from './views/TokensView';
import UsersView from './views/UsersView';
import './console.css';

type Tab = 'platform' | 'users' | 'schemas' | 'blobs' | 'events' | 'tokens';

const NAV: { id: Tab; label: string }[] = [
  { id: 'platform', label: 'Platform' },
  { id: 'users',    label: 'Users' },
  { id: 'schemas',  label: 'Schemas' },
  { id: 'blobs',    label: 'Blobs' },
  { id: 'events',   label: 'Events' },
  { id: 'tokens',   label: 'Tokens' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('platform');
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const client = useStarkbase();
  const navigate = useNavigate();

  // Platform selector state
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Profile panel state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load platforms filtered by current user's wallet
  const loadPlatforms = useCallback(async () => {
    if (!user?.walletAddress) return;
    try {
      const list = await client.platforms.listByWallet(user.walletAddress);
      setPlatforms(list);
      // Auto-select stored platform
      const storedId = localStorage.getItem('sb_platform_id');
      if (storedId) {
        const found = list.find(p => p.id === storedId);
        if (found) setActivePlatform(found);
      }
    } catch {
      // ignore
    }
  }, [client, user?.walletAddress]);

  useEffect(() => {
    if (isAuthenticated && user?.walletAddress) loadPlatforms();
  }, [isAuthenticated, user?.walletAddress, loadPlatforms]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated) return null;

  const selectPlatform = (p: Platform) => {
    setActivePlatform(p);
    localStorage.setItem('sb_platform_id', p.id);
    localStorage.setItem('sb_api_key', p.apiKey);
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="console"><div className="app">
      <aside className="sidebar">
        <div className="sb-head">
          <Link to="/" className="sb-logo" style={{ textDecoration: 'none' }}>
            <div className="sb-mark">SB</div>
            <span className="sb-name">Starkbase</span>
          </Link>

          {/* Platform selector dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative', marginTop: 14 }}>
            <button
              className="platform-selector"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <span className="platform-selector-text">
                {activePlatform ? activePlatform.name : 'Select platform'}
              </span>
              <span className="platform-selector-chevron">{dropdownOpen ? '▲' : '▼'}</span>
            </button>

            {dropdownOpen && (
              <div className="platform-dropdown">
                {platforms.length === 0 ? (
                  <div className="platform-dropdown-empty">
                    No platforms yet
                  </div>
                ) : (
                  platforms.map(p => (
                    <button
                      key={p.id}
                      className={`platform-dropdown-item ${activePlatform?.id === p.id ? 'active' : ''}`}
                      onClick={() => selectPlatform(p)}
                    >
                      <span className="platform-dropdown-name">{p.name}</span>
                      <span className="platform-dropdown-id">{p.id.slice(0, 8)}...</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <nav>
          {NAV.map(({ id, label }) => (
            <button
              key={id}
              className={`nav-item ${tab === id ? 'active' : ''}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="sb-foot" ref={profileRef} style={{ position: 'relative' }}>
          {/* Profile popup */}
          {profileOpen && user && (
            <div className="profile-panel">
              <div className="profile-panel-header">Profile</div>
              <div className="profile-kv">
                <span className="profile-kv-k">Username</span>
                <span className="profile-kv-v">{user.username}</span>
              </div>
              <div className="profile-kv">
                <span className="profile-kv-k">Wallet</span>
                <span className="profile-kv-v" style={{ fontSize: 10 }}>
                  {user.walletAddress}
                </span>
              </div>
              <div className="profile-kv">
                <span className="profile-kv-k">Platform</span>
                <span className="profile-kv-v" style={{ fontSize: 10 }}>
                  {user.platformId}
                </span>
              </div>
              <button className="profile-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}

          <button
            className="user-pill"
            onClick={() => setProfileOpen(!profileOpen)}
          >
            <div className={`dot ${isAuthenticated ? 'dot-on' : 'dot-off'}`} />
            <span className="label">
              {user ? user.username : 'not connected'}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.5 }}>
              {profileOpen ? '▲' : '▼'}
            </span>
          </button>
        </div>
      </aside>

      <main className="main">
        {tab === 'platform' && (
          <PlatformView
            platforms={platforms}
            activePlatform={activePlatform}
            onSelectPlatform={selectPlatform}
            onPlatformsChanged={loadPlatforms}
            walletAddress={user?.walletAddress ?? ''}
          />
        )}
        {tab === 'users'    && <UsersView />}
        {tab === 'schemas'  && <SchemasView />}
        {tab === 'blobs'    && <BlobsView />}
        {tab === 'events'   && <EventsView />}
        {tab === 'tokens'   && <TokensView />}
      </main>
    </div></div>
  );
}
