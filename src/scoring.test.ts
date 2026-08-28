import assert from 'node:assert/strict';
import test from 'node:test';
import { GUARDIAN_POINTS, IDOL_POINTS, emptyIdolSlotScore, guardianScore, idolScore } from './scoring.ts';

test('each defeated guardian is worth five points',()=>{assert.equal(GUARDIAN_POINTS,5);assert.equal(guardianScore({defeatedGuardians:[]}),0);assert.equal(guardianScore({defeatedGuardians:['g1']}),5);assert.equal(guardianScore({defeatedGuardians:['g1','g2','g3']}),15);});
test('each idol is worth three points whether used or unused',()=>{assert.equal(IDOL_POINTS,3);assert.equal(idolScore({idols:[{id:'i1',faceUp:true},{id:'i2',faceUp:false,inSlot:true}]}),6);});
test('empty leader idol slots score their visible values',()=>{const captain={leader:{id:'captain',data:{}},idols:[{id:'i1',faceUp:true,inSlot:true,slotIndex:3} as any]};assert.equal(emptyIdolSlotScore(captain),1+2+3);const mystic={leader:{id:'mystic',data:{}},idols:[{id:'i1',faceUp:true,inSlot:true,slotIndex:2} as any]};assert.equal(emptyIdolSlotScore(mystic),1+2+3+4);});
