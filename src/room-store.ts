import type { EngineCommand, GameState, PlayerId } from './types.ts';
import type { UserId } from './auth.ts';

export type StoredMember = { tokenHash: string; userId?: UserId; playerId?: PlayerId; role: 'player' | 'spectator'; name: string; joinedAt: string; lastSeenAt: string };
export type RoomEvent = { version: number; at: string; kind: 'start' | 'command'; command?: EngineCommand };
export interface StoredRoom { id: string; name: string; seats: number; hostPlayerId: PlayerId; hostUserId?: UserId; members: StoredMember[]; state?: GameState; version: number; events: RoomEvent[]; snapshots: { version: number; state: GameState }[]; createdAt: string; updatedAt: string; visibility: 'public' | 'unlisted'; }

/** Persistence seam. A SQL implementation should make transact one database transaction (SELECT … FOR UPDATE). */
export interface RoomStore { create(room: StoredRoom): Promise<void>; list(): Promise<StoredRoom[]>; read(roomId: string): Promise<StoredRoom>; transact<T>(roomId: string, mutate: (room: StoredRoom) => Promise<T> | T): Promise<T>; }

export class InMemoryRoomStore implements RoomStore {
  #rooms = new Map<string, StoredRoom>();
  #tails = new Map<string, Promise<void>>();
  async create(room: StoredRoom) { if (this.#rooms.has(room.id)) throw new Error('Room already exists'); this.#rooms.set(room.id, structuredClone(room)); }
  async list() { return structuredClone([...this.#rooms.values()]); }
  async read(roomId: string) { const room = this.#rooms.get(roomId); if (!room) throw new Error('Unknown room'); return structuredClone(room); }
  async transact<T>(roomId: string, mutate: (room: StoredRoom) => Promise<T> | T): Promise<T> {
    const prior = this.#tails.get(roomId) ?? Promise.resolve(); let release!: () => void;
    const current = new Promise<void>(resolve => { release = resolve; });
    const tail = prior.then(() => current); this.#tails.set(roomId, tail); await prior;
    try { const room = await this.read(roomId), value = await mutate(room); this.#rooms.set(roomId, room); return value; }
    finally { release(); if (this.#tails.get(roomId) === tail) this.#tails.delete(roomId); }
  }
}
