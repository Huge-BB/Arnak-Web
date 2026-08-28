import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

export type UserId = string;
export type AuthUser = { id: UserId; username: string; displayName: string; createdAt: string };
export type StoredUser = AuthUser & { passwordSalt: string; passwordHash: string };
export type StoredSession = { id: string; tokenHash: string; userId: UserId; createdAt: string; expiresAt: string };
export type AuthSession = { token: string; user: AuthUser; expiresAt: string };

export interface AuthStore {
  createUser(user: StoredUser): Promise<void>;
  findUserByUsername(username: string): Promise<StoredUser | undefined>;
  findUserById(userId: UserId): Promise<StoredUser | undefined>;
  createSession(session: StoredSession): Promise<void>;
  findSessionByHash(tokenHash: string): Promise<StoredSession | undefined>;
  deleteSessionByHash(tokenHash: string): Promise<void>;
  pruneSessions(before: string): Promise<void>;
}

export class InMemoryAuthStore implements AuthStore {
  #users = new Map<UserId, StoredUser>();
  #usernames = new Map<string, UserId>();
  #sessions = new Map<string, StoredSession>();
  async createUser(user: StoredUser) { if (this.#usernames.has(user.username)) throw new Error('Username is already in use'); this.#users.set(user.id, structuredClone(user)); this.#usernames.set(user.username, user.id); }
  async findUserByUsername(username: string) { const id = this.#usernames.get(username); return id ? structuredClone(this.#users.get(id)) : undefined; }
  async findUserById(userId: UserId) { const user = this.#users.get(userId); return user && structuredClone(user); }
  async createSession(session: StoredSession) { this.#sessions.set(session.tokenHash, structuredClone(session)); }
  async findSessionByHash(tokenHash: string) { const session = this.#sessions.get(tokenHash); return session && structuredClone(session); }
  async deleteSessionByHash(tokenHash: string) { this.#sessions.delete(tokenHash); }
  async pruneSessions(before: string) { for (const [hash, session] of this.#sessions) if (session.expiresAt <= before) this.#sessions.delete(hash); }
}

export const normalizeUsername = (value: string) => value.trim().toLowerCase();
export const publicUser = (user: StoredUser): AuthUser => ({ id: user.id, username: user.username, displayName: user.displayName, createdAt: user.createdAt });
export const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');

async function hashPassword(password: string, salt: string) { return Buffer.from(await scrypt(password, salt, 64)).toString('base64url'); }
function validateRegistration(username: string, displayName: string, password: string) {
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(username)) throw new Error('Username must be 3–32 lowercase letters, digits, _ or -');
  if (displayName.length < 1 || displayName.length > 48) throw new Error('Display name must be 1–48 characters');
  if (password.length < 10 || password.length > 256) throw new Error('Password must be 10–256 characters');
}

/** Passwords are scrypt-hashed and session credentials are stored only as hashes. */
export class AuthService {
  private store: AuthStore;
  private sessionLifetimeMs: number;
  constructor(store: AuthStore = new InMemoryAuthStore(), sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000) { this.store = store; this.sessionLifetimeMs = sessionLifetimeMs; }
  async register(input: { username: string; displayName?: string; password: string }): Promise<AuthSession> {
    const username = normalizeUsername(input.username), displayName = input.displayName?.trim() || input.username.trim();
    validateRegistration(username, displayName, input.password);
    const now = new Date().toISOString(), user: StoredUser = { id: `u_${randomBytes(12).toString('base64url')}`, username, displayName, createdAt: now, passwordSalt: randomBytes(16).toString('base64url'), passwordHash: '' };
    user.passwordHash = await hashPassword(input.password, user.passwordSalt);
    await this.store.createUser(user);
    return this.issue(user);
  }
  async login(input: { username: string; password: string }): Promise<AuthSession> {
    const user = await this.store.findUserByUsername(normalizeUsername(input.username));
    if (!user) throw new Error('Invalid username or password');
    const supplied = Buffer.from(await hashPassword(input.password, user.passwordSalt), 'base64url'), expected = Buffer.from(user.passwordHash, 'base64url');
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error('Invalid username or password');
    return this.issue(user);
  }
  async authenticate(token: string | undefined): Promise<AuthUser | undefined> {
    if (!token) return undefined;
    const hash = hashToken(token), session = await this.store.findSessionByHash(hash);
    if (!session) return undefined;
    if (session.expiresAt <= new Date().toISOString()) { await this.store.deleteSessionByHash(hash); return undefined; }
    const user = await this.store.findUserById(session.userId);
    return user && publicUser(user);
  }
  async logout(token: string | undefined) { if (token) await this.store.deleteSessionByHash(hashToken(token)); }
  private async issue(user: StoredUser): Promise<AuthSession> {
    const token = randomBytes(32).toString('base64url'), now = new Date(), expiresAt = new Date(now.getTime() + this.sessionLifetimeMs).toISOString();
    await this.store.pruneSessions(now.toISOString());
    await this.store.createSession({ id: `s_${randomBytes(12).toString('base64url')}`, tokenHash: hashToken(token), userId: user.id, createdAt: now.toISOString(), expiresAt });
    return { token, user: publicUser(user), expiresAt };
  }
}
