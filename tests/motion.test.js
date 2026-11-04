import test from 'node:test';
import assert from 'node:assert/strict';
import { reveal, revealRecords } from '../public/motion.js';

test('motion respects reduced preference and cancels interrupted feedback', () => {
  const previous=globalThis.matchMedia;
  let reduce=false,canceled=0;
  globalThis.matchMedia=()=>({matches:reduce});
  const calls=[];
  const element={animate:(frames,options)=>{calls.push({frames,options});return {cancel:()=>canceled++,finished:new Promise(()=>{})};}};
  try {
    reveal(element,'sheet');
    assert.equal(calls.length,1);
    assert.match(calls[0].frames[0].transform,/12px/);
    reduce=true;reveal(element,'sheet');
    assert.equal(canceled,1);
    assert.equal(calls.length,1);
    assert.doesNotThrow(()=>reveal({}));
  } finally { if(previous)globalThis.matchMedia=previous;else delete globalThis.matchMedia; }
});

test('a thousand records have a bounded animation budget and remain visible by default', () => {
  const calls=[];
  const cards=Array.from({length:1000},()=>({animate:(frames,options)=>{calls.push({frames,options});return {cancel(){},finished:Promise.resolve()};}}));
  revealRecords({querySelectorAll:()=>cards});
  assert.equal(calls.length,6);
  assert.ok(calls.every(call=>call.options.delay<=120));
  assert.ok(calls.every(call=>call.options.fill==='backwards'));
  assert.ok(calls.every(call=>call.frames.every(frame=>frame.opacity>0)));
});
