import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fixture } from './helpers/chat-fixture.js';
import { internals } from '../src/worker.js';

const admin='a'.repeat(32),tech='b'.repeat(32),token='2'.repeat(64),reportId='c'.repeat(32);
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=';
const report=(pole,requestId,photo)=>({pole,symptom:'ไฟไม่ติด',contactType:'none',requestId,photo});
const offer=request=>request(`/api/chat/${tech}/offers`,'POST',{requestKey:crypto.randomUUID(),pole:'T0002',workRevision:0});

test('password changes revoke other sessions and preserve the current session',async()=>{
  const {request,sqlite}=fixture(),other='3'.repeat(64);
  sqlite.prepare('INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').run(createHash('sha256').update(other).digest('hex'),tech,Date.now()+60000,Date.now());
  assert.equal((await request('/api/auth/change-password','POST',{password:'new-password-long-123'},token)).status,200);
  assert.equal((await request('/api/workspace','GET',undefined,token)).status,200);
  assert.equal((await request('/api/workspace','GET',undefined,other)).status,401);
  assert.equal((await request('/api/auth/change-password','POST',{password:'attacker-password-123'},other)).status,401);
});

test('an in-flight old-password login cannot create a session after credentials change',async()=>{
  const {request,sqlite,DB}=fixture(),password='old-password-long-123',salt=Buffer.from('0123456789abcdef').toString('base64');
  sqlite.prepare('UPDATE users SET password_hash=?,salt=? WHERE id=?').run(await internals.passwordHash(password,salt),salt,tech);
  const prepare=DB.prepare.bind(DB);
  DB.prepare=sql=>{const statement=prepare(sql),first=statement.first;
    if(sql==='SELECT * FROM users WHERE username=? AND role=?')statement.first=async()=>{
      const snapshot=await first();
      sqlite.prepare('UPDATE users SET password_hash=? WHERE id=?').run('replacement-credential',tech);
      return snapshot;
    };
    return statement;
  };
  const result=await request('/api/auth/login','POST',{username:'technician',role:'technician',password});
  assert.equal(result.status,401);assert.equal(result.headers.has('set-cookie'),false);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM sessions WHERE user_id=?').get(tech).n,1);
});

test('simultaneous registration decisions keep review and activation consistent',async()=>{
  const {request,sqlite,DB}=fixture(),registration='e'.repeat(32);
  sqlite.prepare("INSERT INTO registrations(id,user_id,requested_role,status,requested_at) VALUES(?,?,'technician','pending',1)").run(registration,tech);
  const prepare=DB.prepare.bind(DB);let reads=0,unlock;const gate=new Promise(resolve=>unlock=resolve);
  DB.prepare=sql=>{const statement=prepare(sql),first=statement.first;
    if(sql==='SELECT id,user_id,status FROM registrations WHERE id=?')statement.first=async()=>{const row=await first();if(++reads===2)unlock();await gate;return row;};
    return statement;
  };
  const results=await Promise.all(['approved','rejected'].map(decision=>request(`/api/admin/registrations/${registration}/review`,'POST',{decision})));
  assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);
  const status=sqlite.prepare('SELECT status FROM registrations WHERE id=?').get(registration).status;
  assert.equal(sqlite.prepare('SELECT active FROM users WHERE id=?').get(tech).active,status==='approved'?1:0);
});

test('report retry returns the original pole after edited input',async()=>{
  const {request,sqlite}=fixture(),requestId='same-report-request-key-2026';
  const created=await request('/api/reports','POST',report('T0001',requestId));
  const retried=await request('/api/reports','POST',report('T0002',requestId));
  assert.equal(retried.status,201);assert.equal(retried.body.data.id,created.body.data.id);
  assert.equal(retried.body.data.pole,'T0001');assert.equal(retried.body.data.duplicate,true);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM reports WHERE request_id=?').get(requestId).n,1);
});

test('committed report with a lost response retains its referenced photo',async()=>{
  const {request,sqlite,DB,photos}=fixture(),batch=DB.batch.bind(DB);
  DB.batch=async statements=>{await batch(statements);throw new Error('simulated lost committed response');};
  const result=await request('/api/reports','POST',report('T0001','committed-report-request-2026',png));
  assert.equal(result.status,201);
  const saved=sqlite.prepare('SELECT before_photo_key FROM reports WHERE id=?').get(result.body.data.id);
  assert.equal(photos.has(saved.before_photo_key),true);
});

test('committed repair with a lost response retains both before and after evidence',async()=>{
  const {request,sqlite,DB,photos}=fixture();
  const created=await request('/api/reports','POST',report('T0001','committed-repair-request-2026',png));
  const start=await request('/api/admin/jobs/start','POST',{pole:'T0001',reportIds:[created.body.data.id],workRevision:1});
  const batch=DB.batch.bind(DB);DB.batch=async statements=>{await batch(statements);throw new Error('simulated lost committed response');};
  const result=await request(`/api/admin/jobs/${start.body.data.id}/finish`,'POST',{cause:'หลอดไฟหมดอายุ',photo:png,workRevision:2});
  assert.equal(result.status,500);
  const job=sqlite.prepare('SELECT status,after_photo_key FROM jobs WHERE id=?').get(start.body.data.id);
  assert.equal(job.status,2);assert.equal(photos.has(job.after_photo_key),true);
  assert.equal(photos.has(sqlite.prepare('SELECT before_photo_key FROM reports WHERE id=?').get(created.body.data.id).before_photo_key),true);
});

test('unconfirmed database outcomes retain photo uploads when reconciliation fails',async()=>{
  const {request,DB,photos}=fixture(),prepare=DB.prepare.bind(DB);let failed=false;
  DB.batch=async()=>{failed=true;throw new Error('database unavailable');};
  DB.prepare=sql=>{const statement=prepare(sql);if(failed)statement.first=async()=>{throw new Error('database still unavailable');};return statement;};
  assert.equal((await request('/api/reports','POST',report('T0001','unconfirmed-report-request-2026',png))).status,500);
  assert.equal(photos.size,1);
});

test('invitation acceptance preserves assigned instructions and deadlines for joining reports',async()=>{
  const {request,sqlite}=fixture(),dueAt=Date.now()+86400000;
  sqlite.prepare('UPDATE reports SET instructions=?,due_at=? WHERE id=?').run('ตัดไฟก่อนทำงาน',dueAt,reportId);
  const sent=(await offer(request)).body.data;
  const accepted=await request(`/api/chat/offers/${sent.id}/respond`,'POST',{decision:'accepted'},token);
  assert.equal(accepted.status,200);
  const job=sqlite.prepare('SELECT instructions,due_at FROM jobs WHERE id=?').get(accepted.body.data.jobId);
  assert.ok(job.instructions.includes('ตัดไฟก่อนทำงาน'));assert.equal(job.due_at,dueAt);
  const added=await request('/api/reports','POST',report('T0002','joining-invited-repair-2026'));
  const joined=sqlite.prepare('SELECT instructions,due_at FROM reports WHERE id=?').get(added.body.data.id);
  assert.equal(joined.instructions,job.instructions);assert.equal(joined.due_at,dueAt);
});

test('work mutations expose expired invitations in history and incremental refresh',async()=>{
  for(const mutation of ['claim','assign','cancel','report']){
    const {request}=fixture(),sent=(await offer(request)).body.data;
    const data={pole:'T0002',reportIds:[reportId],workRevision:0};
    if(mutation==='claim')assert.equal((await request('/api/jobs/start','POST',data,token)).status,201);
    if(mutation==='assign')assert.equal((await request('/api/admin/assign','POST',{...data,technicianId:tech})).status,200);
    if(mutation==='cancel')assert.equal((await request('/api/admin/cancel','POST',{...data,note:'duplicate'})).status,200);
    if(mutation==='report')assert.equal((await request('/api/reports','POST',report('T0002','invalidate-invitation-request-2026'))).status,201);
    const history=(await request(`/api/chat/${admin}`,'GET',undefined,token)).body.data;
    assert.equal(history.messages[0].offer_status,'expired',mutation);
    const refreshed=(await request(`/api/chat/${admin}?after=${sent.id}`,'GET',undefined,token)).body.data;
    assert.equal(refreshed.updates[0].offer_status,'expired',mutation);
    assert.equal((await request(`/api/chat/offers/${sent.id}/respond`,'POST',{decision:'accepted'},token)).status,409);
    assert.equal((await request(`/api/chat/offers/${sent.id}/respond`,'POST',{decision:'declined'},token)).status,409);
  }
});

test('workspace unread total only counts unread incoming chat messages',async()=>{
  const {request}=fixture();
  const sent=(await request(`/api/chat/${tech}`,'POST',{requestKey:crypto.randomUUID(),body:'incoming'})).body.data;
  await request(`/api/chat/${admin}`,'POST',{requestKey:crypto.randomUUID(),body:'outgoing'},token);
  assert.equal((await request('/api/workspace','GET',undefined,token)).body.data.chat_unread,1);
  await request(`/api/chat/${admin}/read`,'POST',{through:sent.id},token);
  assert.equal((await request('/api/workspace','GET',undefined,token)).body.data.chat_unread,0);
});
