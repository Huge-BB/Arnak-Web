import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from './engine.ts';
import { advanceResearchByNode } from './research-action.ts';
import { resolveResearchReward } from './research-rewards.ts';
import { resolvePendingAssistantRefresh, resolvePendingSnakeRescueAssistant } from './pending-rewards.ts';
import { resolvePendingAssistantReward } from './pending-rewards.ts';
import type { EngineContext, ResearchTrackDefinition } from './types.ts';

function state() {
  const game = createGame(['p1']);
  game.phase = 'playing';
  game.currentPlayer = 'p1';
  game.research.board = 'bird';
  game.research.magnifyingNode.p1 = 'bird:start';
  game.research.journalNode.p1 = 'bird:start';
  return game;
}

const track: ResearchTrackDefinition = {
  id: 'bird',
  name: 'Bird',
  rows: [{
    magnifyingPoints: 1,
    journalPoints: 0,
    grantsAssistant: false,
    nodes: [{
      id: 'bird:r0:p0', rowIndex: 0, pathIndex: 0, researchLevel: 0,
      rewards: [
        { token: 'magnifying', rewards: [{ type: 'GAIN_RESOURCE', resource: 'coin', amount: 2 }], verified: true },
        { token: 'journal', rewards: [{ type: 'CLAIM_ASSISTANT', level: 'silver' }], verified: true },
      ],
    }],
  }],
  bridges: [{
    id: 'bird:start->bird:r0:p0',
    from: 'bird:start',
    to: 'bird:r0:p0',
    cost: {},
    rewards: [{ type: 'GAIN_RESOURCE', resource: 'compass', amount: 1 }],
    verified: true,
  }],
};

test('verified bridge and matching node resource reward arrays resolve immediately', () => {
  const game = state();
  advanceResearchByNode(game, track, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r0:p0' });
  assert.equal(game.players.p1.resources.compass, 1);
  assert.equal(game.players.p1.resources.coin, 2);
  assert.equal(game.pendingRewards.length, 0);
});

test('assistant research reward is exposed as a structured pending choice', () => {
  const game = state();
  game.players.p1.rules.journalMaxLead = 1;
  advanceResearchByNode(game, track, { playerId: 'p1', token: 'journal', toNodeId: 'bird:r0:p0' });
  assert.equal(game.players.p1.resources.coin, 0);
  assert.equal(game.players.p1.resources.compass, 1);
  assert.equal(game.pendingRewards.length, 1);
  assert.equal(game.pendingRewards[0].code, 'research:CLAIM_ASSISTANT');
  assert.deepEqual(game.pendingRewards[0].payload, { type: 'CLAIM_ASSISTANT', level: 'silver' });
});

test('Bird free guardian reward becomes a structured target-selection pending reward', () => {
  const game = state();
  resolveResearchReward(game, 'p1', 'bird:test', { type: 'OVERCOME_GUARDIAN_FREE' });
  assert.equal(game.pendingRewards.length, 1);
  assert.equal(game.pendingRewards[0].code, 'research:OVERCOME_GUARDIAN_FREE');
  assert.deepEqual(game.pendingRewards[0].payload, { type: 'OVERCOME_GUARDIAN_FREE' });
});

test('Snake GAIN_FEAR_CARD adds a base-game Fear card to played cards', () => {
  const game = state();
  const context: EngineContext = {
    cards: { fear: { id: 'fear', name: 'Fear', type: 'Fear', expansion: 'Base Game' } },
  };
  resolveResearchReward(game, 'p1', 'snake:test', { type: 'GAIN_FEAR_CARD', amount: 1 }, context);
  assert.deepEqual(game.players.p1.playedCards, ['fear']);
});

test('Monkey REFRESH_ASSISTANTS all readies both assistants', () => {
  const game = state();
  game.players.p1.assistants = [
    { id: 'a', level: 'silver', exhausted: true },
    { id: 'b', level: 'gold', exhausted: true },
  ];
  resolveResearchReward(game, 'p1', 'monkey:test', { type: 'REFRESH_ASSISTANTS', amount: 'all' });
  assert.deepEqual(game.players.p1.assistants.map(assistant => assistant.exhausted), [false, false]);
});

test('a numbered research assistant refresh requires exactly the chosen assistants', () => {
  const game = state();
  game.players.p1.assistants = [{ id: 'a', level: 'silver', exhausted: true }, { id: 'b', level: 'gold', exhausted: true }];
  resolveResearchReward(game, 'p1', 'monkey:test', { type: 'REFRESH_ASSISTANTS', amount: 2 });
  assert.equal(game.pendingRewards[0].code, 'research:REFRESH_ASSISTANTS');
  assert.throws(() => resolvePendingAssistantRefresh(game, 'p1', 0, ['a']), /exact number/);
  const resolved = resolvePendingAssistantRefresh(game, 'p1', 0, ['a', 'b']);
  assert.deepEqual(resolved.players.p1.assistants.map(assistant => assistant.exhausted), [false, false]);
});

test('Snake rescue lets the player select any special-stack assistant and claims it exhausted',()=>{
 const game=state();game.assistants.specialStack=['hidden-a','hidden-b'];resolveResearchReward(game,'p1','snake:rescue',{type:'CLAIM_SNAKE_RESCUE_ASSISTANT'});
 const next=resolvePendingSnakeRescueAssistant(game,'p1',0,'hidden-b');assert.deepEqual(next.assistants.specialStack,['hidden-a']);assert.deepEqual(next.players.p1.assistants,[{id:'hidden-b',level:'silver',exhausted:true}]);
});

test('Snake upgrade-and-refresh and refresh rewards target the chosen assistant',()=>{
 const game=state();game.players.p1.assistants=[{id:'a',level:'silver',exhausted:true},{id:'b',level:'gold',exhausted:true}];
 resolveResearchReward(game,'p1','snake:upgrade',{type:'UPGRADE_AND_REFRESH_ASSISTANT',level:'gold'});
 const upgraded=resolvePendingAssistantReward(game,'p1',0,{assistantId:'a'});
 assert.deepEqual(upgraded.players.p1.assistants,[{id:'a',level:'gold',exhausted:false},{id:'b',level:'gold',exhausted:true}]);
 resolveResearchReward(upgraded,'p1','snake:refresh',{type:'REFRESH_ASSISTANT'});
 const refreshed=resolvePendingAssistantReward(upgraded,'p1',0,{assistantId:'b'});
 assert.deepEqual(refreshed.players.p1.assistants.map(assistant=>assistant.exhausted),[false,false]);
});

test('SEQUENCE resolves deterministic children and leaves choices pending', () => {
  const game = state();
  game.players.p1.deck = ['card-a'];
  const sequenceTrack = structuredClone(track);
  sequenceTrack.bridges![0].rewards = [{
    type: 'SEQUENCE',
    rewards: [
      { type: 'GAIN_RESOURCE', resource: 'coin', amount: 1 },
      { type: 'DRAW_CARD', amount: 1 },
      { type: 'CHOOSE', count: 1, options: [
        { type: 'GAIN_RESOURCE', resource: 'tablet', amount: 1 },
        { type: 'GAIN_RESOURCE', resource: 'arrowhead', amount: 1 },
      ] },
    ],
  }];
  advanceResearchByNode(game, sequenceTrack, { playerId: 'p1', token: 'magnifying', toNodeId: 'bird:r0:p0' });
  assert.equal(game.players.p1.resources.coin, 3);
  assert.deepEqual(game.players.p1.hand, ['card-a']);
  assert.equal(game.pendingRewards[0].code, 'research:CHOOSE');
});
