import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createGame, reduce } from './engine.ts';
import { nextLegalResearchPosition, nextResearchPosition, RESEARCH_START_POSITION, researchRowPoints, researchScore, rowGrantsAssistant, templeArrivalAward } from './research.ts';
import type { EngineContext, ResearchTrackDefinition } from './types.ts';

async function loadTracks(): Promise<Record<string, ResearchTrackDefinition>> {
  const raw = await readFile(new URL('./generated/research-tracks.json', import.meta.url), 'utf8');
  return JSON.parse(raw);
}

test('extracts Bird, Snake, Monkey, and Lizard research tracks', async () => {
  const tracks = await loadTracks();
  assert.deepEqual(Object.keys(tracks).sort(), ['bird', 'lizard', 'monkey', 'snake']);
  assert.equal(tracks.bird.rows.length, 7);
  assert.equal(tracks.snake.rows.length, 7);
  assert.equal(tracks.monkey.rows.length, 8);
  assert.ok(tracks.lizard.rows.length >= 7);
  for (const id of ['bird', 'snake', 'monkey', 'lizard']) {
    assert.ok((tracks[id].bridges ?? []).length > 0, `${id} should have research bridges`);
    assert.equal(tracks[id].templeArrivalPoints, undefined);
  }
});

test('Monkey research scoring is preserved from start toward the temple', async () => {
  const { monkey } = await loadTracks();
  assert.deepEqual(
    monkey.rows.map(row => [row.magnifyingPoints, row.journalPoints]),
    [[1, 0], [3, 0], [4, 1], [5, 2], [5, 4], [8, 7], [9, 9], [15, 16]],
  );
});

test('Bird research scoring is preserved from start toward the temple', async () => {
  const { bird } = await loadTracks();
  assert.deepEqual(
    bird.rows.map(row => [row.magnifyingPoints, row.journalPoints]),
    [[1, 0], [2, 1], [4, 2], [6, 4], [9, 6], [12, 8], [16, 10]],
  );
  assert.deepEqual(
    bird.rows.map(row => row.grantsAssistant),
    [true, true, true, true, false, false, false],
  );
});

test('Snake research scoring is preserved from start toward the temple', async () => {
  const { snake } = await loadTracks();
  assert.deepEqual(
    snake.rows.map(row => [row.magnifyingPoints, row.journalPoints]),
    [[1, 0], [2, 3], [3, 4], [4, 5], [5, 8], [10, 12], [15, 15]],
  );
  assert.deepEqual(
    snake.rows.map(row => row.grantsAssistant),
    [true, false, true, true, true, false, false],
  );
});

test('research position keeps the printed starting space separate from row zero', async () => {
  const { bird } = await loadTracks();
  assert.equal(nextResearchPosition(bird, 'magnifying', RESEARCH_START_POSITION), 0);
  assert.equal(nextResearchPosition(bird, 'journal', RESEARCH_START_POSITION), 0);
  assert.equal(researchRowPoints(bird, 'magnifying', RESEARCH_START_POSITION), 0);
  assert.equal(researchRowPoints(bird, 'magnifying', 0), 1);
  assert.equal(researchRowPoints(bird, 'journal', 0), 0);
});

test('journal lead limit is a per-player research rule', async () => {
  const { bird } = await loadTracks();
  assert.throws(() => nextLegalResearchPosition(bird, 'journal', 0, 0, 0), /cannot advance more than 0 row/);
  assert.equal(nextLegalResearchPosition(bird, 'journal', 0, 0, 0, { journalMaxLead: 1 }), 1);
  assert.throws(() => nextLegalResearchPosition(bird, 'journal', 1, 0, 1, { journalMaxLead: 1 }), /cannot advance more than 1 row/);
});

test('only the magnifying glass can enter the temple', async () => {
  const { bird } = await loadTracks();
  const topRow = bird.rows.length - 1;
  assert.equal(nextResearchPosition(bird, 'magnifying', topRow), bird.rows.length);
  assert.throws(() => nextResearchPosition(bird, 'journal', topRow), /cannot advance farther/);
  assert.equal(researchRowPoints(bird, 'magnifying', bird.rows.length), 0);
  assert.throws(() => researchRowPoints(bird, 'journal', bird.rows.length), /Journal cannot enter the temple/);
});

test('temple arrival awards require board-specific manual values', async () => {
  const { bird } = await loadTracks();
  assert.throws(() => templeArrivalAward(bird, 0), /have not been recorded/);
  const configured = { ...bird, templeArrivalPoints: [12, 9, 6, 3] as [number, number, number, number] };
  assert.deepEqual([0, 1, 2, 3].map(index => templeArrivalAward(configured, index)), [12, 9, 6, 3]);
  assert.throws(() => templeArrivalAward(configured, 4), /No temple arrival award/);
});

test('assistant-row metadata can be queried independently of TTS coordinates', async () => {
  const { bird } = await loadTracks();
  assert.equal(rowGrantsAssistant(bird, 0), true);
  assert.equal(rowGrantsAssistant(bird, 4), false);
  assert.equal(rowGrantsAssistant(bird, RESEARCH_START_POSITION), false);
});

test('researchScore allows valid leader-specific journal positions', async () => {
  const { bird } = await loadTracks();
  assert.equal(researchScore(bird, 4, 3), 13);
  assert.equal(researchScore(bird, bird.rows.length, 6, 23), 33);
  assert.equal(researchScore(bird, 0, 1), 2);
});

test('ADVANCE_RESEARCH moves the selected token from the printed start onto row zero', async () => {
  const researchTracks = await loadTracks();
  const context: EngineContext = { cards: {}, researchTracks };
  let state = reduce(createGame(['p1']), { type: 'START_GAME' }, context);
  assert.equal(state.research.magnifying.p1, RESEARCH_START_POSITION);
  state = reduce(state, { type: 'ADVANCE_RESEARCH', playerId: 'p1', track: 'magnifying' }, context);
  assert.equal(state.research.magnifying.p1, 0);
  assert.equal(state.players.p1.researchMagnifying, 0);
});

test('base player journal cannot advance ahead of magnifying through reducer', async () => {
  const researchTracks = await loadTracks();
  const context: EngineContext = { cards: {}, researchTracks };
  let state = reduce(createGame(['p1']), { type: 'START_GAME' }, context);
  state = reduce(state, { type: 'ADVANCE_RESEARCH', playerId: 'p1', track: 'magnifying' }, context);
  state.players.p1.mainActionUsed = false;
  state = reduce(state, { type: 'ADVANCE_RESEARCH', playerId: 'p1', track: 'journal' }, context);
  state.players.p1.mainActionUsed = false;
  assert.throws(() => reduce(state, { type: 'ADVANCE_RESEARCH', playerId: 'p1', track: 'journal' }, context), /cannot advance more than 0 row/);
});

test('journalist-style rule allows journal to lead by exactly one row', async () => {
  const researchTracks = await loadTracks();
  const context: EngineContext = { cards: {}, researchTracks };
  let state = reduce(createGame(['p1']), { type: 'START_GAME' }, context);
  state.players.p1.rules.journalMaxLead = 1;
  state = reduce(state, { type: 'ADVANCE_RESEARCH', playerId: 'p1', track: 'magnifying' }, context);
  state.players.p1.mainActionUsed = false;
  state = reduce(state, { type: 'ADVANCE_RESEARCH', playerId: 'p1', track: 'journal' }, context);
  state.players.p1.mainActionUsed = false;
  state = reduce(state, { type: 'ADVANCE_RESEARCH', playerId: 'p1', track: 'journal' }, context);
  state.players.p1.mainActionUsed = false;
  assert.equal(state.research.magnifying.p1, 0);
  assert.equal(state.research.journal.p1, 1);
  assert.throws(() => reduce(state, { type: 'ADVANCE_RESEARCH', playerId: 'p1', track: 'journal' }, context), /cannot advance more than 1 row/);
});

test('START_GAME can select any of the four implemented research boards', async () => {
  const researchTracks = await loadTracks();
  const context: EngineContext = { cards: {}, researchTracks };
  for (const researchBoard of ['bird', 'snake', 'monkey', 'lizard'] as const) {
    const state = reduce(createGame(['p1']), { type: 'START_GAME', researchBoard }, context);
    assert.equal(state.research.board, researchBoard);
  }
});

test('journal cannot advance beyond its top scored row through the reducer', async () => {
  const researchTracks = await loadTracks();
  const context: EngineContext = { cards: {}, researchTracks };
  let state = reduce(createGame(['p1']), { type: 'START_GAME' }, context);
  state.research.magnifying.p1 = researchTracks.bird!.rows.length - 1;
  state.players.p1.researchMagnifying = researchTracks.bird!.rows.length - 1;
  state.research.journal.p1 = researchTracks.bird!.rows.length - 1;
  state.players.p1.researchJournal = researchTracks.bird!.rows.length - 1;
  assert.throws(() => reduce(state, { type: 'ADVANCE_RESEARCH', playerId: 'p1', track: 'journal' }, context), /cannot advance farther/);
});
