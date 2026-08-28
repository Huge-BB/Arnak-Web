import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService, InMemoryAuthStore } from './auth.ts';

test('registration hashes passwords, authenticates sessions, and rejects invalid credentials', async () => {
  const auth = new AuthService(new InMemoryAuthStore(), 60_000);
  const registered = await auth.register({ username: 'archaeologist', displayName: 'Archaeologist', password: 'correct-horse-battery' });
  assert.equal(registered.user.username, 'archaeologist');
  assert.equal((await auth.authenticate(registered.token))?.displayName, 'Archaeologist');
  await assert.rejects(auth.login({ username: 'archaeologist', password: 'wrong-password' }), /Invalid username or password/);
  await assert.rejects(auth.register({ username: 'archaeologist', password: 'another-long-password' }), /already in use/);
  await auth.logout(registered.token);
  assert.equal(await auth.authenticate(registered.token), undefined);
});

test('expired sessions cannot authenticate', async () => {
  const auth = new AuthService(new InMemoryAuthStore(), -1);
  const session = await auth.register({ username: 'expired_user', password: 'correct-horse-battery' });
  assert.equal(await auth.authenticate(session.token), undefined);
});
