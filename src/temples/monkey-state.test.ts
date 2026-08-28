import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, reduce } from '../engine.ts';
import { monkeyTrackArtifact, queueMonkeyTrackArtifactActivation, setupMonkeyTrackArtifact } from './monkey-state.ts';
import type { EngineContext } from '../types.ts';
import cards from '../generated/cards.json' with { type: 'json' };

const context: EngineContext = {
  cards: {
    a: { id: 'a', name: 'A', type: 'Artifact', expansion: 'test', cost: 3 },
    b: { id: 'b', name: 'B', type: 'Artifact', expansion: 'test', cost: 3 },
    cheap: { id: 'cheap', name: 'Cheap', type: 'Artifact', expansion: 'test', cost: 2 },
  },
};

test('Monkey setup deterministically selects a cost-3 track Artifact', () => {
  const left = createGame(['p1']);
  const right = createGame(['p1']);
  const a = setupMonkeyTrackArtifact(left, context, 'monkey:r4:magnifying', 'same-seed');
  const b = setupMonkeyTrackArtifact(right, context, 'monkey:r4:magnifying', 'same-seed');
  assert.deepEqual(a, b);
  assert.ok(['a', 'b'].includes(a.artifactId));
});

test('Monkey track Artifact activation is queued only on its configured node', () => {
  const state = createGame(['p1']);
  const artifact = setupMonkeyTrackArtifact(state, context, 'monkey:r4:magnifying', 'seed');
  queueMonkeyTrackArtifactActivation(state, 'p1', 'monkey:r3:p0');
  assert.equal(state.pendingRewards.length, 0);
  queueMonkeyTrackArtifactActivation(state, 'p1', 'monkey:r4:magnifying');
  assert.equal(state.pendingRewards.length, 1);
  assert.deepEqual(state.pendingRewards[0].payload, { type: 'TRIGGER_TRACK_ARTIFACT', artifactId: artifact.artifactId });
});

test('START_GAME places the Monkey track Artifact when a card catalog is available', () => {
  const state = reduce(createGame(['p1', 'p2']), { type: 'START_GAME', seed: 'track-artifact', researchBoard: 'monkey' }, { cards });
  assert.ok(monkeyTrackArtifact(state));
});
