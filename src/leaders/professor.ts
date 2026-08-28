import { setLeaderState } from './utils.ts';
import type { LeaderRules } from './types.ts';

export const professorLeader: LeaderRules = {
  id: 'professor',
  name: 'Professor',
  expansion: 'Expedition Leaders',
  startingCardNames: ['Funding', 'Preservation', 'Arnakology', 'Linguistics'],
  setup({ state, playerId }) {
    const archive = state.market.artifactDeck.splice(0, 3);
    if (archive.length !== 3) throw new Error('Professor setup requires three artifacts for the archive');
    setLeaderState(state, playerId, 'professor', {
      archive,
      archiveRefilled: false,
      suitcase: { compass: 0, tablet: 0 },
      roundBonusesRemaining: { 2: 'compass', 3: 'tablet', 4: 'compass', 5: 'tablet' },
    });
  },
  onRoundStart({ state, playerId, round }) {
    const leader = (state.players[playerId] as any).leader;
    if (leader?.id !== 'professor') return;
    const resource = leader.data.roundBonusesRemaining?.[round];
    if (!resource) return;
    leader.data.suitcase[resource] = (leader.data.suitcase[resource] ?? 0) + 1;
    delete leader.data.roundBonusesRemaining[round];
  },
};
