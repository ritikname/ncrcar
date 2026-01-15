import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import * as bcrypt from 'bcryptjs';

// --- Type Definitions for Cloudflare Workers (if missing in env) ---
interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: any;
  error?: string;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  run<T = unknown>(): Promise<D1Result<T>>;
  first<T = unknown>(colName?: string): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface R2Object {
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
}

interface R2Bucket {
  put(key: string, value: any, options?: any): Promise<R2Object>;
  get(key: string): Promise<R2ObjectBody | null>;
}

type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  OWNER_EMAIL: string;
  OWNER_PASSWORD_HASH: string;
  EMAIL_SERVICE_URL: string;
  FRONTEND_URL: string;
};

type Variables = {
  user: any;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware
app.use('/api/*', cors({
  origin: (origin, c) => c.env.FRONTEND_URL,
  credentials: true,
}));

// --- AUTH UTILS ---

const generateToken = async (payload: any, secret: string) => {
  return await sign({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, secret, 'HS256'); // 7 days
};

const authMiddleware = async (c: any, next: any) => {
  const token = getCookie(c, 'auth_token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256');
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid Token' }, 401);
  }
};

// --- AUTH ROUTES ---

app.post('/api/auth/signup', async (c) => {
  const { name, email, password, phone } = await c.req.json();
  const hash = await bcrypt.hash(password, 10);

  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)'
    ).bind(name, email, hash, phone, 'customer').run();

    if (!result.success) throw new Error('DB Error');
    
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: 'Email already exists or invalid data' }, 400);
  }
});

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();

  // 1. Check Owner Config
  if (email === c.env.OWNER_EMAIL) {
    const validOwner = await bcrypt.compare(password, c.env.OWNER_PASSWORD_HASH);
    if (validOwner) {
      // Ensure owner exists in DB for foreign keys
      const ownerExists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
      if (!ownerExists) {
        await c.env.DB.prepare(
          'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
        ).bind('Owner', email, c.env.OWNER_PASSWORD_HASH, 'owner').run();
      }

      const token = await generateToken({ email, role: 'owner' }, c.env.JWT_SECRET);
      setCookie(c, 'auth_token', token, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 604800 });
      return c.json({ success: true, role: 'owner' });
    }
  }

  // 2. Check Customer DB
  const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  const token = await generateToken({ id: user.id, email, role: user.role, name: user.name }, c.env.JWT_SECRET);
  setCookie(c, 'auth_token', token, { httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 604800 });
  return c.json({ success: true, role: user.role, user: { name: user.name, phone: user.phone } });
});

app.post('/api/auth/logout', (c) => {
  deleteCookie(c, 'auth_token');
  return c.json({ success: true });
});

app.get('/api/me', authMiddleware, (c) => {
  const user = c.get('user');
  return c.json(user);
});

// --- PASSWORD RESET ---

app.post('/api/auth/forgot-password', async (c) => {
  const { email } = await c.req.json();
  const user: any = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();

  if (user) {
    const resetToken = crypto.randomUUID();
    const tokenHash = await bcrypt.hash(resetToken, 10);
    const expires = Date.now() + 1000 * 60 * 30; // 30 mins

    await c.env.DB.prepare('UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?')
      .bind(tokenHash, expires, user.id).run();

    const link = `${c.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    
    // Trigger Apps Script
    await fetch(c.env.EMAIL_SERVICE_URL, {
      method: 'POST',
      body: JSON.stringify({ type: 'reset_password', email, link })
    });
  }

  // Always return success to prevent enumeration
  return c.json({ message: 'If account exists, email sent.' });
});

app.post('/api/auth/reset-password', async (c) => {
  const { email, token, newPassword } = await c.req.json();
  const user: any = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

  if (!user || !user.reset_token_hash || user.reset_token_expires < Date.now()) {
    return c.json({ error: 'Invalid or expired token' }, 400);
  }

  const validToken = await bcrypt.compare(token, user.reset_token_hash);
  if (!validToken) return c.json({ error: 'Invalid token' }, 400);

  const newHash = await bcrypt.hash(newPassword, 10);
  await c.env.DB.prepare('UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?')
    .bind(newHash, user.id).run();

  return c.json({ success: true });
});

// --- CARS CRUD (Owner Only for mutations) ---

app.get('/api/cars', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM cars ORDER BY created_at DESC').all();
  // Parse gallery_images back to array
  const cars = results.map((car: any) => ({
    ...car,
    galleryImages: JSON.parse(car.gallery_images || '[]'),
    imageBase64: car.image_url // Mapping to maintain frontend compatibility
  }));
  return c.json(cars);
});

app.post('/api/cars', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'owner') return c.json({ error: 'Forbidden' }, 403);

  const formData = await c.req.parseBody();
  const file = formData['image'] as File;
  const name = formData['name'] as string;
  // ... extract other fields

  if (!file || !file.type.startsWith('image/')) return c.json({ error: 'Invalid Image' }, 400);

  // R2 Upload
  const key = `cars/${crypto.randomUUID()}-${file.name}`;
  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type }
  });
  
  const imageUrl = `${c.env.FRONTEND_URL}/cdn/${key}`; 

  const carId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO cars (id, name, price_per_day, image_url, status, gallery_images, fuel_type, transmission, seats, rating, category, total_stock)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    carId, name, formData['price'], imageUrl, 'available', '[]', 
    formData['fuelType'], formData['transmission'], formData['seats'], 
    formData['rating'], formData['category'], formData['totalStock']
  ).run();

  return c.json({ success: true, carId });
});

// --- BOOKINGS CRUD ---

app.get('/api/bookings/my', authMiddleware, async (c) => {
  const user = c.get('user');
  // If owner, return all bookings. If customer, return only theirs.
  if (user.role === 'owner') {
    const { results } = await c.env.DB.prepare('SELECT * FROM bookings ORDER BY created_at DESC').all();
    return c.json(results);
  } else {
    // For customers, ideally restrict, but this endpoint is named "my"
    // However, the original app architecture shared one list.
    // For secure production:
    const { results } = await c.env.DB.prepare('SELECT * FROM bookings WHERE email = ? OR customer_phone = ? ORDER BY created_at DESC').bind(user.email, user.phone).all();
    return c.json(results);
  }
});

app.post('/api/bookings', async (c) => {
  // Public endpoint (unauthenticated bookings allowed in prototype flow, but let's optional auth)
  // Or require auth. The original prototype allowed guests to book via modal flow.
  // For production, let's allow it but ideally link to user if logged in.
  const data = await c.req.json();
  const id = crypto.randomUUID();
  
  // Basic validation omitted for brevity
  await c.env.DB.prepare(`
    INSERT INTO bookings (id, car_id, customer_name, customer_phone, email, start_date, end_date, total_cost, transaction_id, status, is_approved)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id, data.carId, data.customerName, data.customerPhone, data.email,
    data.startDate, data.endDate, data.totalCost, data.transactionId, 'confirmed', 0
  ).run();

  // Trigger Email via Apps Script
  // Note: We should fetch car details to enrich email, but for now sending basic data
  await fetch(c.env.EMAIL_SERVICE_URL, {
    method: 'POST',
    body: JSON.stringify({
      type: 'new_booking',
      email: data.email,
      name: data.customerName,
      cost: data.totalCost
    })
  });

  return c.json({ success: true, bookingId: id });
});

app.patch('/api/bookings/:id/status', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.role !== 'owner') return c.json({ error: 'Forbidden' }, 403);
  
  const id = c.req.param('id');
  const { status, isApproved } = await c.req.json();
  
  if (isApproved !== undefined) {
    await c.env.DB.prepare('UPDATE bookings SET is_approved = ? WHERE id = ?').bind(isApproved ? 1 : 0, id).run();
  }
  if (status) {
    await c.env.DB.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(status, id).run();
  }

  return c.json({ success: true });
});


// Simple proxy route to serve R2 images securely if bucket is private
app.get('/cdn/:key', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.BUCKET.get(key);
  if (!object) return c.text('Not Found', 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  return new Response(object.body, { headers });
});

export default app;