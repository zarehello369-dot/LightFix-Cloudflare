export const $ = selector => document.querySelector(selector);
export const control = (form, name) => form.elements.namedItem(name);
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const date = value => value ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(Number(value)) : 'ยังไม่ระบุ';
export const icon = `<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M32 9a18 18 0 0 0-10 33v5h20v-5A18 18 0 0 0 32 9Z" fill="#f4c928"/><path d="M24 53h16M27 59h10" stroke="#f4c928" stroke-width="4" stroke-linecap="round"/><path d="M32 18v5m-10 5 4 3m16-3-4 3" stroke="#17252b" stroke-width="3" stroke-linecap="round"/></svg>`;
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
    <a class="brand" href="/" aria-label="LightFix หน้าแรก">${icon}<span>LightFix</span></a>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">เมนู</button>
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
