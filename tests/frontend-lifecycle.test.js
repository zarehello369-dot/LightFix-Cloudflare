import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {serialTasks,mergeMessages,draftMayClear,uncertainInvite} from '../public/chat-state.js';

const source=name=>readFileSync(new URL(`../public/${name}`,import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<4;i++)await new Promise(resolve=>setImmediate(resolve));};
function element(){return {dataset:{},style:{setProperty(){},removeProperty(){}},classList:{add(){},remove(){}},value:'',innerHTML:'',textContent:'',disabled:false,setAttribute(){},focus(){},addEventListener(type,handler){this[type]=handler;},removeEventListener(){},querySelectorAll(){return [];}};}

test('empty mounted chat renders its empty state and polling disables a deactivated peer',async()=>{
  const nodes=new Map(),get=selector=>{if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);};
  const root=element();root.querySelector=get;get('.chat-log').innerHTML='กำลังโหลดข้อความ…';
  let active=true,poll;
  const contact=()=>({id:'peer',display_name:'ช่าง',username:'tech',role:'technician',active,online:false});
  const context={serialTasks,mergeMessages,draftMayClear,uncertainInvite,profileEditor:()=>({destroy(){}}),avatarMarkup:()=>'',installEmojiPicker(){},esc:String,date:String,messageDay:()=>'',emojiOnly:()=>false,
    api:async path=>path==='/api/chat/contacts'?{contacts:[contact()],profile:{display_name:'ฉัน'}}:{messages:[],updates:[],more:false},post:async()=>{},
    document:{hidden:false,activeElement:null,hasFocus:()=>false,querySelector:()=>null,querySelectorAll:()=>[],body:element(),addEventListener(){},removeEventListener(){}},
    window:{addEventListener(){},removeEventListener(){}},ResizeObserver:class{observe(){}disconnect(){}},setInterval:fn=>{poll=fn;return 1;},clearInterval(){},queueMicrotask,crypto:{randomUUID:()=> 'key'},root};
  runInNewContext(source('chat.js').replace(/^import .*;\r?\n/gm,'').replace('export function mountChat','function mountChat')+'\nglobalThis.stop=mountChat(root,{user:{id:"me",name:"ฉัน"},role:"admin"});',context);
  await flush();
  get('.chat-contacts').click({target:{closest:()=>({dataset:{peer:'peer'},hasAttribute:()=>false})}});
  await flush();
  assert.match(get('.chat-log').innerHTML,/chat-conversation-empty/);
  assert.equal(get('#chat-input').disabled,false);
  active=false;await poll();await flush();
  assert.equal(get('#chat-input').disabled,true);assert.equal(get('.chat-send').disabled,true);assert.equal(get('.chat-emoji-toggle').disabled,true);
  assert.match(get('.chat-compose-meta>span').textContent,/ปิดใช้งาน/);
  context.stop();
});

function reportHarness(post){
  const nodes=new Map(),get=selector=>{if(!nodes.has(selector))nodes.set(selector,element());return nodes.get(selector);};
  const fields={pole:get('#pole'),contactType:get('#contact-type'),contactValue:get('#contact-value')};
  fields.pole.value='T0001';fields.contactType.value='none';
  const radio=element();radio.value='ไฟไม่ติด';
  const button=get('#submit-report'),form=element();form.elements={namedItem:name=>fields[name]};
  form.querySelector=()=>radio;form.querySelectorAll=()=>[...Object.values(fields),radio,button];
  let sequence=0,receipt;
  const context={$:get,control:(f,name)=>f.elements.namedItem(name),getPole:value=>value,post,photoFailed:false,photoPending:false,reportPhoto:'image',reportRequestId:'original-key',reportAttempt:null,
    crypto:{randomUUID:()=>`key-${++sequence}`},location:{origin:'https://example.test'},trackingPath:id=>`/track?id=${id}`,rememberReport:()=>true,history:{replaceState(){}},showReportReceipt:value=>{receipt=value;},Date,Object};
  const code=source('app.js').split('async function submitReport(event) {')[1].split('async function boardPage()')[0];
  runInNewContext('async function submitReport(event) {'+code,context);
  return {submit:()=>context.submitReport({preventDefault(){},currentTarget:form}),fields,radio,button,form,receipt:()=>receipt,context};
}

test('uncertain report retries keep original payload and receipt even after edits and temporary rejection',async()=>{
  const sent=[];let release;
  const h=reportHarness(async(path,payload)=>{sent.push({...payload});if(sent.length===1){await new Promise(resolve=>release=resolve);throw new Error('offline');}if(sent.length===2)throw Object.assign(new Error('slow'),{code:'SLOW_DOWN'});return {id:'report',pole:'T0001'};});
  const first=h.submit();await h.submit();assert.equal(sent.length,1);release();await first;
  assert.equal(h.fields.pole.disabled,true);assert.match(h.button.textContent,/ตรวจผล/);
  h.fields.pole.value='T0002';h.radio.value='อาการใหม่';await h.submit();
  assert.equal(h.fields.pole.disabled,true);await h.submit();
  assert.equal(sent.length,3);assert.deepEqual(sent[1],sent[0]);assert.deepEqual(sent[2],sent[0]);assert.equal(h.receipt().pole,'T0001');
});

test('definitive first report rejection unlocks corrections with a fresh request key',async()=>{
  const sent=[];const h=reportHarness(async(path,payload)=>{sent.push({...payload});if(sent.length===1)throw Object.assign(new Error('invalid'),{code:'CONTACT_INVALID'});return {id:'report',pole:payload.pole};});
  await h.submit();assert.equal(h.fields.pole.disabled,false);h.fields.pole.value='T0002';await h.submit();
  assert.equal(sent[1].pole,'T0002');assert.notEqual(sent[1].requestId,sent[0].requestId);
});

test('task dialogs prevent Escape and back while saving or resetting a password',()=>{
  const target=element(),back=element();let busy,closed=0,prevented=0;
  target.querySelector=selector=>selector==='[data-close]'?back:selector.includes('data-preparing')?null:busy;
  target.showModal=()=>{};target.close=()=>closed++;
  const code=source('staff.js').split('function dialog(html) {')[1].split('async function action(')[0];
  const context={$:()=>target,toast(){}};runInNewContext('function dialog(html) {'+code+'\ndialog("test");',context);
  busy={};target.oncancel({type:'cancel',preventDefault(){prevented++;}});back.click({type:'click',preventDefault(){prevented++;}});
  assert.equal(closed,0);assert.equal(prevented,2);
  busy=null;back.click({type:'click'});assert.equal(closed,1);
});

test('mobile choice buttons follow programmatic values, resets and disabled changes',async()=>{
  const select=element(),form=element();let trigger,observe;
  select.id='status';select.nodeType=1;select.matches=()=>true;select.querySelectorAll=()=>[];select.closest=()=>select;
  select.hasAttribute=()=>false;
  select.form=form;select.value='open';select.after=node=>{trigger=node;};
  Object.defineProperty(select,'selectedOptions',{get:()=>[{textContent:select.value==='open'?'เปิด':'เสร็จ'}]});
  const body=element();body.nodeType=1;body.matches=()=>false;body.append=()=>{};body.querySelectorAll=()=>[select];
  const context={matchMedia:()=>({matches:true,addEventListener(){}}),document:{body,activeElement:null,querySelector:()=>null,createElement:()=>element()},CSS:{escape:value=>value},queueMicrotask,
    MutationObserver:class{constructor(callback){observe=callback;}observe(){}},Event};
  runInNewContext(source('mobile-picker.js').replaceAll('export function','function')+'\ninstallMobilePickers();',context);
  assert.equal(trigger.textContent,'เปิด');
  select.value='done';context.syncMobilePicker(select);assert.equal(trigger.textContent,'เสร็จ');
  form.reset();select.value='open';await flush();assert.equal(trigger.textContent,'เปิด');
  select.disabled=true;observe([{type:'attributes',target:select}]);assert.equal(trigger.disabled,true);
});
