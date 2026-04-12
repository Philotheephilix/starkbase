import { AxiosInstance } from 'axios';

export class RegistriesModule {
  constructor(private http: AxiosInstance) {}

  async list(platformId: string) {
    const { data } = await this.http.get(`/owners/platforms/${platformId}/registries`);
    return data;
  }

  async create(platformId: string, req: { name: string; maxFileSize?: number; maxTotalSize?: number; allowedMimeTypes?: string[] }) {
    const { data } = await this.http.post(`/owners/platforms/${platformId}/registries`, req);
    return data;
  }

  async update(platformId: string, registryId: string, req: { maxFileSize?: number; maxTotalSize?: number; allowedMimeTypes?: string[] }) {
    await this.http.put(`/owners/platforms/${platformId}/registries/${registryId}`, req);
  }

  async delete(platformId: string, registryId: string) {
    await this.http.delete(`/owners/platforms/${platformId}/registries/${registryId}`);
  }
}
