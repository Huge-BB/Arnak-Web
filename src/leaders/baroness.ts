import { setLeaderState } from './utils.ts';
import type { LeaderRules } from './types.ts';

function removeCardEverywhere(player: { hand:string[]; deck:string[]; playedCards:string[] }, cardId: string) {
  for (const zone of [player.hand, player.deck, player.playedCards]) {
    let index = zone.indexOf(cardId);
    while (index >= 0) {
      zone.splice(index, 1);
      index = zone.indexOf(cardId);
    }
  }
}
function removeAll(zone:string[],cardId:string){let index=zone.indexOf(cardId);while(index>=0){zone.splice(index,1);index=zone.indexOf(cardId);}}

export const baronessLeader: LeaderRules = {
  id: 'baroness',
  name: 'Baroness',
  expansion: 'Expedition Leaders',
  startingCardNames: ['Connections', 'Research Notes', 'Resourcefulness', 'Special Delivery'],
  setup({ state, playerId, context }) {
    const specialDeliveryCardId = state.players[playerId].hand.find(id => context.cards[id]?.name === 'Special Delivery');
    if (!specialDeliveryCardId) throw new Error('Baroness setup requires Special Delivery in the starting hand');
    setLeaderState(state, playerId, 'baroness', {
      incomeRoundsRemaining: [2, 3, 4, 5],
      specialDeliveryCardId,
    });
  },
  onRoundStart({ state, playerId, round }) {
    const leader = state.players[playerId].leader;
    if (leader?.id !== 'baroness') return;
    const remaining = (leader.data.incomeRoundsRemaining ?? []) as number[];
    if (!remaining.includes(round)) return;
    state.players[playerId].resources.coin += 1;
    leader.data.incomeRoundsRemaining = remaining.filter(value => value !== round);
  },
  onRoundEnd({ state, playerId }) {
    const player = state.players[playerId];
    const leader = player.leader;
    if (leader?.id !== 'baroness') return;
    const cardId = leader.data.specialDeliveryCardId as string | undefined;
    if (!cardId) return;
    removeCardEverywhere(player, cardId);
    removeAll(state.market.exiled,cardId);
    player.hand.push(cardId);
  },
};
