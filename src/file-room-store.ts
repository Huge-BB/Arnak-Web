import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { RoomStore, StoredRoom } from './room-store.ts';

/** Durable single-process RoomStore. Replace with transactional SQL for replicas. */
export class JsonFileRoomStore implements RoomStore {
  #tail = Promise.resolve();
  private path: string;
  constructor(path: string) { this.path = path; }
  private async load(): Promise<StoredRoom[]> { try { return JSON.parse(await readFile(this.path, 'utf8')) as StoredRoom[]; } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; } }
  private async save(rooms: StoredRoom[]) { await mkdir(dirname(this.path), { recursive: true }); const temp = `${this.path}.tmp`; await writeFile(temp, JSON.stringify(rooms), 'utf8'); await rename(temp, this.path); }
  private async locked<T>(operation: (rooms: StoredRoom[]) => T | Promise<T>): Promise<T> { let release!: () => void; const prior = this.#tail, current = new Promise<void>(resolve => { release = resolve; }); this.#tail = prior.then(() => current); await prior; try { const rooms = await this.load(), result = await operation(rooms); await this.save(rooms); return result; } finally { release(); } }
  async create(room: StoredRoom) { await this.locked(rooms => { if (rooms.some(candidate => candidate.id === room.id)) throw new Error('Room already exists'); rooms.push(structuredClone(room)); }); }
  async list() { return structuredClone(await this.load()); }
  async read(roomId: string) { const room = (await this.load()).find(candidate => candidate.id === roomId); if (!room) throw new Error('Unknown room'); return structuredClone(room); }
  async transact<T>(roomId: string, mutate: (room: StoredRoom) => Promise<T> | T): Promise<T> { return this.locked(async rooms => { const room = rooms.find(candidate => candidate.id === roomId); if (!room) throw new Error('Unknown room'); const value = await mutate(room); room.updatedAt = new Date().toISOString(); return value; }); }
}
