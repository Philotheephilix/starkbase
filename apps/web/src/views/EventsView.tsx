import { useState, useCallback, useEffect } from 'react';
import { useEvents, useStarkbase } from '@starkbase/sdk';
import type { EventRecord, EventMint } from '@starkbase/sdk';

interface PlatformUser {
  userId: string;
  username: string;
  walletAddress: string;
  deployed: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function EventsView() {
  const { createEvent, listEvents, mint, listMints } = useEvents();
  const client = useStarkbase();

  // Platform users for recipient picker
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [useManualAddress, setUseManualAddress] = useState(false);

  const platformId = localStorage.getItem('sb_platform_id');

  useEffect(() => {
    if (!platformId) return;
    setUsersLoading(true);
    client.auth.listUsers(platformId)
      .then(users => setPlatformUsers(users.filter(u => u.deployed && u.walletAddress)))
      .catch(() => setPlatformUsers([]))
      .finally(() => setUsersLoading(false));
  }, [client, platformId]);

  // Create form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [maxSupply, setMaxSupply] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createResult, setCreateResult] = useState<EventRecord | null>(null);

  // Events list
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // Selected event + mint
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [recipient, setRecipient] = useState('');
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState('');
  const [mintResult, setMintResult] = useState<EventMint | null>(null);
  const [mints, setMints] = useState<EventMint[]>([]);
  const [mintsLoading, setMintsLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !imageUrl.trim()) return;
    setCreating(true);
    setCreateError('');
    setCreateResult(null);
    try {
      const event = await createEvent(name.trim(), description.trim(), imageUrl.trim(), maxSupply);
      setCreateResult(event);
      setName(''); setDescription(''); setImageUrl(''); setMaxSupply(0);
      // Refresh list
      const updated = await listEvents();
      setEvents(updated);
    } catch (err: any) {
      setCreateError(err?.response?.data?.error ?? err.message ?? 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const loadEvents = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const result = await listEvents();
      setEvents(result);
    } catch (err: any) {
      setListError(err?.response?.data?.error ?? err.message ?? 'Failed to load events');
    } finally {
      setListLoading(false);
    }
  }, [listEvents]);

  const selectEvent = async (event: EventRecord) => {
    setSelectedEvent(event);
    setMintResult(null);
    setMintError('');
    setRecipient('');
    setMintsLoading(true);
    try {
      const result = await listMints(event.id);
      setMints(result);
    } catch {
      setMints([]);
    } finally {
      setMintsLoading(false);
    }
  };

  const handleMint = async () => {
    if (!selectedEvent || !recipient.trim()) return;
    setMinting(true);
    setMintError('');
    setMintResult(null);
    try {
      const result = await mint(selectedEvent.id, recipient.trim());
      setMintResult(result);
      setRecipient('');
      // Refresh mints list
      const updated = await listMints(selectedEvent.id);
      setMints(updated);
      // Update mint count in events list
      setEvents(prev => prev.map(e =>
        e.id === selectedEvent.id ? { ...e, mintCount: (e.mintCount ?? 0) + 1 } : e
      ));
      setSelectedEvent(prev => prev ? { ...prev, mintCount: (prev.mintCount ?? 0) + 1 } : prev);
    } catch (err: any) {
      setMintError(err?.response?.data?.error ?? err.message ?? 'Mint failed');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="view">
      <div className="vh">
        <div className="vh-title">Events</div>
        <div className="vh-sub">Deploy event NFT contracts and mint proof-of-attendance tokens</div>
      </div>

      {/* Create event */}
      <div className="card">
        <div className="card-title">Create Event</div>
        <form onSubmit={handleCreate}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="fl">Event name</label>
            <input className="inp" placeholder="Starknet Hackathon 2026" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="fl">Description</label>
            <textarea className="ta" rows={2} placeholder="Annual hackathon for builders" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="fl">Image URL</label>
            <input className="inp" placeholder="https://example.com/event-banner.png" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="fl">Max supply <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(0 = unlimited)</span></label>
            <input
              className="inp"
              type="number"
              min={0}
              value={maxSupply}
              onChange={e => setMaxSupply(Number(e.target.value))}
              style={{ maxWidth: 120 }}
            />
          </div>
          <button
            className="btn btn-p btn-sm"
            type="submit"
            disabled={creating || !name.trim() || !description.trim() || !imageUrl.trim()}
          >
            {creating ? <><div className="spin" /> Deploying contract…</> : 'Deploy event contract'}
          </button>
          {createError && <div className="err-box" style={{ marginTop: 10 }}>{createError}</div>}
        </form>

        {createResult && (
          <div style={{ marginTop: 14 }}>
            <div className="out-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Deployed <span className="badge badge-green">success</span>
            </div>
            <div className="kv">
              <span className="kv-k">contract</span>
              <span className="kv-v" style={{ fontSize: 10.5, wordBreak: 'break-all' }}>{createResult.contractAddress}</span>
            </div>
            <div className="kv">
              <span className="kv-k">tx hash</span>
              <span className="kv-v" style={{ fontSize: 10.5, wordBreak: 'break-all' }}>{createResult.txHash}</span>
            </div>
            <div className="kv">
              <span className="kv-k">max supply</span>
              <span className="kv-v">{createResult.maxSupply === 0 ? 'unlimited' : createResult.maxSupply}</span>
            </div>
          </div>
        )}
      </div>

      {/* Events list */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>
          My Events
          {events.length > 0 && <span className="badge badge-dim">{events.length}</span>}
          <button
            className="btn btn-s btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={loadEvents}
            disabled={listLoading}
          >
            {listLoading ? <><div className="spin" /> Loading…</> : '↻ Refresh'}
          </button>
        </div>

        {listError && <div className="err-box">{listError}</div>}

        {events.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
            No events yet. Create one above, then refresh.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {events.map(event => (
              <div
                key={event.id}
                style={{
                  background: selectedEvent?.id === event.id ? 'var(--accent2)' : 'var(--bg2)',
                  border: `1px solid ${selectedEvent?.id === event.id ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--r)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
                onClick={() => selectEvent(event)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {event.imageUrl && (
                    <img
                      src={event.imageUrl}
                      alt={event.name}
                      style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{event.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {event.description}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span className="badge badge-dim">
                        {event.mintCount ?? 0} minted{event.maxSupply > 0 ? ` / ${event.maxSupply}` : ''}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace' }}>
                        {event.contractAddress.slice(0, 12)}…
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mint panel */}
      {selectedEvent && (
        <div className="card">
          <div className="card-title">
            Mint NFT
            <span className="badge badge-blue" style={{ fontSize: 11 }}>{selectedEvent.name}</span>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <label className="fl" style={{ margin: 0 }}>Recipient</label>
              <button
                className={`btn btn-sm ${useManualAddress ? 'btn-s' : 'btn-p'}`}
                style={{ fontSize: 10, padding: '3px 10px' }}
                onClick={() => { setUseManualAddress(false); setRecipient(''); setSelectedUserId(null); }}
                type="button"
              >
                Select user
              </button>
              <button
                className={`btn btn-sm ${useManualAddress ? 'btn-p' : 'btn-s'}`}
                style={{ fontSize: 10, padding: '3px 10px' }}
                onClick={() => { setUseManualAddress(true); setRecipient(''); setSelectedUserId(null); }}
                type="button"
              >
                Manual address
              </button>
            </div>

            {useManualAddress ? (
              <input
                className="inp"
                placeholder="0x..."
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMint()}
              />
            ) : (
              <div style={{
                maxHeight: 200,
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r)',
                background: 'var(--bg2)',
              }}>
                {usersLoading ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <div className="loading" style={{ justifyContent: 'center' }}><div className="spin" /> Loading users…</div>
                  </div>
                ) : platformUsers.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text2)', fontSize: 12 }}>
                    No deployed users found.{' '}
                    <button
                      className="btn btn-s btn-sm"
                      style={{ fontSize: 10 }}
                      onClick={() => setUseManualAddress(true)}
                      type="button"
                    >
                      Enter manually
                    </button>
                  </div>
                ) : (
                  platformUsers.map(u => (
                    <div
                      key={u.userId}
                      onClick={() => {
                        setSelectedUserId(u.userId);
                        setRecipient(u.walletAddress);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border)',
                        background: selectedUserId === u.userId ? 'rgba(255,77,0,0.08)' : 'transparent',
                        borderLeft: selectedUserId === u.userId ? '3px solid var(--orange)' : '3px solid transparent',
                        transition: 'all 0.1s',
                      }}
                    >
                      <div style={{
                        width: 30, height: 30,
                        background: selectedUserId === u.userId ? 'var(--orange)' : 'var(--bg3)',
                        borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                        color: selectedUserId === u.userId ? 'black' : 'var(--text2)',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}>
                        {u.username.charAt(0)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--textb)' }}>{u.username}</div>
                        <div style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {u.walletAddress}
                        </div>
                      </div>
                      {selectedUserId === u.userId && (
                        <span className="badge badge-green" style={{ flexShrink: 0 }}>selected</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            className="btn btn-p"
            onClick={handleMint}
            disabled={minting || !recipient.trim()}
          >
            {minting ? <><div className="spin" /> Minting…</> : 'Mint NFT'}
          </button>

          {mintError && <div className="err-box">{mintError}</div>}

          {mintResult && (
            <div style={{ marginTop: 10 }}>
              <div className="out-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Minted <span className="badge badge-green">success</span>
              </div>
              <div className="kv">
                <span className="kv-k">token ID</span>
                <span className="kv-v">{mintResult.tokenId}</span>
              </div>
              <div className="kv">
                <span className="kv-k">recipient</span>
                <span className="kv-v" style={{ fontSize: 10.5 }}>{mintResult.recipient}</span>
              </div>
              <div className="kv">
                <span className="kv-k">tx hash</span>
                <span className="kv-v" style={{ fontSize: 10.5, wordBreak: 'break-all' }}>{mintResult.txHash}</span>
              </div>
            </div>
          )}

          {/* Mints table */}
          <div style={{ marginTop: 16 }}>
            <div className="out-label" style={{ marginBottom: 8 }}>
              Mint History
              {mints.length > 0 && <span className="badge badge-dim" style={{ marginLeft: 8 }}>{mints.length}</span>}
            </div>
            {mintsLoading ? (
              <div className="loading"><div className="spin" /> Loading mints…</div>
            ) : mints.length === 0 ? (
              <div style={{ color: 'var(--text2)', fontSize: 12 }}>No mints yet.</div>
            ) : (
              <table className="tbl" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>token ID</th>
                    <th>recipient</th>
                    <th>tx hash</th>
                    <th>minted at</th>
                  </tr>
                </thead>
                <tbody>
                  {mints.map(m => (
                    <tr key={m.id}>
                      <td><span className="badge badge-blue">#{m.tokenId}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--code)' }}>
                        {m.recipient.slice(0, 16)}…
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text2)' }}>
                        {m.txHash.slice(0, 14)}…
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>{formatDate(m.mintedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
