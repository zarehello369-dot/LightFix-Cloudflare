import test from 'node:test';
import assert from 'node:assert/strict';
import { groupReports, queueReports, readFilters } from '../public/workflow.js';

test('pole grouping keeps duplicate complaints together and orders hazardous poles first',()=>{
  const data={reports:[{id:'1',pole:'T0001',status:0,symptom:'ไฟไม่ติด',at:1},{id:'2',pole:'T0001',status:0,symptom:'ไฟสว่างน้อย',at:2},{id:'3',pole:'T0002',status:1,symptom:'สายไฟหลุดหรือห้อยต่ำ',at:3}],poles:[{pole:'T0001',location:'หน้าตลาด'}]};
  const rows=queueReports(data,'open','ไฟสว่างน้อย');
  assert.equal(rows.length,2);
  assert.equal(groupReports(data.reports)[0].pole,'T0002');
  const groups=groupReports(rows,[],[],data.poles);
  assert.equal(groups.length,1);assert.equal(groups[0].reports.length,2);assert.equal(groups[0].location,'หน้าตลาด');
});
test('filter preferences validate persisted data and tolerate blocked storage',()=>{
  const storage={getItem:key=>key==='tech' ? '{"reportStatus":"1","reportQuery":"T0001"}' : '{"reportStatus":"bad"}'};
  assert.equal(readFilters(storage,'tech').reportQuery,'T0001');
  assert.equal(readFilters(storage,'admin').reportStatus,'open');
  assert.equal(readFilters({getItem:()=>{throw new Error('blocked')}},'tech').reportQuery,'');
});
