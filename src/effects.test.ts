import assert from 'node:assert/strict';
import test from 'node:test';
import { createGame, reduce } from './engine.ts';
import { resolvePendingChoice } from './pending-choice.ts';
import { expansionEffectPresets } from './expansion-effect-presets.ts';
import { overcomeGuardian } from './guardian-actions.ts';
import { placeLizardTrackGuardian, revealLizardTrackGuardian } from './temples/lizard-state.ts';
import type { EngineContext, ResearchTrackDefinition } from './types.ts';

const context: EngineContext = {
  cards: {
    funding: { id: 'funding', name: 'Funding', type: 'Starter', expansion: 'Base Game', color: 'Yellow' },
    exploration: { id: 'exploration', name: 'Exploration', type: 'Starter', expansion: 'Base Game', color: 'Yellow' },
    fear: { id: 'fear', name: 'Fear', type: 'Fear', expansion: 'Base Game', points: -1 },
    utility: { id: 'utility', name: 'Utility', type: 'Item', expansion: 'Base Game', cost: 1 },
    drawn: { id: 'drawn', name: 'Drawn Card', type: 'Item', expansion: 'Base Game', cost: 1 },
  },
  cardEffects: {
    utility: [
      { type: 'GAIN_RESOURCE', resource: 'tablet', amount: 1 },
      { type: 'DRAW_CARD', amount: 1 },
    ],
  },
};

function playableState(cardId: string) {
  const state = reduce(createGame(['p1']), { type: 'START_GAME' });
  state.players.p1.hand = [cardId];
  return state;
}

test('Funding gains one coin when played for its effect', () => {
  const state = playableState('funding');
  const next = reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'funding' }, context);

  assert.equal(next.players.p1.resources.coin, 3);
  assert.deepEqual(next.players.p1.hand, []);
  assert.deepEqual(next.players.p1.playedCards, ['funding']);
});

test('Exploration gains one compass when played for its effect', () => {
  const state = playableState('exploration');
  const next = reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'exploration' }, context);

  assert.equal(next.players.p1.resources.compass, 1);
});

test('Fear cannot be played and remains in hand', () => {
  const state = playableState('fear');
  const before = structuredClone(state.players.p1.resources);
  assert.throws(
    () => reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'fear' }, context),
    /Fear cards cannot be played/,
  );

  assert.deepEqual(state.players.p1.resources, before);
  assert.deepEqual(state.players.p1.hand, ['fear']);
  assert.deepEqual(state.players.p1.playedCards, []);
});

  test('audited free card timing leaves the turn main action available', () => {
 const state=playableState('funding');state.players.p1.hand=['funding'];state.sites.site={id:'site',level:1,idolSlots:0};
 const timingContext:EngineContext={cards:{funding:{id:'funding',name:'Funding',type:'Starter',expansion:'Base Game'}},cardEffects:{funding:[{type:'GAIN_RESOURCE',resource:'coin',amount:1}]},cardActionTiming:{funding:'free'}};
 const afterFree=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'funding'},timingContext);
 assert.equal(afterFree.players.p1.mainActionUsed,undefined);
 const afterMain=reduce(afterFree,{type:'PLACE_WORKER',playerId:'p1',siteId:'site'},timingContext);
    assert.equal(afterMain.players.p1.mainActionUsed,true);
  });

  test('audited main card timing spends the turn main action', () => {
    const state=playableState('artifact');state.players.p1.hand=['artifact','payment'];
    const timingContext:EngineContext={cards:{artifact:{id:'artifact',name:'Artifact',type:'Artifact',expansion:'Base Game'},payment:{id:'payment',name:'Payment',type:'Item',expansion:'Base Game'}},cardEffects:{artifact:[{type:'GAIN_RESOURCE',resource:'coin',amount:1}]},cardActionTiming:{artifact:'main'}};
    const afterArtifact=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'artifact',activationPaymentCardId:'payment'},timingContext);
    assert.equal(afterArtifact.players.p1.mainActionUsed,true);
    assert.throws(()=>reduce(afterArtifact,{type:'ADVANCE_RESEARCH',playerId:'p1',token:'magnifying',to:1},timingContext),/main action/);
  });

test('custom effects compose resource gain and card draw', () => {
  const state = playableState('utility');
  state.players.p1.deck = ['drawn'];
  const next = reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'utility' }, context);

  assert.equal(next.players.p1.resources.tablet, 1);
  assert.deepEqual(next.players.p1.hand, ['drawn']);
  assert.deepEqual(next.players.p1.deck, []);
});

test('PLAY_CARD rejects cards not in hand and leaves input unchanged', () => {
  const state = playableState('funding');
  assert.throws(
    () => reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'exploration' }, context),
    /not in the player hand/,
  );
  assert.deepEqual(state.players.p1.hand, ['funding']);
});

test('card effects can create temporary travel for a later action in the same turn',()=>{
 const state=playableState('utility');
 const travelContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'GAIN_TRAVEL',travel:{boot:2,boat:1}}]}};
 const next=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},travelContext);
 assert.deepEqual(next.actionWindow?.temporaryTravel,{boot:2,boat:1});
});

test('card effects can pay resources then draw from the bottom of the deck',()=>{
 const state=playableState('utility');state.players.p1.resources.coin=1;state.players.p1.deck=['top','bottom'];
 const bottomContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'PAY_RESOURCE_THEN',cost:{coin:1},effects:[{type:'DRAW_FROM_BOTTOM',amount:1}]}]}};
 const next=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},bottomContext);
 assert.equal(next.players.p1.resources.coin,0);assert.deepEqual(next.players.p1.hand,['bottom']);assert.deepEqual(next.players.p1.deck,['top']);
});

test('bottom-draw keep effects preserve exactly one selected card and discard the rest',()=>{
 const state=playableState('utility');state.players.p1.deck=['top','keep','discard'];
 const keepContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},top:{id:'top',name:'Top',type:'Starter',expansion:'Base Game'},keep:{id:'keep',name:'Keep',type:'Starter',expansion:'Base Game'},discard:{id:'discard',name:'Discard',type:'Starter',expansion:'Base Game'}},cardEffects:{utility:[{type:'DRAW_BOTTOM_THEN_KEEP',maximum:2}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},keepContext);
 const candidates=resolvePendingChoice(pending,'p1',0,{type:'card-count',count:2},keepContext);
 assert.deepEqual(candidates.players.p1.deck,['top']);assert.equal(candidates.pendingRewards.length,1);
 const next=resolvePendingChoice(candidates,'p1',0,{type:'card',cardId:'keep'},keepContext);
 assert.deepEqual(next.players.p1.hand,['keep']);assert.deepEqual(next.players.p1.playedCards,['utility','discard']);
});

test('top-draw selection can keep one card, return a different card to deck top, and discard the rest',()=>{
 const state=playableState('utility');state.players.p1.deck=['keep','return','discard','unseen'];
 const selectionContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'DRAW_THEN_KEEP_AND_OPTIONAL_TOP',maximum:3}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},selectionContext);
 const candidates=resolvePendingChoice(pending,'p1',0,{type:'card-count',count:3},selectionContext);
 const next=resolvePendingChoice(candidates,'p1',0,{type:'keep-and-top',keepCardId:'keep',topDeckCardId:'return'},selectionContext);
 assert.deepEqual(next.players.p1.hand,['keep']);assert.deepEqual(next.players.p1.deck,['return','unseen']);assert.deepEqual(next.players.p1.playedCards,['utility','discard']);
});

test('a pass-for-gain choice grants its reward and immediately passes the player',()=>{
 const state=playableState('utility');state.playerOrder=['p1','p2'];state.players.p2=structuredClone(state.players.p1);state.players.p2.id='p2';state.players.p2.name='Player 2';state.players.p2.hand=[];
 const passContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'CHOOSE_ONE',options:[{type:'GAIN_RESOURCE',resource:'coin',amount:2},{type:'PASS_IMMEDIATELY_GAIN',gain:{coin:3}}]}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},passContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'card-option',optionIndex:1},passContext);
 assert.equal(next.players.p1.resources.coin,5);assert.equal(next.players.p1.hasPassed,true);assert.equal(next.currentPlayer,'p2');assert.equal(next.players.p1.mustPassImmediately,undefined);
});

test('Stone Key-style effects return only a selected idol that is in a player-board slot',()=>{
 const state=playableState('utility');state.players.p1.idols=[{id:'slotted',faceUp:true,inSlot:true},{id:'free',faceUp:true}];
 const keyContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Artifact',expansion:'Base Game'},payment:{id:'payment',name:'Payment',type:'Starter',expansion:'Base Game'}},cardEffects:{utility:[{type:'RETURN_SLOTTED_IDOL'}]}};
 state.players.p1.hand=['utility','payment'];
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility',activationPaymentCardId:'payment'},keyContext);
 assert.throws(()=>resolvePendingChoice(pending,'p1',0,{type:'idol',idolId:'free'},keyContext),/slotted/);
 const next=resolvePendingChoice(pending,'p1',0,{type:'idol',idolId:'slotted'},keyContext);
 assert.deepEqual(next.players.p1.idols,[{id:'free',faceUp:true}]);
});

test('state-count card effects respect their counter and printed cap',()=>{
 const state=playableState('utility');state.players.p1.idols=[{id:'i1',faceUp:true},{id:'i2',faceUp:true},{id:'i3',faceUp:true},{id:'i4',faceUp:true}];state.players.p1.defeatedGuardians=['g1','g2'];state.sites.s={id:'s',level:1,idolSlots:0,occupiedBy:'p1',guardian:'g3'};
 const countContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'GAIN_RESOURCE_PER',resource:'compass',counter:'IDOLS',max:3},{type:'GAIN_RESOURCE_PER',resource:'arrowhead',counter:'GUARDIAN_TOTAL',max:3}]}};
 const next=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},countContext);
 assert.equal(next.players.p1.resources.compass,3);assert.equal(next.players.p1.resources.arrowhead,3);
});

test('guardian-Fear immunity lasts through round cleanup and then resets',()=>{
 const state=playableState('utility');state.sites.s={id:'s',level:1,idolSlots:0,occupiedBy:'p1',guardian:'g'};
 const immunityContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}},cardEffects:{utility:[{type:'IGNORE_GUARDIAN_FEAR_THIS_ROUND'}]}};
 const protectedState=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},immunityContext);
 const next=reduce(protectedState,{type:'PASS',playerId:'p1'},immunityContext);
 assert.equal(next.players.p1.hand.includes('fear')||next.players.p1.deck.includes('fear'),false);assert.equal(next.players.p1.guardianFearImmuneThisRound,false);
});

test('self-exile free-research effects preserve research topology while bypassing its printed cost',()=>{
 const state=playableState('utility');state.research.board='bird';state.research.magnifyingNode.p1='bird:r0:p0';state.research.journalNode.p1='bird:start';
 const track:ResearchTrackDefinition={id:'bird',name:'Bird',rows:[{magnifyingPoints:1,journalPoints:0,grantsAssistant:false,nodes:[{id:'bird:r0:p0',rowIndex:0,pathIndex:0,researchLevel:0}]}],bridges:[{id:'bird:start:b',from:'bird:start',to:'bird:r0:p0',cost:{jewel:1},verified:true}]};
 const researchContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'EXILE_SELF'},{type:'FREE_RESEARCH',token:'journal'}]},researchTracks:{bird:track}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},researchContext);
 assert.deepEqual(pending.market.exiled,['utility']);
 const next=resolvePendingChoice(pending,'p1',0,{type:'research-node',token:'journal',nodeId:'bird:r0:p0'},researchContext);
 assert.equal(next.research.journalNode.p1,'bird:r0:p0');assert.equal(next.players.p1.resources.jewel,0);
});

test('research-discount effects waive only their printed resource icons, not travel',()=>{
 const state=playableState('utility');state.research.board='bird';state.players.p1.hand=['utility','boot'];state.players.p1.resources.jewel=1;
 const track:ResearchTrackDefinition={id:'bird',name:'Bird',rows:[{magnifyingPoints:1,journalPoints:0,grantsAssistant:false,nodes:[{id:'bird:r0:p0',rowIndex:0,pathIndex:0,researchLevel:0}]}],bridges:[{id:'bird:start:b',from:'bird:start',to:'bird:r0:p0',cost:{arrowhead:1,tablet:2,jewel:1,travel:{boot:1}},verified:true}]};
 const researchContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},boot:{id:'boot',name:'Boot',type:'Starter',expansion:'Base Game',travel:{boot:1}}},cardEffects:{utility:[{type:'RESEARCH_DISCOUNT',discount:{arrowhead:1,tablet:2}}]},researchTracks:{bird:track}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},researchContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'research-node',token:'magnifying',nodeId:'bird:r0:p0',paymentCardIds:['boot']},researchContext);
 assert.equal(next.research.magnifyingNode.p1,'bird:r0:p0');assert.equal(next.players.p1.resources.jewel,0);assert.equal(next.players.p1.resources.arrowhead,0);assert.equal(next.players.p1.resources.tablet,0);assert.deepEqual(next.players.p1.playedCards,['utility','boot']);
});

test('a card can pay one resource to gain a fixed resource bundle',()=>{
 const state=playableState('utility');state.players.p1.resources.compass=1;
 const paid:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'PAY_RESOURCE_GAIN',cost:{compass:1},gain:{tablet:1,arrowhead:1}}]}};
 const next=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},paid);
 assert.equal(next.players.p1.resources.compass,0);assert.equal(next.players.p1.resources.tablet,1);assert.equal(next.players.p1.resources.arrowhead,1);
});

test('a card effect adds a base-game Fear card to the shared play/discard area',()=>{
 const state=playableState('utility');
 const fearContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}},cardEffects:{utility:[{type:'GAIN_FEAR_CARD',amount:1}]}};
 const next=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},fearContext);
 assert.deepEqual(next.players.p1.playedCards,['utility','fear']);
});

test('exile choice distinguishes the same card id in hand from the shared play area',()=>{
 const state=playableState('utility');state.players.p1.hand.push('fear');state.players.p1.playedCards.push('fear');
 const exileContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}},cardEffects:{utility:[{type:'EXILE_OWN_CARD'}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},exileContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'card',cardId:'fear',zone:'played'},exileContext);
 assert.deepEqual(next.players.p1.hand,['fear']);
 assert.deepEqual(next.players.p1.playedCards,['utility']);
 assert.deepEqual(next.market.exiled,['fear']);
});

test('a self-exiling card moves only its source card to the market exile',()=>{
 const state=playableState('utility');state.players.p1.deck=['drawn'];
 const exileContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},drawn:{id:'drawn',name:'Drawn',type:'Starter',expansion:'Base Game'}},cardEffects:{utility:[{type:'EXILE_SELF'},{type:'DRAW_CARD',amount:1}]}};
 const next=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},exileContext);
 assert.deepEqual(next.players.p1.playedCards,[]);assert.deepEqual(next.players.p1.hand,['drawn']);assert.deepEqual(next.market.exiled,['utility']);
});

test('discard-then card effects resume through the public pending-choice dispatcher',()=>{
 const state=playableState('utility');state.players.p1.hand.push('payment');state.players.p1.deck=['drawn'];
 const discardContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},payment:{id:'payment',name:'Payment',type:'Starter',expansion:'Base Game'},drawn:{id:'drawn',name:'Drawn',type:'Starter',expansion:'Base Game'}},cardEffects:{utility:[{type:'DISCARD_ONE_THEN',effects:[{type:'DRAW_CARD',amount:1}]}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},discardContext);
 assert.equal(pending.pendingRewards[0]?.code,'card:RESOLVE_EFFECT');
 const next=resolvePendingChoice(pending,'p1',0,{type:'card',cardId:'payment'},discardContext);
 assert.deepEqual(next.players.p1.playedCards,['utility','payment']);assert.deepEqual(next.players.p1.hand,['drawn']);assert.deepEqual(next.pendingRewards,[]);
});

test('discard-then effects can continue into a separate owned-card exile choice',()=>{
 const state=playableState('utility');state.players.p1.hand=['utility','discard-me'];state.players.p1.deck=['drawn'];
 const exileContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},'discard-me':{id:'discard-me',name:'Discard',type:'Starter',expansion:'Base Game'},drawn:{id:'drawn',name:'Drawn',type:'Starter',expansion:'Base Game'}},cardEffects:{utility:[{type:'DISCARD_ONE_THEN',effects:[{type:'DRAW_CARD',amount:1},{type:'EXILE_OWN_CARD'}]}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},exileContext);
 const afterDiscard=resolvePendingChoice(pending,'p1',0,{type:'card',cardId:'discard-me'},exileContext);
 assert.equal(afterDiscard.pendingRewards.length,1);assert.deepEqual(afterDiscard.players.p1.hand,['drawn']);
 const next=resolvePendingChoice(afterDiscard,'p1',0,{type:'card',cardId:'utility'},exileContext);
 assert.deepEqual(next.market.exiled,['utility']);assert.deepEqual(next.players.p1.hand,['drawn']);
});

test('upgrade-then card effects preserve their following fixed reward',()=>{
 const state=playableState('utility');state.players.p1.resources.tablet=1;
 const upgradeContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'UPGRADE_RESOURCE_THEN',effects:[{type:'GAIN_RESOURCE',resource:'coin',amount:2}]}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},upgradeContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'resource',resource:'tablet'},upgradeContext);
 assert.equal(next.players.p1.resources.tablet,0);assert.equal(next.players.p1.resources.arrowhead,1);assert.equal(next.players.p1.resources.coin,4);
});

test('assistant-refresh card effects target an exact set of owned assistants',()=>{
 const state=playableState('utility');state.players.p1.assistants=[{id:'assistant-a',level:'silver',exhausted:true},{id:'assistant-b',level:'gold',exhausted:true}];
 const refreshContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'REFRESH_ASSISTANTS_THEN',amount:2,effects:[]}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},refreshContext);
 assert.throws(()=>resolvePendingChoice(pending,'p1',0,{type:'assistants',assistantIds:['assistant-a','assistant-a']},refreshContext),/distinct/);
 const next=resolvePendingChoice(pending,'p1',0,{type:'assistants',assistantIds:['assistant-a','assistant-b']},refreshContext);
 assert.equal(next.players.p1.assistants[0].exhausted,false);assert.equal(next.players.p1.assistants[1].exhausted,false);
});

test('available-assistant card effects resolve the selected supply assistant without claiming or exhausting it',()=>{
 const state=playableState('utility');state.players.p1.resources.coin=1;state.assistants.stacks=[['assistant']];
 const assistantContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'PAY_RESOURCE_THEN',cost:{coin:1},effects:[{type:'ACTIVATE_AVAILABLE_ASSISTANT',level:'gold'}]}]},assistantEffects:{assistant:{silver:{type:'GAIN_RESOURCES',resources:{compass:1}},gold:{type:'GAIN_RESOURCES',resources:{jewel:1}}}}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},assistantContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'assistant-stack',stackIndex:0},assistantContext);
 assert.equal(next.players.p1.resources.coin,0);assert.equal(next.players.p1.resources.jewel,1);assert.deepEqual(next.assistants.stacks,[['assistant']]);assert.deepEqual(next.players.p1.assistants,[]);
});

test('free Item effects take only a visible Item, refill its row, and use their printed destination',()=>{
 const handState=playableState('utility');handState.market.items=['item'];handState.market.itemDeck=['refill'];
 const itemContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},item:{id:'item',name:'Item',type:'Item',expansion:'Base Game'},refill:{id:'refill',name:'Refill',type:'Item',expansion:'Base Game'},artifact:{id:'artifact',name:'Artifact',type:'Artifact',expansion:'Base Game'}},cardEffects:{utility:[{type:'ACQUIRE_MARKET_ITEM',destination:'hand'}]}};
 const handPending=reduce(handState,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},itemContext);
 const handNext=resolvePendingChoice(handPending,'p1',0,{type:'card',cardId:'item'},itemContext);
 assert.deepEqual(handNext.players.p1.hand,['item']);assert.deepEqual(handNext.market.items,['refill']);
 const deckState=playableState('utility');deckState.players.p1.deck=['old'];deckState.market.items=['item'];
 const deckContext:EngineContext={...itemContext,cardEffects:{utility:[{type:'ACQUIRE_MARKET_ITEM',destination:'deck-top'}]}};
 const deckPending=reduce(deckState,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},deckContext);
 assert.throws(()=>resolvePendingChoice(deckPending,'p1',0,{type:'card',cardId:'artifact'},deckContext),/visible Item/);
 const deckNext=resolvePendingChoice(deckPending,'p1',0,{type:'card',cardId:'item'},deckContext);
 assert.deepEqual(deckNext.players.p1.deck,['item','old']);
});

test('Ornate Hammer-style effects exile the rightmost Item before returning a selected exiled Item to deck bottom',()=>{
 const state=playableState('utility');state.players.p1.deck=['old'];state.market.items=['left','right'];state.market.itemDeck=['refill'];state.market.exiled=['previous'];
 const hammerContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},left:{id:'left',name:'Left',type:'Item',expansion:'Base Game'},right:{id:'right',name:'Right',type:'Item',expansion:'Base Game'},previous:{id:'previous',name:'Previous',type:'Item',expansion:'Base Game'},refill:{id:'refill',name:'Refill',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'EXILE_RIGHTMOST_ITEM_GAIN_EXILED_ITEM'}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},hammerContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'card',cardId:'right'},hammerContext);
 assert.deepEqual(next.market.items,['left','refill']);assert.deepEqual(next.market.exiled,['previous']);assert.deepEqual(next.players.p1.deck,['old','right']);
});

test('Decorated Horn-style effects exchange one owned assistant for a visible supply assistant at the same ready level',()=>{
 const state=playableState('utility');state.players.p1.assistants=[{id:'owned',level:'gold',exhausted:true}];state.assistants.stacks=[['available','hidden']];
 const hornContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'EXCHANGE_ASSISTANT_WITH_AVAILABLE'}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},hornContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'assistant-exchange',assistantId:'owned',stackIndex:0},hornContext);
 assert.deepEqual(next.players.p1.assistants,[{id:'available',level:'gold',exhausted:false}]);assert.deepEqual(next.assistants.stacks,[['owned','hidden']]);
});

test('Guiding Stone-style effects activate the visible top site tile and then put it on its matching deck bottom',()=>{
 const state=playableState('utility');state.discovery.level1Deck=['top','next'];
 const siteContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},sites:{top:{id:'top',level:1,rewardCode:'c',expansion:'Base Game'},next:{id:'next',level:1,rewardCode:'t',expansion:'Base Game'}},cardEffects:{utility:[{type:'ACTIVATE_TOP_SITE_DECK',level:1}]}};
 const next=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},siteContext);
 assert.equal(next.players.p1.resources.coin,3);assert.deepEqual(next.discovery.level1Deck,['next','top']);
});

test('Army Knife-style effects require the exact number of distinct selected options',()=>{
 const state=playableState('utility');
 const knifeContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'CHOOSE_DISTINCT',count:2,options:[{type:'EXILE_OWN_CARD'},{type:'GAIN_RESOURCE',resource:'coin',amount:1},{type:'GAIN_RESOURCE',resource:'compass',amount:1},{type:'GAIN_RESOURCE',resource:'tablet',amount:1}]}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},knifeContext);
 assert.throws(()=>resolvePendingChoice(pending,'p1',0,{type:'card-options',optionIndexes:[1,1]},knifeContext),/distinct/);
 const next=resolvePendingChoice(pending,'p1',0,{type:'card-options',optionIndexes:[1,3]},knifeContext);
 assert.equal(next.players.p1.resources.coin,3);assert.equal(next.players.p1.resources.tablet,1);assert.equal(next.pendingRewards.length,0);
});

test('Fishing Rod-style discount purchase may buy the revealed Item deck top or decline without changing it',()=>{
 const state=playableState('utility');state.players.p1.resources.coin=1;state.market.itemDeck=['top','unseen'];
 const rodContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},top:{id:'top',name:'Top',type:'Item',expansion:'Base Game',cost:4},unseen:{id:'unseen',name:'Unseen',type:'Item',expansion:'Base Game',cost:1}},cardEffects:{utility:[{type:'BUY_ITEM',discount:3,includeTop:true}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},rodContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'card',cardId:'top'},rodContext);
 assert.equal(next.players.p1.resources.coin,0);assert.deepEqual(next.players.p1.deck,['top']);assert.deepEqual(next.market.itemDeck,['unseen']);
 const declined=resolvePendingChoice(pending,'p1',0,{type:'skip'},rodContext);
 assert.deepEqual(declined.market.itemDeck,['top','unseen']);assert.deepEqual(declined.players.p1.deck,[]);
});

test('Guardian’s Ocarina-style effect returns an occupied archaeologist and makes all later travel icons planes this round',()=>{
 const state=playableState('utility');state.sites.site={id:'site',level:1,occupiedBy:'p1',idolSlots:0};state.players.p1.availableWorkers=1;
 const ocarinaContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'RETURN_OCCUPIED_WORKER_THEN',effects:[{type:'ALL_TRAVEL_ICONS_ARE_PLANES_THIS_ROUND'}]}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},ocarinaContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'site',siteId:'site'},ocarinaContext);
 assert.equal(next.sites.site.occupiedBy,undefined);assert.equal(next.players.p1.availableWorkers,2);assert.equal(next.players.p1.allTravelIconsArePlanesThisRound,true);
});

test('tent activation and relocation effects enforce their printed target restrictions and resolve the tent reward',()=>{
 const state=playableState('utility');state.sites.from={id:'from',level:2,occupiedBy:'p1',idolSlots:0};state.sites.tent={id:'tent',level:1,isTentSite:true,rewardCode:'c',idolSlots:0};state.sites.levelOne={id:'levelOne',level:1,rewardCode:'t',idolSlots:0};
 const tentContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'MOVE_OCCUPIED_WORKER_THEN_ACTIVATE',destination:'tent',activations:2}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},tentContext);
 assert.throws(()=>resolvePendingChoice(pending,'p1',0,{type:'site-pair',fromSiteId:'from',toSiteId:'levelOne'},tentContext),/tent site/);
 const next=resolvePendingChoice(pending,'p1',0,{type:'site-pair',fromSiteId:'from',toSiteId:'tent'},tentContext);
 assert.equal(next.sites.from.occupiedBy,undefined);assert.equal(next.sites.tent.occupiedBy,'p1');assert.equal(next.players.p1.resources.coin,4);
 const occupied=structuredClone(next);occupied.players.p1.hand=['utility'];
 const emptyOnlyContext:EngineContext={cards:tentContext.cards,cardEffects:{utility:[{type:'ACTIVATE_TENT_SITE',requireEmpty:true}]}};
 const emptyPending=reduce(occupied,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},emptyOnlyContext);
 assert.throws(()=>resolvePendingChoice(emptyPending,'p1',0,{type:'site',siteId:'tent'},emptyOnlyContext),/eligible tent/);
});

test('Explorer snack markers also forbid ordinary relocation back to their marked site',()=>{
 const state=playableState('utility');state.players.p1.leader={id:'explorer',data:{snacks:[{id:'free',used:true,siteId:'from'}]}};state.sites.from={id:'from',level:1,rewardCode:'c',idolSlots:0};state.sites.to={id:'to',level:1,occupiedBy:'p1',rewardCode:'c',idolSlots:0};
 const relocateContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'MOVE_OCCUPIED_WORKER_THEN_ACTIVATE',destination:'level1',activations:1}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},relocateContext);
 assert.throws(()=>resolvePendingChoice(pending,'p1',0,{type:'site-pair',fromSiteId:'to',toSiteId:'from'},relocateContext),/snack token/);
});

test('occupied-site activation, guardian relocation, and two-tent activation resolve only legal selected spaces',()=>{
 const state=playableState('utility');state.players.p1.resources.coin=1;state.players.p1.resources.compass=2;state.sites.guardianFrom={id:'guardianFrom',level:2,occupiedBy:'p1',guardian:'g',idolSlots:0};state.sites.tentA={id:'tentA',level:1,isTentSite:true,rewardCode:'c',idolSlots:0};state.sites.tentB={id:'tentB',level:1,isTentSite:true,rewardCode:'t',idolSlots:0};
 const cardContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'MOVE_GUARDIAN_FROM_OWN_SITE_THEN_ACTIVATE',destination:'tent-or-level1'}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},cardContext);
 const moved=resolvePendingChoice(pending,'p1',0,{type:'site-pair',fromSiteId:'guardianFrom',toSiteId:'tentA'},cardContext);
 assert.equal(moved.sites.guardianFrom.guardian,undefined);assert.equal(moved.sites.tentA.guardian,'g');assert.equal(moved.players.p1.resources.coin,2);
 moved.players.p1.hand=['utility'];
 const chartsContext:EngineContext={cards:cardContext.cards,cardEffects:{utility:[{type:'PAY_RESOURCE_THEN',cost:{coin:1},effects:[{type:'ACTIVATE_TENT_SITES',count:2,requireEmpty:false}]}]}};
 const chartsPending=reduce(moved,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},chartsContext);
 const charts=resolvePendingChoice(chartsPending,'p1',0,{type:'site-ids',siteIds:['tentA','tentB']},chartsContext);
 assert.equal(charts.players.p1.resources.coin,2);assert.equal(charts.players.p1.resources.tablet,1);
});

test('free-guardian card effects reuse the public guardian target resolver',()=>{
 const state=playableState('utility');state.sites.site={id:'site',level:1,occupiedBy:'p1',guardian:'guardian',idolSlots:0};
 const guardianContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'OVERCOME_GUARDIAN_FREE'}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},guardianContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'site',siteId:'site'},guardianContext);
 assert.equal(next.sites.site.guardian,undefined);assert.deepEqual(next.players.p1.defeatedGuardians,['guardian']);
});

test('Bear Trap-style free guardian effects may target an empty site but never another player\'s archaeologist',()=>{
 const state=playableState('utility');state.sites.empty={id:'empty',level:1,guardian:'guardian',idolSlots:0};state.playerOrder=['p1','p2'];state.players.p2=structuredClone(state.players.p1);state.players.p2.id='p2';state.players.p2.name='Player 2';state.sites.other={id:'other',level:1,occupiedBy:'p2',guardian:'other-guardian',idolSlots:0};
 const trapContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'EXILE_SELF'},{type:'OVERCOME_GUARDIAN_FREE',requiresOwnArchaeologist:false}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},trapContext);
 assert.throws(()=>resolvePendingChoice(pending,'p1',0,{type:'site',siteId:'other'},trapContext),/another player/);
 const next=resolvePendingChoice(pending,'p1',0,{type:'site',siteId:'empty'},trapContext);
 assert.equal(next.sites.empty.guardian,undefined);assert.deepEqual(next.players.p1.defeatedGuardians,['guardian']);assert.deepEqual(next.market.exiled,['utility']);
});

test('War Club-style free guardian effects can defeat the revealed Lizard track guardian from the magnifying glass row',()=>{
 const state=playableState('utility');state.research.magnifyingNode.p1='lizard:r3:p0';placeLizardTrackGuardian(state,{id:'guardian',nodeId:'lizard:r3:p0'});revealLizardTrackGuardian(state,'lizard:r3:p0');
 const guardianContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},cardEffects:{utility:[{type:'OVERCOME_GUARDIAN_FREE',lizardTrackAllowed:true}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},guardianContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'lizard-track-guardian'},guardianContext);
 assert.deepEqual(next.players.p1.defeatedGuardians,['guardian']);assert.equal((next.research.templeData?.lizardGuardians as {defeated:boolean}[])[0].defeated,true);
});

test('level-I site card effects reuse the public site target resolver',()=>{
 const state=playableState('utility');state.sites.site={id:'site',level:1,tileId:'site-tile',idolSlots:0};
 const siteContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'}},sites:{'site-tile':{id:'site-tile',level:1,rewardCode:'c',expansion:'Base Game'}},cardEffects:{utility:[{type:'ACTIVATE_DISCOVERED_LEVEL1_SITE'}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},siteContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'site',siteId:'site'},siteContext);
 assert.equal(next.players.p1.resources.coin,3);
});

test('discount-purchase card effects reuse market purchase and artifact activation',()=>{
 const state=playableState('utility');state.market.artifacts=['artifact'];state.market.artifactDeck=['refill'];
 const discountContext:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},artifact:{id:'artifact',name:'Artifact',type:'Artifact',expansion:'Base Game',cost:3},refill:{id:'refill',name:'Refill',type:'Artifact',expansion:'Base Game',cost:2}},cardEffects:{utility:[{type:'BUY_WITH_DISCOUNT',itemDiscount:0,artifactDiscount:3}],artifact:[{type:'GAIN_RESOURCE',resource:'coin',amount:1}]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},discountContext);
 const next=resolvePendingChoice(pending,'p1',0,{type:'card',cardId:'artifact'},discountContext);
 assert.ok(next.players.p1.playedCards.includes('artifact'));assert.equal(next.players.p1.resources.coin,3);assert.deepEqual(next.market.artifacts,['refill']);
});

test('extension guardian presets can ready a used boon or spend a defeated guardian as a cost',()=>{
 const context:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Surprise Shipment'},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}}};
 let state=createGame(['p1']);state.phase='playing';
 state.players.p1.hand=['utility'];state.players.p1.defeatedGuardians=['guardian-a'];state.players.p1.usedGuardianBoons=['guardian-a'];
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'}, {...context,cardEffects:{utility:[expansionEffectPresets.resetGuardianBoon()]}});
 state=resolvePendingChoice(state,'p1',0,{type:'guardian',guardianId:'guardian-a'},context);
 assert.deepEqual(state.players.p1.usedGuardianBoons,[]);
 state.players.p1.hand=['utility'];state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'}, {...context,cardEffects:{utility:[expansionEffectPresets.spendDefeatedGuardian([{type:'GAIN_RESOURCE',resource:'arrowhead',amount:2}])]}});
 state=resolvePendingChoice(state,'p1',0,{type:'guardian',guardianId:'guardian-a'},context);
 assert.deepEqual(state.players.p1.defeatedGuardians,[]);assert.equal(state.players.p1.resources.arrowhead,2);
});

test('a lasting guardian-defeat preset triggers only this round and is cleared during cleanup',()=>{
 const context:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Surprise Shipment'},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}},guardians:{g:{id:'g',expansion:'Base Game',cost:{}}}};
 let state=createGame(['p1']);state.phase='playing';state.players.p1.hand=['utility'];state.sites.site={id:'site',level:1,idolSlots:0,occupiedBy:'p1',guardian:'g'};
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},{...context,cardEffects:{utility:[expansionEffectPresets.onOvercomeGuardianThisRound({tablet:1})]}});
 overcomeGuardian(state,'p1','site',context);
 assert.equal(state.players.p1.resources.tablet,1);
 state=reduce(state,{type:'PASS',playerId:'p1'},context);
 assert.equal(state.players.p1.guardianDefeatRewardsThisRound,undefined);
});

test('virtual idol-slot preset resolves a normal printed effect without consuming an idol or slot',()=>{
 const context:EngineContext={cards:{utility:{id:'utility',name:'Utility',type:'Item',expansion:'Surprise Shipment'}}};
 let state=createGame(['p1']);state.phase='playing';state.players.p1.hand=['utility'];
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},{...context,cardEffects:{utility:[expansionEffectPresets.useStandardIdolSlotEffect()]}});
 state=resolvePendingChoice(state,'p1',0,{type:'idol-effect',effect:'tablets'},context);
 assert.equal(state.players.p1.resources.tablet,2);assert.equal(state.players.p1.idols.filter(idol=>idol.inSlot).length,0);
});

test('expansion semantic presets cover Hidden Fear, flexible costs, bonus actions, borrowed assistants, and map tile swaps',()=>{
 const shipment:{[key:string]:any}={utility:{id:'utility',name:'Utility',type:'Item',expansion:'Surprise Shipment'},second:{id:'second',name:'Second',type:'Item',expansion:'Surprise Shipment'},hidden:{id:'hidden',name:'Hidden Fear',type:'Starter',expansion:'Expedition Leaders'}};
 let state=createGame(['p1','p2']);state.phase='playing';state.players.p1.hand=['utility','second','hidden'];state.players.p1.resources.coin=1;state.players.p1.resources.compass=1;
 const flexible:EngineContext={cards:shipment,cardEffects:{utility:[expansionEffectPresets.payAnyResourcesThen(['coin','compass'],2,[{type:'GAIN_RESOURCE',resource:'jewel',amount:1}])]}};
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},flexible);
 state=resolvePendingChoice(state,'p1',0,{type:'resource-payment',payment:{coin:1,compass:1}},flexible);
 assert.equal(state.players.p1.resources.jewel,1);assert.equal(state.players.p1.resources.coin,0);assert.equal(state.players.p1.resources.compass,0);

 state.players.p1.hand=['utility','second','hidden'];state.players.p1.mainActionUsed=undefined;
 const extra:EngineContext={cards:shipment,cardEffects:{utility:[expansionEffectPresets.extraMainAction()],second:[{type:'GAIN_RESOURCE_PER',resource:'tablet',counter:'FEAR_IN_HAND_AND_PLAY'}]},cardActionTiming:{utility:'main',second:'main'}};
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},extra);
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'second'},extra);
 assert.equal(state.players.p1.resources.tablet,1);assert.equal(state.players.p1.extraMainActions,undefined);

 state.players.p1.hand=['utility'];state.players.p1.mainActionUsed=undefined;state.players.p2.assistants=[{id:'gold',level:'gold',exhausted:true}];
 const gold:EngineContext={cards:shipment,cardEffects:{utility:[expansionEffectPresets.activateAnyGoldAssistant()]},assistantEffects:{gold:{silver:{type:'GAIN_RESOURCES',resources:{coin:1}},gold:{type:'GAIN_RESOURCES',resources:{tablet:2}}}}};
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},gold);
 state=resolvePendingChoice(state,'p1',0,{type:'assistant-target',ownerId:'p2',assistantId:'gold'},gold);
 assert.equal(state.players.p1.resources.tablet,3);assert.equal(state.players.p2.assistants[0].exhausted,true);

 state.players.p1.hand=['utility'];state.sites.left={id:'left',level:1,tileId:'left-tile',idolSlots:0,occupiedBy:'p2'};state.sites.right={id:'right',level:1,tileId:'right-tile',idolSlots:0};
 const map:EngineContext={cards:shipment,sites:{'left-tile':{id:'left-tile',level:1,rewardCode:'c',expansion:'Surprise Shipment'},'right-tile':{id:'right-tile',level:1,rewardCode:'t',expansion:'Surprise Shipment'}},cardEffects:{utility:[expansionEffectPresets.swapSiteTilesThenActivate()]}};
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},map);
 state=resolvePendingChoice(state,'p1',0,{type:'site-swap',firstSiteId:'left',secondSiteId:'right',activateSiteId:'left'},map);
 assert.equal(state.sites.left.tileId,'right-tile');assert.equal(state.sites.right.tileId,'left-tile');assert.equal(state.players.p1.resources.tablet,4);
});

test('Ominous artifacts trigger their printed penalty when an owned card effect exiles them',()=>{
 const cards={utility:{id:'utility',name:'Utility',type:'Item',expansion:'Base Game'},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'},chalice:{id:'chalice',name:'Ominous Chalice',type:'Artifact',expansion:'Surprise Shipment'}};
 let state=createGame(['p1']);state.phase='playing';state.players.p1.hand=['utility','chalice'];
 const exileContext:EngineContext={cards,cardEffects:{utility:[{type:'EXILE_OWN_CARD'}]}};
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'utility'},exileContext);
 state=resolvePendingChoice(state,'p1',0,{type:'card',cardId:'chalice'},exileContext);
 assert.deepEqual(state.market.exiled,['chalice']);assert.equal(state.players.p1.resources.coin,1);assert.ok(state.players.p1.playedCards.includes('fear'));
});

test('Mourning effects put gained Fear in the shared play area before counting Fear in hand and play',()=>{
 const cards={mourning:{id:'mourning',name:'Coins of Mourning',type:'Artifact',expansion:'Surprise Shipment'},payment:{id:'payment',name:'Payment',type:'Starter',expansion:'Base Game'},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}};
 const state=createGame(['p1']);state.phase='playing';state.players.p1.hand=['mourning','payment'];
 const next=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'mourning',activationPaymentCardId:'payment'},{cards,cardEffects:{mourning:[{type:'SEQUENCE',effects:[{type:'GAIN_FEAR_CARD',amount:1},expansionEffectPresets.perFear('coin',3)]}]}});
  assert.equal(next.players.p1.resources.coin,1);assert.ok(next.players.p1.playedCards.includes('fear'));
});

test('Stones of Mourning gains tablets per Fear in hand and play after discarding its Fear',()=>{
 const cards={stones:{id:'stones',name:'Stones of Mourning',type:'Artifact',expansion:'Surprise Shipment'},payment:{id:'payment',name:'Payment',type:'Starter',expansion:'Base Game'},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}};
 const state=createGame(['p1']);state.phase='playing';state.players.p1.hand=['stones','payment','fear','fear'];
 const next=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'stones',activationPaymentCardId:'payment'},{cards,cardEffects:{stones:[{type:'SEQUENCE',effects:[{type:'GAIN_FEAR_CARD',amount:1},expansionEffectPresets.perFear('tablet',3)]}]}});
 assert.equal(next.players.p1.resources.tablet,3);assert.deepEqual(next.players.p1.hand,['fear','fear']);assert.ok(next.players.p1.playedCards.includes('fear'));
});

test('Beads of Mourning serializes one resource upgrade for each counted Fear',()=>{
 const cards={beads:{id:'beads',name:'Beads of Mourning',type:'Artifact',expansion:'Surprise Shipment'},payment:{id:'payment',name:'Payment',type:'Starter',expansion:'Base Game'},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}};
 let state=createGame(['p1']);state.phase='playing';state.players.p1.hand=['beads','payment','fear'];state.players.p1.resources.tablet=2;
 const beadsContext:EngineContext={cards,cardEffects:{beads:[{type:'SEQUENCE',effects:[{type:'GAIN_FEAR_CARD',amount:1},expansionEffectPresets.upgradesPerFear(3)]}]}};
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'beads',activationPaymentCardId:'payment'},beadsContext);
 assert.equal(state.pendingRewards.length,1);
 state=resolvePendingChoice(state,'p1',0,{type:'resource',resource:'tablet'},beadsContext);
 assert.equal(state.pendingRewards.length,1);
 state=resolvePendingChoice(state,'p1',0,{type:'resource',resource:'tablet'},beadsContext);
 assert.equal(state.pendingRewards.length,0);assert.equal(state.players.p1.resources.arrowhead,2);assert.ok(state.players.p1.playedCards.includes('fear'));
});

test('Puppy-style activation accepts only an unoccupied Level I site',()=>{
 const cards={puppy:{id:'puppy',name:'Puppy',type:'Item',expansion:'Surprise Shipment'}};
 const state=createGame(['p1','p2']);state.phase='playing';state.players.p1.hand=['puppy'];state.sites.empty={id:'empty',level:1,idolSlots:0,rewardCode:'c'};state.sites.occupied={id:'occupied',level:1,idolSlots:0,rewardCode:'c',occupiedBy:'p2'};
 const puppyContext:EngineContext={cards,cardEffects:{puppy:[expansionEffectPresets.activateUnoccupiedSite(1)]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'puppy'},puppyContext);
 assert.throws(()=>resolvePendingChoice(pending,'p1',0,{type:'site',siteId:'occupied'},puppyContext),/unoccupied/);
 const next=resolvePendingChoice(pending,'p1',0,{type:'site',siteId:'empty'},puppyContext);
  assert.equal(next.players.p1.resources.coin,1);
});

test('Rope Ladder uses board-row topology instead of screen coordinates',()=>{
 const cards={ladder:{id:'ladder',name:'Rope Ladder',type:'Item',expansion:'Surprise Shipment'},fear:{id:'fear',name:'Fear',type:'Fear',expansion:'Base Game'}};
 let state=createGame(['p1']);state.phase='playing';state.players.p1.hand=['ladder'];
 state.sites.camp={id:'camp',level:1,mapRow:0,idolSlots:0,rewardCode:'c',occupiedBy:'p1'};
 state.sites.level2={id:'level2',level:2,mapRow:1,idolSlots:0,rewardCode:'t'};
 state.sites.wrongRow={id:'wrongRow',level:1,mapRow:2,idolSlots:0,rewardCode:'a'};
 const context:EngineContext={cards,cardEffects:{ladder:[expansionEffectPresets.activateSiteInRowAboveOwnWorker(2)]}};
 const pending=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'ladder'},context);
 assert.throws(()=>resolvePendingChoice(pending,'p1',0,{type:'site',siteId:'wrongRow'},context),/directly above/);
 const next=resolvePendingChoice(pending,'p1',0,{type:'site',siteId:'level2'},context);
 assert.equal(next.players.p1.resources.tablet,1);
  assert.equal(next.players.p1.playedCards.filter((id) => id === 'fear').length,2);
});

test('leader market primitives exile/refill a chosen row card and exile a discounted purchased Artifact',()=>{
 const cards={monkey:{id:'monkey',name:'Little Monkey',type:'Item',expansion:'Expedition Leaders'},shovel:{id:'shovel',name:'Shovel',type:'Item',expansion:'Expedition Leaders'},item:{id:'item',name:'Item',type:'Item',expansion:'Base Game'},itemRefill:{id:'itemRefill',name:'Item refill',type:'Item',expansion:'Base Game'},artifact:{id:'artifact',name:'Artifact',type:'Artifact',expansion:'Base Game',cost:2},artifactRefill:{id:'artifactRefill',name:'Artifact refill',type:'Artifact',expansion:'Base Game',cost:2},payment:{id:'payment',name:'Payment',type:'Starter',expansion:'Base Game'}};
 let state=createGame(['p1']);state.phase='playing';state.players.p1.hand=['monkey'];state.market.items=['item'];state.market.itemDeck=['itemRefill'];
 const monkeyContext:EngineContext={cards,cardEffects:{monkey:[{type:'EXILE_MARKET_CARD_REFILL',row:'either',optional:true}]}};
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'monkey'},monkeyContext);
 state=resolvePendingChoice(state,'p1',0,{type:'card',cardId:'item'},monkeyContext);
 assert.deepEqual(state.market.items,['itemRefill']);assert.deepEqual(state.market.exiled,['item']);
 state.players.p1.hand=['shovel'];state.players.p1.resources.compass=0;state.market.artifacts=['artifact'];state.market.artifactDeck=['artifactRefill'];
 const shovelContext:EngineContext={cards,cardEffects:{shovel:[{type:'BUY_ARTIFACT_WITH_DISCOUNT_THEN_EXILE',discount:2}],artifact:[{type:'GAIN_RESOURCE',resource:'coin',amount:1}]}};
 state=reduce(state,{type:'PLAY_CARD',playerId:'p1',cardId:'shovel'},shovelContext);
 state=resolvePendingChoice(state,'p1',0,{type:'card',cardId:'artifact'},shovelContext);
 assert.equal(state.players.p1.resources.coin,1);assert.ok(state.market.exiled.includes('artifact'));assert.deepEqual(state.market.artifacts,['artifactRefill']);
});

test('playing an Artifact requires and consumes a different hand card as activation payment', () => {
  const state = playableState('artifact');
  state.players.p1.hand.push('payment');
  const artifactContext: EngineContext = { cards: {
    artifact: { id: 'artifact', name: 'Artifact', type: 'Artifact', expansion: 'Base Game' },
    payment: { id: 'payment', name: 'Payment', type: 'Starter', expansion: 'Base Game' },
  } };
  assert.throws(() => reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'artifact' }, artifactContext), /requires one discarded/);
  const next = reduce(state, { type: 'PLAY_CARD', playerId: 'p1', cardId: 'artifact', activationPaymentCardId: 'payment' }, artifactContext);
  assert.deepEqual(next.players.p1.hand, []);
  assert.deepEqual(next.players.p1.playedCards, ['payment', 'artifact']);
});
