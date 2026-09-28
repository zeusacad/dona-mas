/** Cloudflare-only adapter. The existing Express API is not bundled or modified. */
export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    if (incoming.pathname !== '/health' && !incoming.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request);
    }
    if (!env.BACKEND_ORIGIN) {
      return Response.json({ error: 'Backend URL not configured', code: 'BACKEND_NOT_CONFIGURED' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    let base;
    try {
      base = new URL(env.BACKEND_ORIGIN);
      const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
      if ((base.protocol !== 'https:' && !(isLocal && base.protocol === 'http:')) || base.username || base.password || base.search || base.hash || base.pathname !== '/') {
        throw new Error('Use an HTTPS origin without a path');
      }
    } catch (_) {
      return Response.json({ error: 'Invalid backend configuration', code: 'INVALID_BACKEND_ORIGIN' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
    const target = new URL(incoming.pathname + incoming.search, base.origin);
    const headers = new Headers();
    for (const name of ['accept', 'content-type', 'authorization']) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    try {
      const upstream = await fetch(target, {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual',
        cache: 'no-store'
      });
      const responseHeaders = new Headers({ 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      if (upstream.headers.has('content-type')) responseHeaders.set('Content-Type', upstream.headers.get('content-type'));
      return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    } catch (_) {
      return Response.json({ error: 'No se pudo contactar el servidor de Dona Más', code: 'BACKEND_UNAVAILABLE' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
  }
};
