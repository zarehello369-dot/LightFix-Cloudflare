import { esc, badge, toast } from './shared.js';
import { repairProgressMarkup } from './repair-progress.js';

const lineIcon = (path, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
const photoIcon = lineIcon('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>', 28);
const zoom = lineIcon('<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6M10 7v6"/>', 18);
const copy = lineIcon('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>', 18);
const share = lineIcon('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/>', 18);

function photoMarkup(r, id, phase) {
  const before = phase === 'before';
  const label = before ? 'ก่อนซ่อม' : 'หลังซ่อม';
  const available = before ? r.hasBefore : r.hasAfter;
  return `<figure class="tracking-photo"><div class="tracking-photo-slot">${available
    ? `<a href="/media/${id}/${phase}" target="_blank" rel="noopener" aria-label="เปิดรูป${label}เสา ${esc(r.pole)} ขนาดเต็มในแท็บใหม่"><img src="/media/${id}/${phase}" alt="รูป${label}เสา ${esc(r.pole)}" width="400" height="400" loading="lazy"><span class="tracking-zoom">${zoom}</span></a>`
    : `<div class="tracking-no-photo">${photoIcon}<span>ยังไม่มีรูป${label}</span></div>`}</div><figcaption>${label}${available ? ' · แตะเพื่อดูรูปเต็ม' : ''}</figcaption></figure>`;
}

export function trackingDetailMarkup(r, id) {
  return `<div class="tracking-layout">
    <article class="tracking-card" aria-label="รายละเอียดเรื่องแจ้ง">
      <div class="tracking-summary">
        <div class="tracking-pole"><h2>เสา ${esc(r.pole)}</h2>${badge(r.status)}</div>
        <p class="tracking-reference">เลขเรื่อง <span class="number">${esc(id)}</span></p>
        <dl class="tracking-facts"><div><dt>อาการที่แจ้ง</dt><dd>${esc(r.symptom)}</dd></div><div><dt>บันทึกงาน</dt><dd>${r.note ? esc(r.note) : 'ยังไม่มีบันทึกงาน'}</dd></div><div><dt>สาเหตุ</dt><dd>${r.cause ? `${esc(r.cause)}${r.causeDetail ? ` · ${esc(r.causeDetail)}` : ''}` : 'ยังไม่ระบุสาเหตุ'}</dd></div></dl>
      </div>
      <section class="tracking-photos" aria-labelledby="tracking-photos-title"><div class="tracking-photo-heading"><h2 id="tracking-photos-title">ภาพการซ่อม</h2><span>ภาพย่อ 1:1</span></div><div class="tracking-photo-pair">${photoMarkup(r, id, 'before')}${photoMarkup(r, id, 'after')}</div></section>
      <div class="tracking-actions"><button class="button outline" id="tracking-copy-reference" type="button">${copy}คัดลอกเลขอ้างอิง</button><button class="button outline" id="tracking-share" type="button">${share}แชร์ลิงก์</button></div>
    </article>
    <aside class="tracking-progress repair-progress" aria-labelledby="tracking-progress-title">${repairProgressMarkup(r, 'tracking-progress-title')}</aside>
  </div>`;
}

export function wireTrackingDetail(target, report, id) {
  target.querySelector('#tracking-copy-reference').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(id); toast('คัดลอกเลขอ้างอิงแล้ว'); }
    catch { toast('คัดลอกไม่ได้ กรุณาเลือกเลขเรื่องด้านบน'); }
  });
  target.querySelector('#tracking-share').addEventListener('click', async () => {
    const url = `${location.origin}/track?id=${id}`;
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: `ติดตามเรื่องแจ้งเสา ${report.pole} · LightFix`, url }); }
      catch (error) { if (error.name !== 'AbortError') toast('แชร์ไม่ได้ กรุณาคัดลอกลิงก์จากแถบที่อยู่'); }
    } else {
      try { await navigator.clipboard.writeText(url); toast('คัดลอกลิงก์ให้แล้ว พร้อมนำไปแชร์'); }
      catch { toast('คัดลอกลิงก์ไม่ได้ กรุณาคัดลอกจากแถบที่อยู่'); }
    }
  });
  target.querySelectorAll('.tracking-photo img').forEach(img => img.addEventListener('error', () => {
    const link = img.closest('a');
    const message = document.createElement('span');
    message.className = 'tracking-photo-error';
    message.textContent = 'โหลดภาพย่อไม่ได้ · แตะเพื่อเปิดรูปเต็ม';
    img.hidden = true; link.append(message);
  }, { once: true }));
}
