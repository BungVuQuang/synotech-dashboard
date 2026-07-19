const HTML_ACCEPT = /(?:^|,)\s*text\/html(?:\s*;|\s*,|$)/i;
const FILE_LIKE_PATH = /\/[A-Za-z0-9._-]+\.[A-Za-z0-9]{1,12}$/;

function isStaticAssetPath(pathname) {
  return pathname.startsWith('/assets/') || FILE_LIKE_PATH.test(pathname);
}

function noStoreHtml(response, method) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  headers.set('Pragma', 'no-cache');
  headers.set('Expires', '0');
  headers.set('X-Synotech-SPA-Fallback', '1');
  return new Response(method === 'HEAD' ? null : response.body, {
    status: 200,
    statusText: 'OK',
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const assetResponse = await env.ASSETS.fetch(request);

    if (assetResponse.status !== 404) return assetResponse;
    if (!['GET', 'HEAD'].includes(request.method)) return assetResponse;
    if (isStaticAssetPath(url.pathname)) return assetResponse;
    if (!HTML_ACCEPT.test(request.headers.get('Accept') || '')) return assetResponse;

    const indexUrl = new URL('/index.html', url);
    const indexRequest = new Request(indexUrl, {
      method: request.method,
      headers: request.headers,
      redirect: 'manual',
    });
    const indexResponse = await env.ASSETS.fetch(indexRequest);
    if (!indexResponse.ok) return indexResponse;
    return noStoreHtml(indexResponse, request.method);
  },
};
