import assert from 'node:assert/strict';
import test from 'node:test';
import { projectGameState, RoomService } from './room-service.ts';
import { createGame } from './engine.ts';
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

test('snapshot projection hides another player pending-choice payload from players and spectators', () => {
  const state = createGame(['p1', 'p2']);
  state.pendingRewards = [
    { playerId: 'p1', sourceId: 'secret-p1', code: 'card:RESOLVE_EFFECT', payload: { privateCard: '0101' } },
    { playerId: 'p2', sourceId: 'secret-p2', code: 'card:RESOLVE_EFFECT', payload: { privateCard: '0102' } },
  ];
  assert.deepEqual(projectGameState(state, 'p1').pendingRewards.map(reward => reward.sourceId), ['secret-p1']);
  assert.deepEqual(projectGameState(state, 'p2').pendingRewards.map(reward => reward.sourceId), ['secret-p2']);
  assert.deepEqual(projectGameState(state).pendingRewards, []);
});

test('a reserved pass executes once when the player next receives a legal turn', async () => {
  const rooms = new RoomService(context), host = await rooms.createRoom({ seats: 2 });
  const guest = await rooms.joinRoom(host.roomId, { name: 'Guest' });
  await rooms.startRoom(host.roomId, host.token, { seed: 'reserved-pass' });
  assert.equal((await rooms.setAutoPass(host.roomId, guest.token, true)).viewer.autoPass, true);
  const next = await rooms.submitCommand(host.roomId, host.token, { type: 'action', action: { type: 'PASS', playerId: 'p1' } });
  // Both players have now passed, so round cleanup immediately resets
  // hasPassed and rotates first player. Reaching round two proves p2's
  // one-time reserved pass was consumed.
  assert.equal(next.state?.round, 2);
  assert.equal(next.state?.currentPlayer, 'p2');
  assert.equal((await rooms.snapshot(host.roomId, guest.token)).viewer.autoPass, false);
});
