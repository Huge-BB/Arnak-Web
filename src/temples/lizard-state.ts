import type { GameState, ResearchNodeId } from '../types.ts';

export interface LizardTrackGuardian {
  id: string;
  nodeId: ResearchNodeId;
  defeated: boolean;
  revealed: boolean;
}

function data(state: GameState) {
  state.research.templeData ??= {};
  const templeData = state.research.templeData as Record<string, unknown>;
  if (!Array.isArray(templeData.lizardGuardians)) templeData.lizardGuardians = [];
  return templeData;
}

export function lizardTrackGuardians(state: GameState): LizardTrackGuardian[] {
  return (data(state).lizardGuardians as LizardTrackGuardian[]);
}

export function placeLizardTrackGuardian(state: GameState, guardian: Omit<LizardTrackGuardian, 'defeated'|'revealed'>) {
  const guardians = lizardTrackGuardians(state);
  if (guardians.some(entry => entry.id === guardian.id)) throw new Error(`Lizard track guardian already exists: ${guardian.id}`);
  guardians.push({ ...guardian, defeated: false, revealed: false });
}

export function activeLizardBlockerNodes(state: GameState): ResearchNodeId[] {
  return lizardTrackGuardians(state).filter(guardian => !guardian.defeated).map(guardian => guardian.nodeId);
}

export function defeatLizardTrackGuardian(state: GameState, guardianId: string) {
  const guardian = lizardTrackGuardians(state).find(entry => entry.id === guardianId);
  if (!guardian) throw new Error(`Unknown Lizard track guardian: ${guardianId}`);
  if (guardian.defeated) throw new Error(`Lizard track guardian already defeated: ${guardianId}`);
  guardian.defeated = true;
}
/** The printed guardian space is the central Level-3 Lizard research node. */
export const LIZARD_TRACK_GUARDIAN_NODE = 'lizard:r3:p0';

export function revealLizardTrackGuardian(state:GameState,nodeId:ResearchNodeId){for(const guardian of lizardTrackGuardians(state))if(!guardian.defeated&&guardian.nodeId===nodeId)guardian.revealed=true;}

export function removeLizardTrackGuardian(state: GameState, guardianId: string) {
  const guardians = lizardTrackGuardians(state);
  const index = guardians.findIndex(entry => entry.id === guardianId);
  if (index < 0) throw new Error(`Unknown Lizard track guardian: ${guardianId}`);
  guardians.splice(index, 1);
}
