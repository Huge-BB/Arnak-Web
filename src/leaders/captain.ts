import { setLeaderState } from './utils.ts';
import type { LeaderRules } from './types.ts';

export const captainLeader: LeaderRules = {
  id: 'captain',
  name: 'Captain',
  expansion: 'Expedition Leaders',
  startingCardNames: ['Funding', 'Piloting', 'Transmission', 'Hidden Fear'],
  setup({ state, playerId }) {
    const player = state.players[playerId];
    player.workers = 3;
    player.availableWorkers = 3;
    setLeaderState(state, playerId, 'captain', {
      specialistUsedThisRound: false,
      specialistWorkerCommitted: false,
    });
  },
  onRoundEnd({ state, playerId }) {
    const leader = (state.players[playerId] as any).leader;
    if (leader?.id !== 'captain') return;
    leader.data.specialistUsedThisRound = false;
    leader.data.specialistWorkerCommitted = false;
  },
};
