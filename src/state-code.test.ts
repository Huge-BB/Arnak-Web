import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame } from './engine.ts';
import { decodeStateCode, encodeStateCode } from './state-code.ts';

test('state code restores an exact JSON-safe game checkpoint', () => {
  const state = createGame(['p1', 'p2']);
  state.phase = 'playing';
  state.players.p1.resources.compass = 7;
  state.sites.test = { id: 'test', level: 1, idolSlots: 1, occupiedBy: 'p1' };
  assert.deepEqual(decodeStateCode(encodeStateCode(state)), state);
});
test('state code rejects a malformed payload', () => {
  assert.throws(() => decodeStateCode('ARNK2.not-a-valid-code'), /Invalid state code/);
});
