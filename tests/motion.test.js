import test from 'node:test';
import assert from 'node:assert/strict';
import { reveal, settle } from '../public/motion.js';

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

test('fast repeated tab feedback cancels prior motion and reduced mode never moves content', () => {
  const previous = globalThis.matchMedia;
  let reduce = false, canceled = 0, count = 0;
  globalThis.matchMedia = () => ({ matches:reduce });
  const element = { animate() { count++; return { cancel() { canceled++; }, finished:new Promise(()=>{}) }; } };
  try {
    settle(element); settle(element);
    assert.equal(count, 2); assert.equal(canceled, 1);
    reduce = true; settle(element);
    assert.equal(count, 2); assert.equal(canceled, 2);
    assert.doesNotThrow(() => settle(null));
    assert.doesNotThrow(() => settle({}));
  } finally { if (previous) globalThis.matchMedia=previous; else delete globalThis.matchMedia; }
});

test('scroll entrances never hide default content, run once, and stop when preference changes', async () => {
  const names = ['document','MutationObserver','IntersectionObserver','matchMedia','innerHeight'];
  const old = Object.fromEntries(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis,name)]));
  let enter, mediaChange, canceled = 0, animationCount = 0;
  const element = { hidden:false, closest:()=>null, getBoundingClientRect:()=>({top:1000,width:300,height:200}),
    animate() { animationCount++; return { cancel() { canceled++; }, finished:new Promise(()=>{}) }; } };
  const visible = { ...element, getBoundingClientRect:()=>({top:20,width:300,height:200}) };
  const body = { nodeType:1, matches:()=>false, querySelectorAll:()=>[visible,element] };
  const changes = { document:{body,hidden:false,addEventListener(){},documentElement:{toggleAttribute(){}}}, innerHeight:800,
    MutationObserver:class { observe(){} }, IntersectionObserver:class { constructor(fn){enter=fn;} observe(){} unobserve(){} },
    matchMedia:()=>({matches:false,addEventListener(_,fn){mediaChange=fn;}}) };
  try {
    Object.assign(globalThis,changes);
    const module = await import('../public/motion.js?scroll-test');
    module.installMotion();
    assert.equal(animationCount,0);
    assert.equal(element.hidden,false);
    enter([{target:element,isIntersecting:true}]);
    enter([{target:element,isIntersecting:true}]);
    assert.equal(animationCount,1);
    mediaChange({matches:true});
    assert.equal(canceled,1);
  } finally { for(const name of names) { if(old[name])Object.defineProperty(globalThis,name,old[name]);else delete globalThis[name]; } }
});
