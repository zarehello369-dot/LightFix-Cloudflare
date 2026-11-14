import {messageDay,emojiOnly} from './chat-presentation.js';
import {profileEditor,avatarMarkup} from './chat-profile.js';
import {installEmojiPicker} from './chat-emoji.js';
import {api,post,esc,date} from './shared.js';
import {serialTasks,mergeMessages,draftMayClear,uncertainInvite} from './chat-state.js';

const icon=(name)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{checks:'<path d="m2 12 4 4L16 6m-5 10 3 3L24 9"/>',back:'<path d="m14 6-6 6 6 6"/>',smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 9h.01M16 9h.01"/>',send:'<path d="m3 3 18 9-18 9 4-9-4-9Zm4 9h14"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',work:'<rect x="3" y="7" width="18" height="14" rx="3"/><path d="M8 7V3h8v4M3 12h18M10 12v3h4v-3"/>',chat:'<path d="M21 11a9 9 0 0 1-9 9H4l-3 2 2-6a9 9 0 1 1 18-5Z"/>'}[name]}</svg>`;
const roleName=role=>role==='admin'?'เจ้าหน้าที่':'ช่างไฟฟ้า';
const presenceMarkup=online=>`<span class="chat-presence ${online?'is-online':'is-offline'}"><i aria-hidden="true"></i>${online?'ออนไลน์':'ออฟไลน์'}</span>`;
const offerLabel={pending:'รอช่างตอบรับ',accepted:'รับงานแล้ว',declined:'ปฏิเสธงานแล้ว',expired:'คำเชิญหมดอายุ'};

export function mountChat(root,{user,role,notifications=[]}) {
  let disposed=false,peer=null,contacts=[],rows=[],more=false,busy=false,system=false,query='',timer,readThrough=0,generation=0,contactSignature='';
  const drafts=new Map(), pending=new Map(), draftVersions=new Map(), invitePending=new Map(), enqueue=serialTasks();
  let refreshPromise,readBusy=false,offerGeneration=0,myProfile={display_name:user.name};
  const version=id=>draftVersions.get(id)||0;
  const alignThread=()=>root.style.setProperty('--chat-header-bottom',`${Math.max(0,document.querySelector('.site-header')?.getBoundingClientRect().bottom||64,document.querySelector('.site-header>.shell')?.getBoundingClientRect().bottom||0)}px`);
  root.innerHTML=`<div class="chat-title"><h1>ข้อความ</h1><span class="muted">พูดคุยและประสานงานในทีม</span></div>
  <div class="chat-layout"><section class="chat-people" aria-label="รายชื่อคู่สนทนา"><div class="chat-people-head"><div class="chat-people-title"><h2>แชทในทีม</h2><button type="button" class="button ghost small chat-own-profile" aria-label="แก้ไขโปรไฟล์ของฉัน">โปรไฟล์</button></div><p class="chat-presence-note">สถานะเมื่อเปิดพื้นที่ทำงาน</p><label class="chat-search">${icon('search')}<input type="search" placeholder="ค้นหาชื่อในทีม" aria-label="ค้นหาคู่สนทนา"></label></div><div class="chat-contacts"></div></section>
  <section class="chat-thread" aria-label="บทสนทนา"><div class="chat-placeholder">${icon('chat')}<h2>เริ่มคุยกับทีม</h2><p>เลือกชื่อเจ้าหน้าที่หรือช่างไฟฟ้า<br>เพื่อส่งข้อความและประสานงาน</p></div></section></div><p class="chat-global-error" role="status"></p>`;
  const syncChrome=()=>{
    document.body.style.setProperty('--staff-chat-header-height',`${document.querySelector('.site-header')?.getBoundingClientRect().height||96}px`);alignThread();
  };
  const chromeObserver=new ResizeObserver(syncChrome);const siteHeader=document.querySelector('.site-header');if(siteHeader){chromeObserver.observe(siteHeader);const inner=siteHeader.querySelector('.shell');if(inner)chromeObserver.observe(inner);siteHeader.addEventListener('transitionend',syncChrome);}syncChrome();window.addEventListener('resize',syncChrome);window.addEventListener('scroll',syncChrome,{passive:true});
  const $=s=>root.querySelector(s), error=message=>{if(!disposed) $('.chat-global-error').textContent=message;};
  const editor=profileEditor(root,saved=>{myProfile=saved;user.name=saved.display_name;document.querySelectorAll('.staff-identity h2 span').forEach(e=>e.textContent=saved.display_name);updateOwnAvatar();refresh();});
  const openProfile=()=>editor.open().catch(e=>error(e.message));
  $('.chat-own-profile').onclick=openProfile;
  function updateOwnAvatar(){root.querySelectorAll('.chat-self-avatar').forEach(e=>e.innerHTML=avatarMarkup(myProfile));}
  const alive=(id,stamp=generation)=>!disposed && peer?.id===id && !system && stamp===generation;
  function renderContacts(){
    const signature=JSON.stringify([contacts,peer?.id,system,query,notifications.map(n=>n.read_at)]);
    if(signature===contactSignature)return;contactSignature=signature;
    const focused=document.activeElement?.closest('[data-peer]')?.dataset.peer;
    const filtered=contacts.filter(c=>(c.display_name+' '+c.username).toLowerCase().includes(query.toLowerCase()));
    $('.chat-contacts').innerHTML=`<button class="chat-contact chat-system ${system?'is-selected':''}" data-system><span class="chat-avatar">${icon('work')}</span><span class="chat-person"><strong>แจ้งเตือนงาน</strong><small>ข้อความและการมอบหมายเดิม</small></span>${notifications.some(n=>!n.read_at)?'<span class="chat-unread">ใหม่</span>':''}</button>${filtered.map(c=>`<button class="chat-contact ${peer?.id===c.id&&!system?'is-selected':''}" data-peer="${esc(c.id)}" ${peer?.id===c.id&&!system?'aria-current="true"':''}><span class="chat-avatar-wrap"><span class="chat-avatar">${avatarMarkup(c)}</span><i class="chat-avatar-status ${c.online?'is-online':'is-offline'}" aria-hidden="true"></i></span><span class="chat-person"><strong>${esc(c.display_name)}</strong><small>${esc(c.preview||roleName(c.role))}</small><span class="chat-contact-detail"><span class="chat-role">${roleName(c.role)}${c.active?'':' · ปิดใช้งาน'}</span>${presenceMarkup(c.online)}</span></span>${c.unread?`<span class="chat-unread">${c.unread>99?'99+':c.unread}</span>`:''}</button>`).join('')}${!filtered.length?'<p class="chat-no-contacts muted">ไม่พบรายชื่อที่ค้นหา</p>':''}`;
    if(focused)$(`[data-peer="${focused}"]`)?.focus({preventScroll:true});
  }
  function saveDraft(){if(peer&&!system){const input=$('.chat-compose textarea');if(input)drafts.set(peer.id,input.value);}}
  function syncPeerControls(){
    if(!peer||system)return;
    const input=$('#chat-input'),send=$('.chat-send'),emoji=$('.chat-emoji-toggle'),offer=$('.chat-offer-toggle');
    if(input)input.disabled=!peer.active;
    if(send)send.disabled=busy||!peer.active;
    if(emoji)emoji.disabled=!peer.active;
    if(offer)offer.disabled=!peer.active||!!$('.chat-offer-slot [data-close-offer]')?.disabled;
    const note=$('.chat-compose-meta>span');
    if(note)note.textContent=peer.active?'ข้อความส่วนตัวระหว่างคุณกับคู่สนทนา':'ส่งข้อความไม่ได้ เนื่องจากบัญชีนี้ปิดใช้งาน';
  }
  function back(){saveDraft();generation++;peer=null;system=false;$('.chat-layout').classList.remove('is-thread');renderContacts();$('.chat-search input').focus();}
  function header(name,sub,avatarUrl){return `<header class="chat-thread-head"><button class="button ghost chat-back" aria-label="กลับรายชื่อแชท">${icon('back')}</button><span class="chat-avatar-wrap"><span class="chat-avatar chat-peer-avatar">${avatarMarkup({display_name:name,avatar_url:avatarUrl})}</span><i class="chat-avatar-status ${peer?.online?'is-online':'is-offline'}" aria-hidden="true"></i></span><div class="chat-peer-name"><h2>${esc(name)}</h2><p>${esc(sub)}</p></div><button class="chat-profile-shortcut chat-self-avatar chat-avatar" type="button" aria-label="แก้ไขโปรไฟล์ของฉัน">${avatarMarkup(myProfile)}</button></header>`;}
  async function openPeer(contact){
    saveDraft();generation++;peer=contact;system=false;rows=[];more=false;readThrough=0;
    alignThread();$('.chat-layout').classList.add('is-thread');renderContacts();
    $('.chat-thread').innerHTML=`${header(contact.display_name,roleName(contact.role)+(contact.active?(contact.online?' · ออนไลน์':' · ออฟไลน์'):' · บัญชีปิดใช้งาน'),contact.avatar_url)}<div class="chat-log" tabindex="0" aria-label="ประวัติข้อความ"><p class="loading">กำลังโหลดข้อความ…</p></div>
      <div class="chat-offer-slot"></div><div class="chat-emoji-panel" id="chat-emoji-panel" hidden></div><form class="chat-compose"><button class="button ghost chat-emoji-toggle" type="button" aria-label="เลือกอีโมจิ" aria-controls="chat-emoji-panel" aria-expanded="false" ${contact.active?'':'disabled'}>${icon('smile')}</button><label class="visually-hidden" for="chat-input">ข้อความถึง ${esc(contact.display_name)}</label><textarea id="chat-input" rows="1" maxlength="2000" placeholder="พิมพ์ข้อความ…" ${contact.active?'':'disabled'}></textarea><button class="button primary chat-send" aria-label="ส่งข้อความ" ${contact.active?'':'disabled'}>${icon('send')}</button></form><div class="chat-compose-meta"><span>${contact.active?'ข้อความส่วนตัวระหว่างคุณกับคู่สนทนา':'ส่งข้อความไม่ได้ เนื่องจากบัญชีนี้ปิดใช้งาน'}</span>${role==='admin'&&contact.role==='technician'&&contact.active?`<button class="chat-offer-toggle" type="button">${icon('work')} ส่งคำเชิญงาน</button>`:''}</div><p class="chat-error" role="status"></p>`;
    $('.chat-back').onclick=back;
    $('.chat-profile-shortcut').onclick=openProfile;
    const input=$('#chat-input');input.value=drafts.get(contact.id)||'';
    input.oninput=()=>{drafts.set(contact.id,input.value);draftVersions.set(contact.id,version(contact.id)+1);resizeInput();};
    const resizeInput=()=>{input.style.height='auto';input.style.height=Math.min(input.scrollHeight,120)+'px';};resizeInput();
    $('.chat-compose').onsubmit=send;
    installEmojiPicker($('.chat-thread'));
    $('.chat-send').disabled=busy||!contact.active;
    $('.chat-log').addEventListener('scroll',()=>{markVisible().catch(e=>error(e.message));},{passive:true});
    $('.chat-offer-toggle')?.addEventListener('click',offerForm);
    await refresh();
  }
  function renderMessages(stick=false,prepend=false){
    const log=$('.chat-log');if(!log)return;
    const oldHeight=log.scrollHeight, oldTop=log.scrollTop;let lastDay='';
    log.innerHTML=`${more?'<button class="button outline small chat-older">โหลดข้อความก่อนหน้า</button>':''}${rows.length?rows.map(m=>{
      const mine=m.sender_id===user.id;
      const day=messageDay(m.created_at),dayBreak=day!==lastDay?`<div class="chat-day"><time>${esc(day)}</time></div>`:'';lastDay=day;
      return `${dayBreak}<article class="chat-message ${mine?'is-mine':''} ${m.kind==='text'&&emojiOnly(m.body)?'is-emoji':''}"><div class="chat-bubble">${m.kind==='offer'?`<div class="chat-offer-label">${icon('work')} คำเชิญรับงาน · ${esc(m.pole)}</div>`:''}<p>${esc(m.body)}</p>${m.kind==='offer'?`<div class="chat-offer-state ${m.offer_status}">${offerLabel[m.offer_status]}</div>${m.offer_status==='pending'&&!mine?`<div class="chat-offer-actions"><button class="button primary small" data-respond="${m.id}" data-decision="accepted">รับงานนี้</button><button class="button outline small" data-respond="${m.id}" data-decision="declined">ปฏิเสธ</button></div>`:''}${m.offer_status==='accepted'&&!mine?'<p class="small">งานนี้อยู่ใน “งานของฉัน” แล้ว</p>':''}`:''}</div><div class="chat-message-meta"><time>${date(m.created_at)}</time>${mine?`<span>${m.read_at?'อ่านแล้ว '+icon('checks'):'ส่งแล้ว'}</span>`:''}</div></article>`;
    }).join(''):'<div class="chat-conversation-empty"><h3>เริ่มบทสนทนา</h3><p>ทักทายหรือสอบถามเรื่องงานได้เลย</p></div>'}`;
    log.scrollTop=stick?log.scrollHeight:Math.max(0,oldTop+(prepend?log.scrollHeight-oldHeight:0));
    $('.chat-older')?.addEventListener('click',loadOlder);
    root.querySelectorAll('[data-respond]').forEach(b=>b.onclick=()=>respond(b));
  }
  async function markVisible(){
    const target=peer?.id,stamp=generation,log=$('.chat-log');
    if(!target||!log||readBusy||document.hidden||!document.hasFocus()||log.scrollHeight-log.scrollTop-log.clientHeight>40)return;
    const incoming=rows.filter(m=>m.recipient_id===user.id).at(-1)?.id||0;
    if(incoming<=readThrough)return;readBusy=true;
    try{await post(`/api/chat/${target}/read`,{through:incoming});if(!alive(target,stamp))return;readThrough=incoming;const c=contacts.find(c=>c.id===target);if(c)c.unread=0;renderContacts();}
    finally{readBusy=false;}
  }
  function refresh(){
    if(disposed||document.hidden)return Promise.resolve();
    const stamp=generation;
    if(refreshPromise?.stamp===stamp)return refreshPromise.task;
    const task=enqueue(async()=>{
      if(disposed||stamp!==generation||document.hidden)return;
      const target=peer?.id;
      try{
        const result=await api('/api/chat/contacts');if(disposed||stamp!==generation)return;contacts=result.contacts;myProfile=result.profile||myProfile;updateOwnAvatar();
        if(peer&&!system){const current=contacts.find(c=>c.id===peer.id);if(current){peer=current;$('.chat-peer-name h2').textContent=current.display_name;$('.chat-peer-name p').textContent=roleName(current.role)+(current.active?(current.online?' · ออนไลน์':' · ออฟไลน์'):' · บัญชีปิดใช้งาน');$('.chat-peer-avatar').innerHTML=avatarMarkup(current);$('.chat-thread-head .chat-avatar-status').className=`chat-avatar-status ${current.online?'is-online':'is-offline'}`;}}
        syncPeerControls();
        if(target&&alive(target,stamp)){
          const after=rows.at(-1)?.id;
          const result=await api(`/api/chat/${target}${after?`?after=${after}`:''}`);if(!alive(target,stamp))return;
          const log=$('.chat-log'),stick=!rows.length||log.scrollHeight-log.scrollTop-log.clientHeight<40;
          const next=mergeMessages(rows,[...(result.updates||[]),...result.messages]);
          if(!after)more=result.more;
          if(!after||JSON.stringify(next)!==JSON.stringify(rows)){rows=next;renderMessages(stick);}
          await markVisible();
          // Incremental pages never skip a burst of messages received while offline.
          if(result.newMore)queueMicrotask(()=>{if(alive(target,stamp)){refreshPromise=null;refresh();}});
        }
        renderContacts();error('');
      }catch(e){if(!disposed&&stamp===generation)error(e.message+' · จะเชื่อมต่อใหม่อัตโนมัติ');}
    });
    refreshPromise={stamp,task};task.finally(()=>{if(refreshPromise?.task===task)refreshPromise=null;});return task;
  }
  function loadOlder(){
    if(!peer||!rows.length)return;const target=peer.id,stamp=generation,button=$('.chat-older');button.disabled=true;
    return enqueue(async()=>{
      if(!alive(target,stamp))return;
      try{const result=await api(`/api/chat/${target}?before=${rows[0].id}`);if(!alive(target,stamp))return;rows=mergeMessages(rows,result.messages);more=result.more;renderMessages(false,true);}
      catch(e){if(alive(target,stamp)){error(e.message);button.disabled=false;}}
    });
  }
  async function send(event){
    event.preventDefault();if(busy||!peer)return;
    const target=peer.id,stamp=generation,input=$('#chat-input'),raw=input.value,text=raw.trim();if(!text)return;
    drafts.set(target,raw);const sent={version:version(target),value:raw};
    const previous=pending.get(target),requestKey=previous?.body===text?previous.key:crypto.randomUUID();pending.set(target,{body:text,key:requestKey});
    busy=true;const button=$('.chat-send');button.disabled=true;$('.chat-error').textContent='กำลังส่ง…';
    try{
      await post(`/api/chat/${target}`,{body:text,requestKey});pending.delete(target);
      if(draftMayClear({version:version(target),value:drafts.get(target)||''},sent)){
        drafts.delete(target);
        if(alive(target)&&$('#chat-input').value===raw){$('#chat-input').value='';$('#chat-input').style.height='auto';}
      }
      if(alive(target,stamp))$('.chat-error').textContent='';await refresh();
    }catch(e){if(alive(target,stamp))$('.chat-error').textContent=e.message+' · ข้อความยังอยู่ กดส่งเพื่อลองอีกครั้ง';}
    finally{busy=false;if(!disposed&&peer&&!system)$('.chat-send').disabled=!peer.active;}
  }
  async function offerForm(){
    const target=peer.id,stamp=generation,slot=$('.chat-offer-slot'),offerStamp=++offerGeneration;
    const offerAlive=()=>alive(target,stamp)&&offerStamp===offerGeneration;
    if(slot.innerHTML){slot.innerHTML='';return;}
    slot.innerHTML='<p class="loading">กำลังโหลดงานล่าสุด…</p>';
    try{
      const retained=invitePending.get(target);
      const data=retained?null:await api('/api/admin/workspace');if(!offerAlive())return;
      const waiting=data?.poles.filter(p=>data.reports.some(r=>r.pole===p.pole&&r.status===0)&&!data.jobs.some(j=>j.pole===p.pole&&j.status===1)&&!data.reports.some(r=>r.pole===p.pole&&r.status===0&&r.assignedId&&r.assignedId!==target))||[];
      if(!retained&&!waiting.length){slot.innerHTML='<div class="chat-invite"><p>ยังไม่มีงานรอที่ส่งคำเชิญได้</p><button class="button outline small">ปิด</button></div>';slot.querySelector('button').onclick=()=>slot.innerHTML='';return;}
      slot.innerHTML=`<form class="chat-invite"><div class="chat-invite-head"><h3>ส่งงานให้ ${esc(peer.display_name)}</h3><button type="button" class="button ghost small" data-close-offer>ปิด</button></div>${retained?`<p>ตรวจผลการส่งครั้งก่อน: ${esc(retained.pole)}</p><p>${esc(retained.body||'ไม่มีรายละเอียดเพิ่มเติม')}</p><p class="small muted">ระบบยังไม่ได้ยืนยันผล กดส่งอีกครั้งเพื่อตรวจรายการเดิมโดยไม่สร้างซ้ำ</p>`:`<label for="chat-pole">เลือกเสาที่รอเริ่มงาน</label><select id="chat-pole" required>${waiting.map(p=>`<option value="${p.pole}">${p.pole} · ${esc(p.location||'ไม่ระบุตำแหน่ง')}</option>`).join('')}</select><label for="chat-instructions">รายละเอียดเพิ่มเติม (ถ้ามี)</label><input class="input" id="chat-instructions" maxlength="1000" placeholder="เช่น จุดนัดพบหรืออุปกรณ์ที่ต้องเตรียม"><p class="small muted">ช่างเลือกตอบรับหรือปฏิเสธได้ งานยังไม่เริ่มจนกว่าจะตอบรับ</p>`}<p class="chat-invite-error" role="alert"></p><button class="button primary small">${retained?'ตรวจผล / ส่งอีกครั้ง':'ส่งคำเชิญงาน'}</button></form>`;
      const form=slot.querySelector('form');let sending=false;
      form.querySelector('[data-close-offer]').onclick=()=>{if(!sending){offerGeneration++;slot.innerHTML='';}};
      form.onsubmit=async event=>{
        event.preventDefault();if(sending)return;sending=true;
        const button=form.querySelector('button.primary');button.disabled=true;form.querySelector('[data-close-offer]').disabled=true;
        const pole=form.querySelector('#chat-pole')?.value;
        const payload=invitePending.get(target)||{requestKey:crypto.randomUUID(),pole,workRevision:waiting.find(p=>p.pole===pole).work_revision,body:form.querySelector('#chat-instructions').value};
        invitePending.set(target,payload);form.querySelectorAll('input,select').forEach(e=>e.disabled=true);
        const toggle=$('.chat-offer-toggle');if(toggle)toggle.disabled=true;
        try{
          await post(`/api/chat/${target}/offers`,payload);invitePending.delete(target);
          if(offerAlive()&&form.isConnected){slot.innerHTML='';await refresh();}
        }catch(e){
          const uncertain=uncertainInvite(e);
          if(!uncertain)invitePending.delete(target);
          if(offerAlive()&&form.isConnected){
            form.querySelector('.chat-invite-error').textContent=e.message+(uncertain?' · ปิดแล้วเปิดคำเชิญใหม่เพื่อตรวจผลการส่งเดิม':' · ปิดแล้วเปิดคำเชิญใหม่เพื่อโหลดรายการล่าสุด');
            // Immutable uncertain send: reopening recovers the exact payload and key.
            button.disabled=true;
          }
        }finally{
          sending=false;if(offerAlive()){const current=$('.chat-offer-toggle');if(current)current.disabled=!peer.active;if(form.isConnected)form.querySelector('[data-close-offer]').disabled=false;}
        }
      };
    }catch(e){if(offerAlive())slot.innerHTML=`<p class="chat-invite-error">${esc(e.message)} · ปิดแล้วเปิดคำเชิญใหม่เพื่อลองอีกครั้ง</p>`;}
  }
  async function respond(button){
    const target=peer.id,stamp=generation,log=$('.chat-log');log.querySelectorAll('[data-respond]').forEach(b=>b.disabled=true);
    try{await post(`/api/chat/offers/${button.dataset.respond}/respond`,{decision:button.dataset.decision});if(alive(target,stamp)){$('.chat-error').textContent=button.dataset.decision==='accepted'?'รับงานแล้ว เปิด “งานของฉัน” เพื่อบันทึกการซ่อม':'ปฏิเสธคำเชิญแล้ว';await refresh();}}
    catch(e){if(alive(target,stamp)){$('.chat-error').textContent=e.message;await refresh();}}
    finally{if(alive(target,stamp))log.querySelectorAll('[data-respond]').forEach(b=>b.disabled=false);}
  }
  function openSystem(){
    saveDraft();generation++;peer=null;system=true;alignThread();$('.chat-layout').classList.add('is-thread');renderContacts();
    $('.chat-thread').innerHTML=`${header('แจ้งเตือนงาน','ข้อความจากระบบเดิม แยกจากบทสนทนาส่วนตัว')}<div class="chat-log chat-system-log">${notifications.length?notifications.map(n=>`<article><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><time>${date(n.created_at)}</time>${n.read_at?'<span class="small muted">อ่านแล้ว</span>':`<button class="button outline small" data-notice="${esc(n.id)}">ทำเครื่องหมายว่าอ่าน</button>`}</article>`).join(''):'<div class="chat-conversation-empty">ยังไม่มีแจ้งเตือนงาน</div>'}</div>`;
    $('.chat-back').onclick=back;
    $('.chat-profile-shortcut').onclick=openProfile;
    root.querySelectorAll('[data-notice]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await post(`${role==='admin'?'/api/admin':'/api'}/notifications/${b.dataset.notice}/read`);notifications.find(n=>n.id===b.dataset.notice).read_at=Date.now();if(system&&!disposed)openSystem();}catch(e){error(e.message);b.disabled=false;}});
  }
  $('.chat-contacts').addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.hasAttribute('data-system'))openSystem();
    else if(button.dataset.peer){const contact=contacts.find(c=>c.id===button.dataset.peer);if(contact)openPeer(contact);}
  });
  $('.chat-search input').oninput=event=>{query=event.target.value;renderContacts();};
  $('.chat-contacts').innerHTML='<p class="loading">กำลังโหลดรายชื่อ…</p>';
  refresh();timer=setInterval(refresh,6000);const visibility=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',visibility);window.addEventListener('focus',visibility);
  return ()=>{disposed=true;generation++;chromeObserver.disconnect();siteHeader?.removeEventListener('transitionend',syncChrome);window.removeEventListener('resize',syncChrome);window.removeEventListener('scroll',syncChrome);document.body.style.removeProperty('--staff-chat-header-height');clearInterval(timer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',visibility);drafts.clear();pending.clear();editor.destroy();};
}
