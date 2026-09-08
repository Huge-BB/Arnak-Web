import type { GameState } from './types.ts';

/** Portable, URL-safe debug checkpoint for exact local-game restoration. */
const PREFIX = 'ARNK2.';

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
function base64ToBytes(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function encodeStateCode(state: GameState) {
  return `${PREFIX}${bytesToBase64(new TextEncoder().encode(JSON.stringify(state)))}`;
}

export function decodeStateCode(value: string): GameState {
  if (!value.startsWith(PREFIX)) throw new Error('Invalid state code prefix');
  let decoded: unknown;
  try { decoded = JSON.parse(new TextDecoder().decode(base64ToBytes(value.slice(PREFIX.length)))); }
  catch { throw new Error('Invalid state code payload'); }
  if (!decoded || typeof decoded !== 'object') throw new Error('Invalid state code payload');
  const state = decoded as Partial<GameState>;
  if (!state.players || !Array.isArray(state.playerOrder) || !state.currentPlayer || !state.phase || !state.research || !state.sites) throw new Error('State code is missing required game state');
  return state as GameState;
}
