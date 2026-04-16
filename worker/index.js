/**
 * GRE 8000 Flashcard - Cloudflare Worker API
 * 
 * Bindings required:
 *   - DB: D1 database
 * 
 * Endpoints:
 *   POST /api/register    - Create new user (nickname) -> returns uid + secret
 *   POST /api/login       - Login with uid + secret -> returns profile
 *   GET  /api/sync        - Get progress (Authorization: Bearer <secret>)
 *   PUT  /api/sync        - Save progress (Authorization: Bearer <secret>)
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function err(msg, status = 400) {
  return json({ ok: false, error: msg }, status);
}

function generateId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function generateSecret() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

async function auth(request, db) {
  const header = request.headers.get('Authorization') || '';
  const secret = header.replace('Bearer ', '').trim();
  if (!secret) return null;
  const row = await db.prepare('SELECT uid, nickname FROM users WHERE secret = ?').bind(secret).first();
  return row;
}

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const db = env.DB;

    try {
      // ========== REGISTER ==========
      if (path === '/api/register' && request.method === 'POST') {
        const body = await request.json();
        const nickname = (body.nickname || '').trim();
        if (!nickname || nickname.length > 20) {
          return err('昵称不能为空，且不超过20字');
        }
        const uid = generateId();
        const secret = generateSecret();
        const now = new Date().toISOString();

        await db.prepare(
          'INSERT INTO users (uid, nickname, secret, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(uid, nickname, secret, now, now).run();

        // Initialize empty progress
        await db.prepare(
          'INSERT INTO progress (uid, data, updated_at) VALUES (?, ?, ?)'
        ).bind(uid, '{}', now).run();

        return json({ ok: true, uid, secret, nickname });
      }

      // ========== LOGIN ==========
      if (path === '/api/login' && request.method === 'POST') {
        const body = await request.json();
        const { uid, secret } = body;
        if (!uid || !secret) return err('需要 uid 和 secret');

        const user = await db.prepare(
          'SELECT uid, nickname, created_at FROM users WHERE uid = ? AND secret = ?'
        ).bind(uid, secret).first();

        if (!user) return err('身份验证失败', 401);
        return json({ ok: true, ...user });
      }

      // ========== GET PROGRESS ==========
      if (path === '/api/sync' && request.method === 'GET') {
        const user = await auth(request, db);
        if (!user) return err('未授权', 401);

        const row = await db.prepare(
          'SELECT data, updated_at FROM progress WHERE uid = ?'
        ).bind(user.uid).first();

        const data = row ? JSON.parse(row.data) : {};
        const updatedAt = row ? row.updated_at : null;
        return json({ ok: true, data, updatedAt });
      }

      // ========== SAVE PROGRESS ==========
      if (path === '/api/sync' && request.method === 'PUT') {
        const user = await auth(request, db);
        if (!user) return err('未授权', 401);

        const body = await request.json();
        const data = body.data;
        if (!data || typeof data !== 'object') return err('无效的进度数据');

        // Validate: data should be { "index": status } where status is 0/1/2
        const serialized = JSON.stringify(data);
        if (serialized.length > 500000) return err('数据过大');

        const now = new Date().toISOString();
        await db.prepare(
          'INSERT INTO progress (uid, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(uid) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at'
        ).bind(user.uid, serialized, now).run();

        return json({ ok: true, updatedAt: now });
      }

      // ========== 404 ==========
      return err('Not found', 404);

    } catch (e) {
      console.error(e);
      return err('Internal error: ' + e.message, 500);
    }
  },
};
