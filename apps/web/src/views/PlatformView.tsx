import { useState } from 'react';
import { useStarkbase } from '@starkbase/sdk';
import type { Platform } from '@starkbase/sdk';

function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button className={`copy-btn${copied ? ' ok' : ''}`} onClick={copy}>
      {copied ? 'copied' : 'copy'}
    </button>
  );
}

function maskKey(key: string): string {
  if (key.length <= 12) return '***';
  return key.slice(0, 6) + '...' + key.slice(-4);
}

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

interface Props {
  platforms: Platform[];
  activePlatform: Platform | null;
  onSelectPlatform: (p: Platform) => void;
  onPlatformsChanged: () => void;
  walletAddress: string;
}

export default function PlatformView({ platforms, activePlatform, onSelectPlatform, onPlatformsChanged, walletAddress }: Props) {
  const client = useStarkbase();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      console.log('[PlatformView] creating with wallet:', walletAddress);
      const platform = await client.platforms.create(name.trim(), walletAddress);
      onSelectPlatform(platform);
      onPlatformsChanged();
      setName('');
      setModalOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err.message ?? 'Failed to create platform');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view">
      <div className="vh" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="vh-title">Platforms</div>
          <div className="vh-sub">Manage your Starkbase platforms</div>
        </div>
        <button className="btn btn-p" onClick={() => setModalOpen(true)}>
          + Create Platform
        </button>
      </div>

      {/* Active platform detail */}
      {activePlatform && (
        <div className="card" style={{ borderColor: 'rgba(255,77,0,0.3)', background: 'rgba(255,77,0,0.04)' }}>
          <div className="card-title">
            Active Platform
            <span className="badge badge-green">selected</span>
          </div>
          <div className="kv">
            <span className="kv-k">Name</span>
            <span className="kv-v" style={{ fontWeight: 600, color: 'var(--textb)' }}>{activePlatform.name}</span>
          </div>
          <div className="kv">
            <span className="kv-k">Platform ID</span>
            <span className="kv-v">{activePlatform.id}</span>
            <CopyBtn value={activePlatform.id} />
          </div>
          <div className="kv">
            <span className="kv-k">API Key</span>
            <span className="kv-v">{maskKey(activePlatform.apiKey)}</span>
            <CopyBtn value={activePlatform.apiKey} />
          </div>
          <div className="kv">
            <span className="kv-k">Created</span>
            <span className="kv-v">{formatDate(activePlatform.createdAt)}</span>
          </div>
        </div>
      )}

      {/* Platforms grid */}
      {platforms.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 22px' }}>
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 12 }}>+</div>
          <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>
            No platforms yet. Create your first platform to get started.
          </div>
          <button className="btn btn-p" onClick={() => setModalOpen(true)}>
            + Create Platform
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {platforms.map(p => (
            <div
              key={p.id}
              className="card"
              style={{
                cursor: 'pointer',
                marginBottom: 0,
                borderColor: activePlatform?.id === p.id ? 'var(--orange)' : 'var(--border)',
                background: activePlatform?.id === p.id ? 'rgba(255,77,0,0.04)' : 'var(--bg1)',
                transition: 'all 0.15s',
              }}
              onClick={() => onSelectPlatform(p)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36,
                  background: activePlatform?.id === p.id ? 'var(--orange)' : 'var(--bg3)',
                  borderRadius: 10,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 14, fontWeight: 700,
                  color: activePlatform?.id === p.id ? 'black' : 'var(--text2)',
                  textTransform: 'uppercase',
                  flexShrink: 0,
                }}>
                  {p.name.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, color: 'var(--textb)', fontSize: 14,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace' }}>
                    {p.id.slice(0, 18)}...
                  </div>
                </div>
                {activePlatform?.id === p.id && (
                  <span className="badge badge-green" style={{ flexShrink: 0 }}>active</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                {formatDate(p.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Getting Started</div>
        <div style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 2.2 }}>
          <div>
            <span style={{ color: 'var(--orange)', fontWeight: 600 }}>1.</span> Create a platform to get your{' '}
            <code style={{ color: 'var(--orange)', background: 'var(--bg2)', padding: '2px 6px', borderRadius: 6, fontSize: 11 }}>platformId</code> +{' '}
            <code style={{ color: 'var(--orange)', background: 'var(--bg2)', padding: '2px 6px', borderRadius: 6, fontSize: 11 }}>apiKey</code>
          </div>
          <div>
            <span style={{ color: 'var(--orange)', fontWeight: 600 }}>2.</span> Select a platform from the dropdown to activate it
          </div>
          <div>
            <span style={{ color: 'var(--orange)', fontWeight: 600 }}>3.</span> Go to <strong style={{ color: 'var(--textb)' }}>Schemas</strong> to define typed document structures
          </div>
          <div>
            <span style={{ color: 'var(--orange)', fontWeight: 600 }}>4.</span> Go to <strong style={{ color: 'var(--textb)' }}>Documents</strong> to upload & query data stored on EigenDA
          </div>
        </div>
      </div>

      {/* Create Platform Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => !loading && setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Platform</span>
              <button className="modal-close" onClick={() => !loading && setModalOpen(false)}>
                x
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="fl">Platform name</label>
                <input
                  className="inp"
                  placeholder="my-app"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                />
              </div>
              {error && <div className="err-box">{error}</div>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-s"
                  onClick={() => !loading && setModalOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button className="btn btn-p" type="submit" disabled={loading || !name.trim()}>
                  {loading ? <><div className="spin" /> Creating...</> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
