import test from 'node:test';
import assert from 'node:assert/strict';
import {submitStaffForm, readWorkDraft, saveWorkDraft, selectPoleReports} from '../public/staff-forms.js';
import {groupReports} from '../public/workflow.js';

test('async save errors receive the original form after the browser clears currentTarget',async()=>{
  const button={textContent:'บันทึก',disabled:false}, form={dataset:{},querySelector:()=>button}, event={currentTarget:form,preventDefault(){}};
  let received;
  const pending=submitStaffForm(event,async()=>{await Promise.resolve();throw Object.assign(new Error('Changed'),{code:'WORK_CHANGED'});},(target,error)=>{received={target,error};});
  event.currentTarget=null;
  await pending;
  assert.equal(received.target,form);assert.equal(received.error.code,'WORK_CHANGED');assert.equal(button.disabled,false);assert.equal(button.textContent,'บันทึก');
});
test('repeated submissions are blocked while saving and success does not trigger error recovery',async()=>{
  const button={textContent:'บันทึก'},form={dataset:{},querySelector:()=>button},event={currentTarget:form,preventDefault(){}};
  let release,calls=0,errors=0;
  const pending=submitStaffForm(event,()=>{calls++;return new Promise(resolve=>{release=resolve;});},()=>{errors++;});
  await submitStaffForm(event,()=>{calls++;},()=>{errors++;});release();await pending;
  assert.equal(calls,1);assert.equal(errors,0);
});
test('drafts recover after reload, expire and tolerate blocked storage without persisting photos',()=>{
  const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
  assert.equal(saveWorkDraft(storage,'tech:1:job',{note:'ร่างซ่อม',cause:'สายไฟ'},true,1000),true);
  assert.equal(readWorkDraft(storage,'tech:1:job',2000).fields.note,'ร่างซ่อม');
  assert.equal(readWorkDraft(storage,'other-user',2000),null);
  assert.equal(readWorkDraft(storage,'tech:1:job',1000+86400001),null);
  assert.equal(readWorkDraft({getItem:()=>'{broken'},'key'),null);
  assert.equal(saveWorkDraft({setItem(){throw Error('blocked');}},'key',{},false),false);
  assert.deepEqual(Object.keys(JSON.parse(values.get('tech:1:job'))).sort(),['fields','hasPhoto','updatedAt']);
});
test('a pole action targets every open complaint on that pole and never another pole or closed history',()=>{
  const rows=[{id:'1',pole:'T0001',status:0},{id:'2',pole:'T0001',status:0},{id:'3',pole:'T0002',status:0},{id:'4',pole:'T0001',status:2}];
  assert.deepEqual(selectPoleReports(rows,'T0001'),['1','2']);
});
test('completed complaints do not acquire actions for a newer active repair on the same pole',()=>{
  const groups=groupReports([{id:'old',pole:'T0001',status:2,at:1,symptom:'ไฟไม่ติด'}],[{id:'new',pole:'T0001',status:1}]);
  assert.equal(groups[0].job,undefined);assert.equal(groups[0].open.length,0);
});
