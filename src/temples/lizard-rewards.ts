import { resolveRewardCode } from '../site-rewards.ts';
import type { EngineContext, GameState, PlayerId } from '../types.ts';

export interface BurnedLizardSite {
  siteId: string;
  tileId: string;
  guardianId?: string;
}

function burnedSites(state: GameState): BurnedLizardSite[] {
  state.research.templeData ??= {};
  const data = state.research.templeData as Record<string, unknown>;
  if (!Array.isArray(data.lizardBurnedSites)) data.lizardBurnedSites = [];
  return data.lizardBurnedSites as BurnedLizardSite[];
}

export function isLizardBurnedSite(state: GameState, siteId: string) {
  return burnedSites(state).some(site => site.siteId === siteId);
}

/** Trigger an unoccupied discovered Level I site, burn it, then place a new face-up idol there. */
export function activateAndBurnLizardLevel1Site(
  state: GameState,
  playerId: PlayerId,
  siteId: string,
  context: EngineContext,
): GameState {
  const site = state.sites[siteId];
  if (!site || site.level !== 1 || !site.tileId) throw new Error(`Site is not a discovered Level I site: ${siteId}`);
  if (site.occupiedBy) throw new Error('Lizard burn requires an unoccupied Level I site');
  if (isLizardBurnedSite(state, siteId)) throw new Error(`Level I site is already burned: ${siteId}`);
  const definition = context.sites?.[site.tileId];
  if (!definition || definition.level !== 1) throw new Error(`Unknown Level I site tile: ${site.tileId}`);
  if (!state.discovery.idolDeck[0]) throw new Error('Lizard burn requires an idol to refill the site');

  const next = structuredClone(state);
  resolveRewardCode(next, playerId, site.tileId, definition.rewardCode, context);
  const nextSite = next.sites[siteId];
  const record: BurnedLizardSite = { siteId, tileId: nextSite.tileId! };
  if (nextSite.guardian) record.guardianId = nextSite.guardian;
  burnedSites(next).push(record);
  delete nextSite.tileId;
  delete nextSite.guardian;
  nextSite.faceUpIdolId = next.discovery.idolDeck.shift();
  return next;
}
