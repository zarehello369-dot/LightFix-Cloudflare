import { date, esc } from './shared.js';
import { uiIcon } from './ui-icons.js';

const contactLabel = type => ({ phone: 'โทรศัพท์', line: 'LINE', email: 'อีเมล', name: 'ชื่อ' })[type] || 'ข้อมูลผู้แจ้ง';
const countLabel = count => `${count} เรื่องแจ้ง`;
const reporterContact = report => {
  const value=esc(report.contactValue || 'ไม่ได้ระบุ');
  return report.contactType==='name' && /ติดตามผ่านลิงก์|ไม่ขอรับการติดต่อกลับ/.test(report.contactValue || '')
    ? value : `${contactLabel(report.contactType)}: ${value}`;
};
const hazardIcon = uiIcon('warning', 18);
const photoIcon = uiIcon('image', 18);
const beforePhoto = report => report.hasBefore
  ? `<a class="overview-photo-link" href="/media/${encodeURIComponent(report.id)}/before" target="_blank" rel="noopener" aria-label="ดูรูปก่อนซ่อมของเรื่อง ${esc(report.symptom || 'ไม่ระบุอาการ')} (เปิดแท็บใหม่)">${photoIcon} ดูรูปก่อนซ่อม</a>`
  : `<span class="overview-photo-missing">${photoIcon} ไม่มีรูปก่อนซ่อม</span>`;

export function overviewCard(group, { active = false, viewerId = '', viewerName = '' } = {}) {
  const reports = group.reports;
  const owner = group.assignedName || (group.assignedId === viewerId ? viewerName : group.assignedId ? 'มอบหมายแล้ว' : 'ยังไม่มอบหมาย');
  const dangerousSymptom = reports.find(report => /สายไฟ|เสาหรือโคมชำรุด/.test(report.symptom))?.symptom;
  const status = active ? 'กำลังซ่อม' : 'รอรับเรื่อง';
  const rows = reports.map(report => `<li class="overview-report-row">
    <div class="overview-report-copy">
      <h3>${esc(report.symptom || 'ไม่ระบุอาการ')}</h3>
      <p class="overview-report-time">แจ้งเมื่อ ${date(report.at)}</p>
      <p>${reporterContact(report)} · ${beforePhoto(report)}</p>
    </div>
    ${active ? '' : `<button type="button" class="button outline overview-accept-one" data-start-report="${esc(report.id)}" data-start-pole="${esc(group.pole)}" aria-label="รับเรื่อง ${esc(report.symptom || 'ไม่ระบุอาการ')} ที่แจ้งเมื่อ ${date(report.at)}">รับ</button>`}
  </li>`).join('');
  const actions = active
    ? `<button type="button" class="button primary" data-open-pole="${esc(group.pole)}">เปิดงานเสา ${esc(group.pole)}</button>`
    : `${reports.length > 1 && reports.length <= 3 ? `<button type="button" class="button primary" data-start-pole="${esc(group.pole)}">รับทั้ง ${reports.length} เรื่อง</button>` : ''}
       <button type="button" class="button outline" data-assign-pole="${esc(group.pole)}">${group.assignedId ? 'เปลี่ยนผู้รับผิดชอบ' : 'มอบหมายช่าง'}</button>`;

  return `<article class="panel overview-card" data-work-pole="${esc(group.pole)}">
    <div class="overview-card-head"><h3 class="number">${esc(group.pole)}</h3><span class="overview-status ${active ? 'doing' : 'waiting'}">${status} · ${countLabel(reports.length)}</span></div>
    ${group.urgent ? `<p class="overview-hazard">${hazardIcon}<span>เสี่ยงอันตราย: ${esc(dangerousSymptom || 'ตรวจสอบอาการก่อนเริ่มงาน')}</span></p>` : ''}
    <div class="overview-card-meta"><div><span>ตำแหน่ง</span><strong>${esc(group.location || 'ยังไม่ระบุตำแหน่ง')}</strong></div><p>ผู้รับผิดชอบ: ${esc(owner)}</p>${group.dueAt ? `<p class="${group.dueAt < Date.now() ? 'overdue' : ''}">${group.dueAt < Date.now() ? 'เกินกำหนด' : 'กำหนดเสร็จ'} ${date(group.dueAt)}</p>` : ''}</div>
    <ul class="overview-report-list" aria-label="เรื่องแจ้งของเสา ${esc(group.pole)}">${rows}</ul>
    <div class="overview-card-actions">${actions}</div>
  </article>`;
}
