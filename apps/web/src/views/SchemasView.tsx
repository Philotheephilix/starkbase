import React, { useState, useEffect, useCallback } from 'react';
import { useSchemas } from '@starkbase/sdk';
import type { SchemaFieldDef, SchemaRecord, SchemaVerifyResult, DocumentRecord, DocumentVersion } from '@starkbase/sdk';

type SubTab = 'overview' | 'operate' | 'verify';
type FieldEntry = { name: string; type: SchemaFieldDef['type']; required: boolean };
type Op = 'upload' | 'find' | 'findAll' | 'findMany' | 'update' | 'delete' | 'history';
type Result = { ok: boolean; data: unknown } | null;

const FIELD_TYPES: SchemaFieldDef['type'][] = ['string', 'number', 'boolean', 'object', 'array'];

const OPS: { id: Op; label: string; method: string; desc: string }[] = [
  { id: 'upload',   label: 'Upload',    method: 'POST',   desc: 'Create new document' },
  { id: 'find',     label: 'Find',      method: 'GET',    desc: 'Get by key' },
  { id: 'findAll',  label: 'Find All',  method: 'GET',    desc: 'All active docs' },
  { id: 'findMany', label: 'Find Many', method: 'POST',   desc: 'Filter by fields' },
  { id: 'update',   label: 'Update',    method: 'PUT',    desc: 'Create new version' },
  { id: 'delete',   label: 'Delete',    method: 'DELETE', desc: 'Soft-delete' },
  { id: 'history',  label: 'History',   method: 'GET',    desc: 'All versions' },
];

export default function SchemasView() {
  const { listSchemas, createSchema, getSchema, verifySchema, collection } = useSchemas();

  const [subTab, setSubTab] = useState<SubTab>('overview');
  const [schemas, setSchemas] = useState<SchemaRecord[]>([]);
  const [schemasLoading, setSchemasLoading] = useState(false);
  const [selectedSchema, setSelectedSchema] = useState<SchemaRecord | null>(null);

  // Create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [schemaName, setSchemaName] = useState('');
  const [fields, setFields] = useState<FieldEntry[]>([{ name: '', type: 'string', required: false }]);
  const [onchain, setOnchain] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Operate tab
  const [op, setOp] = useState<Op>('findAll');
  const [docKey, setDocKey] = useState('');
  const [dataJson, setDataJson] = useState('{\n  \n}');
  const [filterJson, setFilterJson] = useState('{}');
  const [opLoading, setOpLoading] = useState(false);
  const [opResult, setOpResult] = useState<Result>(null);
  const [editingDoc, setEditingDoc] = useState<string | null>(null);
  const [editJson, setEditJson] = useState('');

  // Verify tab
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<SchemaVerifyResult | null>(null);
  const [verifyError, setVerifyError] = useState('');

  const loadSchemas = useCallback(async () => {
    setSchemasLoading(true);
    try {
      const list = await listSchemas();
      setSchemas(list);
    } catch { /* ignore */ }
    finally { setSchemasLoading(false); }
  }, [listSchemas]);

  useEffect(() => { loadSchemas(); }, [loadSchemas]);

  // Schema selector dropdown
  const selectSchema = (s: SchemaRecord) => {
    setSelectedSchema(s);
    setOpResult(null);
    setVerifyResult(null);
    setVerifyError('');
  };

  // Create modal handlers
  const addField = () => setFields(f => [...f, { name: '', type: 'string', required: false }]);
  const removeField = (i: number) => setFields(f => f.filter((_, j) => j !== i));
  const updateField = <K extends keyof FieldEntry>(i: number, k: K, v: FieldEntry[K]) =>
    setFields(f => f.map((e, j) => j === i ? { ...e, [k]: v } : e));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schemaName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const fieldsMap: Record<string, SchemaFieldDef> = {};
      for (const f of fields.filter(f => f.name.trim())) {
        const def: SchemaFieldDef = { type: f.type };
        if (f.required) def.required = true;
        fieldsMap[f.name.trim()] = def;
      }
      const schema = await createSchema(schemaName.trim(), { fields: fieldsMap }, { onchain });
      setSelectedSchema(schema);
      await loadSchemas();
      setSchemaName('');
      setFields([{ name: '', type: 'string', required: false }]);
      setOnchain(false);
      setModalOpen(false);
    } catch (err: any) {
      setCreateError(err?.response?.data?.error ?? err.message ?? 'Failed to create schema');
    } finally {
      setCreating(false);
    }
  };

  // Operate tab — execute operation
  const parseJson = (raw: string): Record<string, unknown> | null => {
    try { return JSON.parse(raw); } catch { return null; }
  };

  const execute = async () => {
    if (!selectedSchema) return;
    setOpLoading(true);
    setOpResult(null);
    const col = collection(selectedSchema.name);
    try {
      let data: unknown;
      switch (op) {
        case 'upload': { const p = parseJson(dataJson); if (!p) throw new Error('Invalid JSON'); data = await col.upload(docKey, p); break; }
        case 'find': { data = await col.find(docKey); break; }
        case 'findAll': { data = await col.findAll(); break; }
        case 'findMany': { const p = parseJson(filterJson); if (!p) throw new Error('Invalid JSON'); data = await col.findMany(p); break; }
        case 'update': { const p = parseJson(dataJson); if (!p) throw new Error('Invalid JSON'); data = await col.update(docKey, p); break; }
        case 'delete': { await col.delete(docKey); data = { success: true }; break; }
        case 'history': { data = await col.history(docKey); break; }
      }
      setOpResult({ ok: true, data });
    } catch (err: any) {
      setOpResult({ ok: false, data: err?.response?.data?.error ?? err.message ?? 'Failed' });
    } finally {
      setOpLoading(false);
    }
  };

  // Edit inline
  const handleInlineEdit = async (key: string) => {
    if (!selectedSchema) return;
    const parsed = parseJson(editJson);
    if (!parsed) { alert('Invalid JSON'); return; }
    setOpLoading(true);
    try {
      await collection(selectedSchema.name).update(key, parsed);
      setEditingDoc(null);
      // Refresh findAll
      const data = await collection(selectedSchema.name).findAll();
      setOpResult({ ok: true, data });
    } catch (err: any) {
      alert(err?.response?.data?.error ?? err.message ?? 'Update failed');
    } finally {
      setOpLoading(false);
    }
  };

  // Verify
  const handleVerify = async () => {
    if (!selectedSchema) return;
    setVerifying(true);
    setVerifyError('');
    setVerifyResult(null);
    try {
      const result = await verifySchema(selectedSchema.name);
      setVerifyResult(result);
    } catch (err: any) {
      setVerifyError(err?.response?.data?.error ?? err.message ?? 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const needsKey = ['upload', 'find', 'update', 'delete', 'history'].includes(op);
  const needsData = ['upload', 'update'].includes(op);
  const needsFilter = op === 'findMany';
  const currentOp = OPS.find(o => o.id === op)!;
  const isOnchainBlocked = selectedSchema?.onchain && (op === 'update' || op === 'delete');

  return (
    <div className="view">
      {/* Header with schema dropdown */}
      <div className="vh" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="vh-title">Schemas</div>
          <div className="vh-sub">Define structures, operate on documents, verify onchain</div>
        </div>
        <button className="btn btn-p" onClick={() => setModalOpen(true)}>
          + Create Schema
        </button>
      </div>

      {/* Schema selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {schemasLoading && <div className="loading"><div className="spin" /> Loading...</div>}
        {schemas.map(s => (
          <button
            key={s.name}
            className={`btn btn-sm ${selectedSchema?.name === s.name ? 'btn-p' : 'btn-s'}`}
            onClick={() => selectSchema(s)}
          >
            {s.name}
            {s.onchain && <span style={{ marginLeft: 4, fontSize: 9, opacity: 0.7 }}>*</span>}
          </button>
        ))}
        {!schemasLoading && schemas.length === 0 && (
          <span style={{ color: 'var(--text2)', fontSize: 12 }}>No schemas yet</span>
        )}
      </div>

      {selectedSchema ? (
        <>
          {/* Sub-tabs */}
          <div className="tabs">
            {(['overview', 'operate', 'verify'] as SubTab[]).map(t => (
              <button
                key={t}
                className={`t-btn ${subTab === t ? 'active' : ''}`}
                onClick={() => { setSubTab(t); setOpResult(null); }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ─── OVERVIEW ─── */}
          {subTab === 'overview' && (
            <>
              <div className="card">
                <div className="card-title">
                  Schema Details
                  {selectedSchema.onchain && <span className="badge badge-blue">onchain</span>}
                </div>
                <div className="kv">
                  <span className="kv-k">Name</span>
                  <span className="kv-v" style={{ fontWeight: 600, color: 'var(--textb)' }}>{selectedSchema.name}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">ID</span>
                  <span className="kv-v" style={{ fontSize: 11 }}>{selectedSchema.id}</span>
                </div>
                {selectedSchema.onchainTxHash && (
                  <div className="kv">
                    <span className="kv-k">Tx Hash</span>
                    <span className="kv-v" style={{ fontSize: 11 }}>{selectedSchema.onchainTxHash}</span>
                  </div>
                )}
                <div className="kv">
                  <span className="kv-k">Created</span>
                  <span className="kv-v">{new Date(selectedSchema.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="card">
                <div className="card-title">
                  Fields
                  <span className="badge badge-dim">{Object.keys(selectedSchema.fields).length}</span>
                </div>
                {Object.keys(selectedSchema.fields).length === 0 ? (
                  <div style={{ color: 'var(--text2)', fontSize: 12 }}>No fields defined</div>
                ) : (
                  Object.entries(selectedSchema.fields).map(([fname, fdef]) => (
                    <div className="schema-field" key={fname}>
                      <span className="sf-name">{fname}</span>
                      <span className="badge badge-blue">{fdef.type}</span>
                      {fdef.required && <span className="badge badge-amber">required</span>}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ─── OPERATE ─── */}
          {subTab === 'operate' && (
            <>
              {/* Operation picker */}
              <div className="ops">
                {OPS.map(({ id, label, method }) => (
                  <button
                    key={id}
                    className={`op${op === id ? ' active' : ''}`}
                    onClick={() => { setOp(id); setOpResult(null); }}
                  >
                    <span className="op-v">{label}</span>
                    <span className="op-m">{method}</span>
                  </button>
                ))}
              </div>

              <div className="card">
                <div className="card-title">
                  {currentOp.label}
                  <span className="badge badge-dim">{currentOp.method}</span>
                  <span style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400 }}>
                    — {currentOp.desc}
                  </span>
                </div>

                {needsKey && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="fl">Document key</label>
                    <input className="inp" placeholder="alice" value={docKey} onChange={e => setDocKey(e.target.value)} />
                  </div>
                )}

                {needsData && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="fl">Data (JSON)</label>
                    <textarea className="ta" value={dataJson} onChange={e => setDataJson(e.target.value)} rows={5}
                      placeholder={'{\n  "name": "Alice",\n  "age": 25\n}'} />
                  </div>
                )}

                {needsFilter && (
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="fl">Filter (JSON)</label>
                    <textarea className="ta" value={filterJson} onChange={e => setFilterJson(e.target.value)} rows={3}
                      placeholder={'{ "name": "Alice" }'} />
                  </div>
                )}

                {isOnchainBlocked ? (
                  <div className="warn-box">
                    <strong>Onchain schema</strong> — documents are immutable. Update and delete are disabled.
                  </div>
                ) : (
                  <button className="btn btn-p" onClick={execute}
                    disabled={opLoading || (needsKey && !docKey.trim())}>
                    {opLoading ? <><div className="spin" /> Running...</> : `Execute ${currentOp.label}`}
                  </button>
                )}
              </div>

              {/* Results */}
              {opResult && (
                <div className="card">
                  <div className="card-title">
                    Result
                    {opResult.ok ? <span className="badge badge-green">success</span> : <span className="badge badge-red">error</span>}
                  </div>

                  {(op === 'findAll' || op === 'findMany') && opResult.ok && Array.isArray(opResult.data) ? (
                    <DocumentList
                      docs={opResult.data as DocumentRecord[]}
                      editingDoc={editingDoc}
                      editJson={editJson}
                      isOnchain={!!selectedSchema.onchain}
                      onStartEdit={(key, data) => { setEditingDoc(key); setEditJson(JSON.stringify(data, null, 2)); }}
                      onCancelEdit={() => setEditingDoc(null)}
                      onSaveEdit={handleInlineEdit}
                      onEditJsonChange={setEditJson}
                    />
                  ) : op === 'history' && opResult.ok && Array.isArray(opResult.data) ? (
                    <HistoryTable versions={opResult.data as DocumentVersion[]} />
                  ) : (
                    <pre className={`out${opResult.ok ? ' ok' : ' err'}`}>
                      {opResult.ok ? JSON.stringify(opResult.data, null, 2) : String(opResult.data)}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}

          {/* ─── VERIFY ─── */}
          {subTab === 'verify' && (
            <>
              <div className="card">
                <div className="card-title">
                  Onchain Verification
                  <span className="badge badge-dim">prover</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16, lineHeight: 1.8 }}>
                  Cross-reference the local schema commitment (SHA-256 of fields) with the onchain registry contract.
                  This proves the schema definition has not been tampered with since it was anchored onchain.
                </p>

                {!selectedSchema.onchain ? (
                  <div className="warn-box">
                    Schema <strong>{selectedSchema.name}</strong> was not created with{' '}
                    <code style={{ color: 'var(--orange)', background: 'var(--bg2)', padding: '2px 6px', borderRadius: 6, fontSize: 11 }}>onchain=true</code>.
                    Only onchain schemas can be verified.
                  </div>
                ) : (
                  <button className="btn btn-p" onClick={handleVerify} disabled={verifying}>
                    {verifying ? <><div className="spin" /> Verifying...</> : 'Verify Onchain'}
                  </button>
                )}

                {verifyError && <div className="err-box" style={{ marginTop: 12 }}>{verifyError}</div>}

                {verifyResult && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                      {verifyResult.verified
                        ? <span className="badge badge-green" style={{ fontSize: 12, padding: '5px 12px' }}>Verified</span>
                        : <span className="badge badge-red" style={{ fontSize: 12, padding: '5px 12px' }}>Mismatch</span>
                      }
                    </div>
                    <div className="kv">
                      <span className="kv-k">Commitment</span>
                      <span className="kv-v" style={{ fontSize: 10.5 }}>{verifyResult.commitment}</span>
                    </div>
                    <div className="kv">
                      <span className="kv-k">Onchain Key</span>
                      <span className="kv-v" style={{ fontSize: 10.5 }}>{verifyResult.onchainKey}</span>
                    </div>
                    {verifyResult.txHash && (
                      <div className="kv">
                        <span className="kv-k">Tx Hash</span>
                        <span className="kv-v" style={{ fontSize: 10.5 }}>{verifyResult.txHash}</span>
                      </div>
                    )}
                    {verifyResult.onchainWalletAddress && (
                      <div className="kv">
                        <span className="kv-k">Wallet</span>
                        <span className="kv-v" style={{ fontSize: 10.5 }}>{verifyResult.onchainWalletAddress}</span>
                      </div>
                    )}
                    {!verifyResult.verified && (
                      <div className="warn-box" style={{ marginTop: 12 }}>
                        Commitment mismatch — the schema may have been tampered with or the registry entry is stale.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '40px 22px' }}>
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 12 }}>{ }</div>
          <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 16 }}>
            {schemas.length > 0
              ? 'Select a schema above to view, operate, or verify.'
              : 'No schemas yet. Create your first schema to get started.'}
          </div>
          {schemas.length === 0 && (
            <button className="btn btn-p" onClick={() => setModalOpen(true)}>
              + Create Schema
            </button>
          )}
        </div>
      )}

      {/* ─── Create Schema Modal ─── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => !creating && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create Schema</span>
              <button className="modal-close" onClick={() => !creating && setModalOpen(false)}>x</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="fl">Schema name</label>
                <input className="inp" placeholder="users" value={schemaName}
                  onChange={e => setSchemaName(e.target.value)} autoFocus />
              </div>

              <div className="fl" style={{ marginBottom: 8 }}>Fields</div>
              <div className="fields-row" style={{ marginBottom: 4 }}>
                <span className="fl">name</span>
                <span className="fl">type</span>
                <span className="fl" style={{ paddingLeft: 4 }}>req</span>
                <span />
              </div>
              {fields.map((field, i) => (
                <div key={i} className="fields-row">
                  <input className="inp" placeholder="field name" value={field.name}
                    onChange={e => updateField(i, 'name', e.target.value)} />
                  <select className="sel" value={field.type}
                    onChange={e => updateField(i, 'type', e.target.value as SchemaFieldDef['type'])}>
                    {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="checkbox" checked={field.required}
                      onChange={e => updateField(i, 'required', e.target.checked)}
                      style={{ accentColor: 'var(--orange)', cursor: 'pointer', width: 14, height: 14 }} />
                  </div>
                  <button type="button" className="btn btn-d btn-xs" onClick={() => removeField(i)}
                    disabled={fields.length === 1}>x</button>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-s btn-sm" onClick={addField}>+ Add field</button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={onchain} onChange={e => setOnchain(e.target.checked)}
                    style={{ accentColor: 'var(--orange)', cursor: 'pointer', width: 14, height: 14 }} />
                  <span style={{ fontSize: 12, color: onchain ? 'var(--orange)' : 'var(--text2)' }}>onchain</span>
                </label>
                {onchain && <span className="badge badge-blue" style={{ fontSize: 10 }}>anchored to registry</span>}
              </div>

              {createError && <div className="err-box" style={{ marginTop: 12 }}>{createError}</div>}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button type="button" className="btn btn-s" onClick={() => !creating && setModalOpen(false)} disabled={creating}>
                  Cancel
                </button>
                <button className="btn btn-p" type="submit" disabled={creating || !schemaName.trim()}>
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

/* ─── Document List with inline edit ─── */
function DocumentList({ docs, editingDoc, editJson, isOnchain, onStartEdit, onCancelEdit, onSaveEdit, onEditJsonChange }: {
  docs: DocumentRecord[];
  editingDoc: string | null;
  editJson: string;
  isOnchain: boolean;
  onStartEdit: (key: string, data: Record<string, unknown>) => void;
  onCancelEdit: () => void;
  onSaveEdit: (key: string) => void;
  onEditJsonChange: (v: string) => void;
}) {
  if (!docs.length) return <div style={{ color: 'var(--text2)', fontSize: 12 }}>No documents found</div>;

  return (
    <div>
      <div style={{ color: 'var(--text2)', fontSize: 11, marginBottom: 10 }}>
        {docs.length} document{docs.length !== 1 ? 's' : ''}
      </div>
      {docs.map((doc, i) => (
        <div key={`${doc.key}-${doc.version}`} style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px',
          marginBottom: i < docs.length - 1 ? 10 : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ color: 'var(--orange)', fontWeight: 600, fontSize: 13 }}>{doc.key}</span>
            <span className="badge badge-dim">v{doc.version}</span>
            {!isOnchain && (
              <button
                className="btn btn-s btn-xs"
                style={{ marginLeft: 'auto' }}
                onClick={() => onStartEdit(doc.key, doc.data ?? {})}
              >
                edit
              </button>
            )}
          </div>

          {editingDoc === doc.key ? (
            <div>
              <textarea
                className="ta"
                value={editJson}
                onChange={e => onEditJsonChange(e.target.value)}
                rows={6}
                style={{ marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-p btn-sm" onClick={() => onSaveEdit(doc.key)}>Save</button>
                <button className="btn btn-s btn-sm" onClick={onCancelEdit}>Cancel</button>
              </div>
            </div>
          ) : (
            <pre className="out" style={{ margin: 0, maxHeight: 160 }}>
              {JSON.stringify(doc.data ?? doc, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── History Table ─── */
function HistoryTable({ versions }: { versions: DocumentVersion[] }) {
  if (!versions.length) return <div style={{ color: 'var(--text2)', fontSize: 12 }}>No history</div>;
  return (
    <table className="tbl">
      <thead>
        <tr><th>ver</th><th>status</th><th>blobId</th><th>createdBy</th><th>createdAt</th></tr>
      </thead>
      <tbody>
        {versions.map(v => (
          <tr key={v.version}>
            <td>v{v.version}</td>
            <td><span className={`badge${v.deleted ? ' badge-red' : ' badge-green'}`}>{v.deleted ? 'deleted' : 'active'}</span></td>
            <td style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--text2)' }}>{v.blobId.slice(0, 24)}...</td>
            <td style={{ color: 'var(--text2)', fontSize: 11 }}>{v.createdBy.slice(0, 12)}...</td>
            <td style={{ color: 'var(--text2)', fontSize: 11 }}>{new Date(v.createdAt).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
