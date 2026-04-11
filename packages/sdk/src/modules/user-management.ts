import { AxiosInstance } from 'axios';

export class UserManagementModule {
  constructor(private http: AxiosInstance) {}

  async listUsers(platformId: string) {
    const { data } = await this.http.get(`/owners/platforms/${platformId}/users`);
    return data;
  }

  async removeUser(platformId: string, userId: string) {
    await this.http.delete(`/owners/platforms/${platformId}/users/${userId}`);
  }

  async assignRole(platformId: string, userId: string, roleId: string) {
    await this.http.post(`/owners/platforms/${platformId}/users/${userId}/roles`, { roleId });
  }

  async removeRole(platformId: string, userId: string, roleId: string) {
    await this.http.delete(`/owners/platforms/${platformId}/users/${userId}/roles/${roleId}`);
  }
}
