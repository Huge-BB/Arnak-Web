import { applyResearchManualData } from './research-manual.ts';
import { applyResearchRewardManualData, type ResearchRewardManualData } from './research-rewards-manual.ts';
import { applyMonkeyPrintedTopology } from './temples/monkey-topology.ts';
import type {
  ResearchBoardId,
  ResearchManualData,
  ResearchTrackDefinition,
} from './types.ts';

export type GeneratedResearchTracks = Partial<Record<ResearchBoardId, ResearchTrackDefinition>>;

/** Merge generated TTS topology with board costs/overrides and the separate node-reward overlay. */
export function buildResearchTracks(
  generated: GeneratedResearchTracks,
  manual: ResearchManualData,
  options: { requireVerifiedEntries?: boolean; rewardManual?: ResearchRewardManualData } = {},
): GeneratedResearchTracks {
  const result: GeneratedResearchTracks = {};
  for (const boardId of ['bird', 'snake', 'monkey', 'lizard'] as const) {
    const track = generated[boardId];
    if (!track) continue;
    const printedTopology = boardId === 'monkey' ? applyMonkeyPrintedTopology(track) : track;
    const withBoardData = applyResearchManualData(printedTopology, manual, {
      requireVerified: options.requireVerifiedEntries ?? false,
    });
    result[boardId] = applyResearchRewardManualData(withBoardData, options.rewardManual, {
      requireVerified: options.requireVerifiedEntries ?? false,
    });
  }
  return result;
}

export function researchBridgeCoverage(track: ResearchTrackDefinition) {
  const bridges = track.bridges ?? [];
  const verified = bridges.filter(bridge => bridge.verified === true).length;
  return {
    total: bridges.length,
    verified,
    remaining: bridges.length - verified,
    complete: bridges.length > 0 && verified === bridges.length,
  };
}
