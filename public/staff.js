import { $, control, esc, date, badge, api, post, shell, toast, showError, photoData } from './shared.js';

const state = { role: '', tab: 'overview', data: null, selected: new Set() };
const roleLabel = role => role === 'admin' ? 'เจ้าหน้าที่' : 'ช่างไฟฟ้า';
const contactLabel = type => ({ phone: 'โทรศัพท์', line: 'LINE', email: 'อีเมล', name: 'ชื่อ' })[type] || 'ข้อมูลผู้แจ้ง';
const base = () => state.role === 'admin' ? '/api/admin' : '/api';

export async function staffPage(role) {
  state.role = role;
  document.title = `${roleLabel(role)} · LightFix`;
  shell(`<section class="shell page"><div id="staff-root"><p class="loading" role="status">กำลังตรวจการเข้าสู่ระบบ…</p></div></section>`, role);
  try {
    const me = await api(`${base()}/auth/me`);
    if (me.role !== role) return loginPage('บัญชีนี้ใช้กับพื้นที่อื่น กรุณาเข้าสู่ระบบให้ตรงบทบาท');
    if (me.mustChangePassword) return changePasswordPage(me);
    await loadWorkspace();
  } catch (error) { if (error.code === 'LOGIN_REQUIRED') loginPage(); else showError($('#staff-root'), error); }
}

function loginPage(message = '') {
  $('#staff-root').innerHTML = `<div class="login-wrap"><div class="panel"><h1>เข้าสู่พื้นที่${roleLabel(state.role)}</h1>
    <p class="muted">${state.role === 'admin' ? 'ใช้ชื่อผู้ใช้และรหัสผ่าน LightFix เพื่อจัดการเรื่องแจ้งและงานซ่อม' : 'ใช้ชื่อผู้ใช้ LightFix เพื่อดูงานและอัปเดตการซ่อม'}</p>
    ${message ? `<div class="error-box" role="alert">${esc(message)}</div>` : ''}
    <form id="login-form"><div class="field"><label for="username">ชื่อผู้ใช้</label><input class="input" id="username" name="username" autocomplete="username" required></div>
    <div class="field"><label for="password">รหัสผ่าน</label><input class="input" id="password" name="password" type="password" autocomplete="current-password" required></div>
    <div id="login-error" class="field-error" role="alert"></div><button class="button primary" type="submit">เข้าสู่ระบบ</button></form>
    <button id="show-register" class="button ghost" type="button">ขอบัญชีใหม่</button></div></div>`;
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
  try { state.data = await api(`${base()}/workspace`); renderWorkspace(); }
  catch (error) { if (error.code === 'PASSWORD_CHANGE_REQUIRED') return changePasswordPage(await api(`${base()}/auth/me`)); showError($('#staff-root'), error); }
}

function renderWorkspace() {
  const data = state.data;
  const tabs = state.role === 'admin' ? [['overview','ภาพรวม'],['reports','เรื่องแจ้ง'],['jobs','งานซ่อม'],['poles','ข้อมูลเสา'],['users','บัญชีผู้ใช้'],['messages','ข้อความ'],['history','ประวัติซ่อม']] : [['overview','ภาพรวม'],['reports','เรื่องแจ้ง'],['jobs','งานซ่อม'],['poles','ข้อมูลเสา'],['messages','ข้อความ'],['history','ประวัติซ่อม']];
  $('#staff-root').innerHTML = `<div class="staff-layout"><aside class="staff-rail"><div class="staff-identity"><h2>${roleLabel(state.role)}<span>${esc(data.user.name)}</span></h2><button id="logout" class="button ghost small" type="button">ออกจากระบบ</button></div><label class="staff-nav-label" for="staff-view">หน้าทำงาน</label><select id="staff-view" class="staff-view-select" aria-label="เลือกหน้าทำงาน">${tabs.map(([key,label]) => `<option value="${key}" ${state.tab === key ? 'selected' : ''}>${label}</option>`).join('')}</select><nav aria-label="เมนูพื้นที่ทำงาน">${tabs.map(([key,label]) => `<button type="button" data-tab="${key}" ${state.tab === key ? 'aria-current="page"' : ''}>${label}</button>`).join('')}</nav></aside><div class="staff-main"><div id="staff-content"></div></div></div><dialog class="dialog" id="task-dialog" aria-labelledby="dialog-title"></dialog>`;
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
    state.tab = button.dataset.tab;
    renderWorkspace();
    document.querySelector(`[data-tab="${state.tab}"]`)?.focus();
  }));
  $('#staff-view').addEventListener('change', event => {
    state.tab = event.currentTarget.value;
    renderWorkspace();
    $('#staff-view').focus();
  });
  $('#logout').addEventListener('click', async () => { await post(`${base()}/auth/logout`); loginPage(); });
  renderTab();
}

function renderTab() {
  const views = { overview, reports, jobs, poles, users, messages, history };
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
function content(html) { $('#staff-content').innerHTML = html; enhanceTables(); }
function dialog(html) {
  const target = $('#task-dialog'); target.innerHTML = html; target.showModal();
  target.querySelector('[data-close]')?.addEventListener('click', () => target.close());
  return target;
}
async function action(path, data, success) {
  await post(path, data); toast(success); state.selected.clear(); state.data = await api(`${base()}/workspace`); renderWorkspace();
}
function formError(form, error) { const box = form.querySelector('[data-error]'); if (box) box.textContent = error.message; }
function statusCount(n) { return state.data.reports.filter(r => r.status === n).length; }

function overview() {
  const d = state.data, open = d.reports.filter(r => r.status < 2);
  content(`<h1>งานวันนี้</h1><p class="muted">${state.role === 'admin' ? 'ตรวจเรื่องใหม่ มอบหมาย และดูงานที่กำลังทำ' : 'ดูเรื่องที่รับได้และงานที่ต้องอัปเดต'}</p>
    <div class="metric-row"><div class="metric"><strong>${statusCount(0)}</strong><span>รอรับเรื่อง</span></div><div class="metric"><strong>${statusCount(1)}</strong><span>กำลังซ่อม</span></div><div class="metric"><strong>${d.notifications.filter(n => !n.read_at).length}</strong><span>ข้อความยังไม่อ่าน</span></div></div>
    <section class="staff-section"><h2>เรื่องที่ต้องดู</h2>${open.length ? `<div class="panel">${open.slice(0,8).map(r => `<div class="staff-row"><strong class="number">${esc(r.pole)}</strong><div>${esc(r.symptom)}<p>${date(r.at)}</p></div>${badge(r.status)}</div>`).join('')}</div>` : '<div class="empty">ยังไม่มีเรื่องที่ต้องดำเนินการ</div>'}</section>
    <section class="staff-section"><h2>ข้อความล่าสุด</h2>${d.notifications.length ? `<div class="panel">${d.notifications.slice(0,4).map(n => `<div class="staff-row"><strong>${esc(n.title)}</strong><div>${esc(n.body)}<p>${date(n.created_at)}</p></div>${n.read_at ? '<span class="small muted">อ่านแล้ว</span>' : '<span class="badge wait">ใหม่</span>'}</div>`).join('')}</div>` : '<div class="empty">ยังไม่มีข้อความ</div>'}</section>`);
}

function reports() {
  const d = state.data, rows = d.reports;
  content(`<h1>เรื่องแจ้ง</h1><p class="muted">เลือกเรื่องของเสาเดียวกันได้สูงสุด 3 เรื่องเพื่อเริ่มงาน${state.role === 'admin' ? 'หรือมอบหมาย' : ''}</p>
    <div class="toolbar"><button class="button dark" id="start-job">เริ่มงานจากที่เลือก</button>${state.role === 'admin' ? '<button class="button outline" id="assign-job">มอบหมาย</button><button class="button ghost" id="cancel-job">ยกเลิกเรื่องของเสา</button>' : ''}<span class="small muted" id="selected-count">เลือก ${state.selected.size} เรื่อง</span></div>
    ${rows.length ? `<div class="panel table-wrap"><table class="data-table reports-table"><thead><tr><th>เลือก</th><th>เสา / อาการ</th><th>สถานะ</th><th>วันที่</th><th>ผู้รับงาน</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r.status === 0 ? `<input type="checkbox" aria-label="เลือกเรื่องเสา ${esc(r.pole)}" data-report="${esc(r.id)}" ${state.selected.has(r.id) ? 'checked' : ''}>` : ''}</td><td><strong class="number">${esc(r.pole)}</strong><br>${esc(r.symptom)}<br><span class="small muted">${contactLabel(r.contactType)}: ${esc(r.contactValue)}</span></td><td>${badge(r.status)}</td><td class="small number">${date(r.at)}</td><td class="small">${r.assignedId ? 'มอบหมายแล้ว' : 'ยังไม่มอบหมาย'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">ยังไม่มีเรื่องแจ้งในพื้นที่ของคุณ</div>'}`);
  document.querySelectorAll('[data-report]').forEach(input => input.addEventListener('change', () => { input.checked ? state.selected.add(input.dataset.report) : state.selected.delete(input.dataset.report); $('#selected-count').textContent = `เลือก ${state.selected.size} เรื่อง`; }));
  $('#start-job').addEventListener('click', startSelected);
  $('#assign-job')?.addEventListener('click', assignSelected);
  $('#cancel-job')?.addEventListener('click', cancelPole);
}

function selectedReports() {
  const rows = state.data.reports.filter(r => state.selected.has(r.id));
  if (!rows.length || rows.length > 3 || new Set(rows.map(r => r.pole)).size !== 1 || rows.some(r => r.status !== 0)) { toast('เลือกเรื่องรอรับ 1–3 เรื่องของเสาเดียวกัน'); return null; }
  return rows;
}
function startSelected() {
  const rows = selectedReports(); if (!rows) return;
  const target = dialog(`<h2 id="dialog-title">เริ่มงานเสา ${esc(rows[0].pole)}</h2><p>รับงาน ${rows.length} เรื่องเข้าสู่การซ่อม</p><div class="dialog-actions"><button class="button outline" data-close>กลับ</button><button class="button primary" id="confirm-start">ยืนยันเริ่มงาน</button></div>`);
  $('#confirm-start').addEventListener('click', async () => { try { await action(`${base()}/jobs/start`, { pole: rows[0].pole, reportIds: rows.map(r => r.id) }, 'เริ่มงานแล้ว'); state.selected.clear(); } catch (e) { toast(e.message); } finally { target.close(); } });
}
function assignSelected() {
  const rows = selectedReports(); if (!rows) return;
  const techs = state.data.users.filter(u => u.role === 'technician' && u.active);
  if (!techs.length) return toast('ยังไม่มีบัญชีช่างที่ใช้งานได้');
  const target = dialog(`<h2 id="dialog-title">มอบหมายเสา ${esc(rows[0].pole)}</h2><form id="assign-form"><div class="field"><label for="assign-tech">ช่างที่รับงาน</label><select id="assign-tech" name="technicianId">${techs.map(u => `<option value="${esc(u.id)}">${esc(u.display_name)}</option>`).join('')}</select></div><div class="field"><label for="assign-due">กำหนดเสร็จ (ถ้ามี)</label><input class="input" type="datetime-local" id="assign-due" name="due"></div><div class="field"><label for="assign-instructions">รายละเอียดงาน</label><textarea id="assign-instructions" name="instructions" rows="3"></textarea></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button primary">มอบหมายงาน</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); const f = e.currentTarget; try { await action('/api/admin/assign', { pole: rows[0].pole, reportIds: rows.map(r => r.id), technicianId: control(f, 'technicianId').value, dueAt: control(f, 'due').value ? new Date(control(f, 'due').value).getTime() : null, instructions: control(f, 'instructions').value }, 'มอบหมายงานแล้ว'); state.selected.clear(); target.close(); } catch (error) { formError(f, error); } });
}
function cancelPole() {
  const rows = selectedReports(); if (!rows) return;
  const target = dialog(`<h2 id="dialog-title">ยกเลิกเรื่องของเสา ${esc(rows[0].pole)}?</h2><p>เรื่องที่ยังเปิดอยู่ทั้งหมดของเสานี้จะถูกยกเลิก และเหตุผลจะแสดงต่อสาธารณะ</p><form id="cancel-form"><div class="field"><label for="cancel-note">เหตุผล</label><textarea id="cancel-note" name="note" required rows="3"></textarea></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button danger">ยืนยันยกเลิก</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); try { await action('/api/admin/cancel', { pole: rows[0].pole, note: control(e.currentTarget, 'note').value }, 'ยกเลิกเรื่องแล้ว'); state.selected.clear(); } catch (error) { formError(e.currentTarget, error); } });
}

function jobs() {
  const rows = state.data.jobs.filter(j => j.status === 1);
  content(`<h1>งานซ่อม</h1><p class="muted">เปิดงานเพื่อบันทึกความคืบหน้าหรือปิดงานพร้อมรูปหลังซ่อม</p>
    ${rows.length ? `<div class="record-list">${rows.map(j => `<article class="panel"><div class="inline" style="justify-content:space-between"><h2 class="section-heading number" style="margin:0">เสา ${esc(j.pole)}</h2>${badge(1)}</div><p class="small muted">เริ่ม ${date(j.started_at)}${j.due_at ? ` · กำหนด ${date(j.due_at)}` : ''}</p>${j.instructions ? `<p><strong>รายละเอียด:</strong> ${esc(j.instructions)}</p>` : ''}${j.public_note ? `<p><strong>บันทึก:</strong> ${esc(j.public_note)}</p>` : ''}<div class="actions"><button class="button outline small" data-note="${esc(j.id)}">บันทึกความคืบหน้า</button><button class="button primary small" data-finish="${esc(j.id)}">ปิดงานซ่อม</button></div></article>`).join('')}</div>` : '<div class="empty">ไม่มีงานที่กำลังซ่อม <button class="button ghost" data-tab="reports">ดูเรื่องแจ้ง</button></div>'}`);
  document.querySelectorAll('[data-note]').forEach(b => b.addEventListener('click', () => noteJob(b.dataset.note)));
  document.querySelectorAll('[data-finish]').forEach(b => b.addEventListener('click', () => finishJob(b.dataset.finish)));
  $('#staff-content [data-tab=reports]')?.addEventListener('click', () => { state.tab = 'reports'; renderWorkspace(); });
}
function noteJob(jobId) {
  const job = state.data.jobs.find(j => j.id === jobId);
  const target = dialog(`<h2 id="dialog-title">บันทึกงานเสา ${esc(job.pole)}</h2><form id="note-form"><div class="field"><label for="job-note">ข้อความความคืบหน้า</label><textarea id="job-note" name="note" rows="4" maxlength="500">${esc(job.public_note)}</textarea><span class="field-note">ข้อความนี้แสดงบนหน้าติดตามเรื่อง</span></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button primary">บันทึก</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); try { await action(`${base()}/jobs/${jobId}/note`, { note: control(e.currentTarget, 'note').value }, 'บันทึกความคืบหน้าแล้ว'); } catch (error) { formError(e.currentTarget, error); } });
}
function finishJob(jobId) {
  const job = state.data.jobs.find(j => j.id === jobId);
  const target = dialog(`<h2 id="dialog-title">ปิดงานเสา ${esc(job.pole)}</h2><p>เพิ่มรูปหลังซ่อมและสาเหตุที่ตรวจพบก่อนยืนยัน</p><form id="finish-form"><div class="field"><label for="finish-cause">สาเหตุ <span class="required">*</span></label><select id="finish-cause" name="cause" required><option value="">เลือกสาเหตุ</option>${state.data.causes.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div><div class="field"><label for="finish-detail">รายละเอียดสาเหตุ (ถ้ามี)</label><textarea id="finish-detail" name="causeDetail" rows="2"></textarea></div><div class="field"><label for="finish-note">บันทึกสำหรับผู้แจ้ง</label><textarea id="finish-note" name="note" rows="2">${esc(job.public_note)}</textarea></div><div class="field"><label for="finish-photo">รูปหลังซ่อม <span class="required">*</span></label><input id="finish-photo" name="photo" type="file" accept="image/jpeg,image/png" required><span class="field-note">JPG หรือ PNG ไม่เกิน 1.5 MB</span></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button primary">ยืนยันปิดงาน</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); const f = e.currentTarget, button = f.querySelector('button:not([type=button])'); button.disabled = true; button.textContent = 'กำลังบันทึก…'; try { const photo = await photoData(control(f, 'photo').files[0]); await action(`${base()}/jobs/${jobId}/finish`, { cause: control(f, 'cause').value, causeDetail: control(f, 'causeDetail').value, note: control(f, 'note').value, photo }, 'ปิดงานซ่อมแล้ว'); } catch (error) { formError(f, error); button.disabled = false; button.textContent = 'ยืนยันปิดงาน'; } });
}

function poles() {
  const rows = state.data.poles;
  content(`<h1>ข้อมูลเสา</h1><p class="muted">ดูตำแหน่งและจำนวนงานของเสา${state.role === 'admin' ? ' หรือเพิ่มและแก้ไขข้อมูลเสา' : ''}</p>
    <div class="toolbar"><label class="eyeless" for="pole-filter">ค้นหาหมายเลขเสา</label><input class="input" id="pole-filter" placeholder="ค้นหาเสา"><span class="small muted">${rows.length} เสา</span>${state.role === 'admin' ? '<button class="button primary" id="new-pole">เพิ่มเสา</button>' : ''}</div>
    <div class="panel table-wrap"><table class="data-table"><thead><tr><th>หมายเลข</th><th>ตำแหน่ง</th><th>เรื่องเปิด</th><th>ซ่อมแล้ว</th>${state.role === 'admin' ? '<th>จัดการ</th>' : ''}</tr></thead><tbody id="pole-rows"></tbody></table></div>`);
  const draw = () => {
    const filter = $('#pole-filter').value.trim().toUpperCase();
    $('#pole-rows').innerHTML = rows.filter(p => !filter || p.pole.includes(filter) || p.location?.includes(filter)).map(p => `<tr><td class="number"><strong>${esc(p.pole)}</strong>${p.active ? '' : '<br><span class="small muted">ปิดใช้</span>'}</td><td>${esc(p.location || 'ไม่ระบุตำแหน่ง')}</td><td class="number">${p.open_count}</td><td class="number">${p.repair_count}</td>${state.role === 'admin' ? `<td><button class="button outline small" data-edit-pole="${esc(p.pole)}">แก้ไข</button></td>` : ''}</tr>`).join('') || '<tr><td colspan="5" class="muted">ไม่พบเสาที่ค้นหา</td></tr>';
    enhanceTables();
    document.querySelectorAll('[data-edit-pole]').forEach(b => b.addEventListener('click', () => poleForm(rows.find(p => p.pole === b.dataset.editPole))));
  };
  $('#pole-filter').addEventListener('input', draw); draw();
  $('#new-pole')?.addEventListener('click', () => poleForm());
}
function poleForm(p = {}) {
  const editing = !!p.pole;
  const target = dialog(`<h2 id="dialog-title">${editing ? `แก้ไขเสา ${esc(p.pole)}` : 'เพิ่มเสาใหม่'}</h2><form id="pole-form" class="staff-form"><div class="field"><label for="edit-pole">หมายเลขเสา</label><input class="input number" id="edit-pole" name="pole" required pattern="T[0-9]{4}" maxlength="5" value="${esc(p.pole || '')}" ${editing ? 'readonly' : ''}></div><div class="field"><label for="edit-location">ตำแหน่ง</label><input class="input" id="edit-location" name="location" value="${esc(p.location || '')}"></div><div class="field"><label for="edit-lat">ละติจูด</label><input class="input" id="edit-lat" name="lat" type="number" step="any" value="${p.lat ?? ''}"></div><div class="field"><label for="edit-lng">ลองจิจูด</label><input class="input" id="edit-lng" name="lng" type="number" step="any" value="${p.lng ?? ''}"></div><div class="field"><label for="edit-model">รุ่นโคม</label><input class="input" id="edit-model" name="model" value="${esc(p.model || '')}"></div><div class="field"><label for="edit-installed">ติดตั้งเมื่อ</label><input class="input" id="edit-installed" name="installedAt" value="${esc(p.installed_at || '')}"></div><div class="field full"><label for="edit-notes">บันทึก</label><textarea id="edit-notes" name="notes" rows="2">${esc(p.notes || '')}</textarea></div><label class="inline full"><input name="active" type="checkbox" ${p.active === 0 ? '' : 'checked'}> เปิดใช้เสานี้</label><div class="field-error full" data-error role="alert"></div><div class="dialog-actions full"><button type="button" class="button outline" data-close>กลับ</button><button class="button primary">บันทึกเสา</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); const f = e.currentTarget; try { await action('/api/admin/poles', { pole: control(f, 'pole').value.toUpperCase(), location: control(f, 'location').value, lat: control(f, 'lat').value, lng: control(f, 'lng').value, model: control(f, 'model').value, installedAt: control(f, 'installedAt').value, notes: control(f, 'notes').value, active: control(f, 'active').checked }, 'บันทึกข้อมูลเสาแล้ว'); } catch (error) { formError(f, error); } });
}

function users() {
  if (state.role !== 'admin') return;
  const d = state.data;
  content(`<h1>บัญชีผู้ใช้</h1><p class="muted">จัดการบทบาท การเปิดใช้งาน และรหัสผ่านของแต่ละบัญชี</p>
    <section class="staff-section"><h2>คำขอสมัคร ${d.registrations.filter(r => r.status === 'pending').length} รายการ</h2>${d.registrations.filter(r => r.status === 'pending').length ? `<div class="panel">${d.registrations.filter(r => r.status === 'pending').map(r => `<div class="staff-row"><strong>${esc(r.username)}</strong><div>${esc(r.display_name)} · ${esc(r.requested_role)}<p>ติดต่อ: ${esc(r.contact)} · ${date(r.requested_at)}</p></div><div class="actions"><button class="button primary small" data-approve="${esc(r.id)}">อนุมัติ</button><button class="button outline small" data-reject="${esc(r.id)}">ปฏิเสธ</button></div></div>`).join('')}</div>` : '<div class="empty">ไม่มีคำขอใหม่</div>'}</section>
    <section class="staff-section"><h2>บัญชีทั้งหมด</h2><div class="panel table-wrap"><table class="data-table"><thead><tr><th>ชื่อผู้ใช้</th><th>บทบาท</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${d.users.map(u => `<tr><td><span class="user-identity"><strong>${esc(u.username)}</strong>${u.display_name && u.display_name !== u.username ? `<span class="small muted">${esc(u.display_name)}</span>` : ''}</span></td><td>${u.role === 'admin' ? 'ผู้ดูแล' : 'ช่าง'}</td><td>${u.active ? '<span class="status-note">ใช้งานได้</span>' : '<span class="danger-note">ยังไม่เปิดใช้</span>'}</td><td><div class="actions"><button class="button outline small" data-edit-user="${esc(u.id)}">แก้ไข</button>${u.id !== d.user.id ? `<button class="button ghost small" data-reset="${esc(u.id)}">ตั้งรหัสใหม่</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div><button class="button ghost" id="self-password" style="margin-top:16px">เปลี่ยนรหัสผ่านของฉัน</button></section>`);
  document.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => review(b.dataset.approve, 'approved')));
  document.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => review(b.dataset.reject, 'rejected')));
  document.querySelectorAll('[data-edit-user]').forEach(b => b.addEventListener('click', () => editUser(d.users.find(u => u.id === b.dataset.editUser))));
  document.querySelectorAll('[data-reset]').forEach(b => b.addEventListener('click', () => resetUser(d.users.find(u => u.id === b.dataset.reset))));
  $('#self-password').addEventListener('click', () => changePasswordPage(d.user));
}
function review(id, decision) {
  const target = dialog(`<h2 id="dialog-title">${decision === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}คำขอนี้?</h2><form id="review-form"><div class="field"><label for="review-reason">เหตุผล (ถ้ามี)</label><textarea id="review-reason" name="reason" rows="2"></textarea></div><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button ${decision === 'approved' ? 'primary' : 'danger'}">ยืนยัน</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); try { await action(`/api/admin/registrations/${id}/review`, { decision, reason: control(e.currentTarget, 'reason').value }, 'บันทึกผลคำขอแล้ว'); } catch (error) { formError(e.currentTarget, error); } });
}
function editUser(u) {
  const target = dialog(`<h2 id="dialog-title">แก้ไขบัญชี ${esc(u.username)}</h2><form id="user-form"><div class="field"><label for="user-name">ชื่อที่แสดง</label><input class="input" id="user-name" name="name" value="${esc(u.display_name)}" required></div><div class="field"><label for="user-role">บทบาท</label><select id="user-role" name="role"><option value="technician" ${u.role === 'technician' ? 'selected' : ''}>ช่างไฟฟ้า</option><option value="admin" ${u.role === 'admin' ? 'selected' : ''}>ผู้ดูแล</option></select></div><label class="inline"><input name="active" type="checkbox" ${u.active ? 'checked' : ''}> เปิดใช้งาน</label><div class="field-error" data-error role="alert"></div><div class="dialog-actions"><button type="button" class="button outline" data-close>กลับ</button><button class="button primary">บันทึกบัญชี</button></div></form>`);
  target.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); const f = e.currentTarget; try { await action(`/api/admin/users/${u.id}`, { name: control(f, 'name').value, role: control(f, 'role').value, active: control(f, 'active').checked }, 'บันทึกบัญชีแล้ว'); } catch (error) { formError(f, error); } });
}
function resetUser(u) {
  const target = dialog(`<h2 id="dialog-title">ตั้งรหัสใหม่ให้ ${esc(u.username)}</h2><p>ระบบจะสร้างรหัสชั่วคราว แสดงเพียงครั้งเดียว ส่งให้เจ้าของบัญชีผ่านช่องทางที่ตกลงกันไว้</p><div class="dialog-actions"><button class="button outline" data-close>กลับ</button><button class="button primary" id="confirm-reset">สร้างรหัสชั่วคราว</button></div>`);
  $('#confirm-reset').addEventListener('click', async () => { const button = $('#confirm-reset'); button.disabled = true; try { const out = await post(`/api/admin/users/${u.id}/reset-password`); target.innerHTML = `<h2 id="dialog-title">รหัสชั่วคราวสำหรับ ${esc(u.username)}</h2><p class="danger-note">คัดลอกก่อนปิดหน้านี้ ระบบจะไม่แสดงรหัสนี้อีก${u.active ? '' : ' และต้องเปิดใช้บัญชีในหน้าแก้ไขก่อนเข้าสู่ระบบ'}</p><p class="track-link number" id="temporary-password">${esc(out.temporaryPassword)}</p><div class="dialog-actions"><button class="button outline" id="copy-password">คัดลอก</button><button class="button primary" data-close>เสร็จแล้ว</button></div>`; target.querySelector('[data-close]').addEventListener('click', () => { target.close(); loadWorkspace(); }); $('#copy-password').addEventListener('click', async () => { try { await navigator.clipboard.writeText(out.temporaryPassword); toast('คัดลอกรหัสแล้ว'); } catch { toast('คัดลอกไม่ได้ กรุณาเลือกข้อความด้านบน'); } }); } catch (error) { toast(error.message); button.disabled = false; } });
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
