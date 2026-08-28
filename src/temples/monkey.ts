import { queueMonkeyTrackArtifactActivation } from './monkey-state.ts';
import type { TempleRules } from './types.ts';

export const monkeyTempleRules: TempleRules = {
  id: 'monkey',
  validateMove({ token, bridge }) {
    if (bridge.allowedTokens && !bridge.allowedTokens.includes(token)) {
      throw new Error(`${token} cannot use research bridge ${bridge.id}`);
    }
  },
  afterMove({ state, playerId, token, to }) {
    if (token === 'magnifying') queueMonkeyTrackArtifactActivation(state, playerId, to);
  },
};
