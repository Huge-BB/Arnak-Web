import assert from 'node:assert/strict';
import test from 'node:test';
import { RoomService } from './room-service.ts';
import type { EngineContext } from './types.ts';

const context: EngineContext = { cards: {} };
test('room service owns seats, starts an authoritative game, and projects private hands', async () => {
  const rooms = new RoomService(context);
  const host = await rooms.createRoom({ name: 'Test', seats: 2 });
  const guest = await rooms.joinRoom(host.roomId, { name: 'Guest' });
  const started = await rooms.startRoom(host.roomId, host.token, { seed: 'room-test', moonStaff: 'red' });
  assert.equal(started.state?.moonStaff, 'red');
  assert.equal(started.state?.players.p1.handCount, 0);
  assert.equal(started.state?.players.p2.hand.length, 0);
  assert.deepEqual(started.state?.market.itemDeck, []);
  assert.deepEqual(started.state?.market.artifactDeck, []);
  await assert.rejects(rooms.submitCommand(host.roomId, guest.token, { type: 'action', action: { type: 'PASS', playerId: 'p1' } }), /own seat/);
});

test('spectators receive snapshots but cannot act, and subscribers see state changes', async () => {
  const rooms = new RoomService(context), host = await rooms.createRoom();
  const spectator = await rooms.joinRoom(host.roomId, { spectator: true });
  await rooms.startRoom(host.roomId, host.token, { seed: 'spectator-test' });
  let snapshots = 0;
  const unsubscribe = await rooms.subscribe(host.roomId, spectator.token, () => { snapshots += 1; });
  await assert.rejects(rooms.submitCommand(host.roomId, spectator.token, { type: 'action', action: { type: 'PASS', playerId: 'p1' } }), /Spectators/);
  await rooms.submitCommand(host.roomId, host.token, { type: 'action', action: { type: 'PASS', playerId: 'p1' } });
  assert.equal(snapshots, 2);
  unsubscribe();
});
