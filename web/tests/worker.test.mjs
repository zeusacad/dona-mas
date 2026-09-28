import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

const mockAssets = { fetch: async () => new Response('asset-ok', { status: 200 }) };
function req(path, options) { return new Request('https://donamas.example' + path, options); }

test('static content is served through assets binding', async () => {
  const result = await worker.fetch(req('/styles.css'), { ASSETS: mockAssets });
  assert.equal(await result.text(), 'asset-ok');
});
test('backend is required for API routes', async () => {
  const result = await worker.fetch(req('/api/donations'), { ASSETS: mockAssets });
  assert.equal(result.status, 503);
  assert.equal((await result.json()).code, 'BACKEND_NOT_CONFIGURED');
});
test('backend URL must be an origin, not a credential or path', async () => {
  const result = await worker.fetch(req('/api/donations'), { BACKEND_ORIGIN: 'https://user:pass@api.example.com/path' });
  assert.equal(result.status, 503);
  assert.equal((await result.json()).code, 'INVALID_BACKEND_ORIGIN');
});
test('API proxy preserves method, JSON body, authorization and query', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (target, options) => {
      assert.equal(target.toString(), 'https://api.example.com/api/donations?status=available');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers.get('authorization'), 'Bearer token');
      assert.deepEqual(JSON.parse(await new Response(options.body).text()), { title: 'Test' });
      assert.equal(options.headers.has('cookie'), false);
      return Response.json({ id: 1 }, { status: 201 });
    };
    const result = await worker.fetch(req('/api/donations?status=available', { method: 'POST', headers: { authorization: 'Bearer token', 'content-type': 'application/json', cookie: 'session=x' }, body: JSON.stringify({ title: 'Test' }) }), { BACKEND_ORIGIN: 'https://api.example.com' });
    assert.equal(result.status, 201);
    assert.equal((await result.json()).id, 1);
    assert.equal(result.headers.get('cache-control'), 'no-store');
  } finally { globalThis.fetch = original; }
});
test('upstream failures return JSON 502', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('offline'); };
    const result = await worker.fetch(req('/health'), { BACKEND_ORIGIN: 'https://api.example.com' });
    assert.equal(result.status, 502);
    assert.equal((await result.json()).code, 'BACKEND_UNAVAILABLE');
  } finally { globalThis.fetch = original; }
});
