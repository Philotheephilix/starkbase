import React, { useState } from 'react';
import { useSchemas } from '@starkbase/sdk';
import type { SchemaFieldDef, SchemaRecord } from '@starkbase/sdk';

type FieldEntry = { name: string; type: SchemaFieldDef['type']; required: boolean };

const FIELD_TYPES: SchemaFieldDef['type'][] = ['string', 'number', 'boolean', 'object', 'array'];

export default function SchemasView() {
  const { createSchema, getSchema } = useSchemas();

  // Create form
  const [schemaName, setSchemaName] = useState('');
  const [fields, setFields] = useState<FieldEntry[]>([
    { name: '', type: 'string', required: false },
  ]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createResult, setCreateResult] = useState<SchemaRecord | null>(null);

  // Get form
  const [getName, setGetName] = useState('');
  const [getting, setGetting] = useState(false);
  const [getError, setGetError] = useState('');
  const [getResult, setGetResult] = useState<SchemaRecord | null>(null);

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
      const schema = await createSchema(schemaName.trim(), { fields: fieldsMap });
      setCreateResult(schema);
      // Persist schema name
      const updated = [...new Set([...savedSchemas, schema.name])];
      setSavedSchemas(updated);
      localStorage.setItem('sb_schemas', JSON.stringify(updated));
      setSchemaName('');
      setFields([{ name: '', type: 'string', required: false }]);
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

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn-s btn-sm" onClick={addField}>
              + Add field
            </button>
            <button className="btn btn-p btn-sm" type="submit" disabled={creating || !schemaName.trim()}>
              {creating ? <><div className="spin" /> Creating…</> : 'Create schema'}
            </button>
          </div>

          {createError && <div className="err-box" style={{ marginTop: 10 }}>{createError}</div>}
        </form>

        {createResult && (
          <div style={{ marginTop: 14 }}>
            <div className="out-label">Created</div>
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
              <div className="out-label" style={{ marginBottom: 6 }}>Fields</div>
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
    </div>
  );
}
