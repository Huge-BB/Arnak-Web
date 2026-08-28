/**
 * JSONL command line facade for deterministic engine/replay automation.
 *
 * Input starts with either {"type":"create-game","players":[...]} or
 * {"type":"state","state":GameState}; each later line is an EngineCommand.
 * A JSON state snapshot is emitted after every accepted line.
 */
import { createInterface } from 'node:readline';
import { readFile } from 'node:fs/promises';
import { createGame } from './engine.ts';
import { applyEngineCommand } from './engine-api.ts';
import { withBaseAssistantEffects } from './assistant-effect-data.ts';
import { withBaseGuardianEffects } from './guardian-effect-data.ts';
import { withBaseCardEffects } from './card-effect-data.ts';
import { buildResearchTracks } from './research-data.ts';
import { createBaseBoardSites } from './base-board-setup.ts';
import type { EngineCommand, EngineContext, GameState, PlayerId } from './types.ts';

type Bootstrap = { type: 'create-game'; players: PlayerId[] } | { type: 'state'; state: GameState };
const root = new URL('.', import.meta.url);
async function json<T>(relative: string): Promise<T> { return JSON.parse(await readFile(new URL(relative, root), 'utf8')) as T; }
const [cards, assistants, sites, idols, guardians, generatedTracks, manual, rewards] = await Promise.all([
  json<EngineContext['cards']>('./generated/cards.json'), json<NonNullable<EngineContext['assistants']>>('./generated/assistants.json'), json<NonNullable<EngineContext['sites']>>('./generated/sites.json'), json<NonNullable<EngineContext['idols']>>('./generated/idols.json'), json<NonNullable<EngineContext['guardians']>>('./generated/guardians.json'), json<NonNullable<EngineContext['researchTracks']>>('./generated/research-tracks.json'), json<Parameters<typeof buildResearchTracks>[1]>('../data/research-manual-data.json'), json<Parameters<typeof buildResearchTracks>[2]['rewardManual']>('../data/research-rewards-manual.json'),
]);
const context: EngineContext = withBaseCardEffects(withBaseGuardianEffects(withBaseAssistantEffects({ cards, assistants, sites, idols, guardians, researchTracks: buildResearchTracks(generatedTracks, manual, { rewardManual: rewards }) })));
let state: GameState | undefined;
const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const raw of input) {
  if (!raw.trim()) continue;
  try {
    const value = JSON.parse(raw) as Bootstrap | EngineCommand;
    if (!state) {
      if (value.type === 'create-game') state = createGame(value.players);
      else if (value.type === 'state') state = value.state;
      else throw new Error('First JSONL record must create-game or state');
    } else {
      const command = value as EngineCommand;
      if (command.type === 'action' && command.action.type === 'START_GAME' && Object.keys(state.sites).length === 0) {
        state.sites = createBaseBoardSites(state.playerOrder.length, command.action.seed ?? 'arnak-cli');
      }
      state = applyEngineCommand(state, command, context);
    }
    process.stdout.write(`${JSON.stringify({ ok: true, state })}\n`);
  } catch (error) { process.stdout.write(`${JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) })}\n`); }
}
