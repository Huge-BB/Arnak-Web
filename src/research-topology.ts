import { findResearchBridge, findResearchNode, researchTempleNode } from './research-manual.ts';
import type { ResearchNodeId, ResearchToken, ResearchTrackDefinition } from './types.ts';

export const researchStartNode = (boardId: string): ResearchNodeId => `${boardId}:start`;

export function researchNodeLevel(track: ResearchTrackDefinition, nodeId: ResearchNodeId): number {
  if (nodeId === researchStartNode(track.id)) return -1;
  if (nodeId === researchTempleNode(track.id)) return track.rows.length;
  return findResearchNode(track, nodeId).researchLevel;
}

export function legalResearchDestinations(track: ResearchTrackDefinition, from: ResearchNodeId): ResearchNodeId[] {
  return (track.bridges ?? []).filter(bridge => bridge.from === from).map(bridge => bridge.to);
}

export function assertLegalResearchNodeMove(
  track: ResearchTrackDefinition,
  token: ResearchToken,
  from: ResearchNodeId,
  to: ResearchNodeId,
  magnifyingNode: ResearchNodeId,
  journalNode: ResearchNodeId,
  journalMaxLead = 0,
) {
  if (!Number.isInteger(journalMaxLead) || journalMaxLead < 0) throw new Error('journalMaxLead must be a non-negative integer');
  if (token === 'journal' && to === researchTempleNode(track.id)) throw new Error('Journal cannot enter the Lost Temple');

  findResearchBridge(track, from, to);
  const nextMagnifying = token === 'magnifying' ? to : magnifyingNode;
  const nextJournal = token === 'journal' ? to : journalNode;
  const magnifyingLevel = researchNodeLevel(track, nextMagnifying);
  const journalLevel = researchNodeLevel(track, nextJournal);

  if (journalLevel > magnifyingLevel + journalMaxLead) {
    throw new Error(`Journal cannot advance more than ${journalMaxLead} research level(s) ahead of the magnifying glass`);
  }
}
