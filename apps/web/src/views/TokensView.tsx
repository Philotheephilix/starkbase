import { useState, useCallback } from 'react';
import { useTokens } from '@starkbase/sdk';
import type { CreatedToken, MintTokenResponse, TokenMintEvent } from '@starkbase/sdk';

export default function TokensView() {
  const { deploy, mint, list, history } = useTokens();

  // Deploy form
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [initialSupply, setInitialSupply] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');
  const [deployResult, setDeployResult] = useState<CreatedToken | null>(null);

  // Token list
  const [tokens, setTokens] = useState<CreatedToken[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // Selected token
  const [selectedToken, setSelectedToken] = useState<CreatedToken | null>(null);

  // Mint form
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [minting, setMinting] = useState(false);
  const [mintError, setMintError] = useState('');
  const [mintResult, setMintResult] = useState<MintTokenResponse | null>(null);

  // Mint history
  const [mintHistory, setMintHistory] = useState<TokenMintEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !symbol.trim() || !initialSupply.trim() || !recipientAddress.trim()) return;
    setDeploying(true);
    setDeployError('');
    setDeployResult(null);
    try {
      const token = await deploy(name.trim(), symbol.trim(), initialSupply.trim(), recipientAddress.trim());
      setDeployResult(token);
      setName(''); setSymbol(''); setInitialSupply(''); setRecipientAddress('');
      const updated = await list();
      setTokens(updated);
    } catch (err: any) {
      setDeployError(err?.response?.data?.error ?? err.message ?? 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  };

  const loadTokens = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      setTokens(await list());
    } catch (err: any) {
      setListError(err?.response?.data?.error ?? err.message ?? 'Failed to load tokens');
    } finally {
      setListLoading(false);
    }
  }, [list]);

  const loadHistory = useCallback(async (contractAddress: string) => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      setMintHistory(await history(contractAddress));
    } catch (err: any) {
      setHistoryError(err?.response?.data?.error ?? err.message ?? 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  }, [history]);

  const selectToken = async (token: CreatedToken) => {
    setSelectedToken(token);
    setMintResult(null);
    setMintError('');
    setRecipient('');
    setAmount('');
    await loadHistory(token.contractAddress);
  };

  const handleMint = async () => {
    if (!selectedToken || !recipient.trim() || !amount.trim()) return;
    setMinting(true);
    setMintError('');
    setMintResult(null);
    try {
      const result = await mint(selectedToken.contractAddress, recipient.trim(), amount.trim());
      setMintResult(result);
      setRecipient('');
      setAmount('');
      await loadHistory(selectedToken.contractAddress);
    } catch (err: any) {
      setMintError(err?.response?.data?.error ?? err.message ?? 'Mint failed');
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="view">
      <div className="vh">
        <div className="vh-title">Tokens</div>
        <div className="vh-sub">Deploy ERC-20 token contracts and mint game currency to users</div>
      </div>

      {/* Deploy Token */}
      <div className="card">
        <div className="card-title">Deploy Token</div>
        <form onSubmit={handleDeploy}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="fl">Token name</label>
            <input className="inp" placeholder="Gold" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="fl">Symbol</label>
            <input className="inp" placeholder="GLD" value={symbol} onChange={e => setSymbol(e.target.value)} style={{ maxWidth: 120 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="fl">Initial supply <span style={{ color: 'var(--text2)', fontWeight: 400 }}>(wei, no decimals)</span></label>
            <input className="inp" placeholder="1000000000000000000" value={initialSupply} onChange={e => setInitialSupply(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="fl">Initial recipient address</label>
            <input className="inp" placeholder="0x..." value={recipientAddress} onChange={e => setRecipientAddress(e.target.value)} />
          </div>
          <button
            className="btn btn-p btn-sm"
            type="submit"
            disabled={deploying || !name.trim() || !symbol.trim() || !initialSupply.trim() || !recipientAddress.trim()}
          >
            {deploying ? <><div className="spin" /> Deploying contract…</> : 'Deploy token contract'}
          </button>
          {deployError && <div className="err-box" style={{ marginTop: 10 }}>{deployError}</div>}
        </form>

        {deployResult && (
          <div style={{ marginTop: 14 }}>
            <div className="out-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Deployed <span className="badge badge-green">success</span>
            </div>
            <div className="kv">
              <span className="kv-k">contract</span>
              <span className="kv-v" style={{ fontSize: 10.5, wordBreak: 'break-all' }}>{deployResult.contractAddress}</span>
            </div>
            <div className="kv">
              <span className="kv-k">tx hash</span>
              <span className="kv-v" style={{ fontSize: 10.5, wordBreak: 'break-all' }}>{deployResult.transactionHash}</span>
            </div>
            <div className="kv">
              <span className="kv-k">creator</span>
              <span className="kv-v" style={{ fontSize: 10.5 }}>{deployResult.creatorWallet}</span>
            </div>
          </div>
        )}
      </div>

      {/* My Tokens */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>
          My Tokens
          {tokens.length > 0 && <span className="badge badge-dim">{tokens.length}</span>}
          <button
            className="btn btn-s btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={loadTokens}
            disabled={listLoading}
          >
            {listLoading ? <><div className="spin" /> Loading…</> : '↻ Refresh'}
          </button>
        </div>

        {listError && <div className="err-box">{listError}</div>}

        {tokens.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: 12, textAlign: 'center', padding: '16px 0' }}>
            No tokens yet. Deploy one above, then refresh.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {tokens.map(token => (
              <div
                key={token.contractAddress}
                style={{
                  background: selectedToken?.contractAddress === token.contractAddress ? 'var(--accent2)' : 'var(--bg2)',
                  border: `1px solid ${selectedToken?.contractAddress === token.contractAddress ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--r)',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.12s',
                }}
                onClick={() => selectToken(token)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>
                      {token.name} <span style={{ color: 'var(--text2)', fontWeight: 400 }}>({token.symbol})</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace' }}>
                        {token.contractAddress.slice(0, 14)}…
                      </span>
                      <span className="badge badge-dim">supply: {token.initialSupply}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected token: mint + history */}
      {selectedToken && (
        <div className="card">
          <div className="card-title">
            Mint Tokens
            <span className="badge badge-blue" style={{ fontSize: 11 }}>{selectedToken.name}</span>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label className="fl">Recipient wallet address</label>
              <input
                className="inp"
                placeholder="0x..."
                value={recipient}
                onChange={e => setRecipient(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="fl">Amount (wei)</label>
              <input
                className="inp"
                placeholder="1000000000000000000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleMint()}
              />
            </div>
            <button
              className="btn btn-p"
              onClick={handleMint}
              disabled={minting || !recipient.trim() || !amount.trim()}
            >
              {minting ? <><div className="spin" /> Minting…</> : 'Mint'}
            </button>
          </div>

          {mintError && <div className="err-box">{mintError}</div>}

          {mintResult && (
            <div style={{ marginTop: 10 }}>
              <div className="out-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Minted <span className="badge badge-green">success</span>
              </div>
              <div className="kv">
                <span className="kv-k">recipient</span>
                <span className="kv-v" style={{ fontSize: 10.5 }}>{mintResult.recipient}</span>
              </div>
              <div className="kv">
                <span className="kv-k">amount</span>
                <span className="kv-v">{mintResult.amount}</span>
              </div>
              <div className="kv">
                <span className="kv-k">tx hash</span>
                <span className="kv-v" style={{ fontSize: 10.5, wordBreak: 'break-all' }}>{mintResult.txHash}</span>
              </div>
            </div>
          )}

          {/* Mint history */}
          <div style={{ marginTop: 20 }}>
            <div className="out-label" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              Mint History
              {mintHistory.length > 0 && <span className="badge badge-dim">{mintHistory.length}</span>}
              <button
                className="btn btn-s btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => loadHistory(selectedToken.contractAddress)}
                disabled={historyLoading}
              >
                {historyLoading ? <><div className="spin" /> Loading…</> : '↻ Refresh'}
              </button>
            </div>

            {historyError && <div className="err-box">{historyError}</div>}

            {historyLoading ? (
              <div className="loading"><div className="spin" /> Fetching on-chain events…</div>
            ) : mintHistory.length === 0 ? (
              <div style={{ color: 'var(--text2)', fontSize: 12 }}>No mints found on-chain yet.</div>
            ) : (
              <table className="tbl" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>recipient</th>
                    <th>amount</th>
                    <th>tx hash</th>
                    <th>block #</th>
                  </tr>
                </thead>
                <tbody>
                  {mintHistory.map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--code)' }}>
                        {m.recipient.slice(0, 16)}…
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{m.amount}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text2)' }}>
                        {m.txHash.slice(0, 14)}…
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text2)' }}>{m.blockNumber.toLocaleString()}</td>
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
