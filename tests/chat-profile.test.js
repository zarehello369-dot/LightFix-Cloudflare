import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './helpers/chat-fixture.js';
const tech='b'.repeat(32),techToken='2'.repeat(64);
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1cAAAAASUVORK5CYII=';
test('profile changes cannot rename accounts, alter roles or modify another user',async()=>{
 const {request,sqlite}=fixture();
 assert.equal((await request('/api/chat/profile','GET',undefined,'bad')).status,401);
 const updated=await request('/api/chat/profile','POST',{displayName:'ชื่อที่ห้ามเปลี่ยน',userId:'a'.repeat(32),role:'admin',username:'newuser'},techToken);
 assert.equal(updated.status,200);assert.equal(updated.body.data.display_name,'ช่าง');
 const record=sqlite.prepare('SELECT display_name,role,username FROM users WHERE id=?').get(tech);
 assert.equal(record.display_name,'ช่าง');assert.equal(record.role,'technician');assert.equal(record.username,'technician');
 assert.equal(sqlite.prepare('SELECT display_name FROM users WHERE id=?').get('a'.repeat(32)).display_name,'ผู้ดูแล');
});
test('avatars remain authenticated, persist during name edits and can be removed',async()=>{
 const {request}=fixture();
 const saved=await request('/api/chat/profile','POST',{displayName:'ช่างใหม่',photo:png},techToken);
 assert.equal(saved.status,200);const url=saved.body.data.avatar_url;
 const image=await request(url);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.equal(image.headers.get('cache-control'),'private, no-store');assert.ok(image.body.length>20);
 assert.equal((await request(url,'GET',undefined,'bad')).status,401);
 await request('/api/chat/profile','POST',{displayName:'เปลี่ยนชื่ออีกครั้ง'},techToken);
 const contacts=await request('/api/chat/contacts');const contact=contacts.body.data.contacts.find(c=>c.id===tech);assert.ok(contact.avatar_url);assert.equal(contact.display_name,'ช่าง');
 await request('/api/chat/profile','POST',{displayName:'ช่างใหม่',removePhoto:true},techToken);
 assert.equal((await request(url)).status,404);
 assert.equal((await request('/api/chat/profile','GET',undefined,techToken)).body.data.avatar_url,null);
});
test('profile rejects oversized images and executable image types',async()=>{
 const {request}=fixture();
 assert.equal((await request('/api/chat/profile','POST',{displayName:'ช่าง',photo:'data:image/svg+xml;base64,PHN2Zz4='},techToken)).status,400);
 const bytes=Buffer.alloc(100001);Buffer.from([0x89,0x50,0x4e,0x47]).copy(bytes);
 assert.equal((await request('/api/chat/profile','POST',{displayName:'ช่าง',photo:'data:image/png;base64,'+bytes.toString('base64')},techToken)).status,413);
});
test('avatar delivery preserves bytes when a database adapter returns numeric arrays',async()=>{
 const {request,DB}=fixture();await request('/api/chat/profile','POST',{photo:png},techToken);
 const prepare=DB.prepare.bind(DB);DB.prepare=sql=>{const statement=prepare(sql),first=statement.first;if(sql==='SELECT avatar,avatar_type FROM staff_profiles WHERE user_id=?')statement.first=async()=>{const row=await first();return row?{...row,avatar:[...row.avatar]}:row;};return statement;};
 const image=await request(`/api/chat/avatars/${tech}`);assert.deepEqual([...image.body.slice(0,4)],[0x89,0x50,0x4e,0x47]);
});
test('emoji-only and mixed Thai messages round-trip without losing their characters',async()=>{
 const {request}=fixture();
 for(const body of ['🙏👍💡','เรียบร้อยแล้วครับ ✅👨‍🔧'])assert.equal((await request(`/api/chat/${tech}`,'POST',{requestKey:crypto.randomUUID(),body})).body.data.body,body);
 const received=await request(`/api/chat/${'a'.repeat(32)}`,'GET',undefined,techToken);
 assert.deepEqual(received.body.data.messages.map(m=>m.body),['🙏👍💡','เรียบร้อยแล้วครับ ✅👨‍🔧']);
});
