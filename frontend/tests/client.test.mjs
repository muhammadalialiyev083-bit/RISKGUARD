import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/api/client.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext },
}).outputText;
let clientId = 0;
const user = { id: 1, username: 'test-admin', role: 'ADMIN' };
const credentials = { username: user.username, password: '  TestPassword!  ' };
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json' },
});

async function clientFor(t, handler) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options });
    return handler(url, options, calls);
  };
  t.after(() => { globalThis.fetch = originalFetch; });
  const client = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}#${clientId++}`);
  return { ...client, calls };
}

test('login, logout and relogin use rotated tokens and preserve the password', async t => {
  const { api, calls } = await clientFor(t, (url, options) => {
    if (url.endsWith('/csrf')) return json({ csrfToken: 'before-login' });
    const token = options.headers.get('X-CSRFToken');
    if (url.endsWith('/login')) {
      assert.equal(token, calls.filter(call => call.url.endsWith('/login')).length === 1 ? 'before-login' : 'after-logout');
      assert.deepEqual(JSON.parse(options.body), credentials);
      return json({ user, csrfToken: 'after-login' });
    }
    assert.ok(url.endsWith('/logout'));
    assert.equal(token, 'after-login');
    return json({ message: 'ok', csrfToken: 'after-logout' });
  });
  assert.deepEqual((await api.login(credentials)).user, user);
  await api.logout();
  await api.login(credentials);
  assert.equal(calls.filter(call => call.url.endsWith('/csrf')).length, 1);
  assert.ok(calls.every(call => call.credentials === 'include' && call.cache === 'no-store'));
});

test('older login responses invalidate the cached token before logout', async t => {
  let tokenRequests = 0;
  const { api } = await clientFor(t, (url, options) => {
    if (url.endsWith('/csrf')) return json({ csrfToken: `token-${++tokenRequests}` });
    if (url.endsWith('/login')) return json({ user });
    assert.equal(options.headers.get('X-CSRFToken'), 'token-2');
    return json({ message: 'ok' });
  });
  await api.login(credentials);
  await api.logout();
  assert.equal(tokenRequests, 2);
});

test('a stale CSRF rejection refreshes once and retries the same action', async t => {
  let tokenRequests = 0;
  let attempts = 0;
  const { api, calls } = await clientFor(t, (url, options) => {
    if (url.endsWith('/csrf')) return json({ csrfToken: `token-${++tokenRequests}` });
    attempts += 1;
    if (attempts === 1) return json({ detail: 'CSRF Failed: token incorrect.' }, 403);
    assert.equal(options.headers.get('X-CSRFToken'), 'token-2');
    return json({ user, csrfToken: 'rotated' });
  });
  await api.login(credentials);
  const actions = calls.filter(call => call.method === 'POST');
  assert.equal(actions.length, 2);
  assert.equal(actions[0].body, actions[1].body);
});

test('a repeated CSRF failure stops after one retry', async t => {
  const { api, ApiError, calls } = await clientFor(t, url => url.endsWith('/csrf')
    ? json({ csrfToken: 'token' })
    : json({ detail: 'CSRF Failed: origin rejected.' }, 403));
  await assert.rejects(api.login(credentials), error => error instanceof ApiError && error.status === 403);
  assert.equal(calls.filter(call => call.method === 'POST').length, 2);
});

test('permission errors and invalid credentials are never retried', async t => {
  const { api, calls } = await clientFor(t, url => {
    if (url.endsWith('/csrf')) return json({ csrfToken: 'token' });
    if (url.endsWith('/login')) return json({ non_field_errors: ['Foydalanuvchi nomi yoki parol noto‘g‘ri.'] }, 400);
    return json({ detail: 'Permission denied.' }, 403);
  });
  await assert.rejects(api.login(credentials), /Foydalanuvchi nomi yoki parol/);
  await assert.rejects(api.publishPlan(1), /Permission denied/);
  assert.equal(calls.length, 3);
});

test('concurrent actions share the CSRF bootstrap request', async t => {
  const { api, calls } = await clientFor(t, async (url, options) => {
    if (url.endsWith('/csrf')) return json({ csrfToken: 'shared-token' });
    assert.equal(options.headers.get('X-CSRFToken'), 'shared-token');
    return json({ ok: true });
  });
  await Promise.all([api.publishPlan(1), api.approveBIA(2)]);
  assert.equal(calls.filter(call => call.url.endsWith('/csrf')).length, 1);
});

test('HTML from a static host cannot masquerade as a successful login', async t => {
  const { api } = await clientFor(t, url => url.endsWith('/csrf')
    ? json({ csrfToken: 'token' })
    : new Response('<html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } }));
  await assert.rejects(api.login(credentials), /kutilmagan javob/);
});

test('a failed CSRF bootstrap can be retried without reloading the page', async t => {
  let attempts = 0;
  const { api, calls } = await clientFor(t, url => {
    if (url.endsWith('/csrf')) return ++attempts === 1 ? json({}) : json({ csrfToken: 'token' });
    return json({ user });
  });
  await assert.rejects(api.login(credentials), /xavfsizlik tokeni/);
  assert.deepEqual((await api.login(credentials)).user, user);
  assert.equal(calls.filter(call => call.method === 'POST').length, 1);
});

test('network and upstream errors provide readable messages', async t => {
  let attempts = 0;
  const { api } = await clientFor(t, () => {
    if (++attempts === 1) throw new TypeError('Failed to fetch');
    return new Response('<html>Bad gateway</html>', { status: 502 });
  });
  await assert.rejects(api.getMe(), /Server bilan bog‘lanib bo‘lmadi/);
  await assert.rejects(api.getMe(), /Server vaqtincha ishlamayapti/);
});

test('profile loading retains authentication failures for session handling', async t => {
  const { api, ApiError } = await clientFor(t, () => json({ detail: 'Authentication credentials were not provided.' }, 403));
  await assert.rejects(api.getMe(), error => error instanceof ApiError && error.status === 403);
});
