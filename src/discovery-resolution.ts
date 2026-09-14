import { resolveRewardCode } from './site-rewards.ts';
import type { EngineContext, GameState, PlayerId } from './types.ts';

/** Reveal the site, then its guardian, and only then resolve the site effect. */
export function revealDiscoveredSite(state:GameState,playerId:PlayerId,siteId:string,context:EngineContext) {
  const site=state.sites[siteId];
  if(!site)throw new Error(`Unknown discovery site: ${siteId}`);
  if(site.tileId)throw new Error(`Discovery site is already revealed: ${siteId}`);
  const deck=site.level===1?state.discovery.level1Deck:state.discovery.level2Deck;
  const tileId=deck.shift();
  if(!tileId)throw new Error(`Level ${site.level} site deck is empty`);
  const guardianId=state.discovery.guardianDeck.shift();
  if(!guardianId)throw new Error('Guardian deck is empty');
  const definition=context.sites?.[tileId];
  if(!definition||definition.level!==site.level)throw new Error(`Unknown discovered site tile: ${tileId}`);
  site.tileId=tileId;
  site.guardian=guardianId;
  resolveRewardCode(state,playerId,tileId,definition.rewardCode,context);
}
