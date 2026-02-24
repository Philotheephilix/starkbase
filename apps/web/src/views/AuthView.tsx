import React, { useState } from 'react';
import { useAuth } from '@starkbase/sdk';

export default function AuthView() {
  const { user, isAuthenticated, isLoading, error, register, login, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ username: '', password: '' });

  const platformId = localStorage.getItem('sb_platform_id');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'register') {
      await register(form);
    } else {
      await login(form);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="view">
        <div className="vh">
          <div className="vh-title">Auth</div>
          <div className="vh-sub">Authenticated session</div>
        </div>

        <div className="card">
          <div className="card-title">
            Session <span className="badge badge-green">active</span>
          </div>
          <div className="kv">
            <span className="kv-k">username</span>
            <span className="kv-v">{user.username}</span>
          </div>
          <div className="kv">
            <span className="kv-k">wallet</span>
            <span className="kv-v" style={{ fontSize: 11 }}>{user.walletAddress}</span>
          </div>
          <button className="btn btn-d btn-sm" onClick={logout} style={{ marginTop: 12 }}>
            Logout
          </button>
        </div>

        <div className="info">
          You are authenticated. Go to <strong>Schemas</strong> to create schemas, or{' '}
          <strong>Documents</strong> to upload and query data.
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <div className="vh">
        <div className="vh-title">Auth</div>
        <div className="vh-sub">Register or login to access document operations</div>
      </div>

      {!platformId && (
        <div className="warn-box">
          No platform configured. Create a platform first on the <strong>Platform</strong> tab.
        </div>
      )}

      <div className="card">
        <div className="card-title">Authentication</div>

        <div className="tabs">
          <button
            className={`t-btn${mode === 'login' ? ' active' : ''}`}
            onClick={() => setMode('login')}
          >Login</button>
          <button
            className={`t-btn${mode === 'register' ? ' active' : ''}`}
            onClick={() => setMode('register')}
          >Register</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="fl">Username</label>
            <input
              className="inp"
              placeholder="alice"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label className="fl">Password</label>
            <input
              className="inp"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          {error && <div className="err-box" style={{ marginBottom: 10 }}>{error.message}</div>}

          <button className="btn btn-p" type="submit" disabled={isLoading || !form.username || !form.password}>
            {isLoading
              ? <><div className="spin" />{mode === 'register' ? 'Deploying wallet…' : 'Logging in…'}</>
              : mode === 'register' ? 'Create account + deploy wallet' : 'Login'
            }
          </button>

          {mode === 'register' && (
            <p style={{ marginTop: 8, color: 'var(--text2)', fontSize: '11.5px' }}>
              Registration deploys a Starknet wallet on Sepolia — takes ~20–30s.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
