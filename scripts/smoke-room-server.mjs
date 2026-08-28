import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Exercises the actual HTTP contract used by the browser rather than only the
// RoomService class.  A distinct local port keeps it safe beside a dev server.
const port = Number(process.env.ARNAK_SMOKE_ROOM_PORT ?? 18887);
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--experimental-strip-types', 'src/room-server.ts'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, ARNAK_ROOM_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverOutput = '';
server.stdout.on('data', chunk => { serverOutput += String(chunk); });
server.stderr.on('data', chunk => { serverOutput += String(chunk); });

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers ?? {}) },
  });
  const json = await response.json();
  assert.equal(response.ok, true, `${path}: ${json.error ?? response.status}`);
  assert.equal(json.ok, true, `${path} did not return ok`);
  return json;
}

async function ready() {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { await request('/health'); return; }
    catch (error) { lastError = error; await delay(50); }
  }
  throw new Error(`Room HTTP server never became ready: ${lastError}\n${serverOutput}`);
}

async function collectSnapshots(response, minimum) {
  assert.ok(response.body, 'SSE response has no body');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', snapshots = [];
  while (snapshots.length < minimum) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
      const data = block.split('\n').find(line => line.startsWith('data: '));
      if (data) snapshots.push(JSON.parse(data.slice(6)));
    }
  }
  return snapshots;
}

try {
  await ready();
  const created = await request('/rooms', { method: 'POST', body: JSON.stringify({ name: 'HTTP smoke', seats: 2 }) });
  const host = created.ticket;
  const joined = await request(`/rooms/${host.roomId}/join`, { method: 'POST', body: JSON.stringify({ name: 'Guest' }) });
  assert.equal(joined.ticket.playerId, 'p2');
  await request(`/rooms/${host.roomId}/start`, { method: 'POST', body: JSON.stringify({ token: host.token, seed: 'http-smoke', researchBoard: 'bird' }) });
  const hostView = await request(`/rooms/${host.roomId}/snapshot?token=${encodeURIComponent(host.token)}`);
  const guestView = await request(`/rooms/${host.roomId}/snapshot?token=${encodeURIComponent(joined.ticket.token)}`);
  assert.equal(hostView.snapshot.state.phase, 'playing');
  assert.equal(hostView.snapshot.state.players.p1.hand.length, 5);
  assert.equal(hostView.snapshot.state.players.p2.hand.length, 0);
  assert.equal(guestView.snapshot.state.players.p1.hand.length, 0);
  assert.equal(guestView.snapshot.state.players.p2.hand.length, 5);
  const abort = new AbortController();
  const events = await fetch(`${base}/rooms/${host.roomId}/events?token=${encodeURIComponent(host.token)}`, { signal: abort.signal });
  const streamed = collectSnapshots(events, 2);
  await request(`/rooms/${host.roomId}/commands`, { method: 'POST', body: JSON.stringify({ token: host.token, command: { type: 'action', action: { type: 'PASS', playerId: 'p1' } } }) });
  const snapshots = await Promise.race([streamed, delay(2000).then(() => { throw new Error('Timed out waiting for room SSE snapshots'); })]);
  abort.abort();
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[0].state.players.p1.hand.length, 5);
  assert.equal(snapshots[1].state.players.p1.hasPassed, true);
  console.log(`Room HTTP/SSE smoke passed (${host.roomId}, private hands and live updates verified).`);
} finally {
  server.kill();
  await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(1000)]);
}
