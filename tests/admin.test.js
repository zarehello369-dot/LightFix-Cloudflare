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
  sqlite.exec(readFileSync(new URL('../migrations/0003_workflow.sql', import.meta.url), 'utf8'));
  sqlite.prepare(`INSERT INTO reports(id,pole,symptom,contact_type,contact_value,created_at,request_id,assigned_user_id)
    VALUES(?,?,?,?,?,?,?,?)`).run('c'.repeat(32), 'T0002', 'ไฟไม่ติด', 'name', 'ผู้แจ้ง', 1, 'd'.repeat(32), technicianId);
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
    return { status: response.status, body: await response.json() };
  };
  return { sqlite, request, photos };
}

test('public location search finds active registered poles without exposing report data', async () => {
  const { sqlite, request } = fixture();
  const result = await request('/api/poles/search?q=ไม่มี');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.data, [{ pole: 'T0001', location: 'ไม่มีประวัติ' }]);
  assert.equal((await request('/api/poles/search?q=ม')).status, 400);
  sqlite.prepare('UPDATE poles SET active=0 WHERE pole=?').run('T0001');
  assert.deepEqual((await request('/api/poles/search?q=ไม่มี')).body.data, []);
});

test('photo names identify poles and keep multiple reports and repair rounds separate', async () => {
  const { sqlite, request, photos } = fixture();
  const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const create = async suffix => {
    const result = await request('/api/reports', 'POST', { pole: 'T0001', symptom: 'ไฟไม่ติด', contactType: 'none', photo, requestId: `photo-naming-test-request-${suffix}` });
    assert.equal(result.status, 201); return result.body.data.id;
  };
  const finish = async reportIds => {
    const started = await request('/api/admin/jobs/start', 'POST', { pole: 'T0001', reportIds, workRevision:sqlite.prepare('SELECT revision FROM pole_work_state WHERE pole=?').get('T0001').revision });
    assert.equal(started.status, 201);
    const result = await request(`/api/admin/jobs/${started.body.data.id}/finish`, 'POST', { cause: 'หลอดไฟหมดอายุ', photo, workRevision:sqlite.prepare('SELECT revision FROM pole_work_state WHERE pole=?').get('T0001').revision });
    assert.equal(result.status, 200);
  };
  const ids = [await create('one'), await create('two')];
  const oldKeys = [...photos.keys()];
  assert.equal(oldKeys.length, 2);
  assert.ok(oldKeys.every(key => key.startsWith('unrepaired/T0001/') && key.endsWith('/unrepaired-T0001.png')));
  await finish(ids);
  assert.equal(photos.size, 3);
  assert.ok(oldKeys.every(key => !photos.has(key)));
  assert.ok([...photos.keys()].every(key => key.startsWith('repaired/T0001/') && key.endsWith('/T0001.png')));
  for (const row of sqlite.prepare('SELECT before_photo_key FROM reports WHERE pole=?').all('T0001')) assert.ok(photos.has(row.before_photo_key));
  const firstRound = [...photos.keys()];
  await finish([await create('three')]);
  assert.ok(firstRound.every(key => photos.has(key)));
  assert.equal(photos.size, 5);
  sqlite.close();
});

test('report without callback stores explicit tracking preference in existing schema', async () => {
  const { sqlite, request } = fixture();
  const response = await request('/api/reports', 'POST', { pole: 'T0001', symptom: 'ไฟไม่ติด', contactType: 'none', contactValue: '', requestId: 'test-request-without-contact-2026' });
  assert.equal(response.status, 201);
  const row = sqlite.prepare('SELECT contact_type,contact_value FROM reports WHERE id=?').get(response.body.data.id);
  assert.equal(row.contact_type, 'name');
  assert.equal(row.contact_value, 'ติดตามผ่านลิงก์ (ไม่ขอรับการติดต่อกลับ)');
  sqlite.close();
});

test('registration rejects passwords beyond the same limit as password changes', async () => {
  const {sqlite,request}=fixture();
  const response=await request('/api/auth/register','POST',{username:'new-tech',name:'ช่างใหม่',role:'technician',contact:'ติดต่อผู้ดูแล',password:'x'.repeat(201)});
  assert.equal(response.status,400);assert.equal(response.body.error,'INVALID_REGISTRATION');
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM users WHERE username=?').get('new-tech').n,0);
  sqlite.close();
});

test('concurrent assignments and claims accept one revision and reject the other', async () => {
  const { sqlite, request } = fixture();
  const revision = () => sqlite.prepare('SELECT revision FROM pole_work_state WHERE pole=?').get('T0002').revision;
  const data = { pole:'T0002', reportIds:['c'.repeat(32)], technicianId, instructions:'ตรวจบริเวณทางเข้าตลาด',dueAt:Date.now()+86400000, workRevision:revision() };
  const assigned = await Promise.all([request('/api/admin/assign','POST',data), request('/api/admin/assign','POST',data)]);
  assert.deepEqual(assigned.map(result=>result.status).sort(),[200,409]);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM notifications').get().n,1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM work_mutation_checks').get().n,0);
  const claim = { pole:'T0002', reportIds:data.reportIds, workRevision:revision() };
  const started = await Promise.all([request('/api/jobs/start','POST',claim,technicianToken),request('/api/jobs/start','POST',claim,technicianToken)]);
  assert.deepEqual(started.map(result=>result.status).sort(),[201,409]);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM jobs WHERE status=1').get().n,1);
  assert.equal(sqlite.prepare('SELECT instructions FROM jobs WHERE status=1').get().instructions,data.instructions);
  assert.equal(sqlite.prepare('SELECT due_at FROM jobs WHERE status=1').get().due_at,data.dueAt);
  const stale = await request('/api/admin/assign','POST',data);
  assert.equal(stale.status,409);
  const view = await request('/api/workspace','GET',undefined,technicianToken);
  assert.equal(view.status,200);
  assert.equal(view.body.data.jobs.length,1);
  sqlite.close();
});

test('simultaneous public reports cannot exceed the selectable pole group size', async () => {
  const { sqlite, request } = fixture();
  const results = await Promise.all([0,1,2,3].map(index=>request('/api/reports','POST',{pole:'T0001',symptom:'ไฟไม่ติด',contactType:'none',requestId:`parallel-public-report-${index}`})));
  assert.deepEqual(results.map(result=>result.status).sort(),[201,201,201,409]);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM reports WHERE pole=?').get('T0001').n,3);
  assert.equal(sqlite.prepare('SELECT revision FROM pole_work_state WHERE pole=?').get('T0001').revision,3);
  sqlite.close();
});

test('new reports join the active pole job and invalidate an old repair snapshot', async () => {
  const { sqlite, request } = fixture();
  const started = await request('/api/jobs/start','POST',{pole:'T0002',reportIds:['c'.repeat(32)],workRevision:0},technicianToken);
  assert.equal(started.status,201);
  const snapshot = sqlite.prepare('SELECT revision FROM pole_work_state WHERE pole=?').get('T0002').revision;
  const added = await request('/api/reports','POST',{pole:'T0002',symptom:'ไฟสว่างน้อย',contactType:'none',requestId:'join-active-repair-request-2026'});
  assert.equal(added.status,201);
  const report = sqlite.prepare('SELECT status,job_id,assigned_user_id FROM reports WHERE id=?').get(added.body.data.id);
  assert.equal(report.status,1);
  assert.equal(report.job_id,started.body.data.id);
  assert.equal(report.assigned_user_id,technicianId);
  const note = await request(`/api/jobs/${started.body.data.id}/note`,'POST',{note:'stale note',workRevision:snapshot},technicianToken);
  assert.equal(note.status,409);
  assert.equal(sqlite.prepare('SELECT public_note FROM jobs WHERE id=?').get(started.body.data.id).public_note,'');
  sqlite.close();
});

test('reassignment removes the previous technician right to edit active work', async () => {
  const { sqlite, request } = fixture();
  const started = await request('/api/jobs/start','POST',{pole:'T0002',reportIds:['c'.repeat(32)],workRevision:0},technicianToken);
  assert.equal(started.status,201);
  const nextId = 'f'.repeat(32);
  sqlite.prepare(`INSERT INTO users(id,username,display_name,role,password_hash,salt,iterations,active,created_at) VALUES(?,?,?,'technician','unused','unused',100000,1,1)`).run(nextId,'nexttech','ช่างคนใหม่');
  const assigned = await request('/api/admin/assign','POST',{pole:'T0002',reportIds:['c'.repeat(32)],technicianId:nextId,workRevision:1});
  assert.equal(assigned.status,200);
  const denied = await request(`/api/jobs/${started.body.data.id}/note`,'POST',{note:'must not overwrite',workRevision:2},technicianToken);
  assert.equal(denied.status,403);
  const view = await request('/api/workspace','GET',undefined,technicianToken);
  assert.equal(view.body.data.jobs.length,0);
  assert.equal(view.body.data.reports.length,0);
  sqlite.close();
});

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

test('pole dossier counts repairs separately from complaints, excludes canceled symptoms, and pages full history', async () => {
  const {sqlite,request}=fixture();
  const job='e'.repeat(32);
  sqlite.prepare(`INSERT INTO jobs(id,pole,status,started_at,completed_at,cause,technician_id) VALUES(?,?,2,1000,3601000,?,?)`).run(job,'T0002','หลอดไฟหมดอายุ',technicianId);
  sqlite.prepare('UPDATE reports SET job_id=?,status=2 WHERE pole=?').run(job,'T0002');
  const insert=sqlite.prepare(`INSERT INTO reports(id,pole,symptom,contact_type,contact_value,status,created_at,request_id) VALUES(?,?,?,'phone','private',?,?,?)`);
  for(let i=0;i<24;i++) insert.run(i.toString(16).padStart(32,'0'),'T0002',i<22?'ไฟไม่ติด':'ยกเลิกทดสอบ',i<22?2:3,i+10,`request-${i}`);
  for(const token of [adminToken,technicianToken]) {
    const res=await request('/api/staff/poles/T0002','GET',undefined,token);
    assert.equal(res.status,200);
    const d=res.body.data;
    assert.equal(d.repairs.completed,1);
    assert.equal(d.repairs.average_duration_ms,3600000);
    assert.equal(d.reports.total,25);
    assert.equal(d.symptoms[0].count,23);
    assert.equal(d.symptoms.some(x=>x.label==='ยกเลิกทดสอบ'),false);
    assert.equal(d.complaints.length,20);
    assert.equal(JSON.stringify(d).includes('private'),false);
    assert.equal(d.jobs[0].technician_name,'ช่าง');
  }
  const page=await request('/api/staff/poles/T0002?page=2');
  assert.equal(page.body.data.complaints.length,5);
  const empty=await request('/api/staff/poles/T0001');
  assert.equal(empty.body.data.repairs.completed,0);
  assert.equal(empty.body.data.repairs.average_duration_ms,null);
  const denied=await request('/api/staff/poles/T0002','GET',undefined,'invalid');
  assert.equal(denied.status,401);
  assert.equal((await request('/api/staff/poles/T9999')).status,404);
});
