import type { IncomingMessage, ServerResponse } from 'http';

let cachedApp: any = null;

async function getApp(): Promise<any> {
  if (cachedApp) return cachedApp;
  const mod = await import('../server.js');
  cachedApp = mod.default || mod;
  return cachedApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Server module failed to load',
        message: e?.message || String(e),
        stack: String(e?.stack || '').slice(0, 1200),
      })
    );
  }
}
