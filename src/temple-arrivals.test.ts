import assert from 'node:assert/strict';
import test from 'node:test';
import { assignTempleArrival, emptyTempleArrivalState, templeArrivalPoints } from './temple-arrivals.ts';
import type { ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = {
  id: 'bird',
  name: 'Bird',
  rows: [],
  templeArrivalPoints: [10, 8, 6, 4],
};

test('Lost Temple arrival order uses board-configured first/second/third/fourth values', () => {
  let state = emptyTempleArrivalState();
  for (const playerId of ['p1', 'p2', 'p3', 'p4']) {
    state = assignTempleArrival(state, track, playerId);
  }

  assert.deepEqual(state.arrivals, ['p1', 'p2', 'p3', 'p4']);
  assert.equal(templeArrivalPoints(state, 'p1'), 10);
  assert.equal(templeArrivalPoints(state, 'p2'), 8);
  assert.equal(templeArrivalPoints(state, 'p3'), 6);
  assert.equal(templeArrivalPoints(state, 'p4'), 4);
});

test('Lost Temple arrival state rejects duplicate and over-capacity arrivals', () => {
  let state = assignTempleArrival(emptyTempleArrivalState(), track, 'p1');
  assert.throws(() => assignTempleArrival(state, track, 'p1'), /already reached/);

  state = assignTempleArrival(state, track, 'p2');
  state = assignTempleArrival(state, track, 'p3');
  state = assignTempleArrival(state, track, 'p4');
  assert.throws(() => assignTempleArrival(state, track, 'p5'), /No Lost Temple arrival space/);
});

test('Lost Temple arrival refuses to score before board values are recorded', () => {
  const unrecorded: ResearchTrackDefinition = { id: 'snake', name: 'Snake', rows: [] };
  assert.throws(
    () => assignTempleArrival(emptyTempleArrivalState(), unrecorded, 'p1'),
    /arrival points .* have not been recorded/,
  );
});
