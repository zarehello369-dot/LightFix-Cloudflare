import { reveal, settle, installMotion } from './motion.js';
export { reveal, settle };
export const $ = selector => document.querySelector(selector);
export const control = (form, name) => form.elements.namedItem(name);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const date = value => value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(Number(value)) : 'ยังไม่ระบุ';
export const icon = `<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 31.5c0-3.1-1.4-4.5-3-6.6a11.5 11.5 0 1 1 19 0c-1.6 2.1-3 3.5-3 6.6H17.5Z"/><path d="M18 36h12M20 40h8M24 3v3M8.5 9.5l2.2 2.2M39.5 9.5l-2.2 2.2M4 23h3M44 23h-3"/></g></svg>`;
export const badge = status => `<span class="badge ${['wait','doing','done','cancel'][status] || 'wait'}">${['รอรับเรื่อง','กำลังซ่อม','ซ่อมเสร็จ','ยกเลิก'][status] || 'รอรับเรื่อง'}</span>`;

export async function api(path, options = {}) {
  let response;
  try { response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(options.body ? { 'content-type': 'application/json' } : {}), ...options.headers } }); }
  catch { throw new Error('เชื่อมต่อไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง'); }
  let result;
  try { result = await response.json(); } catch { throw new Error('ระบบตอบกลับไม่ถูกต้อง กรุณาลองใหม่'); }
  if (!response.ok || !result.ok) { const error = new Error(result.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'); error.code = result.error; throw error; }
  return result.data;
}
export const post = (path, data = {}) => api(path, { method: 'POST', body: JSON.stringify(data) });

export function enhancePasswordFields(root) {
  root.querySelectorAll('input[type="password"]').forEach(input => {
    if (input.closest('.password-control')) return;
    const wrap = document.createElement('div');
    wrap.className = 'password-control';
    input.before(wrap); wrap.append(input);
    const toggle = document.createElement('button');
    toggle.type = 'button'; toggle.className = 'password-toggle';
    toggle.setAttribute('aria-controls', input.id);
    const update = () => {
      const visible = input.type === 'text';
      toggle.setAttribute('aria-label', visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
      toggle.setAttribute('aria-pressed', String(visible));
      toggle.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>${visible ? '<path d="m3 3 18 18"/>' : ''}</svg>`;
    };
    toggle.addEventListener('click', () => { input.type = input.type === 'password' ? 'text' : 'password'; update(); });
    update(); wrap.append(toggle);
  });
}

let toastTimer;
let headerScrollListener;
export function toast(message) {
  const target = $('#toast');
  target.textContent = message;
  target.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => target.classList.remove('show'), 5000);
}

export function shell(content, current = '') {
  installMotion();
  const staff = current === 'admin' || current === 'technician';
  document.body.dataset.area = staff ? 'staff' : 'public';
  $('#app').innerHTML = `<header class="site-header"><div class="shell">
    <a class="brand" href="/" aria-label="LightFix หน้าแรก">${icon}</a>
    <a class="site-name" href="/">LightFix</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="เปิดเมนู">เมนู</button>
    <nav id="site-nav" class="site-nav" aria-label="เมนูหลัก">
      <a href="/" ${current === 'report' ? 'aria-current="page"' : ''}>แจ้งไฟเสีย</a>
      <a href="/board" ${current === 'board' ? 'aria-current="page"' : ''}>งานซ่อมในชุมชน</a>
      <a href="/track" ${current === 'track' ? 'aria-current="page"' : ''}>เรื่องที่ฉันแจ้ง</a>
      <a href="/technician" ${current === 'technician' ? 'aria-current="page"' : ''}>ช่างไฟฟ้า</a>
      <a class="nav-cta" href="/admin" ${current === 'admin' ? 'aria-current="page"' : ''}>เจ้าหน้าที่</a>
    </nav></div></header><main id="main">${content}</main>
    <footer class="site-footer"><div class="shell"><span>LightFix · แจ้งไฟถนนเสีย ติดตามงานซ่อม</span><span><a href="/board">ดูงานซ่อมในชุมชน</a><a href="/technician">พื้นที่ช่างไฟฟ้า</a></span></div></footer>`;
  if (headerScrollListener) window.removeEventListener('scroll', headerScrollListener);
  const header = $('.site-header');
  headerScrollListener = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  window.addEventListener('scroll', headerScrollListener, { passive:true });
  headerScrollListener();
  $('.menu-toggle')?.addEventListener('click', event => {
    const open = $('#site-nav').classList.toggle('open');
    header.classList.toggle('menu-open', open);
    event.currentTarget.setAttribute('aria-expanded', String(open));
    event.currentTarget.setAttribute('aria-label', open ? 'ปิดเมนู' : 'เปิดเมนู');
  });
}
export function showError(target, error) {
  target.innerHTML = `<div class="error-box" role="alert">${esc(error.message || error)} <button type="button" class="button small outline">ลองใหม่</button></div>`;
  target.querySelector('button')?.addEventListener('click', () => location.reload());
}
export async function photoData(file) {
  if (!file) return '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('เปิดรูปนี้ไม่ได้ กรุณาเลือกรูป JPG, PNG หรือถ่ายรูปใหม่');
  if (file.size > 25_000_000) throw new Error('รูปใหญ่เกิน 25 MB กรุณาเลือกรูปที่เล็กลง');
  const source = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = source; await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [.85, .7, .5]) {
      const result = canvas.toDataURL('image/jpeg', quality);
      if (result.length * .75 <= 1_500_000) return result;
    }
    throw new Error('ย่อรูปไม่สำเร็จ กรุณาถ่ายใหม่หรือเลือกรูปอื่น');
  } catch (error) { throw new Error(error.message?.includes('กรุณา') ? error.message : 'อ่านรูปไม่ได้ กรุณาถ่ายใหม่หรือเลือกรูปอื่น'); }
  finally { URL.revokeObjectURL(source); }
}
