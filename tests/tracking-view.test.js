import test from 'node:test';
import assert from 'node:assert/strict';
import {repairProgressMarkup} from '../public/repair-progress.js';
import {trackingDetailMarkup} from '../public/tracking-view.js';
import {reportReceiptMarkup} from '../public/report-receipt.js';
const at=Date.UTC(2026,10,12,6,15),id='2'.repeat(32);
const base={pole:'T0005',status:0,at,symptom:'ไฟไม่ติด',startedAt:null,doneAt:null};
test('receipt and tracking share dated progress without inventing future repair dates',()=>{
 const timeline=repairProgressMarkup(base,'test-progress');
 assert.equal((timeline.match(/<time /g)||[]).length,1);
 assert.equal((timeline.match(/รอดำเนินการ/g)||[]).length,2);
 assert.equal((timeline.match(/class="is-complete"/g)||[]).length,1);
 const receipt=reportReceiptMarkup({id,pole:base.pole,url:'https://example.test/track?id='+id,saved:true,sentAt:at});
 assert.ok(receipt.includes(repairProgressMarkup(base,'receipt-steps-title')));
 assert.ok(trackingDetailMarkup(base,id).includes(repairProgressMarkup(base,'tracking-progress-title')));
});
test('working, completed and canceled progress distinguish timestamps and current stage',()=>{
 const doing=repairProgressMarkup({...base,status:1,startedAt:at+60000},'doing');
 assert.equal((doing.match(/<time /g)||[]).length,2);
 const done=repairProgressMarkup({...base,status:2,startedAt:at+60000,doneAt:at+120000},'done');
 assert.equal((done.match(/<time /g)||[]).length,3);
 assert.equal((done.match(/aria-current="step"/g)||[]).length,1);
 const canceled=repairProgressMarkup({...base,status:3},'canceled');
 assert.ok(canceled.includes('เรื่องแจ้งนี้ถูกยกเลิก'));
 assert.equal(canceled.includes('aria-current="step"'),false);
 assert.equal((canceled.match(/class="is-complete"/g)||[]).length,1);
});
test('tracking escapes public notes and preserves independent before and after media availability',()=>{
 const html=trackingDetailMarkup({...base,hasBefore:true,hasAfter:false,note:'<script>bad()</script>',cause:'<img src=x>'},id);
 assert.equal(html.includes('<script>'),false);
 assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
 assert.ok(html.includes('/media/'+id+'/before'));
 assert.equal(html.includes('/media/'+id+'/after'),false);
 assert.ok(html.includes('ยังไม่มีรูปหลังซ่อม'));
 assert.ok(html.includes('target="_blank" rel="noopener"'));
});

test('copy-reference writes only the reference, while unsupported sharing copies the full tracking URL',async t=>{
 const {wireTrackingDetail}=await import('../public/tracking-view.js');
 const listeners={},writes=[];
 const descriptors=Object.fromEntries(['navigator','location','document'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const toast={textContent:'',classList:{add(){},remove(){}}};
 t.mock.timers.enable({apis:['setTimeout']});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{async writeText(value){writes.push(value);}}}});
 Object.defineProperty(globalThis,'location',{configurable:true,value:{origin:'https://example.test'}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{querySelector(){return toast;}}});
 try{
  wireTrackingDetail({querySelector(selector){return{addEventListener(event,fn){listeners[selector]=fn;}};},querySelectorAll(){return[];}},base,id);
  await listeners['#tracking-copy-reference']();
  await listeners['#tracking-share']();
  assert.deepEqual(writes,[id,'https://example.test/track?id='+id]);
 }finally{for(const [key,descriptor]of Object.entries(descriptors)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
