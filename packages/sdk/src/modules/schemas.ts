import type { AxiosInstance } from 'axios';
import type {
  SchemaCollectionDef,
  SchemaRecord,
  DocumentRecord,
  DocumentVersion,
} from '@starkbase/types';

export class SchemaCollection {
  constructor(
    private http: AxiosInstance,
    private schemaName: string
  ) {}

  async upload(key: string, data: Record<string, unknown>): Promise<DocumentRecord> {
    const { data: res } = await this.http.post(
      `/schemas/${this.schemaName}/docs/${encodeURIComponent(key)}`,
      data
    );
    return res;
  }

  async find(key: string): Promise<DocumentRecord> {
    const { data } = await this.http.get(
      `/schemas/${this.schemaName}/docs/${encodeURIComponent(key)}`
    );
    return data;
  }

  async findAll(): Promise<DocumentRecord[]> {
    const { data } = await this.http.get(`/schemas/${this.schemaName}/docs`);
    return data;
  }

  async findMany(filter: Record<string, unknown>): Promise<DocumentRecord[]> {
    const { data } = await this.http.post(
      `/schemas/${this.schemaName}/docs/query`,
      { filter }
    );
    return data;
  }

  async update(key: string, data: Record<string, unknown>): Promise<DocumentRecord> {
    const { data: res } = await this.http.put(
      `/schemas/${this.schemaName}/docs/${encodeURIComponent(key)}`,
      data
    );
    return res;
  }

  async delete(key: string): Promise<void> {
    await this.http.delete(
      `/schemas/${this.schemaName}/docs/${encodeURIComponent(key)}`
    );
  }

  async history(key: string): Promise<DocumentVersion[]> {
    const { data } = await this.http.get(
      `/schemas/${this.schemaName}/docs/${encodeURIComponent(key)}/history`
    );
    return data;
  }
}

export class SchemasModule {
  constructor(private http: AxiosInstance) {}

  async create(name: string, def: SchemaCollectionDef): Promise<SchemaRecord> {
    const { data } = await this.http.post('/schemas', { name, fields: def.fields });
    return data;
  }

  async get(name: string): Promise<SchemaRecord> {
    const { data } = await this.http.get(`/schemas/${name}`);
    return data;
  }
}
