import type { ResearchBridgeDefinition, ResearchNodeDefinition, ResearchTrackDefinition } from '../types.ts';

/**
 * The TTS movement table models Monkey's level 4/5 area as a linear chain.
 * The printed board instead has a magnifying-only left space spanning both
 * levels, while the journal follows two separate right-hand spaces.
 */
export const MONKEY_TRACK_ARTIFACT_NODE = 'monkey:r4:magnifying';

function bridge(from: string, to: string, allowedTokens: ('magnifying' | 'journal')[]): ResearchBridgeDefinition {
  return { id: `${from}->${to}`, from, to, allowedTokens };
}

export function applyMonkeyPrintedTopology(track: ResearchTrackDefinition): ResearchTrackDefinition {
  if (track.id !== 'monkey') return structuredClone(track);
  const next = structuredClone(track);
  const row = next.rows[4];
  if (!row) throw new Error('Monkey topology is missing its printed level 4/5 row');
  if (!(row.nodes ?? []).some((node) => node.id === MONKEY_TRACK_ARTIFACT_NODE)) {
    const artifactNode: ResearchNodeDefinition = {
      id: MONKEY_TRACK_ARTIFACT_NODE,
      rowIndex: 4,
      pathIndex: -1,
      researchLevel: 4,
      spansLevels: [3, 4],
    };
    row.nodes ??= [];
    row.nodes.unshift(artifactNode);
  }
  const keep = (next.bridges ?? []).filter((entry) => ![
    'monkey:r2:p0->monkey:r3:p0',
    'monkey:r3:p0->monkey:r4:p0',
    'monkey:r4:p0->monkey:r5:p0',
  ].includes(`${entry.from}->${entry.to}`));
  next.bridges = [
    ...keep,
    bridge('monkey:r2:p0', 'monkey:r3:p0', ['journal']),
    bridge('monkey:r2:p0', MONKEY_TRACK_ARTIFACT_NODE, ['magnifying']),
    bridge('monkey:r3:p0', 'monkey:r4:p0', ['journal']),
    bridge('monkey:r4:p0', 'monkey:r5:p0', ['journal']),
    bridge(MONKEY_TRACK_ARTIFACT_NODE, 'monkey:r5:p0', ['magnifying']),
  ];
  return next;
}
