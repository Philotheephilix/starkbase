import type { AxiosInstance } from 'axios';
import type { EventRecord, EventMint } from '@starkbase/types';

export class EventsModule {
  constructor(private http: AxiosInstance) {}

  async createEvent(
    name: string,
    description: string,
    imageUrl: string,
    maxSupply?: number
  ): Promise<EventRecord> {
    const { data } = await this.http.post('/events', {
      name,
      description,
      imageUrl,
      maxSupply: maxSupply ?? 0,
    });
    return data as EventRecord;
  }

  async listEvents(): Promise<EventRecord[]> {
    const { data } = await this.http.get('/events');
    return data as EventRecord[];
  }

  async getEvent(id: string): Promise<EventRecord> {
    const { data } = await this.http.get(`/events/${id}`);
    return data as EventRecord;
  }

  async mint(eventId: string, recipient: string): Promise<EventMint> {
    const { data } = await this.http.post(`/events/${eventId}/mint`, { recipient });
    return data as EventMint;
  }

  async listMints(eventId: string): Promise<EventMint[]> {
    const { data } = await this.http.get(`/events/${eventId}/mints`);
    return data as EventMint[];
  }
}
