
import { Hono } from 'hono';

// Since the frontend uses services/api.ts (LocalStorage), 
// we don't need the complex backend logic for the demo deployment.
const app = new Hono();

app.get('/api/*', (c) => {
  return c.json({ 
    message: 'Backend is active. Note: The frontend is currently running in Demo Mode using LocalStorage.',
    success: true 
  });
});

export default app;
