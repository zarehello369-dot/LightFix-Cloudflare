import { $, esc, date, shell, toast } from './shared.js';
import { repairProgressMarkup } from './repair-progress.js';

const receiptIcon = (name, paths, size = 20) => `<svg class="receipt-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" data-receipt-icon="${name}">${paths}</svg>`;
const check = receiptIcon('check', '<path d="m5 12 4 4L19 6"/>', 32);
const copy = receiptIcon('copy', '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>', 18);
const share = receiptIcon('share', '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-4M9 14l6 4"/>', 18);
const calendar = receiptIcon('calendar', '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>');
const clock = receiptIcon('clock', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>');

export function reportReceiptMarkup({ id, pole, url, saved, sentAt }) {
  return `<section class="shell receipt-page" aria-labelledby="receipt-title">
    <header class="receipt-intro">
      <div class="receipt-check" aria-hidden="true">${check}</div>
      <h1 id="receipt-title" class="page-title" tabindex="-1">ส่งเรื่องเรียบร้อย</h1>
      <p>รับแจ้งเสา ${esc(pole)} แล้ว เก็บลิงก์ไว้ติดตามงาน</p>
    </header>
    <div class="receipt-layout">
      <article class="receipt-card" aria-label="ใบรับเรื่องแจ้ง">
        <div class="receipt-card-heading"><h2>เสา ${esc(pole)}</h2><span class="receipt-status">รับเรื่องแล้ว</span></div>
        <div class="receipt-reference"><span>เลขอ้างอิง</span><strong class="number">${esc(id)}</strong></div>
        <div class="receipt-link"><span>ลิงก์ติดตามเรื่อง</span><p id="receipt-url" class="number">${esc(url)}</p></div>
        <p class="receipt-date">${calendar}<time datetime="${new Date(sentAt).toISOString()}">${date(sentAt)}</time></p>
        <div class="receipt-next-action">
          <p>รอเจ้าหน้าที่ตรวจสอบและจัดคิวซ่อม</p>
          <a class="button primary receipt-primary" href="${esc(url)}">ติดตามงานซ่อม <span aria-hidden="true">→</span></a>
          <div class="receipt-actions"><button class="button outline" id="copy-reference" type="button">${copy}คัดลอกเลขอ้างอิง</button><button class="button outline" id="share-track" type="button">${share}แชร์ลิงก์</button></div>
          <p class="receipt-keep-link">เก็บลิงก์นี้ไว้ เพื่อติดตามเรื่องได้ทุกอุปกรณ์</p>
        </div>
        <a class="receipt-another" href="/">แจ้งเสาอื่น</a>
      </article>
      <aside class="receipt-support" aria-label="ขั้นตอนถัดไปและคำแนะนำ">
        <section class="receipt-steps repair-progress" aria-labelledby="receipt-steps-title">${repairProgressMarkup({ at: sentAt, status: 0 }, 'receipt-steps-title')}</section>
        <div class="receipt-notice">${clock}<p>หากไม่เห็นสถานะใหม่ทันที<br>โปรดกลับมาตรวจอีกครั้งภายหลัง</p></div>
        <p class="receipt-storage">${saved ? 'บันทึกลิงก์ไว้ในเรื่องล่าสุดของอุปกรณ์นี้แล้ว เก็บไว้ไม่เกิน 30 วัน หากใช้เครื่องร่วมกับผู้อื่น สามารถล้างประวัติได้ที่หน้าติดตาม' : 'เบราว์เซอร์นี้บันทึกประวัติไม่ได้ กรุณาคัดลอกลิงก์หรือเพิ่มหน้านี้ในบุ๊กมาร์ก'}</p>
      </aside>
    </div>
  </section>`;
}

export function showReportReceipt(receipt) {
  shell(reportReceiptMarkup(receipt), 'track');
  document.body.dataset.view = 'report-receipt';
  async function copyLink(message = 'คัดลอกลิงก์แล้ว') {
    try { await navigator.clipboard.writeText(receipt.url); toast(message); }
    catch { toast('คัดลอกไม่ได้ กรุณาเลือกข้อความลิงก์ด้านบน'); }
  }
  $('#copy-reference').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(receipt.id); toast('คัดลอกเลขอ้างอิงแล้ว'); }
    catch { toast('คัดลอกไม่ได้ กรุณาเลือกเลขอ้างอิงด้านบน'); }
  });
  $('#share-track').addEventListener('click', async () => {
    if (typeof navigator.share !== 'function') return copyLink('อุปกรณ์นี้แชร์โดยตรงไม่ได้ คัดลอกลิงก์ให้แล้ว');
    try { await navigator.share({ title: `ติดตามเรื่องแจ้งเสา ${receipt.pole} · LightFix`, url: receipt.url }); }
    catch (error) { if (error.name !== 'AbortError') toast('แชร์ไม่ได้ กรุณาเลือกข้อความลิงก์ด้านบนเพื่อคัดลอก'); }
  });
  document.title = 'ส่งเรื่องเรียบร้อย · LightFix';
  window.scrollTo({ top: 0, behavior: 'instant' });
  $('#receipt-title').focus({ preventScroll: true });
}
