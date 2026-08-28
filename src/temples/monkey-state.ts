import { shuffleWithSeed } from '../rng.ts';
import type { EngineContext, GameState, PlayerId, ResearchNodeId } from '../types.ts';

export interface MonkeyTrackArtifactState {
  artifactId: string;
  nodeId: ResearchNodeId;
}

function templeData(state: GameState) {
  state.research.templeData ??= {};
  return state.research.templeData as Record<string, unknown>;
}

export function setupMonkeyTrackArtifact(
  state: GameState,
  context: EngineContext,
  nodeId: ResearchNodeId,
  seed: string,
): MonkeyTrackArtifactState {
  const candidates = Object.values(context.cards)
    .filter(card => card.type === 'Artifact' && card.cost === 3)
    .map(card => card.id)
    .sort();
  if (candidates.length === 0) throw new Error('Monkey Temple requires at least one cost-3 Artifact');
  const artifactId = shuffleWithSeed(candidates, `${seed}:monkey:track-artifact`)[0];
  const value = { artifactId, nodeId };
  templeData(state).monkeyTrackArtifact = value;
  return value;
}

export function monkeyTrackArtifact(state: GameState): MonkeyTrackArtifactState | undefined {
  return templeData(state).monkeyTrackArtifact as MonkeyTrackArtifactState | undefined;
}

export function queueMonkeyTrackArtifactActivation(state: GameState, playerId: PlayerId, nodeId: ResearchNodeId) {
  const artifact = monkeyTrackArtifact(state);
  if (!artifact || artifact.nodeId !== nodeId) return;
  state.pendingRewards.push({
    playerId,
    sourceId: nodeId,
    code: 'research:TRIGGER_TRACK_ARTIFACT',
    payload: { type: 'TRIGGER_TRACK_ARTIFACT', artifactId: artifact.artifactId },
  });
}
