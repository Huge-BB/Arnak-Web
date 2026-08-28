import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { AuthService } from './auth.ts';
import { JsonFileAuthStore } from './file-auth-store.ts';
import { JsonFileRoomStore } from './file-room-store.ts';
import { RoomService } from './room-service.ts';
import type { EngineContext } from './types.ts';

test('file-backed auth and room tickets survive a service restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'arnak-store-test-'));
  try {
    const auth = new AuthService(new JsonFileAuthStore(join(directory, 'auth.json')));
    const session = await auth.register({ username: 'persistent_user', password: 'correct-horse-battery' });
    const restartedAuth = new AuthService(new JsonFileAuthStore(join(directory, 'auth.json')));
    assert.equal((await restartedAuth.authenticate(session.token))?.id, session.user.id);

    const context: EngineContext = { cards: {} }, path = join(directory, 'rooms.json');
    const first = new RoomService(context, new JsonFileRoomStore(path));
    const room = await first.createRoom({ name: 'Persistent', user: session.user });
    const restartedRooms = new RoomService(context, new JsonFileRoomStore(path));
    const snapshot = await restartedRooms.snapshot(room.roomId, room.token);
    assert.equal(snapshot.room.name, 'Persistent');
    assert.equal(snapshot.viewer.playerId, 'p1');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
