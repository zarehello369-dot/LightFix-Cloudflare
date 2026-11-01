import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import worker from '../src/worker.js';

const adminId = 'a'.repeat(32);
const technicianId = 'b'.repeat(32);
const adminToken = '1'.repeat(64);
const technicianToken = '2'.repeat(64);
const hash = value => createHash('sha256').update(value).digest('hex');

function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_init.sql', import.meta.url), 'utf8'));
  const user = sqlite.prepare(`INSERT INTO users(id,username,display_name,role,password_hash,salt,iterations,active,created_at)
    VALUES(?,?,?,?,?,?,?,1,?)`);
  user.run(adminId, 'admin', 'ผู้ดูแล', 'admin', 'unused', 'unused', 100000, 1);
  user.run(technicianId, 'technician', 'ช่าง', 'technician', 'unused', 'unused', 100000, 2);
  const session = sqlite.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)');
  session.run(hash(adminToken), adminId, Date.now() + 60000, Date.now());
  session.run(hash(technicianToken), technicianId, Date.now() + 60000, Date.now());
  sqlite.prepare('INSERT INTO poles(pole,location,active,created_at,updated_at) VALUES(?,?,?,?,?)').run('T0001', 'ไม่มีประวัติ', 1, 1, 1);
  sqlite.prepare('INSERT INTO poles(pole,location,active,created_at,updated_at) VALUES(?,?,?,?,?)').run('T0002', 'มีประวัติ', 1, 1, 1);
  sqlite.prepare(`INSERT INTO reports(id,pole,symptom,contact_type,contact_value,created_at,request_id,assigned_user_id)
    VALUES(?,?,?,?,?,?,?,?)`).run('c'.repeat(32), 'T0002', 'ไฟไม่ติด', 'name', 'ผู้แจ้ง', 1, 'd'.repeat(32), technicianId);
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
    async batch(statements) {
      sqlite.exec('BEGIN');
      try { const result = []; for (const statement of statements) result.push(await statement.run()); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    }
  };
  const request = async (path, method = 'GET', data, token = adminToken) => {
    const response = await worker.fetch(new Request(`https://lightfix.example${path}`, {
      method, headers: { cookie: `lf_session=${token}`, ...(data ? { 'content-type': 'application/json' } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {})
    }), { DB });
    return { status: response.status, body: await response.json() };
  };
  return { sqlite, request };
}

test('only an admin can delete an unused pole, and confirmation is required', async () => {
  const { sqlite, request } = fixture();
  assert.equal((await request('/api/admin/poles/T0001', 'DELETE', { confirm: 'T0001' }, technicianToken)).status, 403);
  assert.equal((await request('/api/admin/poles/T0001', 'DELETE', { confirm: 'wrong' })).status, 400);
  assert.equal((await request('/api/admin/poles/T0001', 'DELETE', { confirm: 'T0001' })).status, 200);
  assert.equal(sqlite.prepare('SELECT pole FROM poles WHERE pole=?').get('T0001'), undefined);
  assert.equal((await request('/api/admin/poles/T0002', 'DELETE', { confirm: 'T0002' })).body.error, 'POLE_HAS_HISTORY');
  assert.ok(sqlite.prepare('SELECT pole FROM poles WHERE pole=?').get('T0002'));
  sqlite.close();
});

test('admin can create and delete an unused account while assigned work stays protected', async () => {
  const { sqlite, request } = fixture();
  assert.equal((await request('/api/admin/users', 'POST', { username: 'blocked', name: 'ช่าง', role: 'technician' }, technicianToken)).status, 403);
  const created = await request('/api/admin/users', 'POST', { username: 'newtech', name: 'ช่างใหม่', role: 'technician' });
  assert.equal(created.status, 201);
  assert.ok(created.body.data.temporaryPassword.length >= 20);
  const newId = created.body.data.id;
  const account = sqlite.prepare('SELECT active,must_change_password FROM users WHERE id=?').get(newId);
  assert.equal(account.active, 1);
  assert.equal(account.must_change_password, 1);
  assert.equal((await request('/api/admin/users', 'POST', { username: 'newtech', name: 'ซ้ำ', role: 'technician' })).status, 409);
  assert.equal((await request(`/api/admin/users/${adminId}`, 'DELETE', { confirm: 'admin' })).body.error, 'SELF_DELETE');
  assert.equal((await request(`/api/admin/users/${technicianId}`, 'DELETE', { confirm: 'technician' })).body.error, 'USER_HAS_HISTORY');
  assert.equal((await request(`/api/admin/users/${newId}`, 'DELETE', { confirm: 'wrong' })).status, 400);
  sqlite.prepare(`INSERT INTO registrations(id,user_id,requested_role,status,requested_at) VALUES(?,?,'technician','pending',?)`).run('e'.repeat(32), newId, 3);
  sqlite.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(hash('3'.repeat(64)), newId, Date.now() + 60000, Date.now());
  assert.equal((await request(`/api/admin/users/${newId}`, 'DELETE', { confirm: 'newtech' })).status, 200);
  assert.equal(sqlite.prepare('SELECT id FROM users WHERE id=?').get(newId), undefined);
  assert.equal(sqlite.prepare('SELECT id FROM registrations WHERE user_id=?').get(newId), undefined);
  assert.equal(sqlite.prepare('SELECT user_id FROM sessions WHERE user_id=?').get(newId), undefined);
  assert.ok(sqlite.prepare('SELECT id FROM users WHERE id=?').get(technicianId));
  sqlite.close();
});
