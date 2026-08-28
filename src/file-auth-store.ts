import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AuthStore, StoredSession, StoredUser } from './auth.ts';

type AuthData = { users: StoredUser[]; sessions: StoredSession[] };
const empty = (): AuthData => ({ users: [], sessions: [] });

/**
 * Durable single-process store for LAN/self-hosted installs. Writes use
 * temp-file rename and a process-local queue. Production multi-replica
 * deployments should implement AuthStore with a database transaction.
 */
export class JsonFileAuthStore implements AuthStore {
  #tail = Promise.resolve();
  private path: string;
  constructor(path: string) { this.path = path; }
  private async read(): Promise<AuthData> { try { return JSON.parse(await readFile(this.path, 'utf8')) as AuthData; } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return empty(); throw error; } }
  private async write(data: AuthData) { await mkdir(dirname(this.path), { recursive: true }); const temp = `${this.path}.tmp`; await writeFile(temp, JSON.stringify(data), 'utf8'); await rename(temp, this.path); }
  private async transact<T>(change: (data: AuthData) => T | Promise<T>): Promise<T> { let release!: () => void; const prior = this.#tail, current = new Promise<void>(resolve => { release = resolve; }); this.#tail = prior.then(() => current); await prior; try { const data = await this.read(), value = await change(data); await this.write(data); return value; } finally { release(); } }
  async createUser(user: StoredUser) { await this.transact(data => { if (data.users.some(candidate => candidate.username === user.username)) throw new Error('Username is already in use'); data.users.push(structuredClone(user)); }); }
  async findUserByUsername(username: string) { const user = (await this.read()).users.find(candidate => candidate.username === username); return user && structuredClone(user); }
  async findUserById(userId: string) { const user = (await this.read()).users.find(candidate => candidate.id === userId); return user && structuredClone(user); }
  async createSession(session: StoredSession) { await this.transact(data => { data.sessions.push(structuredClone(session)); }); }
  async findSessionByHash(tokenHash: string) { const session = (await this.read()).sessions.find(candidate => candidate.tokenHash === tokenHash); return session && structuredClone(session); }
  async deleteSessionByHash(tokenHash: string) { await this.transact(data => { data.sessions = data.sessions.filter(session => session.tokenHash !== tokenHash); }); }
  async pruneSessions(before: string) { await this.transact(data => { data.sessions = data.sessions.filter(session => session.expiresAt > before); }); }
}
