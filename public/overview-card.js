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
      <p class="overview-report-meta"><span>${reporterContact(report)}</span>${beforePhoto(report)}</p>
    </div>
  </li>`).join('');
  const viewWork = `<button type="button" class="button outline" data-open-pole="${esc(group.pole)}">ดูงานของเสานี้</button>`;

  return `<article class="panel overview-card" data-work-pole="${esc(group.pole)}">
    <div class="overview-card-head"><div><h3 class="number">${esc(group.pole)} <small>×${reports.length}</small></h3><p class="muted">${esc(group.location || 'ยังไม่ระบุตำแหน่ง')}</p></div><span class="overview-status ${active ? 'doing' : 'waiting'}">${status} · ${countLabel(reports.length)}</span></div>
    ${group.urgent ? `<p class="overview-hazard">${hazardIcon}<span>เสี่ยงอันตราย: ${esc(dangerousSymptom || 'ตรวจสอบอาการก่อนเริ่มงาน')}</span></p>` : ''}
    <details class="staff-card-details"><summary>ดูรูปและรายละเอียด ${reports.length} เรื่อง</summary>
    <div class="overview-card-meta"><p>ผู้รับผิดชอบ: ${esc(owner)}</p>${group.dueAt ? `<p class="${group.dueAt < Date.now() ? 'overdue' : ''}">${group.dueAt < Date.now() ? 'เกินกำหนด' : 'กำหนดเสร็จ'} ${date(group.dueAt)}</p>` : ''}</div>
    <ul class="overview-report-list" aria-label="เรื่องแจ้งของเสา ${esc(group.pole)}">${rows}</ul>
    <div class="overview-card-actions">${viewWork}</div>
    </details>
  </article>`;
}
