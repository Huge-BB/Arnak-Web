/**
 * Minimal local/LAN room server. It owns GameState and sends personalised
 * snapshots over SSE; clients submit only public EngineCommand values.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AuthService } from './auth.ts';
import { withBaseAssistantEffects } from './assistant-effect-data.ts';
import { withBaseCardEffects } from './card-effect-data.ts';
import { withBaseGuardianEffects } from './guardian-effect-data.ts';
import { buildResearchTracks } from './research-data.ts';
import { RoomService } from './room-service.ts';
import { JsonFileAuthStore } from './file-auth-store.ts';
import { JsonFileRoomStore } from './file-room-store.ts';
import type { EngineCommand, EngineContext } from './types.ts';

const root = new URL('.', import.meta.url);
async function json<T>(relative: string): Promise<T> { return JSON.parse(await readFile(new URL(relative, root), 'utf8')) as T; }
const [cards, assistants, sites, idols, guardians, generatedTracks, manual, rewards] = await Promise.all([
  json<EngineContext['cards']>('./generated/cards.json'), json<NonNullable<EngineContext['assistants']>>('./generated/assistants.json'), json<NonNullable<EngineContext['sites']>>('./generated/sites.json'), json<NonNullable<EngineContext['idols']>>('./generated/idols.json'), json<NonNullable<EngineContext['guardians']>>('./generated/guardians.json'), json<NonNullable<EngineContext['researchTracks']>>('./generated/research-tracks.json'), json<Parameters<typeof buildResearchTracks>[1]>('../data/research-manual-data.json'), json<Parameters<typeof buildResearchTracks>[2]['rewardManual']>('../data/research-rewards-manual.json'),
]);
const context: EngineContext = withBaseCardEffects(withBaseGuardianEffects(withBaseAssistantEffects({ cards, assistants, sites, idols, guardians, researchTracks: buildResearchTracks(generatedTracks, manual, { rewardManual: rewards }) })));
const dataDir = resolve(process.env.ARNAK_DATA_DIR ?? '.arnak-data');
const auth = new AuthService(new JsonFileAuthStore(resolve(dataDir, 'auth.json')));
const rooms = new RoomService(context, new JsonFileRoomStore(resolve(dataDir, 'rooms.json')));

async function body(request: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8'); return raw ? JSON.parse(raw) as Record<string, unknown> : {};
}
class HttpError extends Error { readonly status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
const allowedOrigins = new Set((process.env.ARNAK_ALLOWED_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(value => value.trim()).filter(Boolean));
const allowTrustedLanOrigins = process.env.ARNAK_ALLOW_LAN_ORIGINS !== 'false';
function isPrivateLanHost(host: string) { const parts = host.split('.').map(Number); return parts.length === 4 && parts.every(Number.isInteger) && (parts[0] === 10 || parts[0] === 192 && parts[1] === 168 || parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31); }
function isTrustedLanOrigin(origin: string) { try { const url = new URL(origin); return url.protocol === 'http:' && ['5173', '4173'].includes(url.port) && isPrivateLanHost(url.hostname); } catch { return false; } }
function cors(request: import('node:http').IncomingMessage) { const origin = request.headers.origin; return origin && (allowedOrigins.has(origin) || allowTrustedLanOrigins && isTrustedLanOrigin(origin)) ? origin : undefined; }
function headers(request: import('node:http').IncomingMessage, extra: Record<string, string> = {}) { const origin = cors(request); return { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}), ...extra }; }
function send(request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse, code: number, value: unknown) { response.writeHead(code, headers(request, { 'content-type': 'application/json; charset=utf-8' })); response.end(JSON.stringify(value)); }
function error(request: import('node:http').IncomingMessage, response: import('node:http').ServerResponse, cause: unknown) { send(request, response, cause instanceof HttpError ? cause.status : 400, { ok: false, error: cause instanceof Error ? cause.message : String(cause) }); }
function bearer(request: import('node:http').IncomingMessage) { const value = request.headers.authorization; return value?.startsWith('Bearer ') ? value.slice(7) : undefined; }
async function requireUser(request: import('node:http').IncomingMessage) { const user = await auth.authenticate(bearer(request)); if (!user) throw new HttpError(401, 'Sign in is required'); return user; }

const attempts = new Map<string, { count: number; resetAt: number }>();
function rateLimit(request: import('node:http').IncomingMessage) { const key = request.socket.remoteAddress ?? 'unknown', now = Date.now(), prior = attempts.get(key); const bucket = !prior || prior.resetAt < now ? { count: 0, resetAt: now + 60_000 } : prior; bucket.count += 1; attempts.set(key, bucket); if (bucket.count > 10) throw new HttpError(429, 'Too many authentication attempts; retry in a minute'); }

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') { response.writeHead(204, headers(request, { 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type,authorization', 'access-control-max-age': '600' })); response.end(); return; }
    const url = new URL(request.url ?? '/', 'http://localhost'), parts = url.pathname.split('/').filter(Boolean);
    if (request.method === 'GET' && url.pathname === '/health') return send(request, response, 200, { ok: true });
    if (request.method === 'POST' && url.pathname === '/auth/register') { rateLimit(request); return send(request, response, 201, { ok: true, session: await auth.register(await body(request) as { username: string; displayName?: string; password: string }) }); }
    if (request.method === 'POST' && url.pathname === '/auth/login') { rateLimit(request); return send(request, response, 200, { ok: true, session: await auth.login(await body(request) as { username: string; password: string }) }); }
    if (request.method === 'POST' && url.pathname === '/auth/logout') { await auth.logout(bearer(request)); return send(request, response, 200, { ok: true }); }
    if (request.method === 'GET' && url.pathname === '/auth/me') return send(request, response, 200, { ok: true, user: await requireUser(request) });
    if (request.method === 'GET' && url.pathname === '/rooms') return send(request, response, 200, { ok: true, rooms: await rooms.listRooms() });
    if (request.method === 'POST' && url.pathname === '/rooms') { const user = await requireUser(request); return send(request, response, 201, { ok: true, ticket: await rooms.createRoom({ ...await body(request), user }) }); }
    if (parts[0] !== 'rooms' || !parts[1]) return send(request, response, 404, { ok: false, error: 'Not found' });
    const roomId = parts[1], operation = parts[2];
    if (request.method === 'GET' && operation === 'snapshot') return send(request, response, 200, { ok: true, snapshot: await rooms.snapshot(roomId, url.searchParams.get('token') ?? '') });
    if (request.method === 'GET' && operation === 'events') {
      const token = url.searchParams.get('token') ?? '';
      response.writeHead(200, headers(request, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive' }));
      const unsubscribe = await rooms.subscribe(roomId, token, snapshot => response.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`));
      const heartbeat = setInterval(() => response.write(': ping\n\n'), 20_000);
      request.on('close', () => { clearInterval(heartbeat); unsubscribe(); }); return;
    }
    const payload = await body(request), token = String(payload.token ?? '');
    if (request.method === 'POST' && operation === 'join') { const user = await requireUser(request); return send(request, response, 200, { ok: true, ticket: await rooms.joinRoom(roomId, { ...payload, user }) }); }
    if (request.method === 'POST' && operation === 'auto-pass') return send(request, response, 200, { ok: true, snapshot: await rooms.setAutoPass(roomId, token, Boolean(payload.enabled)) });
    if (request.method === 'POST' && operation === 'undo-turn') return send(request, response, 200, { ok: true, snapshot: await rooms.undoTurn(roomId, token) });
    if (request.method === 'POST' && operation === 'start') return send(request, response, 200, { ok: true, snapshot: await rooms.startRoom(roomId, token, payload) });
    if (request.method === 'POST' && operation === 'commands') return send(request, response, 200, { ok: true, snapshot: await rooms.submitCommand(roomId, token, payload.command as EngineCommand) });
    return send(request, response, 404, { ok: false, error: 'Not found' });
  } catch (cause) { error(request, response, cause); }
});
const port = Number(process.env.ARNAK_ROOM_PORT ?? 8787);
server.listen(port, '0.0.0.0', () => process.stdout.write(`Arnak room server listening at http://127.0.0.1:${port}\n`));
