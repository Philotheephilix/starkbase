import { useState, useEffect, useCallback } from 'react';
import { useStarkbase } from '@starkbase/sdk';

interface PlatformUser {
  userId: string;
  username: string;
  walletAddress: string;
  deployed: boolean;
  createdAt: number;
}

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

function formatDate(epoch: number): string {
  return new Date(epoch * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function UsersView() {
  const client = useStarkbase();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // Create user modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const platformId = localStorage.getItem('sb_platform_id');
  const apiKey = localStorage.getItem('sb_api_key');

  const loadUsers = useCallback(async () => {
    if (!platformId) return;
    setLoading(true);
    setError('');
    try {
      const result = await client.auth.listUsers(platformId);
      setUsers(result);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err.message ?? 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [client, platformId]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !apiKey) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('http://localhost:8080/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, username: newUsername.trim(), password: newPassword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setNewUsername('');
      setNewPassword('');
      setModalOpen(false);
      loadUsers();
    } catch (err: any) {
      setCreateError(err.message ?? 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="view">
      <div className="vh" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="vh-title">Users</div>
          <div className="vh-sub">Platform users and their wallets</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-s"
            onClick={loadUsers}
            disabled={loading}
          >
            {loading ? <><div className="spin" /> Loading...</> : 'Refresh'}
          </button>
          <button className="btn btn-p" onClick={() => setModalOpen(true)} disabled={!platformId}>
            + Create User
          </button>
        </div>
      </div>

      {!platformId && (
        <div className="warn-box">
          No platform selected. Select a platform from the dropdown first.
        </div>
      )}

      {error && <div className="err-box">{error}</div>}

      {/* Stats bar */}
      {users.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div className="card" style={{ flex: 1, marginBottom: 0, textAlign: 'center', padding: '18px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--textb)', fontFamily: "'DM Serif Display', serif" }}>
              {users.length}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
              Total Users
            </div>
          </div>
          <div className="card" style={{ flex: 1, marginBottom: 0, textAlign: 'center', padding: '18px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--orange)', fontFamily: "'DM Serif Display', serif" }}>
              {users.filter(u => u.deployed).length}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
              Wallets Deployed
            </div>
          </div>
          <div className="card" style={{ flex: 1, marginBottom: 0, textAlign: 'center', padding: '18px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text2)', fontFamily: "'DM Serif Display', serif" }}>
              {users.filter(u => !u.deployed).length}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
              Pending
            </div>
          </div>
        </div>
      )}

      {/* Users list */}
      {loading && users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 22px' }}>
          <div className="loading" style={{ justifyContent: 'center' }}>
            <div className="spin" /> Loading users...
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 22px' }}>
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 12 }}>0</div>
          <div style={{ color: 'var(--text2)', fontSize: 13 }}>
            No users registered on this platform yet.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-title">
            Registered Users
            <span className="badge badge-dim">{users.length}</span>
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th>Username</th>
                <th>Wallet</th>
                <th>Status</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <>
                  <tr
                    key={user.userId}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === user.userId ? null : user.userId)}
                  >
                    <td>
                      <span style={{ color: 'var(--textb)', fontWeight: 500 }}>{user.username}</span>
                      <span style={{ color: 'var(--text2)', fontSize: 10, marginLeft: 6 }}>
                        {expanded === user.userId ? '▲' : '▼'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text2)' }}>
                      {user.walletAddress ? `${user.walletAddress.slice(0, 10)}...${user.walletAddress.slice(-6)}` : '—'}
                    </td>
                    <td>
                      {user.deployed
                        ? <span className="badge badge-green">deployed</span>
                        : <span className="badge badge-amber">pending</span>
                      }
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text2)' }}>
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                  {expanded === user.userId && (
                    <tr key={`${user.userId}-detail`}>
                      <td colSpan={4} style={{ background: 'var(--bg2)', padding: '14px 16px' }}>
                        <div className="kv">
                          <span className="kv-k">User ID</span>
                          <span className="kv-v" style={{ fontSize: 11 }}>{user.userId}</span>
                          <CopyBtn value={user.userId} />
                        </div>
                        <div className="kv">
                          <span className="kv-k">Username</span>
                          <span className="kv-v">{user.username}</span>
                        </div>
                        <div className="kv">
                          <span className="kv-k">Wallet</span>
                          <span className="kv-v" style={{ fontSize: 11 }}>{user.walletAddress || '—'}</span>
                          {user.walletAddress && <CopyBtn value={user.walletAddress} />}
                        </div>
                        <div className="kv" style={{ marginBottom: 0 }}>
                          <span className="kv-k">Deployed</span>
                          <span className="kv-v">
                            {user.deployed
                              ? <span className="badge badge-green">yes</span>
                              : <span className="badge badge-amber">no</span>
                            }
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Create User Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => !creating && setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create User</span>
              <button className="modal-close" onClick={() => !creating && setModalOpen(false)}>x</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label className="fl">Username</label>
                <input
                  className="inp"
                  placeholder="johndoe"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="fl">Password</label>
                <input
                  className="inp"
                  type="password"
                  placeholder="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              {createError && <div className="err-box">{createError}</div>}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-s"
                  onClick={() => !creating && setModalOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-p"
                  type="submit"
                  disabled={creating || !newUsername.trim() || !newPassword.trim()}
                >
                  {creating ? <><div className="spin" /> Creating...</> : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
