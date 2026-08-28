import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { templeRulesFor } from './temple-rules.ts';
import { defeatLizardTrackGuardian, placeLizardTrackGuardian, LIZARD_TRACK_GUARDIAN_NODE } from './temples/lizard-state.ts';
import type { ResearchBridgeDefinition, ResearchTrackDefinition } from './types.ts';

function playingState() {
  const state = createGame(['p1']);
  state.phase = 'playing';
  state.currentPlayer = 'p1';
  return state;
}

function track(id: string): ResearchTrackDefinition {
  return {
    id,
    name: id,
    rows: [{ magnifyingPoints: 1, journalPoints: 0, grantsAssistant: false, nodes: [
      { id: `${id}:r0:p0`, rowIndex: 0, pathIndex: 0, researchLevel: 0 },
    ] }],
    bridges: [],
  };
}

function bridge(id: string, allowedTokens?: ('magnifying'|'journal')[]): ResearchBridgeDefinition {
  return { id, from: 'from', to: 'to', cost: {}, verified: true, allowedTokens };
}

test('Monkey bridge can be restricted to magnifying glass only', () => {
  const state = playingState();
  const t = track('monkey');
  const b = bridge('monkey:left', ['magnifying']);
  const rules = templeRulesFor('monkey');
  assert.doesNotThrow(() => rules.validateMove?.({ state, track: t, playerId: 'p1', token: 'magnifying', from: 'from', to: 'to', bridge: b }));
  assert.throws(() => rules.validateMove?.({ state, track: t, playerId: 'p1', token: 'journal', from: 'from', to: 'to', bridge: b }), /cannot use research bridge/);
});

test('Monkey bridge can be restricted to journal only', () => {
  const state = playingState();
  const t = track('monkey');
  const b = bridge('monkey:right', ['journal']);
  const rules = templeRulesFor('monkey');
  assert.doesNotThrow(() => rules.validateMove?.({ state, track: t, playerId: 'p1', token: 'journal', from: 'from', to: 'to', bridge: b }));
  assert.throws(() => rules.validateMove?.({ state, track: t, playerId: 'p1', token: 'magnifying', from: 'from', to: 'to', bridge: b }), /cannot use research bridge/);
});

test('Lizard track guardian permits entry, reveals to magnifying glass, and blocks advancement beyond its node', () => {
  const state = playingState();
  placeLizardTrackGuardian(state, { id: 'track-guardian', nodeId: LIZARD_TRACK_GUARDIAN_NODE });
  const t = track('lizard');
  const b = bridge('lizard:test');
  const rules = templeRulesFor('lizard');
  assert.doesNotThrow(() => rules.validateMove?.({ state, track: t, playerId: 'p1', token: 'magnifying', from: 'from', to: 'lizard:r3:p0', bridge: b }));
  rules.afterMove?.({ state, track:t, playerId:'p1', token:'magnifying', from:'from', to:'lizard:r3:p0', bridge:b });
  assert.equal((state.research.templeData?.lizardGuardians as {revealed:boolean}[])[0].revealed,true);
  assert.throws(() => rules.validateMove?.({ state, track: t, playerId: 'p1', token: 'magnifying', from: 'lizard:r3:p0', to: 'after', bridge: b }), /blocked/);
  defeatLizardTrackGuardian(state, 'track-guardian');
  assert.doesNotThrow(() => rules.validateMove?.({ state, track: t, playerId: 'p1', token: 'magnifying', from: 'from', to: 'lizard:r3:p0', bridge: b }));
});
