import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../../src/worker.js';

const adminId = 'a'.repeat(32);
const technicianId = 'b'.repeat(32);
const adminToken = '1'.repeat(64);
const technicianToken = '2'.repeat(64);
const hash = value => createHash('sha256').update(value).digest('hex');

export function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../migrations/0001_init.sql', import.meta.url), 'utf8'));
  const user = sqlite.prepare(`INSERT INTO users(id,username,display_name,role,password_hash,salt,iterations,active,created_at)
    VALUES(?,?,?,?,?,?,?,1,?)`);
  user.run(adminId, 'admin', 'ผู้ดูแล', 'admin', 'unused', 'unused', 100000, 1);
  user.run(technicianId, 'technician', 'ช่าง', 'technician', 'unused', 'unused', 100000, 2);
  const session = sqlite.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)');
  session.run(hash(adminToken), adminId, Date.now() + 60000, Date.now());
  session.run(hash(technicianToken), technicianId, Date.now() + 60000, Date.now());
  sqlite.prepare('INSERT INTO poles(pole,location,active,created_at,updated_at) VALUES(?,?,?,?,?)').run('T0001', 'ไม่มีประวัติ', 1, 1, 1);
  sqlite.prepare('INSERT INTO poles(pole,location,active,created_at,updated_at) VALUES(?,?,?,?,?)').run('T0002', 'มีประวัติ', 1, 1, 1);
  sqlite.exec(readFileSync(new URL('../../migrations/0003_workflow.sql', import.meta.url), 'utf8'));
  sqlite.prepare(`INSERT INTO reports(id,pole,symptom,contact_type,contact_value,created_at,request_id,assigned_user_id)
    VALUES(?,?,?,?,?,?,?,?)`).run('c'.repeat(32), 'T0002', 'ไฟไม่ติด', 'name', 'ผู้แจ้ง', 1, 'd'.repeat(32), technicianId);
  sqlite.exec(readFileSync(new URL('../../migrations/0004_chat.sql', import.meta.url), 'utf8'));
  sqlite.exec(readFileSync(new URL('../../migrations/0005_staff_profiles.sql', import.meta.url), 'utf8'));
  let batchQueue = Promise.resolve();
  const DB = {
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...args) { values = args; return statement; },
        async first() { return sqlite.prepare(sql).get(...values) || null; },
        async all() { return { results: sqlite.prepare(sql).all(...values) }; },
        async run() { const result = sqlite.prepare(sql).run(...values); return { meta: { changes: Number(result.changes) } }; }
      };
      return statement;
    },
    batch(statements) {
      const task = batchQueue.then(async () => { sqlite.exec('BEGIN');
      try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
      }); batchQueue = task.catch(() => {}); return task;
    }
  };
  const photos = new Map();
  const PHOTOS = {
    async put(key, bytes, options) { photos.set(key, { bytes: new Uint8Array(bytes), httpMetadata: options.httpMetadata }); },
    async get(key) { const value = photos.get(key); return value ? { httpMetadata: value.httpMetadata, arrayBuffer: async () => value.bytes.slice().buffer } : null; },
    async delete(key) { photos.delete(key); }
  };
  const request = async (path, method = 'GET', data, token = adminToken) => {
    const response = await worker.fetch(new Request(`https://lightfix.example${path}`, {
      method, headers: { cookie: `lf_session=${token}`, ...(data ? { 'content-type': 'application/json' } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {})
    }), { DB, PHOTOS, RATE_SALT: 'local-test-only' });
    return { status: response.status, headers:response.headers, body:response.headers.get('content-type')?.startsWith('image/')?new Uint8Array(await response.arrayBuffer()):await response.json() };
  };
  return { sqlite, request, photos, DB, PHOTOS };
}
