import test from 'node:test';
import assert from 'node:assert/strict';
import {serialTasks,mergeMessages,draftMayClear,uncertainInvite} from '../public/chat-state.js';

test('a slow history read serializes the next peer refresh and failure does not strand the queue',async()=>{
  const enqueue=serialTasks(),events=[];let finish;
  const older=enqueue(async()=>{events.push('older starts');await new Promise(resolve=>finish=resolve);events.push('older ends');throw new Error('offline');});
  const nextPeer=enqueue(()=>events.push('next peer loaded'));
  await Promise.resolve();assert.deepEqual(events,['older starts']);
  finish();await assert.rejects(older,/offline/);await nextPeer;
  assert.deepEqual(events,['older starts','older ends','next peer loaded']);
});
test('overlapping history pages and message status updates preserve one ordered copy',()=>{
 const merged=mergeMessages([{id:2,body:'เดิม'},{id:3,read_at:null}],[{id:1},{id:2,body:'เดิม'},{id:3,read_at:123},{id:4}]);
 assert.deepEqual(merged.map(row=>row.id),[1,2,3,4]);assert.equal(merged[2].read_at,123);
});
test('send acknowledgement only clears the exact unchanged draft revision',()=>{
 const sent={version:2,value:'ข้อความแรก'};
 assert.equal(draftMayClear({version:2,value:'ข้อความแรก'},sent),true);
 assert.equal(draftMayClear({version:3,value:'ข้อความที่เขียนเพิ่มระหว่างส่ง'},sent),false);
 assert.equal(draftMayClear({version:4,value:'ข้อความแรก'},sent),false);
});
test('post-commit internal errors retain the invitation key and immutable payload',()=>{
 assert.equal(uncertainInvite(new Error('offline')),true);
 assert.equal(uncertainInvite({code:'INTERNAL'}),true);
 assert.equal(uncertainInvite({code:'UNKNOWN_SERVER_FAILURE'}),true);
 assert.equal(uncertainInvite({code:'WORK_CHANGED'}),false);
 assert.equal(uncertainInvite({code:'REQUEST_REUSED'}),false);
});
