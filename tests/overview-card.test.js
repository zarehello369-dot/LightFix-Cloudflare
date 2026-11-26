import test from 'node:test';
import assert from 'node:assert/strict';
import { overviewCard } from '../public/overview-card.js';

const report = (id, symptom, status = 0) => ({id, pole:'T0005', status, symptom, at:Date.parse('2026-11-17T13:07:00+07:00'), contactType:'name', contactValue:'ติดตามผ่านลิงก์', hasBefore:false});
const group = reports => ({pole:'T0005', reports, location:'', urgent:true, assignedName:'', assignedId:''});

test('waiting cards let staff view the queue without taking or assigning a job', () => {
  const html=overviewCard(group([report('r1','ไฟติด ๆ ดับ ๆ'),report('r2','เสาหรือโคมชำรุด')]));
  assert.doesNotMatch(html,/data-start-report|data-start-pole|data-assign-pole/);
  assert.match(html,/data-open-pole="T0005">ดูงานของเสานี้/);
  assert.match(html,/เสี่ยงอันตราย: เสาหรือโคมชำรุด/);
});

test('working card retains the job link without receive actions', () => {
  const html=overviewCard(group([report('r3','ไฟไม่ติด',1)]),{active:true});
  assert.doesNotMatch(html,/data-start-report|data-start-pole|data-assign-pole/);
  assert.match(html,/data-open-pole="T0005"/);
});

test('report text is escaped before it enters the card', () => {
  const html=overviewCard(group([report('r4','<img src=x onerror=alert(1)>')]));
  assert.doesNotMatch(html,/<img src=x/);
  assert.match(html,/&lt;img src=x/);
});

test('before photo has an icon and opens a real media route only when present', () => {
  const withPhoto={...report('r5','ไฟไม่ติด'),hasBefore:true};
  const html=overviewCard(group([withPhoto,report('r6','ไฟสว่างน้อย')]));
  assert.match(html,/<a class="overview-photo-link" href="\/media\/r5\/before" target="_blank" rel="noopener"/);
  assert.match(html,/<svg class="ui-icon" width="18" height="18"/);
  assert.match(html,/<\/svg> ดูรูปก่อนซ่อม<\/a>/);
  assert.match(html,/<span class="overview-photo-missing"><svg class="ui-icon"[\s\S]*?<\/svg> ไม่มีรูปก่อนซ่อม<\/span>/);
  assert.doesNotMatch(html,/\/media\/r6\/before/);
});
