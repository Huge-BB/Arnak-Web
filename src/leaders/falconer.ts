import { setLeaderState } from './utils.ts';
import type { LeaderRules } from './types.ts';

export const falconerLeader: LeaderRules = {
  id: 'falconer',
  name: 'Falconer',
  expansion: 'Expedition Leaders',
  startingCardNames: ['Funding', 'Falconry', 'Animal Bond', 'Tracking'],
  setup({ state, playerId }) {
    setLeaderState(state, playerId, 'falconer', {
      eaglePosition: 0,
      eagleMaxPosition: 4,
    });
  },
  onRoundStart({ state, playerId }) {
    const leader = (state.players[playerId] as any).leader;
    if (leader?.id !== 'falconer') return;
    leader.data.eaglePosition = Math.min(leader.data.eagleMaxPosition, leader.data.eaglePosition + 1);
  },
};
