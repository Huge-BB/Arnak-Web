import manual from '../data/site-effects-manual.json' with { type: 'json' };
import type { EngineContext } from './types.ts';

type SiteOverride = { expansion: string; replacesBaseSiteId?: string };

/** Apply reviewed expansion identity/replacement metadata without altering
 * stable IDs and artwork metadata extracted from TTS. */
export function withManualSiteEffects(sites: NonNullable<EngineContext['sites']>) {
  const next = structuredClone(sites);
  for (const [siteId, value] of Object.entries(manual.overrides as Record<string, SiteOverride>)) {
    const site = next[siteId];
    if (!site) throw new Error(`Manual site override references unknown site: ${siteId}`);
    if (!value.expansion) throw new Error(`Manual site override needs expansion: ${siteId}`);
    if (value.replacesBaseSiteId && !next[value.replacesBaseSiteId]) throw new Error(`Manual site override replacement is unknown: ${siteId} -> ${value.replacesBaseSiteId}`);
    next[siteId] = { ...site, expansion: value.expansion, replacesBaseSiteId: value.replacesBaseSiteId };
  }
  return next;
}
