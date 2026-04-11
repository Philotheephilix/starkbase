import { AxiosInstance } from 'axios';

export class RolesModule {
  constructor(private http: AxiosInstance) {}

  async list(platformId: string) {
    const { data } = await this.http.get(`/owners/platforms/${platformId}/roles`);
    return data;
  }

  async create(platformId: string, req: { name: string; permissions: string[] }) {
    const { data } = await this.http.post(`/owners/platforms/${platformId}/roles`, req);
    return data;
  }

  async update(platformId: string, roleId: string, req: { permissions: string[] }) {
    const { data } = await this.http.put(`/owners/platforms/${platformId}/roles/${roleId}`, req);
    return data;
  }

  async delete(platformId: string, roleId: string) {
    await this.http.delete(`/owners/platforms/${platformId}/roles/${roleId}`);
  }
}
