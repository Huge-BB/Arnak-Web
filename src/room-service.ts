import { randomUUID } from 'node:crypto';
import { createBaseBoardSites } from './base-board-setup.ts';
import { createGame } from './engine.ts';
import { applyEngineCommand, type EngineCommand } from './engine-api.ts';
import { InMemoryRoomStore, type RoomStore, type StoredRoom } from './room-store.ts';
import type { EngineContext, GameState, PlayerId } from './types.ts';

export type RoomTicket = { roomId: string; token: string; playerId?: PlayerId; role: 'player' | 'spectator' };
export type RoomSummary = { id: string; name: string; seats: number; occupiedSeats: number; status: 'lobby' | 'playing' | 'finished'; hostPlayerId: PlayerId };
export type RoomSnapshot = { room: RoomSummary; viewer: { playerId?: PlayerId; role: 'player' | 'spectator' }; state?: ReturnType<typeof projectGameState> };
type Listener = { token: string; notify: (snapshot: RoomSnapshot) => void };

/** Returns only the private hand belonging to the current room session. */
export function projectGameState(state: GameState, viewer?: PlayerId) {
  const players = Object.fromEntries(Object.entries(state.players).map(([id, player]) => [id, {
    ...structuredClone(player), hand: id === viewer ? [...player.hand] : [], handCount: player.hand.length,
    deck: [], deckCount: player.deck.length,
  }]));
  return {
    ...structuredClone(state), players,
    market: { ...structuredClone(state.market), itemDeck: [], artifactDeck: [], itemDeckCount: state.market.itemDeck.length, artifactDeckCount: state.market.artifactDeck.length },
    discovery: { level1DeckCount: state.discovery.level1Deck.length, level2DeckCount: state.discovery.level2Deck.length, guardianDeckCount: state.discovery.guardianDeck.length, idolDeckCount: state.discovery.idolDeck.length },
  };
}

/** Authoritative coordinator; production can replace RoomStore without changing engine or HTTP contracts. */
export class RoomService {
  private context: EngineContext;
  private store: RoomStore;
  #listeners = new Map<string, Set<Listener>>();

  constructor(context: EngineContext, store: RoomStore = new InMemoryRoomStore()) { this.context = context; this.store = store; }

  async createRoom(options: { name?: string; seats?: number; hostName?: string } = {}): Promise<RoomTicket> {
    const roomId = randomUUID().slice(0, 8), token = randomUUID();
    await this.store.create({ id: roomId, name: options.name || `Arnak ${roomId}`, seats: options.seats ?? 2, hostPlayerId: 'p1', members: [{ token, playerId: 'p1', role: 'player', name: options.hostName || 'Host' }], version: 0, events: [], snapshots: [] });
    return { roomId, token, playerId: 'p1', role: 'player' };
  }

  async listRooms(): Promise<RoomSummary[]> { return (await this.store.list()).map(room => this.summary(room)); }

  async joinRoom(roomId: string, options: { name?: string; spectator?: boolean } = {}): Promise<RoomTicket> {
    const ticket = await this.store.transact(roomId, room => {
      if (room.state) throw new Error('Cannot join a game already in progress');
      const count = room.members.filter(member => member.role === 'player').length;
      if (!options.spectator && count >= room.seats) throw new Error('Room is full');
      const member = { token: randomUUID(), role: options.spectator ? 'spectator' as const : 'player' as const, name: options.name || 'Guest', ...(options.spectator ? {} : { playerId: `p${count + 1}` }) };
      room.members.push(member);
      return { roomId, token: member.token, playerId: member.playerId, role: member.role };
    });
    await this.broadcast(roomId);
    return ticket;
  }

  async startRoom(roomId: string, token: string, options: Record<string, unknown> = {}): Promise<RoomSnapshot> {
    await this.store.transact(roomId, room => {
      const host = room.members.find(member => member.token === token);
      if (host?.playerId !== room.hostPlayerId || room.state) throw new Error('Only host may start');
      const playerIds = room.members.filter(member => member.role === 'player').map(member => member.playerId!);
      const seed = String(options.seed || roomId), state = createGame(playerIds);
      state.sites = createBaseBoardSites(playerIds.length, seed);
      room.state = applyEngineCommand(state, { type: 'action', action: { type: 'START_GAME', seed, ...options } }, this.context);
      room.version += 1;
      room.events.push({ version: room.version, at: new Date().toISOString(), kind: 'start' });
      room.snapshots.push({ version: room.version, state: structuredClone(room.state) });
    });
    await this.broadcast(roomId);
    return this.snapshot(roomId, token);
  }

  async submitCommand(roomId: string, token: string, command: EngineCommand): Promise<RoomSnapshot> {
    await this.store.transact(roomId, room => {
      const member = room.members.find(candidate => candidate.token === token);
      if (!room.state || !member?.playerId) throw new Error('Spectators cannot submit game commands');
      const actor = command.type === 'action' ? ('playerId' in command.action ? command.action.playerId : undefined) : command.playerId;
      if (actor !== member.playerId) throw new Error('A session may only submit commands for its own seat');
      room.state = applyEngineCommand(room.state, command, this.context);
      room.version += 1;
      room.events.push({ version: room.version, at: new Date().toISOString(), kind: 'command', command });
      if (room.version % 20 === 0) room.snapshots.push({ version: room.version, state: structuredClone(room.state) });
    });
    await this.broadcast(roomId);
    return this.snapshot(roomId, token);
  }

  async snapshot(roomId: string, token: string): Promise<RoomSnapshot> {
    const room = await this.store.read(roomId), member = room.members.find(candidate => candidate.token === token);
    if (!member) throw new Error('Unknown room session');
    return { room: this.summary(room), viewer: { playerId: member.playerId, role: member.role }, ...(room.state ? { state: projectGameState(room.state, member.playerId) } : {}) };
  }

  async subscribe(roomId: string, token: string, notify: (snapshot: RoomSnapshot) => void): Promise<() => void> {
    const initial = await this.snapshot(roomId, token);
    const listeners = this.#listeners.get(roomId) ?? new Set<Listener>(), listener = { token, notify };
    listeners.add(listener); this.#listeners.set(roomId, listeners); notify(initial);
    return () => { listeners.delete(listener); if (listeners.size === 0) this.#listeners.delete(roomId); };
  }

  private async broadcast(roomId: string) {
    const listeners = this.#listeners.get(roomId);
    if (!listeners?.size) return;
    await Promise.all([...listeners].map(async listener => listener.notify(await this.snapshot(roomId, listener.token))));
  }

  private summary(room: StoredRoom): RoomSummary {
    return { id: room.id, name: room.name, seats: room.seats, occupiedSeats: room.members.filter(member => member.role === 'player').length, status: room.state?.phase === 'finished' ? 'finished' : room.state ? 'playing' : 'lobby', hostPlayerId: room.hostPlayerId };
  }
}
