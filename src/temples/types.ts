import type {
  GameState,
  PlayerId,
  ResearchBridgeDefinition,
  ResearchNodeId,
  ResearchToken,
  ResearchTrackDefinition,
} from '../types.ts';

export interface TempleMoveContext {
  state: GameState;
  track: ResearchTrackDefinition;
  playerId: PlayerId;
  token: ResearchToken;
  from: ResearchNodeId;
  to: ResearchNodeId;
  bridge: ResearchBridgeDefinition;
}

export interface TempleRules {
  id: string;
  validateMove?(context: TempleMoveContext): void;
  beforeMove?(context: TempleMoveContext): void;
  afterMove?(context: TempleMoveContext): void;
}
