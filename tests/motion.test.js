import test from 'node:test';
import assert from 'node:assert/strict';
import { reveal } from '../public/motion.js';

test('motion respects reduced preference and cancels interrupted feedback', () => {
  const previous=globalThis.matchMedia;
  let reduce=false,canceled=0;
  globalThis.matchMedia=()=>({matches:reduce});
  const calls=[];
  const element={animate:(frames,options)=>{calls.push({frames,options});return {cancel:()=>canceled++,finished:new Promise(()=>{})};}};
  try {
    reveal(element);
    assert.equal(calls.length,1);
    assert.deepEqual(calls[0].frames,[{opacity:.7},{opacity:1}]);
    assert.equal(calls[0].options.duration,180);
    reduce=true;reveal(element);
    assert.equal(canceled,1);
    assert.equal(calls.length,1);
    assert.doesNotThrow(()=>reveal({}));
  } finally { if(previous)globalThis.matchMedia=previous;else delete globalThis.matchMedia; }
});
