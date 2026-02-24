import { useState } from 'react';
import { useSchemas } from '@starkbase/sdk';
import type { DocumentRecord, DocumentVersion, SchemaRecord } from '@starkbase/sdk';

type Op = 'upload' | 'find' | 'findAll' | 'findMany' | 'update' | 'delete' | 'history';

interface OpDef {
  id: Op;
  label: string;
  method: string;
  desc: string;
}

const OPS: OpDef[] = [
  { id: 'upload',   label: 'Upload',    method: 'POST',   desc: 'Create new document' },
  { id: 'find',     label: 'Find',      method: 'GET',    desc: 'Get by key' },
  { id: 'findAll',  label: 'Find All',  method: 'GET',    desc: 'All active docs' },
  { id: 'findMany', label: 'Find Many', method: 'POST',   desc: 'Filter by fields' },
  { id: 'update',   label: 'Update',    method: 'PUT',    desc: 'Create new version' },
  { id: 'delete',   label: 'Delete',    method: 'DELETE', desc: 'Soft-delete' },
  { id: 'history',  label: 'History',   method: 'GET',    desc: 'All versions' },
];

type Result = { ok: boolean; data: unknown } | null;

export default function DocumentsView() {
  const { getSchema, collection } = useSchemas();

  // Schema selector
  const [schemaInput, setSchemaInput] = useState('');
  const [activeSchema, setActiveSchema] = useState('');
  const [schemaInfo, setSchemaInfo] = useState<SchemaRecord | null>(null);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [schemaError, setSchemaError] = useState('');

  // Operation state
  const [op, setOp] = useState<Op>('upload');
  const [key, setKey] = useState('');
  const [dataJson, setDataJson] = useState('{\n  \n}');
  const [filterJson, setFilterJson] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result>(null);

  // Saved schema names from localStorage
  const savedSchemas: string[] = (() => {
    try { return JSON.parse(localStorage.getItem('sb_schemas') || '[]'); }
    catch { return []; }
  })();

  const loadSchema = async (name?: string) => {
    const target = name ?? schemaInput;
    if (!target.trim()) return;
    setSchemaError('');
    setSchemaInfo(null);
    setResult(null);
    setLoadingSchema(true);
    try {
      const s = await getSchema(target.trim());
      setSchemaInfo(s);
      setActiveSchema(target.trim());
      setSchemaInput(target.trim());
    } catch (err: any) {
      setSchemaError(err?.response?.data?.error ?? err.message ?? 'Schema not found');
    } finally {
      setLoadingSchema(false);
    }
  };

  const parseJson = (raw: string): Record<string, unknown> | null => {
    try { return JSON.parse(raw); }
    catch { return null; }
  };

  const execute = async () => {
    if (!activeSchema) return;
    setLoading(true);
    setResult(null);
    const col = collection(activeSchema);
    try {
      let data: unknown;
      switch (op) {
        case 'upload': {
          const parsed = parseJson(dataJson);
          if (!parsed) throw new Error('Invalid JSON in data field');
          data = await col.upload(key, parsed);
          break;
        }
        case 'find': {
          data = await col.find(key);
          break;
        }
        case 'findAll': {
          data = await col.findAll();
          break;
        }
        case 'findMany': {
          const parsed = parseJson(filterJson);
          if (!parsed) throw new Error('Invalid JSON in filter field');
          data = await col.findMany(parsed);
          break;
        }
        case 'update': {
          const parsed = parseJson(dataJson);
          if (!parsed) throw new Error('Invalid JSON in data field');
          data = await col.update(key, parsed);
          break;
        }
        case 'delete': {
          await col.delete(key);
          data = { success: true, message: `Document '${key}' deleted` };
          break;
        }
        case 'history': {
          data = await col.history(key);
          break;
        }
      }
      setResult({ ok: true, data });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err.message ?? 'Operation failed';
      setResult({ ok: false, data: msg });
    } finally {
      setLoading(false);
    }
  };

  const needsKey    = ['upload', 'find', 'update', 'delete', 'history'].includes(op);
  const needsData   = ['upload', 'update'].includes(op);
  const needsFilter = op === 'findMany';
  const currentOp  = OPS.find(o => o.id === op)!;

  return (
    <div className="view">
      <div className="vh">
        <div className="vh-title">Documents</div>
        <div className="vh-sub">Upload and query documents stored on EigenDA</div>
      </div>

      {/* Schema selector */}
      <div className="card">
        <div className="card-title">Schema</div>

        {savedSchemas.length > 0 && (
          <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {savedSchemas.map(name => (
              <button
                key={name}
                className={`btn btn-sm${activeSchema === name ? ' btn-p' : ' btn-s'}`}
                onClick={() => loadSchema(name)}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="fl">Schema name</label>
            <input
              className="inp"
              placeholder="users"
              value={schemaInput}
              onChange={e => setSchemaInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadSchema()}
            />
          </div>
          <button
            className="btn btn-p"
            onClick={() => loadSchema()}
            disabled={loadingSchema || !schemaInput.trim()}
          >
            {loadingSchema ? <><div className="spin" /> Loading…</> : 'Load'}
          </button>
        </div>

        {schemaError && <div className="err-box">{schemaError}</div>}

        {schemaInfo && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="badge badge-green">{schemaInfo.name}</span>
            {Object.entries(schemaInfo.fields).map(([fname, fdef]) => (
              <span key={fname} style={{ fontSize: 11, color: 'var(--text2)' }}>
                <span style={{ color: 'var(--code)' }}>{fname}</span>
                <span style={{ opacity: 0.6 }}>:{fdef.type}</span>
                {fdef.required && <span style={{ color: 'var(--warn)', marginLeft: 2 }}>*</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {activeSchema ? (
        <>
          {/* Operation picker */}
          <div className="ops">
            {OPS.map(({ id, label, method }) => (
              <button
                key={id}
                className={`op${op === id ? ' active' : ''}`}
                onClick={() => { setOp(id); setResult(null); }}
              >
                <span className="op-v">{label}</span>
                <span className="op-m">{method}</span>
              </button>
            ))}
          </div>

          {/* Operation form */}
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
                <input
                  className="inp"
                  placeholder="alice"
                  value={key}
                  onChange={e => setKey(e.target.value)}
                />
              </div>
            )}

            {needsData && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="fl">Data (JSON)</label>
                <textarea
                  className="ta"
                  value={dataJson}
                  onChange={e => setDataJson(e.target.value)}
                  rows={5}
                  placeholder={'{\n  "name": "Alice",\n  "age": 25\n}'}
                />
              </div>
            )}

            {needsFilter && (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="fl">Filter (JSON)</label>
                <textarea
                  className="ta"
                  value={filterJson}
                  onChange={e => setFilterJson(e.target.value)}
                  rows={3}
                  placeholder={'{ "name": "Alice" }'}
                />
              </div>
            )}

            {op === 'findAll' && (
              <p style={{ color: 'var(--text2)', fontSize: 12, marginBottom: 12 }}>
                Returns all non-deleted documents in the{' '}
                <code style={{ color: 'var(--code)', background: 'var(--bg2)', padding: '1px 5px', borderRadius: 3 }}>{activeSchema}</code>{' '}
                collection. Each document includes its data fetched from EigenDA.
              </p>
            )}

            <button
              className="btn btn-p"
              onClick={execute}
              disabled={loading || (needsKey && !key.trim())}
            >
              {loading
                ? <><div className="spin" /> Running…</>
                : `Execute ${currentOp.label}`
              }
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="card">
              <div className="card-title">
                Result
                {result.ok
                  ? <span className="badge badge-green">success</span>
                  : <span className="badge badge-red">error</span>
                }
              </div>

              {op === 'history' && result.ok && Array.isArray(result.data) ? (
                <HistoryTable versions={result.data as DocumentVersion[]} />
              ) : op === 'findAll' && result.ok && Array.isArray(result.data) ? (
                <DocumentList docs={result.data as DocumentRecord[]} />
              ) : op === 'findMany' && result.ok && Array.isArray(result.data) ? (
                <DocumentList docs={result.data as DocumentRecord[]} />
              ) : (
                <pre className={`out${result.ok ? ' ok' : ' err'}`}>
                  {result.ok
                    ? JSON.stringify(result.data, null, 2)
                    : String(result.data)
                  }
                </pre>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="info">
          Load a schema above to start working with documents.
        </div>
      )}
    </div>
  );
}

function DocumentList({ docs }: { docs: DocumentRecord[] }) {
  if (!docs.length) {
    return <div style={{ color: 'var(--text2)', fontSize: 12 }}>No documents found</div>;
  }
  return (
    <div>
      <div style={{ color: 'var(--text2)', fontSize: 11, marginBottom: 8 }}>
        {docs.length} document{docs.length !== 1 ? 's' : ''}
      </div>
      {docs.map((doc, i) => (
        <div key={`${doc.key}-${doc.version}`} style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r)', padding: '12px 14px',
          marginBottom: i < docs.length - 1 ? 8 : 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: 'var(--code)', fontWeight: 500 }}>{doc.key}</span>
            <span className="badge badge-dim">v{doc.version}</span>
          </div>
          <pre className="out" style={{ margin: 0, maxHeight: 160 }}>
            {JSON.stringify(doc.data ?? doc, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function HistoryTable({ versions }: { versions: DocumentVersion[] }) {
  if (!versions.length) {
    return <div style={{ color: 'var(--text2)', fontSize: 12 }}>No history</div>;
  }
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>ver</th>
          <th>status</th>
          <th>blobId</th>
          <th>createdBy</th>
          <th>createdAt</th>
        </tr>
      </thead>
      <tbody>
        {versions.map(v => (
          <tr key={v.version}>
            <td>v{v.version}</td>
            <td>
              <span className={`badge${v.deleted ? ' badge-red' : ' badge-green'}`}>
                {v.deleted ? 'deleted' : 'active'}
              </span>
            </td>
            <td style={{ fontFamily: 'monospace', fontSize: 10.5, color: 'var(--text2)' }}>
              {v.blobId.slice(0, 24)}…
            </td>
            <td style={{ color: 'var(--text2)', fontSize: 11 }}>
              {v.createdBy.slice(0, 12)}…
            </td>
            <td style={{ color: 'var(--text2)', fontSize: 11 }}>
              {new Date(v.createdAt).toLocaleString()}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
