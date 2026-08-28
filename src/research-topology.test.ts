import test from 'node:test';
import assert from 'node:assert/strict';
import { assertLegalResearchNodeMove, legalResearchDestinations } from './research-topology.ts';
import type { ResearchTrackDefinition } from './types.ts';

const track: ResearchTrackDefinition = {
  id: 'bird',
  name: 'Bird',
  rows: [
    {
      magnifyingPoints: 1,
      journalPoints: 0,
      grantsAssistant: false,
      nodes: [
        { id: 'bird:r0:left', rowIndex: 0, pathIndex: 0, researchLevel: 0 },
        { id: 'bird:r0:right', rowIndex: 0, pathIndex: 1, researchLevel: 0 },
      ],
    },
    {
      magnifyingPoints: 2,
      journalPoints: 1,
      grantsAssistant: false,
      nodes: [
        { id: 'bird:r1:left', rowIndex: 1, pathIndex: 0, researchLevel: 1 },
        { id: 'bird:r1:right45', rowIndex: 1, pathIndex: 1, researchLevel: 2, spansLevels: [1, 2] },
      ],
    },
  ],
  bridges: [
    { id: 's-l', from: 'bird:start', to: 'bird:r0:left' },
    { id: 's-r', from: 'bird:start', to: 'bird:r0:right' },
    { id: 'l-l', from: 'bird:r0:left', to: 'bird:r1:left' },
    { id: 'r-r45', from: 'bird:r0:right', to: 'bird:r1:right45' },
  ],
  templePoints: [23, 21, 20, 19],
};

test('research destinations follow actual bridges rather than rectangular rows', () => {
  assert.deepEqual(legalResearchDestinations(track, 'bird:r0:right'), ['bird:r1:right45']);
  assert.throws(
    () => assertLegalResearchNodeMove(
      track, 'magnifying', 'bird:r0:right', 'bird:r1:left', 'bird:r0:right', 'bird:start', 0,
    ),
    /Illegal research bridge/,
  );
});

test('journal lead uses logical researchLevel for a space spanning two printed levels', () => {
  assert.throws(
    () => assertLegalResearchNodeMove(
      track, 'journal', 'bird:r0:right', 'bird:r1:right45', 'bird:r0:right', 'bird:r0:right', 1,
    ),
    /cannot advance more than 1 research level/,
  );

  assert.doesNotThrow(() => assertLegalResearchNodeMove(
    track, 'journal', 'bird:r0:right', 'bird:r1:right45', 'bird:r0:right', 'bird:r0:right', 2,
  ));
});
