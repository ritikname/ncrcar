
import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';

type Bindings = {
  ASSETS: any;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('*', async (c) => {
  try {
    const response = await c.env.ASSETS.fetch(c.req.raw);
    if (response.status === 404) {
      // SPA Fallback: serve index.html for unknown routes (non-API)
      const index = await c.env.ASSETS.fetch(new URL('/index.html', c.req.url));
      return index;
    }
    return response;
  } catch (e) {
    return c.text("Internal Error", 500);
  }
});

export const onRequest = handle(app);
