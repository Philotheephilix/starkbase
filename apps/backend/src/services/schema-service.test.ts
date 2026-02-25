import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createDb } from '../db/index';
import { PlatformService } from './platform-service';
import { SchemaService } from './schema-service';
import type Database from 'better-sqlite3';

// Mock EigenDA calls
vi.mock('axios', () => ({
  default: {
    post: vi.fn().mockResolvedValue({
      data: Buffer.from('fakecert').buffer,
    }),
    get: vi.fn().mockImplementation(async (_url: string) => {
      const data = Buffer.from(JSON.stringify({ name: 'Alice', age: 25 }));
      return { data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) };
    }),
  },
}));

let db: Database.Database;
let platformSvc: PlatformService;
let svc: SchemaService;
let platformId: string;

beforeEach(() => {
  db = createDb(':memory:');
  platformSvc = new PlatformService(db);
  svc = new SchemaService(db);
  platformId = platformSvc.createPlatform('Test App').id;
});

afterEach(() => { db.close(); });

describe('SchemaService.createSchema', () => {
  it('creates a schema and returns it', async () => {
    const schema = await svc.createSchema(platformId, 'users', {
      name: { type: 'string', required: true },
      age: { type: 'number' },
    });
    expect(schema.name).toBe('users');
    expect(schema.fields.name.type).toBe('string');
  });

  it('throws 409 for duplicate schema name in same platform', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await expect(
      svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } })
    ).rejects.toThrow('already exists');
  });

  it('allows same name in different platforms', async () => {
    const plat2 = platformSvc.createPlatform('App2').id;
    await svc.createSchema(platformId, 'users', {});
    const s2 = await svc.createSchema(plat2, 'users', {});
    expect(s2.name).toBe('users');
  });
});

describe('SchemaService.getSchema', () => {
  it('returns schema by name', async () => {
    await svc.createSchema(platformId, 'products', { price: { type: 'number', required: true } });
    const schema = svc.getSchema(platformId, 'products');
    expect(schema.fields.price.type).toBe('number');
  });

  it('throws 404 for non-existent schema', () => {
    expect(() => svc.getSchema(platformId, 'missing')).toThrow('not found');
  });
});

describe('SchemaService.validateDocument', () => {
  it('passes when all required fields present with correct types', () => {
    expect(() =>
      svc.validateDocument(
        { name: { type: 'string', required: true }, age: { type: 'number' } },
        { name: 'Alice', age: 25 }
      )
    ).not.toThrow();
  });

  it('throws 400 when required field is missing', () => {
    expect(() =>
      svc.validateDocument({ name: { type: 'string', required: true } }, { age: 25 })
    ).toThrow('Missing required field: name');
  });

  it('throws 400 when field has wrong type', () => {
    expect(() =>
      svc.validateDocument({ age: { type: 'number' } }, { age: 'twenty' })
    ).toThrow("Field 'age' expected number");
  });
});

describe('SchemaService.uploadDocument', () => {
  it('uploads a document and returns DocumentRecord', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    const doc = await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    expect(doc.key).toBe('alice');
    expect(doc.version).toBe(1);
    expect(doc.blobId).toBeTruthy();
  });

  it('throws 409 if document key already exists', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    await expect(
      svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice2' }, '0xwallet')
    ).rejects.toThrow('already exists');
  });

  it('throws 400 if validation fails', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await expect(
      svc.uploadDocument(platformId, 'users', 'alice', {}, '0xwallet')
    ).rejects.toThrow('Missing required field: name');
  });
});

describe('SchemaService.updateDocument', () => {
  it('creates a new version', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    const updated = await svc.updateDocument(platformId, 'users', 'alice', { name: 'Alice V2' }, '0xwallet');
    expect(updated.version).toBe(2);
  });

  it('throws 404 if document does not exist', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await expect(
      svc.updateDocument(platformId, 'users', 'ghost', { name: 'Ghost' }, '0xwallet')
    ).rejects.toThrow('not found');
  });

  it('throws 404 if document is deleted', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    svc.deleteDocument(platformId, 'users', 'alice');
    await expect(
      svc.updateDocument(platformId, 'users', 'alice', { name: 'Alice Resurrected' }, '0xwallet')
    ).rejects.toThrow('not found');
  });
});

describe('SchemaService.deleteDocument', () => {
  it('soft-deletes the document', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    svc.deleteDocument(platformId, 'users', 'alice');
    const row = db.prepare(
      `SELECT deleted FROM schema_documents WHERE platform_id = ? AND schema_name = ? AND doc_key = ? ORDER BY version DESC LIMIT 1`
    ).get(platformId, 'users', 'alice') as any;
    expect(row.deleted).toBe(1);
  });

  it('throws 404 for non-existent document', async () => {
    await svc.createSchema(platformId, 'users', {});
    expect(() => svc.deleteDocument(platformId, 'users', 'ghost')).toThrow('not found');
  });
});

describe('SchemaService.getHistory', () => {
  it('returns all versions in order', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    await svc.updateDocument(platformId, 'users', 'alice', { name: 'Alice V2' }, '0xwallet');
    const history = svc.getHistory(platformId, 'users', 'alice');
    expect(history).toHaveLength(2);
    expect(history[0].version).toBe(1);
    expect(history[1].version).toBe(2);
  });
});

describe('SchemaService.findDocument', () => {
  it('returns document with data for an existing key', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    const doc = await svc.findDocument(platformId, 'users', 'alice');
    expect(doc.key).toBe('alice');
    expect(doc.version).toBe(1);
    expect(doc.data).toBeTruthy();
  });

  it('throws 404 for missing document', async () => {
    await svc.createSchema(platformId, 'users', {});
    await expect(svc.findDocument(platformId, 'users', 'ghost')).rejects.toThrow('not found');
  });

  it('throws 404 for deleted document', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    svc.deleteDocument(platformId, 'users', 'alice');
    await expect(svc.findDocument(platformId, 'users', 'alice')).rejects.toThrow('not found');
  });
});

describe('SchemaService.findAll', () => {
  it('returns all non-deleted documents', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    await svc.uploadDocument(platformId, 'users', 'bob', { name: 'Bob' }, '0xwallet');
    const all = await svc.findAll(platformId, 'users');
    expect(all).toHaveLength(2);
  });

  it('excludes deleted documents', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    await svc.uploadDocument(platformId, 'users', 'bob', { name: 'Bob' }, '0xwallet');
    svc.deleteDocument(platformId, 'users', 'alice');
    const all = await svc.findAll(platformId, 'users');
    expect(all).toHaveLength(1);
    expect(all[0].key).toBe('bob');
  });

  it('excludes document whose latest version is deleted (even if earlier versions are not)', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    await svc.updateDocument(platformId, 'users', 'alice', { name: 'Alice V2' }, '0xwallet');
    // v1 is non-deleted, v2 is non-deleted; now delete (marks v2 deleted)
    svc.deleteDocument(platformId, 'users', 'alice');
    // findAll must exclude alice — latest version (v2) is deleted
    const all = await svc.findAll(platformId, 'users');
    expect(all).toHaveLength(0);
  });
});

describe('SchemaService.findMany', () => {
  it('returns documents matching the filter', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    await svc.uploadDocument(platformId, 'users', 'bob', { name: 'Bob' }, '0xwallet');
    // The axios.get mock always returns { name: 'Alice', age: 25 }
    // so filter { name: 'Alice' } matches both docs, filter { name: 'Bob' } matches none
    const matched = await svc.findMany(platformId, 'users', { name: 'Alice' });
    expect(matched).toHaveLength(2);
    const noMatch = await svc.findMany(platformId, 'users', { name: 'Bob' });
    expect(noMatch).toHaveLength(0);
  });

  it('returns empty array when nothing matches filter', async () => {
    await svc.createSchema(platformId, 'users', { name: { type: 'string', required: true } });
    await svc.uploadDocument(platformId, 'users', 'alice', { name: 'Alice' }, '0xwallet');
    const results = await svc.findMany(platformId, 'users', { name: 'ZZZ_NO_MATCH' });
    expect(results).toHaveLength(0);
  });
});
