import type { ResearchToken, ResearchTrackDefinition } from './types.ts';

/**
 * Research position convention:
 * -1 = printed starting space below the track
 *  0..rows.length-1 = scored research rows from bottom toward the temple
 *  rows.length = temple reached (magnifying glass only)
 */
export const RESEARCH_START_POSITION = -1;

export interface ResearchMovementRules {
  /** How many rows the journal may be ahead of the magnifying glass. Base game = 0; Journalist = 1. */
  journalMaxLead?: number;
}

export function nextResearchPosition(
  track: ResearchTrackDefinition,
  token: ResearchToken,
  currentPosition: number,
): number {
  if (!Number.isInteger(currentPosition) || currentPosition < RESEARCH_START_POSITION) {
    throw new Error(`Invalid research position: ${currentPosition}`);
  }

  const maxPosition = token === 'magnifying' ? track.rows.length : track.rows.length - 1;
  if (currentPosition >= maxPosition) throw new Error(`${token} cannot advance farther`);
  return currentPosition + 1;
}

export function nextLegalResearchPosition(
  track: ResearchTrackDefinition,
  token: ResearchToken,
  currentPosition: number,
  magnifyingPosition: number,
  journalPosition: number,
  rules: ResearchMovementRules | number = {},
): number {
  const journalMaxLead = typeof rules === 'number' ? rules : (rules.journalMaxLead ?? 0);
  if (!Number.isInteger(journalMaxLead) || journalMaxLead < 0) {
    throw new Error('journalMaxLead must be a non-negative integer');
  }

  const next = nextResearchPosition(track, token, currentPosition);
  const nextMagnifying = token === 'magnifying' ? next : magnifyingPosition;
  const nextJournal = token === 'journal' ? next : journalPosition;
  if (nextJournal > nextMagnifying + journalMaxLead) {
    throw new Error(`Journal cannot advance more than ${journalMaxLead} row(s) ahead of the magnifying glass`);
  }
  return next;
}

export function templeArrivalAward(track: ResearchTrackDefinition, arrivalIndex: number): number {
  if (!Number.isInteger(arrivalIndex) || arrivalIndex < 0) {
    throw new Error('Temple arrival index must be a non-negative integer');
  }
  const values = track.templeArrivalPoints;
  if (!values) throw new Error(`Temple arrival points for ${track.id} have not been recorded`);
  const points = values[arrivalIndex];
  if (points === undefined) throw new Error(`No temple arrival award for index ${arrivalIndex}`);
  return points;
}

export function researchRowPoints(
  track: ResearchTrackDefinition,
  token: ResearchToken,
  position: number,
): number {
  if (position === RESEARCH_START_POSITION) return 0;
  if (position === track.rows.length) {
    if (token !== 'magnifying') throw new Error('Journal cannot enter the temple');
    return 0;
  }
  const row = track.rows[position];
  if (!row) throw new Error(`Invalid research position: ${position}`);
  return token === 'magnifying' ? row.magnifyingPoints : row.journalPoints;
}

export function researchScore(
  track: ResearchTrackDefinition,
  magnifyingPosition: number,
  journalPosition: number,
  templeArrivalPoints = 0,
): number {
  if (!Number.isInteger(templeArrivalPoints) || templeArrivalPoints < 0) {
    throw new Error('Temple arrival points must be a non-negative integer');
  }
  return researchRowPoints(track, 'magnifying', magnifyingPosition)
    + researchRowPoints(track, 'journal', journalPosition)
    + templeArrivalPoints;
}

export function rowGrantsAssistant(track: ResearchTrackDefinition, position: number): boolean {
  if (position < 0 || position >= track.rows.length) return false;
  return track.rows[position].grantsAssistant;
}
