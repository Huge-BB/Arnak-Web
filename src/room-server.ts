/**
 * Minimal local/LAN room server. It owns GameState and sends personalised
 * snapshots over SSE; clients submit only public EngineCommand values.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { withBaseAssistantEffects } from './assistant-effect-data.ts';
import { withBaseCardEffects } from './card-effect-data.ts';
import { withBaseGuardianEffects } from './guardian-effect-data.ts';
import { buildResearchTracks } from './research-data.ts';
import { RoomService } from './room-service.ts';
import type { EngineCommand, EngineContext } from './types.ts';

const root = new URL('.', import.meta.url);
async function json<T>(relative: string): Promise<T> { return JSON.parse(await readFile(new URL(relative, root), 'utf8')) as T; }
const [cards, assistants, sites, idols, guardians, generatedTracks, manual, rewards] = await Promise.all([
  json<EngineContext['cards']>('./generated/cards.json'), json<NonNullable<EngineContext['assistants']>>('./generated/assistants.json'), json<NonNullable<EngineContext['sites']>>('./generated/sites.json'), json<NonNullable<EngineContext['idols']>>('./generated/idols.json'), json<NonNullable<EngineContext['guardians']>>('./generated/guardians.json'), json<NonNullable<EngineContext['researchTracks']>>('./generated/research-tracks.json'), json<Parameters<typeof buildResearchTracks>[1]>('../data/research-manual-data.json'), json<Parameters<typeof buildResearchTracks>[2]['rewardManual']>('../data/research-rewards-manual.json'),
]);
const context: EngineContext = withBaseCardEffects(withBaseGuardianEffects(withBaseAssistantEffects({ cards, assistants, sites, idols, guardians, researchTracks: buildResearchTracks(generatedTracks, manual, { rewardManual: rewards }) })));
const rooms = new RoomService(context);

async function body(request: import('node:http').IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []; for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString('utf8'); return raw ? JSON.parse(raw) as Record<string, unknown> : {};
}
function send(response: import('node:http').ServerResponse, code: number, value: unknown) { response.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'no-store' }); response.end(JSON.stringify(value)); }
function error(response: import('node:http').ServerResponse, cause: unknown) { send(response, 400, { ok: false, error: cause instanceof Error ? cause.message : String(cause) }); }

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') { response.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }); response.end(); return; }
    const url = new URL(request.url ?? '/', 'http://localhost'), parts = url.pathname.split('/').filter(Boolean);
    if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { ok: true });
    if (request.method === 'GET' && url.pathname === '/rooms') return send(response, 200, { ok: true, rooms: await rooms.listRooms() });
    if (request.method === 'POST' && url.pathname === '/rooms') return send(response, 201, { ok: true, ticket: await rooms.createRoom(await body(request)) });
    if (parts[0] !== 'rooms' || !parts[1]) return send(response, 404, { ok: false, error: 'Not found' });
    const roomId = parts[1], operation = parts[2];
    if (request.method === 'GET' && operation === 'snapshot') return send(response, 200, { ok: true, snapshot: await rooms.snapshot(roomId, url.searchParams.get('token') ?? '') });
    if (request.method === 'GET' && operation === 'events') {
      const token = url.searchParams.get('token') ?? '';
      response.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform', connection: 'keep-alive', 'access-control-allow-origin': '*' });
      const unsubscribe = await rooms.subscribe(roomId, token, snapshot => response.write(`event: snapshot\ndata: ${JSON.stringify(snapshot)}\n\n`));
      const heartbeat = setInterval(() => response.write(': ping\n\n'), 20_000);
      request.on('close', () => { clearInterval(heartbeat); unsubscribe(); }); return;
    }
    const payload = await body(request), token = String(payload.token ?? '');
    if (request.method === 'POST' && operation === 'join') return send(response, 200, { ok: true, ticket: await rooms.joinRoom(roomId, payload) });
    if (request.method === 'POST' && operation === 'start') return send(response, 200, { ok: true, snapshot: await rooms.startRoom(roomId, token, payload) });
    if (request.method === 'POST' && operation === 'commands') return send(response, 200, { ok: true, snapshot: await rooms.submitCommand(roomId, token, payload.command as EngineCommand) });
    return send(response, 404, { ok: false, error: 'Not found' });
  } catch (cause) { error(response, cause); }
});
const port = Number(process.env.ARNAK_ROOM_PORT ?? 8787);
server.listen(port, '0.0.0.0', () => process.stdout.write(`Arnak room server listening at http://127.0.0.1:${port}\n`));
