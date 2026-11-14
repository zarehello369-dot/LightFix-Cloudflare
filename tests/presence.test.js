import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/chat-fixture.js';
const tech='b'.repeat(32),token='2'.repeat(64),tabId=crypto.randomUUID();
test('presence is authenticated, expires and cannot impersonate another user',async()=>{
 const {request,sqlite}=fixture();
 const online=async()=>Number((await request('/api/chat/contacts')).body.data.contacts.find(c=>c.id===tech).online);
 assert.equal(await online(),0);
 assert.equal((await request('/api/chat/presence','POST',{tabId,visible:true},'bad')).status,401);
 await request('/api/chat/presence','POST',{tabId,visible:true,userId:'a'.repeat(32)},token);
 assert.equal(await online(),1);assert.equal(sqlite.prepare('SELECT user_id FROM staff_presence').get().user_id,tech);
 sqlite.prepare('UPDATE staff_presence SET last_seen=?').run(Date.now()-76000);assert.equal(await online(),0);
 await request('/api/chat/presence','POST',{tabId,visible:true},token);assert.equal(await online(),1);
 await request('/api/chat/presence','POST',{tabId,visible:false},token);assert.equal(await online(),0);
});
test('closing one tab does not hide another live tab and logout clears the session presence',async()=>{
 const {request}=fixture(),otherTab=crypto.randomUUID();
 const online=async()=>Number((await request('/api/chat/contacts')).body.data.contacts.find(c=>c.id===tech).online);
 for(const tab of [tabId,otherTab])await request('/api/chat/presence','POST',{tabId:tab,visible:true},token);
 await request('/api/chat/presence','POST',{tabId,visible:false},token);assert.equal(await online(),1);
 await request('/api/auth/logout','POST',{},token);assert.equal(await online(),0);
});
