import React, { useState } from 'react';
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

export default function PlatformView() {
  const client = useStarkbase();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Platform | null>(null);
  const [error, setError] = useState('');

  const platformId = localStorage.getItem('sb_platform_id');
  const apiKey     = localStorage.getItem('sb_api_key');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const platform = await client.platforms.create(name.trim());
      localStorage.setItem('sb_platform_id', platform.id);
      localStorage.setItem('sb_api_key', platform.apiKey);
      setResult(platform);
      setName('');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err.message ?? 'Failed to create platform');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('sb_platform_id');
    localStorage.removeItem('sb_api_key');
    localStorage.removeItem('sb_schemas');
    window.location.reload();
  };

  return (
    <div className="view">
      <div className="vh">
        <div className="vh-title">Platform</div>
        <div className="vh-sub">Create a platform to get your platformId and apiKey</div>
      </div>

      {/* Active platform display */}
      {(platformId || result) && (
        <div className="card">
          <div className="card-title">
            Active Platform
            <span className="badge badge-green">configured</span>
          </div>
          {result ? (
            <PlatformDisplay platform={result} onClear={handleClear} />
          ) : (
            <>
              <div className="kv">
                <span className="kv-k">platformId</span>
                <span className="kv-v">{platformId}</span>
                <CopyBtn value={platformId!} />
              </div>
              <div className="kv">
                <span className="kv-k">apiKey</span>
                <span className="kv-v">{apiKey ? maskKey(apiKey) : '—'}</span>
                {apiKey && <CopyBtn value={apiKey} />}
              </div>
              <button className="btn btn-d btn-sm" onClick={handleClear} style={{ marginTop: 10 }}>
                Clear &amp; reset
              </button>
            </>
          )}
        </div>
      )}

      {/* Post-create reload prompt */}
      {result && (
        <div className="info" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>
            Platform saved to localStorage.
            Reload to activate the new platformId in all SDK calls.
          </span>
          <button className="btn btn-p btn-sm" onClick={() => window.location.reload()}>
            Reload now
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="card">
        <div className="card-title">Create New Platform</div>
        <form onSubmit={handleCreate}>
          <div className="form-row">
            <div className="form-group">
              <label className="fl">Platform name</label>
              <input
                className="inp"
                placeholder="my-app"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <button className="btn btn-p" type="submit" disabled={loading || !name.trim()}>
              {loading ? <><div className="spin" /> Creating…</> : 'Create'}
            </button>
          </div>
          {error && <div className="err-box">{error}</div>}
        </form>
      </div>

      {/* How it works */}
      <div className="card">
        <div className="card-title">How it works</div>
        <div style={{ color: 'var(--text2)', fontSize: '12px', lineHeight: 2 }}>
          <div><span style={{ color: 'var(--accent)' }}>1.</span> Create a platform → get <code style={{ color: 'var(--code)', background: 'var(--bg2)', padding: '1px 5px', borderRadius: 3 }}>platformId</code> + <code style={{ color: 'var(--code)', background: 'var(--bg2)', padding: '1px 5px', borderRadius: 3 }}>apiKey</code></div>
          <div><span style={{ color: 'var(--accent)' }}>2.</span> Reload the page to activate the platform in the SDK</div>
          <div><span style={{ color: 'var(--accent)' }}>3.</span> Go to <strong style={{ color: 'var(--text)' }}>Auth</strong> → register users (apiKey is used for security)</div>
          <div><span style={{ color: 'var(--accent)' }}>4.</span> Go to <strong style={{ color: 'var(--text)' }}>Schemas</strong> → define typed document structures</div>
          <div><span style={{ color: 'var(--accent)' }}>5.</span> Go to <strong style={{ color: 'var(--text)' }}>Documents</strong> → upload &amp; query documents stored on EigenDA</div>
        </div>
      </div>
    </div>
  );
}

function PlatformDisplay({ platform, onClear }: { platform: Platform; onClear: () => void }) {
  return (
    <>
      <div className="kv">
        <span className="kv-k">id</span>
        <span className="kv-v">{platform.id}</span>
        <CopyBtn2 value={platform.id} />
      </div>
      <div className="kv">
        <span className="kv-k">name</span>
        <span className="kv-v">{platform.name}</span>
      </div>
      <div className="kv">
        <span className="kv-k">apiKey</span>
        <span className="kv-v">{platform.apiKey}</span>
        <CopyBtn2 value={platform.apiKey} />
      </div>
      <button className="btn btn-d btn-sm" onClick={onClear} style={{ marginTop: 10 }}>
        Clear &amp; reset
      </button>
    </>
  );
}

// Separate component to avoid duplicate key error within PlatformDisplay
function CopyBtn2({ value }: { value: string }) {
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
  return key.slice(0, 6) + '…' + key.slice(-4);
}
