import type { CardId, EngineContext, GameState, PlayerId, Resource } from '../types.ts';

export type LeaderId = 'captain' | 'falconer' | 'baroness' | 'professor' | 'explorer' | 'mystic' | string;

export interface LeaderState {
  id: LeaderId;
  data: Record<string, unknown>;
}

export interface LeaderSetupContext {
  state: GameState;
  playerId: PlayerId;
  context: EngineContext;
  seed: string;
}

export interface LeaderRoundContext extends LeaderSetupContext {
  round: number;
}

export interface LeaderRules {
  id: LeaderId;
  name: string;
  expansion: 'Expedition Leaders' | 'Missing Expedition' | string;
  startingCardNames?: string[];
  setup(ctx: LeaderSetupContext): void;
  onRoundStart?(ctx: LeaderRoundContext): void;
  onRoundEnd?(ctx: LeaderRoundContext): void;
}

export interface CaptainLeaderData {
  specialistUsedThisRound: boolean;
  specialistWorkerCommitted: boolean;
}

export interface FalconerLeaderData {
  eaglePosition: number;
  eagleMaxPosition: number;
}

export interface BaronessLeaderData {
  incomeRoundsRemaining: number[];
  specialDeliveryCardId?: CardId;
}

export interface ProfessorLeaderData {
  archive: CardId[];
  archiveRefilled: boolean;
  suitcase: Partial<Record<'compass' | 'tablet', number>>;
  roundBonusesRemaining: Partial<Record<number, 'compass' | 'tablet'>>;
}

export interface ExplorerSnackToken {
  id: 'free' | 'coin' | 'compass';
  cost?: Partial<Record<Resource, number>>;
  availableFromRound: number;
  used: boolean;
  siteId?: string;
}

export interface ExplorerLeaderData {
  snacks: ExplorerSnackToken[];
}

export interface MysticLeaderData {
  ritualPile: CardId[];
  idolSlotCount: number;
}
