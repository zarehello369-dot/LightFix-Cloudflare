import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/chat-fixture.js';
import {uncertainInvite} from '../public/chat-state.js';
const admin='a'.repeat(32),tech='b'.repeat(32),token='2'.repeat(64);
const key=()=>crypto.randomUUID();
test('staff chat is authenticated, private, bounded and retry safe',async()=>{
  const {request,sqlite}=fixture();
  assert.equal((await request('/api/chat/contacts','GET',undefined,'bad')).status,401);
  const send=await request(`/api/chat/${tech}`,'POST',{requestKey:key(),body:'สวัสดีครับ'});
  assert.equal(send.status,200);
  assert.equal((await request(`/api/chat/${tech}`,'POST',{requestKey:send.body.data.request_key,body:'สวัสดีครับ'})).body.data.id,send.body.data.id);
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n,1);
  assert.equal((await request(`/api/chat/${tech}`,'POST',{requestKey:send.body.data.request_key,body:'เปลี่ยนข้อความ'})).status,409);
  assert.equal((await request('/api/chat/contacts','GET',undefined,token)).body.data.contacts[0].unread,1);
  const list=await request(`/api/chat/${admin}`,'GET',undefined,token);
  assert.equal(list.body.data.messages[0].body,'สวัสดีครับ');
  await request(`/api/chat/${admin}/read`,'POST',{through:send.body.data.id},token);
  assert.ok(sqlite.prepare('SELECT read_at FROM chat_messages').get().read_at);
  assert.equal((await request(`/api/chat/${admin}`,'POST',{requestKey:key(),body:'ได้รับแล้ว'},token)).status,200);
  assert.equal((await request(`/api/chat/${tech}`,'POST',{requestKey:key(),body:'x'.repeat(2001)})).status,400);
  sqlite.prepare("UPDATE users SET active=0 WHERE id=?").run(tech);
  assert.equal((await request(`/api/chat/${tech}`,'POST',{requestKey:key(),body:'อีกข้อความ'})).status,409);
  assert.equal((await request(`/api/chat/${admin}`,'GET',undefined,token)).status,401);
});
test('contacts can talk to the same role without exposing someone else conversation',async()=>{
 const {request,sqlite}=fixture(),third='e'.repeat(32);
 sqlite.prepare('INSERT INTO users(id,username,display_name,role,password_hash,salt,iterations,active,created_at) VALUES(?,?,?,?,?,?,?,1,1)').run(third,'admin2','เจ้าหน้าที่สอง','admin','x','x',100000);
 await request(`/api/chat/${third}`,'POST',{requestKey:key(),body:'เฉพาะเจ้าหน้าที่สอง'});
 assert.equal((await request(`/api/chat/${third}`,'GET',undefined,token)).body.data.messages.length,0);
 assert.equal((await request('/api/chat/contacts','GET',undefined,token)).body.data.contacts.find(c=>c.id===third).preview,null);
});
test('history pagination is stable and read only touches intended incoming messages',async()=>{
 const {request,sqlite}=fixture();
 const add=sqlite.prepare('INSERT INTO chat_messages(sender_id,recipient_id,request_key,body,created_at) VALUES(?,?,?,?,?)');
 for(let n=0;n<65;n++)add.run(admin,tech,key(),'ข้อความ '+n,1);
 const latest=(await request(`/api/chat/${admin}`,'GET',undefined,token)).body.data;
 assert.equal(latest.messages.length,50);assert.equal(latest.more,true);
 const older=(await request(`/api/chat/${admin}?before=${latest.messages[0].id}`,'GET',undefined,token)).body.data;
 assert.equal(older.messages.length,15);assert.equal(older.more,false);
 await request(`/api/chat/${admin}/read`,'POST',{through:15},token);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM chat_messages WHERE read_at IS NOT NULL').get().n,15);
 assert.equal((await request(`/api/chat/${admin}?before=no`,'GET',undefined,token)).status,400);
});
test('only invited technician can accept and acceptance starts one job atomically',async()=>{
 const {request,sqlite}=fixture();
 const offer=(await request(`/api/chat/${tech}/offers`,'POST',{requestKey:key(),pole:'T0002',workRevision:0,body:'ช่วยตรวจให้หน่อย'})).body.data;
 assert.equal(offer.offer_status,'pending');assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,0);
 assert.equal((await request(`/api/chat/offers/${offer.id}/respond`,'POST',{decision:'accepted'})).status,403);
 const accept=await request(`/api/chat/offers/${offer.id}/respond`,'POST',{decision:'accepted'},token);
 assert.equal(accept.status,200);
 assert.equal((await request(`/api/chat/offers/${offer.id}/respond`,'POST',{decision:'accepted'},token)).status,200);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,1);
 assert.equal(sqlite.prepare('SELECT status FROM reports').get().status,1);
 assert.equal(sqlite.prepare('SELECT revision FROM pole_work_state WHERE pole=?').get('T0002').revision,1);
 assert.equal((await request(`/api/chat/${admin}/offers`,'POST',{requestKey:key(),pole:'T0002',workRevision:0},token)).status,403);
});
test('decline leaves work waiting and stale invitation cannot start work',async()=>{
 const {request,sqlite}=fixture();
 let offer=(await request(`/api/chat/${tech}/offers`,'POST',{requestKey:key(),pole:'T0002',workRevision:0})).body.data;
 await request(`/api/chat/offers/${offer.id}/respond`,'POST',{decision:'declined'},token);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,0);
 assert.equal((await request(`/api/chat/offers/${offer.id}/respond`,'POST',{decision:'accepted'},token)).status,409);
 offer=(await request(`/api/chat/${tech}/offers`,'POST',{requestKey:key(),pole:'T0002',workRevision:0})).body.data;
 sqlite.prepare("UPDATE pole_work_state SET revision=revision+1 WHERE pole='T0002'").run();
 assert.equal((await request(`/api/chat/offers/${offer.id}/respond`,'POST',{decision:'accepted'},token)).status,409);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,0);
});
test('two concurrent invitations cannot create duplicate active jobs',async()=>{
 const {request,sqlite}=fixture();
 const make=()=>request(`/api/chat/${tech}/offers`,'POST',{requestKey:key(),pole:'T0002',workRevision:0});
 const a=(await make()).body.data,b=(await make()).body.data;
 const result=await Promise.all([a,b].map(o=>request(`/api/chat/offers/${o.id}/respond`,'POST',{decision:'accepted'},token)));
 assert.deepEqual(result.map(r=>r.status).sort(),[200,409]);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM jobs').get().n,1);
 assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM chat_messages WHERE offer_status='expired'").get().n,1);
});
test('incremental refresh cannot skip a burst beyond one history page',async()=>{
 const {request,sqlite}=fixture();
 const add=sqlite.prepare('INSERT INTO chat_messages(sender_id,recipient_id,request_key,body,created_at) VALUES(?,?,?,?,?)');
 for(let n=0;n<125;n++)add.run(admin,tech,key(),'ข้อความ '+n,1);
 let after=0,ids=[],more=true;
 while(more){const page=(await request(`/api/chat/${admin}?after=${after}`,'GET',undefined,token)).body.data;ids.push(...page.messages.map(m=>m.id));after=ids.at(-1);more=page.newMore;}
 assert.equal(ids.length,125);assert.equal(new Set(ids).size,125);assert.equal(ids.at(-1),125);
});
test('invitation retries require identical pole, revision and instructions',async()=>{
 const {request}=fixture(),payload={requestKey:key(),pole:'T0002',workRevision:0,body:'งานเดิม'};
 const sent=await request(`/api/chat/${tech}/offers`,'POST',payload);
 assert.equal(sent.status,200);
 assert.equal((await request(`/api/chat/${tech}/offers`,'POST',payload)).body.data.id,sent.body.data.id);
 for(const change of [{pole:'T0001'},{workRevision:1},{body:'แก้รายละเอียด'}])assert.equal((await request(`/api/chat/${tech}/offers`,'POST',{...payload,...change})).status,409);
});
test('committed invitation with a failed readback is recovered with its original key',async()=>{
 const {request,sqlite,DB}=fixture(),prepare=DB.prepare.bind(DB);
 let failReadback=true;
 DB.prepare=sql=>{
   const statement=prepare(sql),first=statement.first;
   if(sql==='SELECT * FROM chat_messages WHERE sender_id=? AND request_key=?')statement.first=async()=>{
     if(failReadback&&sqlite.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n){failReadback=false;throw new Error('simulated readback failure');}
     return first();
   };
   return statement;
 };
 const payload={requestKey:key(),pole:'T0002',workRevision:0,body:'คำเชิญเดิม'};
 const failed=await request(`/api/chat/${tech}/offers`,'POST',payload);
 assert.equal(failed.status,500);assert.equal(failed.body.error,'INTERNAL');assert.equal(uncertainInvite({code:failed.body.error}),true);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n,1);
 const recovered=await request(`/api/chat/${tech}/offers`,'POST',payload);
 assert.equal(recovered.status,200);assert.equal(recovered.body.data.request_key,payload.requestKey);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM chat_messages').get().n,1);
});
