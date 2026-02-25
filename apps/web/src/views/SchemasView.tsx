import React, { useState } from 'react';
import { useSchemas } from '@starkbase/sdk';
import type { SchemaFieldDef, SchemaRecord, SchemaVerifyResult } from '@starkbase/sdk';

type FieldEntry = { name: string; type: SchemaFieldDef['type']; required: boolean };

const FIELD_TYPES: SchemaFieldDef['type'][] = ['string', 'number', 'boolean', 'object', 'array'];

export default function SchemasView() {
  const { createSchema, getSchema, verifySchema } = useSchemas();

  // Create form
  const [schemaName, setSchemaName] = useState('');
  const [fields, setFields] = useState<FieldEntry[]>([
    { name: '', type: 'string', required: false },
  ]);
  const [onchain, setOnchain] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createResult, setCreateResult] = useState<SchemaRecord | null>(null);

  // Get form
  const [getName, setGetName] = useState('');
  const [getting, setGetting] = useState(false);
  const [getError, setGetError] = useState('');
  const [getResult, setGetResult] = useState<SchemaRecord | null>(null);

  // Verify
  const [verifyName, setVerifyName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<SchemaVerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState('');

  // Saved schema names list (localStorage-backed)
  const [savedSchemas, setSavedSchemas] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('sb_schemas') || '[]'); }
    catch { return []; }
  });

  const addField = () =>
    setFields(f => [...f, { name: '', type: 'string', required: false }]);

  const removeField = (i: number) =>
    setFields(f => f.filter((_, j) => j !== i));

  const updateField = <K extends keyof FieldEntry>(i: number, k: K, v: FieldEntry[K]) =>
    setFields(f => f.map((e, j) => j === i ? { ...e, [k]: v } : e));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateResult(null);
    if (!schemaName.trim()) { setCreateError('Schema name is required'); return; }
    setCreating(true);
    try {
      const fieldEntries = fields.filter(f => f.name.trim());
      const fieldsMap: Record<string, SchemaFieldDef> = {};
      for (const f of fieldEntries) {
        const def: SchemaFieldDef = { type: f.type };
        if (f.required) def.required = true;
        fieldsMap[f.name.trim()] = def;
      }
      const schema = await createSchema(schemaName.trim(), { fields: fieldsMap }, { onchain });
      setCreateResult(schema);
      // Persist schema name
      const updated = [...new Set([...savedSchemas, schema.name])];
      setSavedSchemas(updated);
      localStorage.setItem('sb_schemas', JSON.stringify(updated));
      setSchemaName('');
      setFields([{ name: '', type: 'string', required: false }]);
      setOnchain(false);
    } catch (err: any) {
      setCreateError(err?.response?.data?.error ?? err.message ?? 'Failed to create schema');
    } finally {
      setCreating(false);
    }
  };

  const handleGet = async (nameOverride?: string) => {
    const target = nameOverride ?? getName;
    if (!target.trim()) return;
    setGetError('');
    setGetResult(null);
    setGetting(true);
    try {
      const schema = await getSchema(target.trim());
      setGetResult(schema);
    } catch (err: any) {
      setGetError(err?.response?.data?.error ?? err.message ?? 'Schema not found');
    } finally {
      setGetting(false);
    }
  };

  const handleVerify = async (nameOverride?: string) => {
    const target = nameOverride ?? verifyName;
    if (!target.trim()) return;
    setVerifyError('');
    setVerifyResult(null);
    setVerifying(true);
    try {
      const result = await verifySchema(target.trim());
      setVerifyResult(result);
    } catch (err: any) {
      setVerifyError(err?.response?.data?.error ?? err.message ?? 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="view">
      <div className="vh">
        <div className="vh-title">Schemas</div>
        <div className="vh-sub">Define document structures with typed field validation</div>
      </div>

      {/* Saved schemas quick-load */}
      {savedSchemas.length > 0 && (
        <div className="card">
          <div className="card-title">
            Saved Schemas
            <span className="badge badge-dim">{savedSchemas.length}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {savedSchemas.map(name => (
              <button
                key={name}
                className={`btn btn-sm${getResult?.name === name ? ' btn-p' : ' btn-s'}`}
                onClick={() => { setGetName(name); handleGet(name); }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create schema */}
      <div className="card">
        <div className="card-title">Create Schema</div>
        <form onSubmit={handleCreate}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="fl">Schema name</label>
            <input
              className="inp"
              placeholder="users"
              value={schemaName}
              onChange={e => setSchemaName(e.target.value)}
            />
          </div>

          <div className="fl" style={{ marginBottom: 8 }}>Fields</div>
          {/* Header row */}
          <div className="fields-row" style={{ marginBottom: 4 }}>
            <span className="fl">name</span>
            <span className="fl">type</span>
            <span className="fl" style={{ paddingLeft: 4 }}>required</span>
            <span />
          </div>
          {fields.map((field, i) => (
            <div key={i} className="fields-row">
              <input
                className="inp"
                placeholder="field name"
                value={field.name}
                onChange={e => updateField(i, 'name', e.target.value)}
              />
              <select
                className="sel"
                value={field.type}
                onChange={e => updateField(i, 'type', e.target.value as SchemaFieldDef['type'])}
              >
                {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="checkbox"
                  id={`req-${i}`}
                  checked={field.required}
                  onChange={e => updateField(i, 'required', e.target.checked)}
                  style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 14, height: 14 }}
                />
                <label htmlFor={`req-${i}`} style={{ fontSize: 11, color: 'var(--text2)', cursor: 'pointer' }}>req</label>
              </div>
              <button
                type="button"
                className="btn btn-d btn-xs"
                onClick={() => removeField(i)}
                disabled={fields.length === 1}
              >×</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-s btn-sm" onClick={addField}>
              + Add field
            </button>

            {/* Onchain toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={onchain}
                onChange={e => setOnchain(e.target.checked)}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer', width: 14, height: 14 }}
              />
              <span style={{ fontSize: 12, color: onchain ? 'var(--accent)' : 'var(--text2)' }}>
                onchain
              </span>
            </label>
            {onchain && (
              <span className="badge badge-blue" style={{ fontSize: 10 }}>
                commitment anchored to registry contract
              </span>
            )}

            <button className="btn btn-p btn-sm" type="submit" disabled={creating || !schemaName.trim()} style={{ marginLeft: 'auto' }}>
              {creating ? <><div className="spin" /> Creating…</> : 'Create schema'}
            </button>
          </div>

          {createError && <div className="err-box" style={{ marginTop: 10 }}>{createError}</div>}
        </form>

        {createResult && (
          <div style={{ marginTop: 14 }}>
            <div className="out-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Created
              {createResult.onchain && <span className="badge badge-blue">onchain</span>}
              {createResult.onchainTxHash && (
                <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace' }}>
                  tx: {createResult.onchainTxHash.slice(0, 18)}…
                </span>
              )}
            </div>
            <pre className="out ok">{JSON.stringify(createResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Get schema */}
      <div className="card">
        <div className="card-title">Get Schema</div>
        <div className="form-row">
          <div className="form-group">
            <label className="fl">Schema name</label>
            <input
              className="inp"
              placeholder="users"
              value={getName}
              onChange={e => setGetName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGet()}
            />
          </div>
          <button
            className="btn btn-p"
            onClick={() => handleGet()}
            disabled={getting || !getName.trim()}
          >
            {getting ? <><div className="spin" /> Loading…</> : 'Get schema'}
          </button>
        </div>

        {getError && <div className="err-box">{getError}</div>}

        {getResult && (
          <>
            <div style={{ marginBottom: 10 }}>
              <div className="out-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                Fields
                {getResult.onchain && <span className="badge badge-blue">onchain</span>}
                {getResult.onchainTxHash && (
                  <span style={{ fontSize: 10, color: 'var(--text2)', fontFamily: 'monospace' }}>
                    tx: {getResult.onchainTxHash.slice(0, 18)}…
                  </span>
                )}
              </div>
              {Object.entries(getResult.fields).length === 0 ? (
                <span style={{ color: 'var(--text2)', fontSize: 12 }}>No fields defined</span>
              ) : (
                Object.entries(getResult.fields).map(([fname, fdef]) => (
                  <div className="schema-field" key={fname}>
                    <span className="sf-name">{fname}</span>
                    <span className="badge badge-blue">{fdef.type}</span>
                    {fdef.required && <span className="badge badge-amber">required</span>}
                  </div>
                ))
              )}
            </div>
            <div className="out-label">Raw</div>
            <pre className="out">{JSON.stringify(getResult, null, 2)}</pre>
          </>
        )}
      </div>

      {/* Verify onchain schema */}
      <div className="card">
        <div className="card-title">
          Verify Schema
          <span className="badge badge-dim">onchain</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
          Cross-reference the SQLite commitment with the onchain registry to confirm consistency.
          Only works for schemas created with <code style={{ color: 'var(--code)', background: 'var(--bg2)', padding: '1px 5px', borderRadius: 3 }}>onchain=true</code>.
        </p>
        <div className="form-row">
          <div className="form-group">
            <label className="fl">Schema name</label>
            <input
              className="inp"
              placeholder="users"
              value={verifyName}
              onChange={e => setVerifyName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
            />
          </div>
          <button
            className="btn btn-p"
            onClick={() => handleVerify()}
            disabled={verifying || !verifyName.trim()}
          >
            {verifying ? <><div className="spin" /> Verifying…</> : 'Verify'}
          </button>
        </div>

        {/* Quick-load onchain schemas */}
        {savedSchemas.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {savedSchemas.map(name => (
              <button
                key={name}
                className="btn btn-s btn-xs"
                onClick={() => { setVerifyName(name); handleVerify(name); }}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {verifyError && <div className="err-box" style={{ marginTop: 10 }}>{verifyError}</div>}

        {verifyResult && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              {verifyResult.verified
                ? <span className="badge badge-green">verified ✓</span>
                : <span className="badge badge-red">mismatch ✗</span>
              }
            </div>
            <div className="kv">
              <span className="kv-k">commitment</span>
              <span className="kv-v" style={{ fontSize: 10.5, wordBreak: 'break-all' }}>{verifyResult.commitment}</span>
            </div>
            <div className="kv">
              <span className="kv-k">onchain key</span>
              <span className="kv-v" style={{ fontSize: 10.5, wordBreak: 'break-all' }}>{verifyResult.onchainKey}</span>
            </div>
            {verifyResult.txHash && (
              <div className="kv">
                <span className="kv-k">tx hash</span>
                <span className="kv-v" style={{ fontSize: 10.5, wordBreak: 'break-all' }}>{verifyResult.txHash}</span>
              </div>
            )}
            {verifyResult.onchainWalletAddress && (
              <div className="kv">
                <span className="kv-k">wallet</span>
                <span className="kv-v" style={{ fontSize: 10.5 }}>{verifyResult.onchainWalletAddress}</span>
              </div>
            )}
            {!verifyResult.verified && (
              <div className="warn-box" style={{ marginTop: 10 }}>
                Commitment mismatch — the schema may have been tampered with or the registry entry is stale.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
