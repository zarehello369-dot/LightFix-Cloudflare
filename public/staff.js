import { groupReports, readFilters, queueReports } from './workflow.js';
import { submitStaffForm, readWorkDraft, saveWorkDraft, selectPoleReports } from './staff-forms.js';
import { $, control, esc, date, badge, api, post, shell, toast, showError, photoData, enhancePasswordFields } from './shared.js';

const state = { role: '', tab: 'overview', data: null, selected: new Set() };
const roleLabel = role => role === 'admin' ? 'เจ้าหน้าที่' : 'ช่างไฟฟ้า';
const contactLabel = type => ({ phone: 'โทรศัพท์', line: 'LINE', email: 'อีเมล', name: 'ชื่อ' })[type] || 'ข้อมูลผู้แจ้ง';
const base = () => state.role === 'admin' ? '/api/admin' : '/api';

export async function staffPage(role) {
  state.role = role; state.tab = role === 'technician' ? 'mywork' : 'overview'; state.selected.clear();
  document.title = `${roleLabel(role)} · LightFix`;
  shell(`<section class="shell page"><div id="staff-root"><p class="loading" role="status">กำลังตรวจการเข้าสู่ระบบ…</p></div></section>`, role);
  try {
    const me = await api(`${base()}/auth/me`);
    if (me.role !== role) return loginPage('บัญชีนี้ใช้กับพื้นที่อื่น กรุณาเข้าสู่ระบบให้ตรงบทบาท');
    if (me.mustChangePassword) return changePasswordPage(me);
    await loadWorkspace();
  } catch (error) {
    if (error.code === 'LOGIN_REQUIRED') loginPage();
    else if (error.code === 'FORBIDDEN') {
      const other = role === 'admin' ? 'technician' : 'admin';
      $('#staff-root').innerHTML = `<div class="login-wrap panel"><h1>บัญชีนี้อยู่ในพื้นที่${roleLabel(other)}</h1><p class="muted">เปิดพื้นที่ของบัญชีปัจจุบัน หรือออกจากระบบเพื่อใช้บัญชีอื่น</p><div class="actions"><a class="button primary" href="/${other}">ไปพื้นที่${roleLabel(other)}</a><button class="button outline" id="switch-account">ใช้บัญชีอื่น</button></div></div>`;
      $('#switch-account').addEventListener('click', async () => { await post(`${base()}/auth/logout`); loginPage(); });
    } else showError($('#staff-root'), error);
  }
}

function loginPage(message = '') {
  $('#staff-root').innerHTML = `<div class="login-wrap"><div class="panel"><h1>เข้าสู่พื้นที่${roleLabel(state.role)}</h1>
    <p class="muted">${state.role === 'admin' ? 'ใช้ชื่อผู้ใช้และรหัสผ่าน LightFix เพื่อจัดการเรื่องแจ้งและงานซ่อม' : 'ใช้ชื่อผู้ใช้ LightFix เพื่อดูงานและอัปเดตการซ่อม'}</p>
    ${message ? `<div class="error-box" role="alert">${esc(message)}</div>` : ''}
    <form id="login-form"><div class="field"><label for="username">ชื่อผู้ใช้</label><input class="input" id="username" name="username" autocomplete="username" required></div>
    <div class="field"><label for="password">รหัสผ่าน</label><input class="input" id="password" name="password" type="password" autocomplete="current-password" required></div>
    <div id="login-error" class="field-error" role="alert"></div><button class="button primary" type="submit">เข้าสู่ระบบ</button></form>
    <button id="show-register" class="button ghost" type="button">ขอบัญชีใหม่</button>
    <details class="login-help"><summary>เข้าสู่ระบบไม่ได้?</summary><p>ตรวจสอบชื่อผู้ใช้และเลือกทางเข้าให้ตรงกับบทบาทของคุณ บัญชีใหม่ต้องรอเจ้าหน้าที่อนุมัติก่อน</p><p>หากลืมรหัสผ่าน ให้ติดต่อผู้ดูแล LightFix ของพื้นที่เพื่อขอรหัสชั่วคราว แล้วตั้งรหัสใหม่เมื่อเข้าสู่ระบบ</p><p>หากเป็นผู้ดูแลเพียงคนเดียว ให้เจ้าของระบบตรวจสอบบัญชีผ่านผู้ดูแล Cloudflare</p><a href="/${state.role === 'admin' ? 'technician' : 'admin'}">${state.role === 'admin' ? 'ไปทางเข้าสำหรับช่างไฟฟ้า' : 'ไปทางเข้าสำหรับเจ้าหน้าที่'}</a></details></div></div>`;
  enhancePasswordFields($('#login-form'));
  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button:not([type=button])');
    button.disabled = true; button.textContent = 'กำลังเข้าสู่ระบบ…'; $('#login-error').textContent = '';
    try {
      const result = await post(`${base()}/auth/login`, { role: state.role, username: control(form, 'username').value.trim(), password: control(form, 'password').value });
      if (result.user.mustChangePassword) changePasswordPage(result.user); else await loadWorkspace();
    } catch (error) { $('#login-error').textContent = error.message; button.disabled = false; button.textContent = 'เข้าสู่ระบบ'; }
  });
  $('#show-register').addEventListener('click', registerPage);
}

function registerPage() {
  $('#staff-root').innerHTML = `<div class="login-wrap"><div class="panel"><h1>ขอบัญชี${roleLabel(state.role)}</h1><p class="muted">เจ้าหน้าที่จะตรวจและอนุมัติคำขอก่อนเริ่มใช้งาน</p>
    <form id="register-form"><div class="field"><label for="register-name">ชื่อที่แสดง</label><input class="input" id="register-name" name="name" required maxlength="100"></div>
      <div class="field"><label for="register-username">ชื่อผู้ใช้</label><input class="input" id="register-username" name="username" required pattern="[a-zA-Z0-9._-]{3,40}" autocomplete="username"></div>
      <div class="field"><label for="register-contact">ช่องทางติดต่อสำหรับการอนุมัติ</label><input class="input" id="register-contact" name="contact" required maxlength="150"></div>
      <div class="field"><label for="register-password">รหัสผ่านใหม่</label><input class="input" id="register-password" name="password" type="password" required minlength="12" autocomplete="new-password"><span class="field-note">อย่างน้อย 12 ตัวอักษร</span></div>
      <div id="register-error" class="field-error" role="alert"></div><button class="button primary" type="submit">ส่งคำขอ</button></form><button id="back-login" class="button ghost" type="button">กลับไปเข้าสู่ระบบ</button></div></div>`;
  $('#back-login').addEventListener('click', () => loginPage());
  $('#register-form').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget, button = form.querySelector('button:not([type=button])');
    button.disabled = true; button.textContent = 'กำลังส่งคำขอ…';
    try { await post(`${base()}/auth/register`, { role: state.role, name: control(form, 'name').value.trim(), username: control(form, 'username').value.trim(), contact: control(form, 'contact').value.trim(), password: control(form, 'password').value });
      $('#staff-root').innerHTML = `<div class="login-wrap"><div class="panel"><h1>ส่งคำขอแล้ว</h1><p class="lead">รอเจ้าหน้าที่อนุมัติบัญชี แล้วกลับมาเข้าสู่ระบบ</p><button id="back-login" class="button primary" type="button">กลับไปเข้าสู่ระบบ</button></div></div>`; $('#back-login').addEventListener('click', () => loginPage());
    } catch (error) { $('#register-error').textContent = error.message; button.disabled = false; button.textContent = 'ส่งคำขอ'; }
  });
}

function changePasswordPage(me) {
  $('#staff-root').innerHTML = `<div class="login-wrap"><div class="panel"><h1>ตั้งรหัสผ่านใหม่</h1><p class="muted">บัญชี ${esc(me.username)} ใช้รหัสชั่วคราวอยู่ กรุณาตั้งรหัสของคุณก่อนเริ่มงาน</p>
    <form id="change-form"><div class="field"><label for="new-password">รหัสผ่านใหม่</label><input class="input" id="new-password" name="password" type="password" minlength="12" maxlength="200" required autocomplete="new-password"></div>
      <div class="field"><label for="confirm-password">ยืนยันรหัสผ่าน</label><input class="input" id="confirm-password" name="confirm" type="password" minlength="12" required autocomplete="new-password"></div>
      <div id="change-error" class="field-error" role="alert"></div><button class="button primary" type="submit">บันทึกรหัสใหม่</button></form></div></div>`;
  $('#change-form').addEventListener('submit', async event => {
    event.preventDefault(); const form = event.currentTarget;
    if (control(form, 'password').value !== control(form, 'confirm').value) return $('#change-error').textContent = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
    const button = form.querySelector('button:not([type=button])'); button.disabled = true; button.textContent = 'กำลังบันทึก…';
    try { await post(`${base()}/auth/change-password`, { password: control(form, 'password').value }); toast('ตั้งรหัสผ่านใหม่แล้ว'); await loadWorkspace(); }
    catch (error) { $('#change-error').textContent = error.message; button.disabled = false; button.textContent = 'บันทึกรหัสใหม่'; }
  });
}

async function loadWorkspace() {
  $('#staff-root').innerHTML = '<p class="loading" role="status">กำลังโหลดงาน…</p>';
  try { state.data = await api(`${base()}/workspace`); restoreFilters(); renderWorkspace(); }
  catch (error) { if (error.code === 'PASSWORD_CHANGE_REQUIRED') return changePasswordPage(await api(`${base()}/auth/me`)); showError($('#staff-root'), error); }
}

let filterOwner = '';
function restoreFilters() { const key = `lightfix:filters:${state.role}:${state.data.user.id}`; if (filterOwner === key) return; filterOwner = key; try { Object.assign(state, readFilters(localStorage, key)); } catch { Object.assign(state, {reportStatus:'open',reportQuery:'',poleQuery:'',userQuery:''}); } }
function saveFilters() { try { localStorage.setItem(filterOwner, JSON.stringify({reportStatus:state.reportStatus,reportQuery:state.reportQuery,poleQuery:state.poleQuery,userQuery:state.userQuery})); } catch {} }
const workRevision = pole => state.data.poles.find(item => item.pole === pole)?.work_revision;
const workPayload = (pole, data) => ({...data, workRevision:workRevision(pole)});
function renderWorkspace() {
  const data = state.data, admin = state.role === 'admin';
  const primary = admin ? [['overview','งานรอ'],['reports','คิวงาน'],['jobs','กำลังซ่อม'],['messages','ข้อความ']] : [['mywork','งานของฉัน'],['reports','คิวงานที่รับได้'],['messages','ข้อความ']];
  const secondary = admin ? [['poles','ข้อมูลเสา'],['users','บัญชีผู้ใช้'],['history','ประวัติซ่อม']] : [['poles','ข้อมูลเสา'],['history','ประวัติซ่อม']];
  const options = tabs => tabs.map(([key,label]) => `<option value="${key}" ${state.tab === key ? 'selected' : ''}>${label}</option>`).join('');
  const buttons = tabs => tabs.map(([key,label]) => `<button type="button" data-tab="${key}" ${state.tab === key ? 'aria-current="page"' : ''}>${label}</button>`).join('');
  $('#staff-root').innerHTML = `<div class="staff-layout"><aside class="staff-rail" id="staff-rail"><div class="staff-identity"><h2>${roleLabel(state.role)}<span>${esc(data.user.name)}</span></h2><button id="logout" class="button ghost small" type="button">ออกจากระบบ</button></div><label class="staff-nav-label" for="staff-view">หน้าทำงาน</label><select id="staff-view" class="staff-view-select"><optgroup label="งานหลัก">${options(primary)}</optgroup><optgroup label="ข้อมูลเพิ่มเติม">${options(secondary)}</optgroup></select><nav aria-label="เมนูพื้นที่ทำงาน">${buttons(primary)}<details class="staff-more" ${secondary.some(([key])=>key===state.tab) ? 'open' : ''}><summary>ข้อมูลเพิ่มเติม</summary>${buttons(secondary)}</details></nav></aside><div class="staff-main"><div id="staff-content"></div></div></div><nav class="mobile-work-nav" aria-label="ทางลัดพื้นที่ทำงาน">${buttons(primary.slice(0,3))}<button type="button" data-staff-menu aria-controls="staff-rail" aria-expanded="false">เพิ่มเติม</button></nav><dialog class="dialog" id="task-dialog" aria-labelledby="dialog-title"></dialog>`;
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => navigateTab(button.dataset.tab)));
  $('[data-staff-menu]').addEventListener('click', event => { const rail = $('#staff-rail'), open = rail.classList.toggle('mobile-open'); event.currentTarget.setAttribute('aria-expanded', String(open)); if (open) $('#staff-view').focus(); });
  $('#staff-rail').addEventListener('keydown', event => { if (event.key === 'Escape') { $('#staff-rail').classList.remove('mobile-open'); $('[data-staff-menu]').setAttribute('aria-expanded','false'); $('[data-staff-menu]').focus(); } });
  $('#staff-view').addEventListener('change', event => navigateTab(event.currentTarget.value));
  $('#logout').addEventListener('click', async () => {
    await post(`${base()}/auth/logout`);
    clearAccountDrafts(); loginPage();
  });
  renderTab();
}
function navigateTab(tab) {
  state.tab = tab; state.selected.clear(); renderWorkspace();
  const heading = $('#staff-content h1');
  if (heading) { heading.tabIndex = -1; heading.focus(); }
}

function renderTab() {
  const views = { mywork, overview, reports, jobs, poles, users, messages, history };
  views[state.tab]?.();
}
function enhanceTables(root = $('#staff-content')) {
  root.querySelectorAll('.data-table').forEach(table => {
    const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(row => [...row.children].forEach((cell, index) => {
      if (cell.tagName === 'TD') cell.dataset.label = headers[index] || '';
    }));
  });
}
function content(html) {
  $('#staff-content').innerHTML = html; enhanceTables(); bindWorkActions();
  $('#staff-content [data-queue]')?.addEventListener('click', () => { state.reportStatus = 'open'; state.reportQuery = ''; saveFilters(); navigateTab('reports'); });
}
function dialog(html) {
  const target = $('#task-dialog'); target.innerHTML = html; target.showModal();
  const close = event => {
    if (target.querySelector('form[data-preparing="true"]')) { event?.preventDefault(); toast('กำลังเตรียมรูป รอสักครู่ก่อนกลับ'); return; }
    if (event?.type !== 'cancel') target.close();
  };
  target.querySelector('[data-close]')?.addEventListener('click', close);
  target.oncancel = close;
  return target;
}
async function action(path, data, success, onSaved) {
  const pole = data.pole || state.data.jobs.find(job => path.includes(job.id))?.pole;
  await post(path, pole ? workPayload(pole, data) : data);
  onSaved?.(); toast(success); state.selected.clear();
  $('#task-dialog')?.close();
  // A failed refresh does not turn an already committed write into a failed save.
  try {
    state.data = await api(`${base()}/workspace`); renderWorkspace();
    const heading = $('#staff-content h1'); if (heading) { heading.tabIndex = -1; heading.focus(); }
  } catch { showError($('#staff-root'), new Error(`${success} แต่โหลดรายการใหม่ไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่`)); }
}
function formError(form, error) {
  const box = form?.querySelector('[data-error]'); if (!box) { toast(error.message); return; }
  box.textContent = error.message;
  if (error.code === 'LOGIN_REQUIRED') {
    const link=document.createElement('a'); link.className='button outline small'; link.href=`/${state.role}`; link.textContent='เข้าสู่ระบบอีกครั้ง';
    box.append(document.createElement('br'),link); return;
  }
  if (error.code !== 'WORK_CHANGED' && error.code !== 'STATUS_CHANGED') return;
  const button = document.createElement('button'); button.type = 'button'; button.className = 'button outline small'; button.textContent = 'โหลดข้อมูลงานล่าสุด';
  button.addEventListener('click', async () => {
    button.disabled = true; button.textContent = 'กำลังโหลดข้อมูล…';
    try {
      const latest = await api(`${base()}/workspace`); state.data = latest;
      const pole = form.dataset.pole, job = latest.jobs.find(item => item.id === form.dataset.jobId);
      const group = groupReports(latest.reports.filter(item => item.pole === pole && item.status < 2), latest.jobs, latest.users || [], latest.poles)[0];
      const unavailable = form.dataset.jobId ? !job || job.status !== 1 || (state.role !== 'admin' && (job.assigned_user_id || job.technician_id) !== latest.user.id) : !group?.open.length;
      const submit = form.querySelector('button:not([type="button"])');
      if (unavailable) {
        form.dataset.unavailable = 'true'; if (submit) submit.disabled = true;
        box.innerHTML = '<p>งานนี้ปิดแล้วหรือเปลี่ยนผู้รับผิดชอบ ร่างของคุณยังเก็บไว้ กลับไปตรวจรายการงานล่าสุด</p><button type="button" class="button outline small" data-return-work>กลับไปรายการงาน</button>';
        box.querySelector('button').addEventListener('click', () => renderWorkspace()); return;
      }
      const note = job?.public_note || '', instructions = job?.instructions || group?.open[0]?.instructions || '';
      const assignedId=job?.assigned_user_id || job?.technician_id || group?.assignedId;
      const assignedName=latest.users?.find(user=>user.id===assignedId)?.display_name || (assignedId===latest.user.id?latest.user.name:assignedId?'มอบหมายแล้ว':'ยังไม่มอบหมาย');
      const dueAt=job?.due_at || group?.dueAt;
      box.innerHTML = `<p>โหลดข้อมูลล่าสุดแล้ว ข้อความและรูปที่คุณกำลังเตรียมยังอยู่</p><div class="latest-work"><strong>ข้อมูลล่าสุดของเสา ${esc(pole)}</strong><p>สถานะ: ${job ? 'กำลังซ่อม' : 'รอรับงาน'}</p><p>ผู้รับผิดชอบ: ${esc(assignedName)}</p><p>กำหนดเสร็จ: ${date(dueAt)}</p><p>รายละเอียดงาน: ${esc(instructions || 'ไม่มี')}</p><p>บันทึกล่าสุด: ${esc(note || 'ยังไม่มี')}</p></div><label class="inline"><input type="checkbox" required> ตรวจสอบข้อมูลล่าสุดแล้ว และต้องการบันทึกข้อมูลที่กรอก</label>`;
      box.querySelector('input').focus();
    } catch (failure) { box.firstChild.textContent = `${failure.message} `; button.disabled = false; button.textContent = 'ลองโหลดข้อมูลอีกครั้ง'; }
  });
  box.append(document.createElement('br'), button);
}

const draftMemory = new Map(), draftPhotos = new Map();
const draftKey = (type, jobId) => `lightfix:work-draft:${state.role}:${state.data.user.id}:${type}:${jobId}`;
function readDraft(key) {
  const memory=readWorkDraft({getItem:()=>JSON.stringify(draftMemory.get(key)||null)},key);
  if(memory)return memory;
  draftMemory.delete(key); draftPhotos.delete(key);
  try { return readWorkDraft(sessionStorage,key); } catch { return null; }
}
function deleteDraft(key) { draftMemory.delete(key); draftPhotos.delete(key); try { sessionStorage.removeItem(key); } catch {} }
function clearAccountDrafts() {
  const prefix = `lightfix:work-draft:${state.role}:${state.data.user.id}:`;
  for (const key of draftMemory.keys()) if (key.startsWith(prefix)) deleteDraft(key);
  try { Object.keys(sessionStorage).filter(key=>key.startsWith(prefix)).forEach(key=>sessionStorage.removeItem(key)); } catch {}
}
function attachDraft(form, type, job) {
  const key = draftKey(type,job.id), draft = readDraft(key);
  form.dataset.jobId = job.id; form.dataset.pole = job.pole;
  const fields = [...form.elements].filter(el=>['note','cause','causeDetail'].includes(el.name));
  if (draft) for (const field of fields) if (typeof draft.fields[field.name] === 'string') field.value = draft.fields[field.name];
  const status = document.createElement('p'); status.className = 'field-note draft-status'; status.setAttribute('role','status'); form.prepend(status);
  const save = () => {
    const values = Object.fromEntries(fields.map(field=>[field.name,field.value]));
    const hasPhoto = draftPhotos.has(key), value = { fields:values, hasPhoto, updatedAt:Date.now() };
    draftMemory.set(key,value); let saved = false;
    try { saved = saveWorkDraft(sessionStorage,key,values,hasPhoto); } catch {}
    status.textContent = saved ? `เก็บข้อความร่างในแท็บนี้ 24 ชั่วโมง ยังไม่ได้ส่งข้อมูล${hasPhoto ? ' รูปต้องเลือกใหม่หากโหลดหน้าใหม่' : ''}` : 'เก็บร่างได้ระหว่างเปิดหน้านี้เท่านั้น อย่าปิดแท็บก่อนบันทึก';
  };
  status.textContent = draft ? `เรียกคืนร่างแล้ว${draft.hasPhoto && !draftPhotos.has(key) ? ' กรุณาเลือกรูปอีกครั้งหลังโหลดหน้าใหม่' : ''}` : 'เก็บข้อความร่างในแท็บนี้ รูปเก็บได้จนกว่าจะโหลดหน้าใหม่หรือปิดแท็บ';
  form.addEventListener('input', save); form.addEventListener('change', save);
  const clear = document.createElement('details'); clear.className = 'draft-manage'; clear.innerHTML = '<summary>จัดการร่างในเครื่อง</summary><p class="field-note">ล้างเฉพาะข้อความและรูปที่เตรียมในฟอร์มนี้ ไม่เปลี่ยนข้อมูลงานที่บันทึกแล้ว</p><button type="button" class="button outline small">ล้างร่างและเริ่มใหม่</button>';
  clear.querySelector('button').addEventListener('click',()=>{ deleteDraft(key); form.reset(); form.querySelector('[data-error]').textContent=''; if (form.dataset.unavailable !== 'true') { const submit=form.querySelector('button:not([type="button"])'); submit.disabled=false; } resetPhoto(); status.textContent='ล้างร่างแล้ว ข้อมูลงานที่บันทึกไว้ยังอยู่'; });
  form.insertBefore(clear,form.querySelector('.dialog-actions'));
  const input = control(form,'photo'), preview = form.querySelector('[data-photo-preview]'), preparation = form.querySelector('[data-photo-status]');
  let generation = 0;
  const resetPhoto = () => { generation++; delete form.dataset.preparing; if (!input) return; input.value=''; input.required=true; preview.hidden=true; preview.querySelector('img')?.remove(); if (preparation) preparation.textContent=''; };
  const displayPhoto = () => { if (!input) return; const photo=draftPhotos.get(key); input.required=!photo; preview.hidden=!photo; preview.querySelector('img')?.remove(); if(photo) { const image=document.createElement('img'); image.alt='ตัวอย่างรูปหลังซ่อมที่เตรียมส่ง'; image.src=photo.data; preview.prepend(image); preview.querySelector('figcaption').textContent=photo.name; } };
  displayPhoto();
  input?.addEventListener('change',async()=>{
    const file=input.files[0], version=++generation, submit=form.querySelector('button:not([type="button"])');
    draftPhotos.delete(key); displayPhoto(); if(!file) {save();return;}
    form.dataset.preparing='true'; submit.disabled=true; preparation.textContent='กำลังเตรียมรูป…';
    try { const data=await photoData(file); if(version!==generation)return; draftPhotos.set(key,{data,name:file.name}); displayPhoto(); preparation.textContent='รูปพร้อมส่ง ตรวจภาพก่อนยืนยันปิดงาน'; save(); }
    catch(error) { if(version!==generation)return; input.value=''; preparation.textContent=error.message; save(); }
    finally { if(version===generation) { delete form.dataset.preparing; if(form.dataset.unavailable!=='true')submit.disabled=false; } }
  });
  form.querySelector('[data-remove-photo]')?.addEventListener('click',()=>{draftPhotos.delete(key);resetPhoto();save();});
  return { clear:()=>deleteDraft(key), photo:()=>draftPhotos.get(key)?.data || '' };
}

function overview() {
  const d=state.data, groups=groupReports(d.reports.filter(r=>r.status<2),d.jobs,d.users||[],d.poles);
  const waiting=groups.filter(group=>!group.job), active=groups.filter(group=>group.job);
  content(`<h1>งานรอจัดการ</h1><p class="muted">ดูงานรายเสา แล้วมอบหมายหรือติดตามการซ่อม</p><div class="metric-row"><div class="metric"><strong>${waiting.length}</strong><span>เสารอเริ่มงาน</span><span>${waiting.reduce((n,g)=>n+g.reports.length,0)} เรื่องแจ้ง</span></div><div class="metric"><strong>${active.length}</strong><span>เสากำลังซ่อม</span><span>${active.reduce((n,g)=>n+g.reports.length,0)} เรื่องแจ้ง</span></div><div class="metric"><strong>${d.notifications.filter(n=>!n.read_at).length}</strong><span>ข้อความยังไม่อ่าน</span></div></div><section class="staff-section"><div class="section-head"><h2>เรื่องที่ต้องดำเนินการ</h2><button class="button outline small" data-queue>เปิดคิวทั้งหมด</button></div>${groups.length ? `<div class="work-grid">${[...waiting,...active].slice(0,8).map(group=>groupCard(group,'overview')).join('')}</div>` : '<div class="empty">ยังไม่มีเสาที่ต้องดำเนินการ</div>'}</section>`);
}
function jobGroup(job) {
  const d=state.data, rows=d.reports.filter(report=>report.jobId===job.id || (report.pole===job.pole && report.status===1));
  return groupReports(rows,[job],d.users||[],d.poles)[0] || {pole:job.pole,reports:[],open:[],urgent:false,job,assignedId:job.assigned_user_id||job.technician_id,assignedName:'',location:d.poles.find(p=>p.pole===job.pole)?.location||'',dueAt:job.due_at,firstAt:job.started_at};
}
function groupCard(group, mode='queue') {
  const job=group.job, canStart=group.open.length && !job && group.open.every(report=>report.status===0), admin=state.role==='admin';
  const owner=group.assignedName || (group.assignedId===state.data.user.id ? state.data.user.name : group.assignedId ? 'มอบหมายแล้ว' : 'ยังไม่มอบหมาย');
  const closed=!group.open.length && !job;
  let actions='';
  if(mode==='overview') actions=admin && group.open.length && !job
    ? `<button class="button primary" data-assign-pole="${esc(group.pole)}">มอบหมายช่าง</button>`
    : `<button class="button outline" data-open-pole="${esc(group.pole)}">เปิดงานเสา ${esc(group.pole)}</button>`;
  else {
    if(job) actions+=`<button class="button primary" data-finish="${esc(job.id)}">ปิดงานซ่อม</button><button class="button outline" data-note="${esc(job.id)}">บันทึกความคืบหน้า</button>`;
    if(admin && group.open.length) actions+=`<button class="button ${job?'outline':'primary'}" data-assign-pole="${esc(group.pole)}">${group.assignedId?'เปลี่ยนผู้รับผิดชอบ':'มอบหมายช่าง'}</button>`;
    if(canStart) actions+=`<button class="button ${admin?'outline':'primary'}" data-start-pole="${esc(group.pole)}">รับงานเสา ${esc(group.pole)}</button>`;
    if(admin && group.open.length) actions+=`<details class="manage-menu"><summary>จัดการเพิ่มเติม</summary><button class="button danger small" data-cancel-pole="${esc(group.pole)}">ยกเลิกเรื่องของเสานี้</button></details>`;
  }
  return `<article class="panel work-card" data-work-pole="${esc(group.pole)}"><div class="section-head"><h2 class="section-heading number">${esc(group.pole)}</h2>${badge(job?1:closed?(group.reports[0]?.status??2):0)}</div><p class="muted">${esc(group.location||'ยังไม่ระบุตำแหน่ง')}</p>${group.urgent?'<p class="danger-note">เสี่ยงอันตรายตามอาการแจ้ง</p>':''}<p class="work-symptoms">${esc([...new Set(group.reports.map(report=>report.symptom))].join(' · ')||'เปิดรายละเอียดงานเพื่อดูข้อมูลที่มี')}</p><p class="small">${group.reports.length} เรื่องแจ้ง · ผู้รับผิดชอบ: ${esc(owner)}</p>${group.dueAt?`<p class="small ${group.dueAt<Date.now()?'overdue':''}">${group.dueAt<Date.now()?'เกินกำหนด':'กำหนดเสร็จ'} ${date(group.dueAt)}</p>`:''}${job?.instructions||group.open[0]?.instructions?`<p class="small">รายละเอียดงาน: ${esc(job?.instructions||group.open[0]?.instructions)}</p>`:''}${job?.public_note?`<p class="small"><strong>บันทึกล่าสุด:</strong> ${esc(job.public_note)}</p>`:''}<details class="work-evidence"><summary>ดูรูปและรายละเอียด ${group.reports.length} เรื่อง</summary>${group.reports.length?group.reports.map(report=>`<section class="complaint-detail"><h3>${esc(report.symptom)}</h3><p class="small muted">แจ้งเมื่อ ${date(report.at)}</p><p class="small">${contactLabel(report.contactType)}: ${esc(report.contactValue||'ไม่ได้ระบุ')}</p>${report.hasBefore?`<a class="work-photo-link" href="/media/${encodeURIComponent(report.id)}/before" target="_blank" rel="noopener"><img src="/media/${encodeURIComponent(report.id)}/before" loading="lazy" alt="รูปก่อนซ่อมเสา ${esc(group.pole)}"><span>เปิดรูปก่อนซ่อมขนาดเต็ม (แท็บใหม่)</span></a>`:'<p class="small muted">เรื่องนี้ไม่มีรูปก่อนซ่อม</p>'}${badge(report.status)}</section>`).join(''):'<p class="small">ไม่พบรายละเอียดเรื่องแจ้งในรายการที่โหลด กรุณาโหลดงานล่าสุด</p>'}</details><div class="work-actions">${actions}</div></article>`;
}
function choosePole(pole) { state.selected=new Set(selectPoleReports(state.data.reports,pole)); }
function bindWorkActions() {
  const root=$('#staff-content');
  root.querySelectorAll('[data-start-pole]').forEach(button=>button.addEventListener('click',()=>{choosePole(button.dataset.startPole);startSelected();}));
  root.querySelectorAll('[data-assign-pole]').forEach(button=>button.addEventListener('click',()=>{choosePole(button.dataset.assignPole);assignSelected();}));
  root.querySelectorAll('[data-cancel-pole]').forEach(button=>button.addEventListener('click',()=>{choosePole(button.dataset.cancelPole);cancelPole();}));
  root.querySelectorAll('[data-note]').forEach(button=>button.addEventListener('click',()=>noteJob(button.dataset.note)));
  root.querySelectorAll('[data-finish]').forEach(button=>button.addEventListener('click',()=>finishJob(button.dataset.finish)));
  root.querySelectorAll('[data-open-pole]').forEach(button=>button.addEventListener('click',()=>{state.reportStatus='open';state.reportQuery=button.dataset.openPole;saveFilters();navigateTab('reports');}));
}
function reportResults(rows,d) {
  const groups=groupReports(rows,d.jobs,d.users||[],d.poles);
  return groups.length?`<p class="small muted" role="status">${groups.length} เสา · ${rows.length} เรื่องแจ้ง · ทำรายการได้ทีละเสา</p><div class="work-grid">${groups.map(group=>groupCard(group)).join('')}</div>`:`<div class="empty"><p>ไม่พบเรื่องแจ้ง${state.reportQuery?`สำหรับ “${esc(state.reportQuery)}”`:''} ในตัวกรอง ${esc(({open:'เรื่องที่ต้องดำเนินการ','0':'รอรับเรื่อง','1':'กำลังซ่อม','2':'ซ่อมเสร็จ','3':'ยกเลิก',all:'ทุกสถานะ'})[state.reportStatus||'open'])}</p><button type="button" class="button outline small" data-clear-report-filters>ล้างตัวกรอง</button></div>`;
}
function activeCards(jobs) {
  const groups=jobs.map(jobGroup).sort((a,b)=>Number(b.urgent)-Number(a.urgent)||(a.dueAt||Infinity)-(b.dueAt||Infinity)||a.firstAt-b.firstAt);
  return groups.length?`<div class="work-grid">${groups.map(group=>groupCard(group,'active')).join('')}</div>`:'<div class="empty"><p>ยังไม่มีงานที่กำลังซ่อม</p><p class="small muted">รับงานจากรายการรอรับเพื่อเริ่มบันทึกการซ่อม</p></div>';
}
function mywork() {
  const d=state.data, waiting=d.reports.filter(report=>report.status===0 && report.assignedId===d.user.id), active=d.jobs.filter(job=>job.status===1 && (job.assigned_user_id||job.technician_id)===d.user.id), groups=groupReports(waiting,d.jobs,d.users||[],d.poles);
  const view=state.workView||'active';
  content(`<div class="section-head"><h1>งานของฉัน</h1><button class="button outline small" id="refresh-mywork">โหลดงานล่าสุด</button></div><p class="muted">เปิดงานเพื่อดูอาการ รูป และบันทึกผลการซ่อม</p><div class="work-switch" role="group" aria-label="ประเภทงานของฉัน"><button type="button" data-work-view="active" aria-pressed="${view==='active'}">กำลังทำ <span class="number">${active.length}</span></button><button type="button" data-work-view="waiting" aria-pressed="${view==='waiting'}">รอรับ <span class="number">${groups.length}</span></button></div><section aria-label="${view==='active'?'งานกำลังซ่อม':'งานรอรับ'}">${view==='active'?activeCards(active):groups.length?`<div class="work-grid">${groups.map(group=>groupCard(group,'waiting')).join('')}</div>`:'<div class="empty"><p>ยังไม่มีงานมอบหมายที่รอรับ</p><button class="button outline" data-open-available>ดูคิวงานที่รับได้</button></div>'}</section>`);
  $('#refresh-mywork').addEventListener('click',loadWorkspace);
  document.querySelectorAll('[data-work-view]').forEach(button=>button.addEventListener('click',()=>{state.workView=button.dataset.workView;mywork();document.querySelector(`[data-work-view="${state.workView}"]`).focus();}));
  $('[data-open-available]')?.addEventListener('click',()=>{state.reportStatus='0';state.reportQuery='';saveFilters();navigateTab('reports');});
}
function reports() {
  const d=state.data, status=state.reportStatus||'open', query=state.reportQuery||'';
  content(`<h1>${state.role==='admin'?'คิวงานรายเสา':'คิวงานที่รับได้'}</h1><p class="muted">${state.role==='admin'?'เปิดรายละเอียดแล้วมอบหมายจากบัตรเสาได้ทันที':'ดูอาการและรูปก่อนรับงาน ทำรายการได้ทีละเสา'}</p><div class="toolbar"><label class="eyeless" for="report-status">สถานะเรื่องแจ้ง</label><select id="report-status">${[['open','เรื่องที่ต้องดำเนินการ'],['0','รอรับเรื่อง'],['1','กำลังซ่อม'],['2','ซ่อมเสร็จ'],['3','ยกเลิก'],['all','ทุกสถานะ']].map(([key,label])=>`<option value="${key}" ${status===key?'selected':''}>${label}</option>`).join('')}</select><label class="eyeless" for="report-search">ค้นหาเสาหรืออาการ</label><input class="input" id="report-search" type="search" placeholder="ค้นหาเสาหรืออาการ" value="${esc(query)}"></div><div id="report-results">${reportResults(queueReports(d,status,query),d)}</div>`);
  const draw=()=>{state.selected.clear();$('#report-results').innerHTML=reportResults(queueReports(d,state.reportStatus||'open',state.reportQuery||''),d);bindWorkActions();};
  $('#report-results').addEventListener('click',event=>{if(!event.target.closest('[data-clear-report-filters]'))return;state.reportStatus='open';state.reportQuery='';saveFilters();$('#report-status').value='open';$('#report-search').value='';draw();$('#report-search').focus();});
  $('#report-status').addEventListener('change',event=>{state.reportStatus=event.target.value;saveFilters();draw();});
  $('#report-search').addEventListener('input',event=>{state.reportQuery=event.target.value;saveFilters();draw();});
}

function selectedReports(allowActive = false) {
  const rows = state.data.reports.filter(r => state.selected.has(r.id));
  if (!rows.length || rows.length > 3 || new Set(rows.map(r => r.pole)).size !== 1 || rows.some(r => allowActive ? r.status > 1 : r.status !== 0)) { toast(allowActive ? 'เลือกหนึ่งเสาที่มีเรื่องแจ้งเปิดอยู่' : 'เลือกหนึ่งเสาที่รอรับงาน'); return null; }
  return rows;
}
function startSelected() {
  const rows = selectedReports(); if (!rows) return;
  const target = dialog(`<h2 id="dialog-title">เริ่มงานเสา ${esc(rows[0].pole)}</h2><p>รับงาน ${rows.length} เรื่องเข้าสู่การซ่อม</p><div class="dialog-actions"><button class="button outline" data-close>กลับ</button><button class="button primary" id="confirm-start">ยืนยันเริ่มงาน</button></div>`);
  $('#confirm-start').addEventListener('click', async () => { $('#confirm-start').disabled = true; try { await action(`${base()}/jobs/start`, { pole: rows[0].pole, reportIds: rows.map(r => r.id) }, 'เริ่มงานแล้ว'); state.selected.clear(); } catch (e) { toast(e.message); await loadWorkspace(); } });
}
function assignSelected() {
  const rows = selectedReports(true); if (!rows) return;
  const techs = state.data.users.filter(u => u.role === 'technician' && u.active);
  if (!techs.length) return toast('ยังไม่มีบัญชีช่างที่ใช้งานได้');
  const group = groupReports(rows,state.data.jobs,state.data.users,state.data.poles)[0];
  const target = dialog(`<h2 id="dialog-title">มอบหมายเสา ${esc(rows[0].pole)}</h2><form id="assign-form"><div class="field"><label for="assign-tech">ช่างที่รับงาน</label><select id="assign-tech" name="technicianId">${techs.map(u => `<option value="${esc(u.id)}">${esc(u.display_name)}</option>`).join('')}</select></div><div class="field"><label for="assign-due">กำหนดเสร็จ (ถ้ามี)</label><input class="input" type="datetime-local" id="assign-due" name="due"></div><div class="field"><label for="assign-instructions">รายละเอียดงาน</label><textarea id="assign-instructions" name="instructions" rows="3"></textarea></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button primary">มอบหมายงาน</button></div></form>`);
  target.querySelector('form').dataset.pole = rows[0].pole;
  const form=target.querySelector('form');
  if(group.assignedId) control(form,'technicianId').value=group.assignedId;
  control(form,'instructions').value=group.job?.instructions || group.open[0]?.instructions || '';
  if(group.dueAt) { const value=new Date(group.dueAt); control(form,'due').value=new Date(value.getTime()-value.getTimezoneOffset()*60000).toISOString().slice(0,16); }
  form.addEventListener('submit', event => submitStaffForm(event, async f => { await action('/api/admin/assign', { pole: rows[0].pole, reportIds: selectPoleReports(state.data.reports,rows[0].pole), technicianId: control(f, 'technicianId').value, dueAt: control(f, 'due').value ? new Date(control(f, 'due').value).getTime() : null, instructions: control(f, 'instructions').value }, 'มอบหมายงานแล้ว'); }, formError));
}
function cancelPole() {
  const rows = selectedReports(true); if (!rows) return;
  const target = dialog(`<h2 id="dialog-title">ยกเลิกเรื่องของเสา ${esc(rows[0].pole)}?</h2><p>เรื่องที่ยังเปิดอยู่ทั้งหมดของเสานี้จะถูกยกเลิก และเหตุผลจะแสดงต่อสาธารณะ</p><form id="cancel-form"><div class="field"><label for="cancel-note">เหตุผล</label><textarea id="cancel-note" name="note" required rows="3"></textarea></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button danger">ยืนยันยกเลิก</button></div></form>`);
  target.querySelector('form').dataset.pole = rows[0].pole;
  target.querySelector('form').addEventListener('submit', event => submitStaffForm(event, form => action('/api/admin/cancel', { pole: rows[0].pole, note: control(form, 'note').value }, 'ยกเลิกเรื่องแล้ว'), formError));
}

function jobs() {
  content(`<h1>งานกำลังซ่อม</h1><p class="muted">ดูอาการ รูปก่อนซ่อม และบันทึกผลในงานเดียวกัน</p>${activeCards(state.data.jobs.filter(job=>job.status===1))}`);
}
function noteJob(jobId) {
  const job=state.data.jobs.find(item=>item.id===jobId);
  const target=dialog(`<h2 id="dialog-title">บันทึกงานเสา ${esc(job.pole)}</h2><form id="note-form"><div class="field"><label for="job-note">ข้อความความคืบหน้า</label><textarea id="job-note" name="note" rows="4" maxlength="500">${esc(job.public_note)}</textarea><span class="field-note">ข้อความนี้แสดงบนหน้าติดตามเรื่อง</span></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับและเก็บร่าง</button><button class="button primary" type="submit">บันทึก</button></div></form>`);
  const form=target.querySelector('form'), draft=attachDraft(form,'note',job);
  form.addEventListener('submit',event=>submitStaffForm(event, f=>action(`${base()}/jobs/${jobId}/note`,{note:control(f,'note').value},'บันทึกความคืบหน้าแล้ว',draft.clear),formError));
}
function finishJob(jobId) {
  const job=state.data.jobs.find(item=>item.id===jobId);
  const target=dialog(`<h2 id="dialog-title">ปิดงานเสา ${esc(job.pole)}</h2><p>ตรวจรูปหลังซ่อมและสาเหตุก่อนส่ง ข้อความและรูปอาจแสดงต่อสาธารณะ</p><form id="finish-form"><div class="field"><label for="finish-cause">สาเหตุ <span class="required">*</span></label><select id="finish-cause" name="cause" required><option value="">เลือกสาเหตุ</option>${state.data.causes.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div><div class="field"><label for="finish-detail">รายละเอียดสาเหตุ (ถ้ามี)</label><textarea id="finish-detail" name="causeDetail" rows="2"></textarea></div><div class="field"><label for="finish-note">บันทึกสำหรับผู้แจ้ง</label><textarea id="finish-note" name="note" rows="2" maxlength="500">${esc(job.public_note)}</textarea></div><div class="field"><label for="finish-photo">รูปหลังซ่อม <span class="required">*</span></label><input id="finish-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required aria-describedby="finish-photo-help finish-photo-status"><span class="field-note" id="finish-photo-help">ถ่ายรูปหรือเลือกจากเครื่อง · JPG, PNG หรือ WebP สูงสุด 25 MB ระบบย่อรูปก่อนส่ง</span><span class="field-note" id="finish-photo-status" data-photo-status role="status"></span><figure class="repair-photo-preview" data-photo-preview hidden><figcaption></figcaption><button class="button outline small" type="button" data-remove-photo>นำรูปนี้ออก</button></figure></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับและเก็บร่าง</button><button class="button primary" type="submit">ยืนยันปิดงาน</button></div></form>`);
  const form=target.querySelector('form'), draft=attachDraft(form,'finish',job);
  form.addEventListener('submit',event=>submitStaffForm(event,async f=>{
    const photo=draft.photo()||await photoData(control(f,'photo').files[0]);
    if(!photo)throw new Error('เลือกรูปหลังซ่อมและตรวจภาพก่อนปิดงาน');
    await action(`${base()}/jobs/${jobId}/finish`,{cause:control(f,'cause').value,causeDetail:control(f,'causeDetail').value,note:control(f,'note').value,photo},'ปิดงานซ่อมแล้ว',draft.clear);
  },formError));
}

function poles() {
  const rows = state.data.poles;
  content(`<h1>ข้อมูลเสา</h1><p class="muted">ดูตำแหน่งและจำนวนงานของเสา${state.role === 'admin' ? ' เพิ่ม แก้ไข ปิดใช้ หรือลบเสาที่ยังไม่มีประวัติ' : ''}</p>
    <div class="toolbar"><label class="eyeless" for="pole-filter">ค้นหาหมายเลขเสา</label><input class="input" id="pole-filter" placeholder="ค้นหาเสา"><span class="small muted">${rows.length} เสา</span>${state.role === 'admin' ? '<button class="button primary" id="new-pole">เพิ่มเสา</button>' : ''}</div>
    <div class="panel table-wrap"><table class="data-table"><thead><tr><th>หมายเลข</th><th>ตำแหน่ง</th><th>เรื่องเปิด</th><th>ซ่อมแล้ว</th>${state.role === 'admin' ? '<th>จัดการ</th>' : ''}</tr></thead><tbody id="pole-rows"></tbody></table></div>`);
  const draw = () => {
    const filter = $('#pole-filter').value.trim().toUpperCase();
    $('#pole-rows').innerHTML = rows.filter(p => !filter || p.pole.includes(filter) || p.location?.includes(filter)).map(p => `<tr><td class="number"><strong>${esc(p.pole)}</strong>${p.active ? '' : '<br><span class="small muted">ปิดใช้</span>'}</td><td>${esc(p.location || 'ไม่ระบุตำแหน่ง')}</td><td class="number">${p.open_count}</td><td class="number">${p.repair_count}</td>${state.role === 'admin' ? `<td><div class="actions"><button class="button outline small" data-edit-pole="${esc(p.pole)}">แก้ไข</button>${p.total_report_count || p.job_count ? '<span class="small muted">มีประวัติ · ปิดใช้ในหน้าแก้ไข</span>' : `<details class="manage-menu"><summary>เพิ่มเติม</summary><button class="button danger small" data-delete-pole="${esc(p.pole)}">ลบเสา</button></details>`}</div></td>` : ''}</tr>`).join('') || `<tr><td colspan="${state.role === 'admin' ? 5 : 4}" class="muted">ไม่พบเสาที่ค้นหา</td></tr>`;
    enhanceTables();
    document.querySelectorAll('[data-edit-pole]').forEach(b => b.addEventListener('click', () => poleForm(rows.find(p => p.pole === b.dataset.editPole))));
    document.querySelectorAll('[data-delete-pole]').forEach(b => b.addEventListener('click', () => deletePole(rows.find(p => p.pole === b.dataset.deletePole))));
  };
  $('#pole-filter').value = state.poleQuery || ''; $('#pole-filter').addEventListener('input', () => { state.poleQuery = $('#pole-filter').value; saveFilters(); draw(); }); draw();
  $('#new-pole')?.addEventListener('click', () => poleForm());
}
function deletePole(p) {
  const target = dialog(`<h2 id="dialog-title">ลบเสา ${esc(p.pole)}?</h2><p class="muted">ลบข้อมูลเสานี้ถาวร เสาที่มีเรื่องแจ้งหรืองานซ่อมจะลบไม่ได้และควรปิดใช้แทน</p><form id="delete-pole-form"><div class="field"><label for="confirm-pole">พิมพ์ ${esc(p.pole)} เพื่อยืนยัน</label><input class="input number" id="confirm-pole" name="confirm" required autocomplete="off" spellcheck="false"></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button danger" type="submit">ลบเสาถาวร</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault(); const form = e.currentTarget, button = form.querySelector('[type=submit]'); button.disabled = true;
    try { await api(`/api/admin/poles/${p.pole}`, { method: 'DELETE', body: JSON.stringify({ confirm: control(form, 'confirm').value }) }); toast(`ลบเสา ${p.pole} แล้ว`); await loadWorkspace(); }
    catch (error) { formError(form, error); button.disabled = false; }
  });
}
function poleForm(p = {}) {
  const editing = !!p.pole;
  const target = dialog(`<h2 id="dialog-title">${editing ? `แก้ไขเสา ${esc(p.pole)}` : 'เพิ่มเสาใหม่'}</h2><form id="pole-form" class="staff-form"><div class="field"><label for="edit-pole">หมายเลขเสา</label><input class="input number" id="edit-pole" name="pole" required pattern="T[0-9]{4}" maxlength="5" value="${esc(p.pole || '')}" ${editing ? 'readonly' : ''}></div><div class="field"><label for="edit-location">ตำแหน่ง</label><input class="input" id="edit-location" name="location" value="${esc(p.location || '')}"></div><div class="field"><label for="edit-lat">ละติจูด</label><input class="input" id="edit-lat" name="lat" type="number" step="any" value="${p.lat ?? ''}"></div><div class="field"><label for="edit-lng">ลองจิจูด</label><input class="input" id="edit-lng" name="lng" type="number" step="any" value="${p.lng ?? ''}"></div><div class="field"><label for="edit-model">รุ่นโคม</label><input class="input" id="edit-model" name="model" value="${esc(p.model || '')}"></div><div class="field"><label for="edit-installed">ติดตั้งเมื่อ</label><input class="input" id="edit-installed" name="installedAt" value="${esc(p.installed_at || '')}"></div><div class="field full"><label for="edit-notes">บันทึก</label><textarea id="edit-notes" name="notes" rows="2">${esc(p.notes || '')}</textarea></div><label class="inline full"><input name="active" type="checkbox" ${p.active === 0 ? '' : 'checked'}> เปิดใช้เสานี้</label><div class="field-error full" data-error role="alert"></div><div class="dialog-actions full"><button type="button" class="button outline" data-close>กลับ</button><button class="button primary">บันทึกเสา</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); const f = e.currentTarget; try { await action('/api/admin/poles', { pole: control(f, 'pole').value.toUpperCase(), location: control(f, 'location').value, lat: control(f, 'lat').value, lng: control(f, 'lng').value, model: control(f, 'model').value, installedAt: control(f, 'installedAt').value, notes: control(f, 'notes').value, active: control(f, 'active').checked }, 'บันทึกข้อมูลเสาแล้ว'); } catch (error) { formError(f, error); } });
}

function users() {
  if (state.role !== 'admin') return;
  const d = state.data;
  const pending = d.registrations.filter(r => r.status === 'pending');
  const userRows = d.users.map(u => `<tr data-search="${esc(`${u.username} ${u.display_name}`.toLowerCase())}"><td><span class="user-identity"><strong>${esc(u.username)}</strong>${u.display_name && u.display_name !== u.username ? `<span class="small muted">${esc(u.display_name)}</span>` : ''}</span></td><td>${u.role === 'admin' ? 'ผู้ดูแล' : 'ช่าง'}</td><td>${u.active ? '<span class="status-note">ใช้งานได้</span>' : '<span class="danger-note">ยังไม่เปิดใช้</span>'}</td><td><div class="actions"><button class="button outline small" data-edit-user="${esc(u.id)}">แก้ไข</button>${u.id !== d.user.id ? `<button class="button ghost small" data-reset="${esc(u.id)}">ตั้งรหัสใหม่</button>${u.report_count || u.job_count ? '<span class="small muted">มีประวัติงาน · ปิดใช้ในหน้าแก้ไข</span>' : `<details class="manage-menu"><summary>เพิ่มเติม</summary><button class="button danger small" data-delete-user="${esc(u.id)}">ลบบัญชี</button></details>`}` : '<span class="small muted">บัญชีที่กำลังใช้</span>'}</div></td></tr>`).join('');
  content(`<h1>บัญชีผู้ใช้</h1><p class="muted">จัดการบทบาท การเปิดใช้งาน และรหัสผ่านของแต่ละบัญชี</p>
    <section class="staff-section"><h2>คำขอสมัคร ${pending.length} รายการ</h2>${pending.length ? `<div class="panel">${pending.map(r => `<div class="staff-row"><strong>${esc(r.username)}</strong><div>${esc(r.display_name)} · ${esc(r.requested_role)}<p>ติดต่อ: ${esc(r.contact)} · ${date(r.requested_at)}</p></div><div class="actions"><button class="button primary small" data-approve="${esc(r.id)}">อนุมัติ</button><button class="button outline small" data-reject="${esc(r.id)}">ปฏิเสธ</button></div></div>`).join('')}</div>` : '<div class="empty">ไม่มีคำขอใหม่</div>'}</section>
    <section class="staff-section"><div class="section-head"><h2>บัญชีทั้งหมด</h2><button class="button primary" id="new-user" type="button">เพิ่มบัญชี</button></div><p class="small muted">บัญชีที่มีประวัติงานจะลบไม่ได้ ให้ปิดใช้งานแทนเพื่อเก็บชื่อผู้รับงานไว้</p><div class="toolbar"><label class="eyeless" for="user-filter">ค้นหาบัญชี</label><input class="input" id="user-filter" type="search" placeholder="ค้นหาชื่อผู้ใช้หรือชื่อที่แสดง"><span class="small muted" id="user-count" role="status">${d.users.length} บัญชี</span></div><div class="panel table-wrap"><table class="data-table"><thead><tr><th>ชื่อผู้ใช้</th><th>บทบาท</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody id="user-rows">${userRows}</tbody></table></div><button class="button ghost" id="self-password" style="margin-top:16px">เปลี่ยนรหัสผ่านของฉัน</button></section>`);
  document.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => review(b.dataset.approve, 'approved')));
  document.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => review(b.dataset.reject, 'rejected')));
  document.querySelectorAll('[data-edit-user]').forEach(b => b.addEventListener('click', () => editUser(d.users.find(u => u.id === b.dataset.editUser))));
  document.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => resetUser(d.users.find(u => u.id === b.dataset.reset))));
  document.querySelectorAll('[data-delete-user]').forEach(b => b.addEventListener('click', () => deleteUser(d.users.find(u => u.id === b.dataset.deleteUser))));
  $('#new-user').addEventListener('click', createUser);
  $('#user-filter').value = state.userQuery || '';
  const filterUsers = event => { state.userQuery = event.currentTarget.value; saveFilters(); const query = event.currentTarget.value.trim().toLowerCase(); let shown = 0; document.querySelectorAll('#user-rows tr').forEach(row => { row.hidden = !row.dataset.search.includes(query); if (!row.hidden) shown++; }); $('#user-count').textContent = `พบ ${shown} จาก ${d.users.length} บัญชี`; }; $('#user-filter').addEventListener('input', filterUsers); filterUsers({currentTarget:$('#user-filter')});
  $('#self-password').addEventListener('click', () => changePasswordPage(d.user));
}
function review(id, decision) {
  const target = dialog(`<h2 id="dialog-title">${decision === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอนี้?</h2><form id="review-form"><div class="field"><label for="review-reason">เหตุผล (ถ้ามี)</label><textarea id="review-reason" name="reason" rows="2"></textarea></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button ${decision === 'approved' ? 'primary' : 'danger'}">ยืนยัน</button></div></form>`);
  target.querySelector('form').addEventListener('submit', event => submitStaffForm(event, form => action(`/api/admin/registrations/${id}/review`, { decision, reason: control(form, 'reason').value }, 'บันทึกผลคำขอแล้ว'), formError));
}
function editUser(u) {
  const target = dialog(`<h2 id="dialog-title">แก้ไขบัญชี ${esc(u.username)}</h2><form id="user-form"><div class="field"><label for="user-name">ชื่อที่แสดง</label><input class="input" id="user-name" name="name" value="${esc(u.display_name)}" required></div><div class="field"><label for="user-role">บทบาท</label><select id="user-role" name="role"><option value="technician" ${u.role === 'technician' ? 'selected' : ''}>ช่างไฟฟ้า</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ผู้ดูแล</option></select></div><label class="inline"><input name="active" type="checkbox" ${u.active ? 'checked' : ''}> เปิดใช้งาน</label><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button primary">บันทึกบัญชี</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); const f = e.currentTarget; try { await action(`/api/admin/users/${u.id}`, { name: control(f, 'name').value, role: control(f, 'role').value, active: control(f, 'active').checked }, 'บันทึกบัญชีแล้ว'); } catch (error) { formError(f, error); } });
}
function createUser() {
  const target = dialog(`<h2 id="dialog-title">เพิ่มบัญชีผู้ใช้</h2><p class="muted">ระบบจะสร้างรหัสชั่วคราวให้หนึ่งครั้ง เจ้าของบัญชีต้องตั้งรหัสใหม่เมื่อเข้าสู่ระบบ</p><form id="create-user-form"><div class="field"><label for="create-username">ชื่อผู้ใช้</label><input class="input" id="create-username" name="username" required minlength="3" maxlength="40" pattern="[a-zA-Z0-9._-]{3,40}" autocomplete="off"></div><div class="field"><label for="create-name">ชื่อที่แสดง</label><input class="input" id="create-name" name="name" required maxlength="100"></div><div class="field"><label for="create-role">บทบาท</label><select id="create-role" name="role"><option value="technician">ช่างไฟฟ้า</option><option value="admin">ผู้ดูแล</option></select></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button primary" type="submit">สร้างบัญชี</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault(); const form = e.currentTarget, button = form.querySelector('[type=submit]'); button.disabled = true;
    try { const out = await post('/api/admin/users', { username: control(form, 'username').value.trim(), name: control(form, 'name').value.trim(), role: control(form, 'role').value }); showTemporaryPassword(target, out.username, out.temporaryPassword, 'สร้างบัญชีแล้ว'); }
    catch (error) { formError(form, error); button.disabled = false; }
  });
}
function deleteUser(u) {
  const target = dialog(`<h2 id="dialog-title">ลบบัญชี ${esc(u.username)}?</h2><p class="muted">ลบบัญชีและคำขอสมัครของบัญชีนี้ถาวร บัญชีที่เกี่ยวข้องกับเรื่องแจ้งหรืองานซ่อมจะลบไม่ได้ ให้ปิดใช้งานแทน</p><form id="delete-user-form"><div class="field"><label for="confirm-user">พิมพ์ ${esc(u.username)} เพื่อยืนยัน</label><input class="input" id="confirm-user" name="confirm" required autocomplete="off" spellcheck="false"></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button danger" type="submit">ลบบัญชีถาวร</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault(); const form = e.currentTarget, button = form.querySelector('[type=submit]'); button.disabled = true;
    try { await api(`/api/admin/users/${u.id}`, { method: 'DELETE', body: JSON.stringify({ confirm: control(form, 'confirm').value }) }); toast(`ลบบัญชี ${u.username} แล้ว`); await loadWorkspace(); }
    catch (error) { formError(form, error); button.disabled = false; }
  });
}
function showTemporaryPassword(target, username, password, title, inactive = false) {
  target.innerHTML = `<h2 id="dialog-title">${title}: ${esc(username)}</h2><p class="danger-note">คัดลอกรหัสชั่วคราวก่อนปิดหน้านี้ ระบบจะไม่แสดงอีก${inactive ? ' บัญชีนี้ยังปิดใช้งานอยู่ ต้องเปิดใช้ในหน้าแก้ไขก่อนเข้าสู่ระบบ' : ''}</p><p class="track-link number" id="temporary-password">${esc(password)}</p><div class="dialog-actions"><button class="button outline" id="copy-password" type="button">คัดลอก</button><button class="button primary" data-close type="button">เสร็จแล้ว</button></div>`;
  target.querySelector('[data-close]').addEventListener('click', () => { target.close(); loadWorkspace(); });
  $('#copy-password').addEventListener('click', async () => { try { await navigator.clipboard.writeText(password); toast('คัดลอกรหัสแล้ว'); } catch { toast('คัดลอกไม่ได้ กรุณาเลือกข้อความด้านบน'); } });
}
function resetUser(u) {
  const target = dialog(`<h2 id="dialog-title">ตั้งรหัสใหม่ให้ ${esc(u.username)}</h2><p>ระบบจะสร้างรหัสชั่วคราว แสดงเพียงครั้งเดียว ส่งให้เจ้าของบัญชีผ่านช่องทางที่ตกลงกันไว้</p><div class="dialog-actions"><button class="button outline" data-close>กลับ</button><button class="button primary" id="confirm-reset">สร้างรหัสชั่วคราว</button></div>`);
  $('#confirm-reset').addEventListener('click', async () => { const button = $('#confirm-reset'); button.disabled = true; try { const out = await post(`/api/admin/users/${u.id}/reset-password`); showTemporaryPassword(target, u.username, out.temporaryPassword, 'ตั้งรหัสใหม่แล้ว', !u.active); } catch (error) { toast(error.message); button.disabled = false; } });
}

function messages() {
  const d = state.data;
  content(`<h1>ข้อความ</h1><p class="muted">ข้อความเกี่ยวกับงานและการมอบหมาย</p>${state.role === 'admin' ? `<section class="staff-section"><h2>ส่งข้อความถึงช่าง</h2><form id="message-form" class="panel staff-form"><div class="field"><label for="message-tech">ช่าง</label><select id="message-tech" name="technicianId" required>${d.users.filter(u => u.role === 'technician' && u.active).map(u => `<option value="${esc(u.id)}">${esc(u.display_name)}</option>`).join('')}</select></div><div class="field"><label for="message-title">หัวข้อ</label><input class="input" id="message-title" name="title" required maxlength="150"></div><div class="field full"><label for="message-body">ข้อความ</label><textarea id="message-body" name="body" rows="3" required maxlength="1000"></textarea></div><div class="field-error full" data-error role="alert"></div><button class="button primary">ส่งข้อความ</button></form></section>` : ''}
    <section class="staff-section"><h2>ข้อความที่ได้รับ</h2>${d.notifications.length ? `<div class="panel">${d.notifications.map(n => `<div class="staff-row"><strong>${esc(n.title)}</strong><div>${esc(n.body)}<p>${date(n.created_at)}</p></div>${n.read_at ? '<span class="small muted">อ่านแล้ว</span>' : `<button class="button outline small" data-read="${esc(n.id)}">ทำเครื่องหมายว่าอ่าน</button>`}</div>`).join('')}</div>` : '<div class="empty">ยังไม่มีข้อความ</div>'}</section>`);
  $('#message-form')?.addEventListener('submit', async e => { e.preventDefault(); const f = e.currentTarget; try { await action('/api/admin/notifications', { technicianId: control(f, 'technicianId').value, title: control(f, 'title').value, body: control(f, 'body').value }, 'ส่งข้อความแล้ว'); } catch (error) { formError(f, error); } });
  document.querySelectorAll('[data-read]').forEach(b => b.addEventListener('click', async () => { try { await action(`${base()}/notifications/${b.dataset.read}/read`, {}, 'อ่านแล้ว'); } catch (error) { toast(error.message); } }));
}

function history() {
  const rows = state.data.jobs.filter(j => j.status === 2);
  content(`<h1>ประวัติซ่อม</h1><p class="muted">งานที่ซ่อมเสร็จในระบบใหม่นี้</p>${rows.length ? `<div class="panel table-wrap"><table class="data-table"><thead><tr><th>เสา</th><th>เสร็จเมื่อ</th><th>สาเหตุ</th><th>บันทึก</th>${state.role === 'admin' ? '<th>จัดการ</th>' : ''}</tr></thead><tbody>${rows.map(j => `<tr><td class="number"><strong>${esc(j.pole)}</strong></td><td class="number small">${date(j.completed_at)}</td><td>${esc(j.cause)} ${esc(j.cause_detail)}</td><td>${esc(j.public_note)}</td>${state.role === 'admin' ? `<td><button class="button outline small" data-edit-history="${esc(j.id)}">แก้ไข</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="empty">ยังไม่มีประวัติซ่อมในระบบใหม่</div>'}`);
  document.querySelectorAll('[data-edit-history]').forEach(b => b.addEventListener('click', () => editHistory(rows.find(j => j.id === b.dataset.editHistory))));
}
function editHistory(j) {
  const target = dialog(`<h2 id="dialog-title">แก้ไขประวัติเสา ${esc(j.pole)}</h2><form id="history-form"><div class="field"><label for="history-cause">สาเหตุ</label><select id="history-cause" name="cause">${state.data.causes.map(c => `<option value="${esc(c)}" ${j.cause === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div><div class="field"><label for="history-detail">รายละเอียดสาเหตุ</label><textarea id="history-detail" name="causeDetail" rows="2">${esc(j.cause_detail)}</textarea></div><div class="field"><label for="history-note">บันทึกสาธารณะ</label><textarea id="history-note" name="note" rows="2">${esc(j.public_note)}</textarea></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button primary">บันทึกการแก้ไข</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); const f = e.currentTarget; try { await action(`/api/admin/history/${j.id}`, { cause: control(f, 'cause').value, causeDetail: control(f, 'causeDetail').value, note: control(f, 'note').value }, 'แก้ไขประวัติแล้ว'); } catch (error) { formError(f, error); } });
}
