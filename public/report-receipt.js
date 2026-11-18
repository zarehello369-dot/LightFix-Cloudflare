import { $, esc, date, shell, toast } from './shared.js';
import { repairProgressMarkup } from './repair-progress.js';
import { uiIcon } from './ui-icons.js';

const check = uiIcon('check', 32, 'receipt-icon');
const copy = uiIcon('copy', 18, 'receipt-icon');
const share = uiIcon('share', 18, 'receipt-icon');
const calendar = uiIcon('calendar', 20, 'receipt-icon');
const clock = uiIcon('clock', 20, 'receipt-icon');

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
          <a class="button primary receipt-primary" href="${esc(url)}">ติดตามงานซ่อม ${uiIcon('arrowRight',20)}</a>
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
