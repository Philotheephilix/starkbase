import React, { useState } from 'react';
import { useAuth } from '@starkbase/sdk';

const API_KEY = import.meta.env.VITE_PLATFORM_API_KEY ?? 'your-platform-api-key';

export default function App() {
  const { user, isAuthenticated, isLoading, error, register, login, logout } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const params = { ...form, apiKey: API_KEY };
    if (mode === 'register') {
      await register(params);
    } else {
      await login(params);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div style={styles.container}>
        <h1>Starkbase</h1>
        <p>Logged in as <strong>{user.username}</strong></p>
        <p style={styles.address}>Wallet: <code>{user.walletAddress}</code></p>
        <button onClick={logout} style={styles.button}>Logout</button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>Starkbase</h1>
      <p>BaaS for Starknet</p>

      <div style={styles.tabs}>
        <button
          onClick={() => setMode('login')}
          style={mode === 'login' ? styles.activeTab : styles.tab}
        >Login</button>
        <button
          onClick={() => setMode('register')}
          style={mode === 'register' ? styles.activeTab : styles.tab}
        >Register</button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          placeholder="Username"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          style={styles.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          style={styles.input}
        />
        {error && <p style={styles.error}>{error.message}</p>}
        <button type="submit" disabled={isLoading} style={styles.button}>
          {isLoading
            ? mode === 'register' ? 'Deploying wallet...' : 'Logging in...'
            : mode === 'register' ? 'Create account + wallet' : 'Login'}
        </button>
        {mode === 'register' && (
          <p style={styles.hint}>
            Registration deploys a Starknet wallet on Sepolia — takes ~20s.
          </p>
        )}
      </form>
    </div>
  );
}

const styles = {
  container: { fontFamily: 'sans-serif', maxWidth: 480, margin: '80px auto', padding: 24 },
  form: { display: 'flex', flexDirection: 'column' as const, gap: 12, marginTop: 16 },
  input: { padding: '10px 14px', borderRadius: 6, border: '1px solid #444', background: '#1a1a1a', color: '#e0e0e0', fontSize: 16 },
  button: { padding: '12px 20px', background: '#646cff', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 16 },
  tabs: { display: 'flex', gap: 8, marginBottom: 8 },
  tab: { padding: '8px 16px', background: '#2a2a2a', border: 'none', borderRadius: 4, color: '#aaa', cursor: 'pointer' },
  activeTab: { padding: '8px 16px', background: '#646cff', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' },
  address: { fontSize: 12, wordBreak: 'break-all' as const, background: '#1a1a1a', padding: 8, borderRadius: 4 },
  error: { color: '#ff6b6b', fontSize: 14, margin: 0 },
  hint: { fontSize: 12, color: '#888', margin: 0 },
};
