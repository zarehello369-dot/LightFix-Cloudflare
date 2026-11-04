import test from 'node:test';
import assert from 'node:assert/strict';
import { createLatestRequest } from '../public/requests.js';

const deferred = () => { let resolve,reject; const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject}; };

test('slow earlier search cannot overwrite a newer result or show a stale error', async () => {
  const request=createLatestRequest(),old=deferred(),current=deferred(),shown=[],errors=[];
  const first=request.run(()=>old.promise,value=>shown.push(value),error=>errors.push(error));
  const second=request.run(()=>current.promise,value=>shown.push(value),error=>errors.push(error));
  current.resolve('T0002');await second;old.resolve('T0001');await first;
  assert.deepEqual(shown,['T0002']);
  const stale=deferred();
  const third=request.run(()=>stale.promise,value=>shown.push(value),error=>errors.push(error));
  await request.run(async()=>'T0003',value=>shown.push(value),error=>errors.push(error));
  stale.reject(new Error('old connection'));await third;
  assert.deepEqual(shown,['T0002','T0003']);assert.deepEqual(errors,[]);
});

test('invalid input cancels ownership of a pending tracking result', async () => {
  const request=createLatestRequest(),pending=deferred();let renders=0;
  const task=request.run(()=>pending.promise,()=>renders++,()=>renders++);
  request.invalidate();pending.resolve('old report');await task;
  assert.equal(renders,0);
});

test('latest errors stay visible and independent pages do not cancel one another', async () => {
  const board=createLatestRequest(),track=createLatestRequest(),pending=deferred(),shown=[];
  const task=board.run(()=>pending.promise,value=>shown.push(value),()=>{});
  const error=new Error('network');let received;
  await track.run(async()=>{throw error;},()=>{},value=>{received=value;});
  pending.resolve('board');await task;
  assert.equal(received,error);assert.deepEqual(shown,['board']);
});
