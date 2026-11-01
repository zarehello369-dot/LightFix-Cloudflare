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

let toastTimer;
export function toast(message) {
  const target = $('#toast');
  target.textContent = message;
  target.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => target.classList.remove('show'), 5000);
}

export function shell(content, current = '') {
  $('#app').innerHTML = `<header class="site-header"><div class="shell">
    <a class="brand" href="/" aria-label="LightFix หน้าแรก">${icon}</a>
    <span class="site-name">LightFix</span>
    <a class="header-track" href="/track">ติดตามเรื่อง</a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="เปิดเมนู">เมนู</button>
    <nav id="site-nav" class="site-nav" aria-label="เมนูหลัก">
      <a href="/" ${current === 'report' ? 'aria-current="page"' : ''}>แจ้งไฟเสีย</a>
      <a href="/board" ${current === 'board' ? 'aria-current="page"' : ''}>ความคืบหน้า</a>
      <a href="/track" ${current === 'track' ? 'aria-current="page"' : ''}>ติดตามเรื่อง</a>
      <a href="/technician" ${current === 'technician' ? 'aria-current="page"' : ''}>ช่างไฟฟ้า</a>
      <a class="nav-cta" href="/admin" ${current === 'admin' ? 'aria-current="page"' : ''}>เจ้าหน้าที่</a>
    </nav></div></header><main id="main">${content}</main>
    <footer class="site-footer"><div class="shell"><span>LightFix · แจ้งไฟถนนเสีย ติดตามงานซ่อม</span><span><a href="/board">ดูความคืบหน้า</a><a href="/technician">พื้นที่ช่างไฟฟ้า</a></span></div></footer>`;
  $('.menu-toggle')?.addEventListener('click', event => {
    const open = $('#site-nav').classList.toggle('open');
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
  if (!['image/jpeg', 'image/png'].includes(file.type)) throw new Error('รูปต้องเป็น JPG หรือ PNG');
  if (file.size > 1_500_000) throw new Error('รูปต้องมีขนาดไม่เกิน 1.5 MB');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('อ่านรูปไม่ได้ กรุณาเลือกใหม่'));
    reader.readAsDataURL(file);
  });
}
