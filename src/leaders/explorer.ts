import { setLeaderState } from './utils.ts';
import type { LeaderRules } from './types.ts';

export const explorerLeader: LeaderRules = {
  id: 'explorer',
  name: 'Explorer',
  expansion: 'Expedition Leaders',
  startingCardNames: ['Funding', 'Hike', 'Cartography', 'Scouting'],
  setup({ state, playerId }) {
    const player = state.players[playerId];
    player.workers = 1;
    player.availableWorkers = 1;
    setLeaderState(state, playerId, 'explorer', {
      snacks: [
        { id: 'free', availableFromRound: 1, used: false },
        { id: 'coin', cost: { coin: 1 }, availableFromRound: 1, used: false },
        { id: 'compass', cost: { compass: 1 }, availableFromRound: 3, used: false },
      ],
    });
  },
  onRoundEnd({ state, playerId }) {
    const leader = (state.players[playerId] as any).leader;
    if (leader?.id !== 'explorer') return;
    for (const snack of leader.data.snacks ?? []) {
      snack.used = false;
      delete snack.siteId;
    }
  },
};
