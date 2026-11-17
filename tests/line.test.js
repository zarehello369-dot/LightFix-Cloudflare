import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.js';
import { fixture } from './helpers/chat-fixture.js';
import { notifyLineNewReport, pushLineText } from '../src/line.js';

const groupId=`C${'a'.repeat(32)}`;
const adminToken='1'.repeat(64);
const technicianToken='2'.repeat(64);
const envFor=fixture=>({DB:fixture.DB,PHOTOS:fixture.PHOTOS,RATE_SALT:'local-test-only',LINE_CHANNEL_SECRET:'test-channel-secret',LINE_CHANNEL_ACCESS_TOKEN:'test-access-token'});
const call=async(env,path,method='GET',data,token=adminToken,ctx)=>{
  const response=await worker.fetch(new Request(`https://lightfix.example${path}`,{
    method,headers:{cookie:`lf_session=${token}`,...(data?{'content-type':'application/json'}:{})},
    ...(data?{body:JSON.stringify(data)}:{})
  }),env,ctx);
  return {status:response.status,body:await response.json()};
};
const signedWebhook=async(env,payload,signatureOverride)=>{
  const raw=JSON.stringify(payload),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.LINE_CHANNEL_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(raw)))));
  const response=await worker.fetch(new Request('https://lightfix.example/api/line/webhook',{method:'POST',headers:{'content-type':'application/json','x-line-signature':signatureOverride||signature},body:raw}),env);
  return {status:response.status,body:await response.json()};
};

test('LINE webhook verifies signature and discovers group without storing chat text',async()=>{
  const fixtureData=fixture(),env=envFor(fixtureData);
  const payload={events:[{type:'message',source:{type:'group',groupId},message:{type:'text',text:'private group message'}}]};
  assert.equal((await signedWebhook(env,payload,'bad-signature')).status,401);
  assert.equal(fixtureData.sqlite.prepare('SELECT COUNT(*) AS count FROM line_groups').get().count,0);
  assert.equal((await signedWebhook(env,{events:[]})).status,200);
  assert.equal((await signedWebhook(env,payload)).status,200);
  assert.equal(fixtureData.sqlite.prepare('SELECT COUNT(*) AS count FROM line_groups').get().count,1);
  assert.equal((await call(env,'/api/admin/line','GET',undefined,technicianToken)).status,403);
  const status=await call(env,'/api/admin/line');
  assert.equal(status.status,200);
  assert.equal(status.body.data.groups[0].id,groupId);
  assert.equal((await call(env,'/api/admin/line/select','POST',{groupId})).status,200);
  assert.equal(fixtureData.sqlite.prepare('SELECT selected FROM line_groups WHERE group_id=?').get(groupId).selected,1);
  assert.equal((await signedWebhook(env,{events:[{type:'leave',source:{type:'group',groupId}}]})).status,200);
  assert.equal(fixtureData.sqlite.prepare('SELECT COUNT(*) AS count FROM line_groups').get().count,0);
  fixtureData.sqlite.close();
});

test('LINE push targets selected group and excludes reporter contact from new-report alert',async()=>{
  const fixtureData=fixture(),env=envFor(fixtureData);
  fixtureData.sqlite.prepare('INSERT INTO line_groups(group_id,last_seen_at,selected) VALUES(?,?,1)').run(groupId,Date.now());
  const calls=[];
  const send=async(url,options)=>{calls.push({url,options});return new Response(null,{status:200});};
  assert.equal(await pushLineText(env,'ทดสอบ',send),true);
  assert.equal(calls[0].url,'https://api.line.me/v2/bot/message/push');
  assert.equal(JSON.parse(calls[0].options.body).to,groupId);
  assert.equal(calls[0].options.headers.authorization,'Bearer test-access-token');
  const created=await call(env,'/api/reports','POST',{pole:'T0001',symptom:'ไฟไม่ติด',contactType:'phone',contactValue:'0812345678',requestId:'line-alert-report-request-2026'});
  assert.equal(created.status,201);
  assert.equal(await notifyLineNewReport(env,created.body.data.id,'https://lightfix.example',send),true);
  const message=JSON.parse(calls[1].options.body).messages[0].text;
  assert.match(message,/T0001/);
  assert.match(message,/ไฟไม่ติด/);
  assert.match(message,/https:\/\/lightfix\.example\/admin/);
  assert.equal(message.includes('0812345678'),false);
  fixtureData.sqlite.close();
});

test('new report queues LINE alert once, while duplicate retry does not alert again',async()=>{
  const fixtureData=fixture(),env=envFor(fixtureData);
  fixtureData.sqlite.prepare('INSERT INTO line_groups(group_id,last_seen_at,selected) VALUES(?,?,1)').run(groupId,Date.now());
  const originalFetch=globalThis.fetch, sent=[],pending=[];
  globalThis.fetch=async(url,options)=>{sent.push(JSON.parse(options.body));return new Response(null,{status:200});};
  try {
    const data={pole:'T0001',symptom:'ไฟสว่างน้อย',contactType:'none',requestId:'line-background-request-2026'};
    const ctx={waitUntil:promise=>pending.push(promise)};
    assert.equal((await call(env,'/api/reports','POST',data,adminToken,ctx)).status,201);
    await Promise.all(pending);
    assert.equal(sent.length,1);
    assert.equal((await call(env,'/api/reports','POST',data,adminToken,ctx)).body.data.duplicate,true);
    await Promise.all(pending);
    assert.equal(sent.length,1);
  } finally { globalThis.fetch=originalFetch;fixtureData.sqlite.close(); }
});
