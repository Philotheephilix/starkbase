import { useState, useRef, useCallback } from 'react';
import { useBlobs } from '@starkbase/sdk';
import type { BlobFile } from '@starkbase/sdk';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function BlobsView() {
  const { upload, list, get, delete: removeBlob } = useBlobs();

  const [blobs, setBlobs] = useState<BlobFile[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [lastUploaded, setLastUploaded] = useState<BlobFile | null>(null);

  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async () => {
    setListError('');
    setListLoading(true);
    try {
      const result = await list();
      setBlobs(result);
    } catch (err: any) {
      setListError(err?.response?.data?.error ?? err.message ?? 'Failed to list blobs');
    } finally {
      setListLoading(false);
    }
  }, [list]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    setUploadError('');
    setLastUploaded(null);
    try {
      // Upload all selected files sequentially
      let last: BlobFile | null = null;
      for (const file of Array.from(files)) {
        last = await upload(file);
      }
      setLastUploaded(last);
      // Refresh list
      const result = await list();
      setBlobs(result);
    } catch (err: any) {
      setUploadError(err?.response?.data?.error ?? err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (blob: BlobFile) => {
    setDownloading(blob.id);
    try {
      const bytes = await get(blob.id);
      // Copy into a clean ArrayBuffer (Uint8Array.from avoids SharedArrayBuffer typing issue)
      const copy = Uint8Array.from(bytes);
      const url = URL.createObjectURL(
        new Blob([copy], { type: blob.mimeType ?? 'application/octet-stream' })
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = blob.filename ?? blob.id;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.response?.data?.error ?? err.message ?? 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (blob: BlobFile) => {
    if (!confirm(`Delete "${blob.filename ?? blob.id}"?`)) return;
    setDeleting(blob.id);
    try {
      await removeBlob(blob.id);
      setBlobs(prev => prev.filter(b => b.id !== blob.id));
    } catch (err: any) {
      alert(err?.response?.data?.error ?? err.message ?? 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // Drag-and-drop handlers
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="view">
      <div className="vh">
        <div className="vh-title">Blobs</div>
        <div className="vh-sub">Upload any file to EigenDA — commitment and hash tracked in SQLite</div>
      </div>

      {/* Upload zone */}
      <div
        className="card"
        style={{
          border: dragging ? '1px solid var(--accent)' : '1px dashed var(--border2)',
          background: dragging ? 'var(--accent2)' : 'var(--bg1)',
          transition: 'all 0.15s',
          cursor: 'pointer',
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />

        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          {uploading ? (
            <div className="loading" style={{ justifyContent: 'center' }}>
              <div className="spin" /> Uploading to EigenDA…
            </div>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>↑</div>
              <div style={{ color: 'var(--text2)', fontSize: 12 }}>
                {dragging
                  ? 'Drop to upload'
                  : 'Drag & drop files here, or click to select'
                }
              </div>
              <div style={{ color: 'var(--text2)', fontSize: 11, marginTop: 4, opacity: 0.6 }}>
                Any file type · stored immutably on EigenDA
              </div>
            </>
          )}
        </div>

        {uploadError && (
          <div className="err-box" style={{ margin: '0 0 0' }} onClick={e => e.stopPropagation()}>
            {uploadError}
          </div>
        )}
      </div>

      {/* Last upload result */}
      {lastUploaded && (
        <div className="card">
          <div className="card-title">
            Last Upload <span className="badge badge-green">success</span>
          </div>
          <BlobDetail blob={lastUploaded} />
        </div>
      )}

      {/* Blob list */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 12 }}>
          Stored Blobs
          {blobs.length > 0 && <span className="badge badge-dim">{blobs.length}</span>}
          <button
            className="btn btn-s btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={loadList}
            disabled={listLoading}
          >
            {listLoading ? <><div className="spin" /> Loading…</> : '↻ Refresh'}
          </button>
        </div>

        {listError && <div className="err-box">{listError}</div>}

        {blobs.length === 0 ? (
          <div style={{ color: 'var(--text2)', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
            {listLoading ? '' : 'No blobs yet. Click refresh or upload a file.'}
          </div>
        ) : (
          <table className="tbl" style={{ marginTop: 0 }}>
            <thead>
              <tr>
                <th>filename</th>
                <th>type</th>
                <th>size</th>
                <th>uploaded</th>
                <th>actions</th>
              </tr>
            </thead>
            <tbody>
              {blobs.map(blob => (
                <>
                  <tr
                    key={blob.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpanded(expanded === blob.id ? null : blob.id)}
                  >
                    <td>
                      <span style={{ color: 'var(--code)' }}>{blob.filename ?? '(unnamed)'}</span>
                      <span style={{ color: 'var(--text2)', fontSize: 10, marginLeft: 6 }}>
                        {expanded === blob.id ? '▲' : '▼'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-dim">{blob.mimeType ?? '—'}</span>
                    </td>
                    <td style={{ color: 'var(--text2)' }}>{formatBytes(blob.size)}</td>
                    <td style={{ color: 'var(--text2)', fontSize: 11 }}>{formatDate(blob.createdAt)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn btn-s btn-xs"
                          disabled={downloading === blob.id}
                          onClick={() => handleDownload(blob)}
                        >
                          {downloading === blob.id ? <div className="spin" /> : '↓'} get
                        </button>
                        <button
                          className="btn btn-d btn-xs"
                          disabled={deleting === blob.id}
                          onClick={() => handleDelete(blob)}
                        >
                          {deleting === blob.id ? <div className="spin" /> : '×'} del
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === blob.id && (
                    <tr key={`${blob.id}-detail`}>
                      <td colSpan={5} style={{ padding: '0 8px 12px', background: 'var(--bg2)' }}>
                        <BlobDetail blob={blob} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* SDK usage example */}
      <div className="card">
        <div className="card-title">
          SDK Usage <span className="badge badge-dim">example</span>
        </div>
        <pre className="out" style={{ fontSize: 11.5 }}>{`import { useBlobs } from '@starkbase/sdk';

const { upload, list, get, delete: remove } = useBlobs();

// Upload a file (File object, Uint8Array, or ArrayBuffer)
const record = await upload(file);
// → { id, blobId, commitment, filename, mimeType, size, createdAt }

// List all blobs
const blobs = await list();

// Download blob data
const bytes = await get(record.id);  // Uint8Array
const url = URL.createObjectURL(new Blob([bytes]));

// Soft-delete
await remove(record.id);`}
        </pre>
      </div>
    </div>
  );
}

function BlobDetail({ blob }: { blob: BlobFile }) {
  return (
    <div style={{ marginTop: 8 }}>
      <div className="kv">
        <span className="kv-k">id</span>
        <span className="kv-v">{blob.id}</span>
      </div>
      <div className="kv">
        <span className="kv-k">blobId</span>
        <span className="kv-v" style={{ fontSize: 10.5, wordBreak: 'break-all' }}>{blob.blobId}</span>
      </div>
      <div className="kv">
        <span className="kv-k">commitment</span>
        <span className="kv-v" style={{ fontSize: 10.5 }}>{blob.commitment}</span>
      </div>
      <div className="kv">
        <span className="kv-k">size</span>
        <span className="kv-v">{formatBytes(blob.size)}</span>
      </div>
      {blob.uploadedBy && (
        <div className="kv">
          <span className="kv-k">uploadedBy</span>
          <span className="kv-v" style={{ fontSize: 10.5 }}>{blob.uploadedBy}</span>
        </div>
      )}
    </div>
  );
}
