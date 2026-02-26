import { useCallback } from 'react';
import { useStarkbaseContext } from '../context/StarkbaseContext';
import type { EventRecord, EventMint } from '@starkbase/types';

export function useEvents() {
  const client = useStarkbaseContext();

  const createEvent = useCallback(
    (name: string, description: string, imageUrl: string, maxSupply?: number): Promise<EventRecord> =>
      client.events.createEvent(name, description, imageUrl, maxSupply),
    [client]
  );

  const listEvents = useCallback(
    (): Promise<EventRecord[]> => client.events.listEvents(),
    [client]
  );

  const getEvent = useCallback(
    (id: string): Promise<EventRecord> => client.events.getEvent(id),
    [client]
  );

  const mint = useCallback(
    (eventId: string, recipient: string): Promise<EventMint> =>
      client.events.mint(eventId, recipient),
    [client]
  );

  const listMints = useCallback(
    (eventId: string): Promise<EventMint[]> => client.events.listMints(eventId),
    [client]
  );

  return { createEvent, listEvents, getEvent, mint, listMints };
}
