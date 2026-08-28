import { activeLizardBlockerNodes, revealLizardTrackGuardian } from './lizard-state.ts';
import type { TempleRules } from './types.ts';

export const lizardTempleRules: TempleRules = {
  id: 'lizard',
  validateMove({ state, from }) {
    if (activeLizardBlockerNodes(state).includes(from)) {
      throw new Error(`Research path is blocked beyond ${from}`);
    }
  },
  afterMove({state,token,to}){if(token==='magnifying')revealLizardTrackGuardian(state,to);},
};
