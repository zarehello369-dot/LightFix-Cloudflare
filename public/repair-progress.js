import { date } from './shared.js';

/** Both the submission receipt and tracking page use the same truthful timeline. */
export function repairProgressMarkup(report, headingId) {
  const steps = [
    { title: 'รับเรื่องแจ้งแล้ว', at: report.at },
    { title: 'เริ่มงานซ่อม', at: report.startedAt },
    { title: 'ซ่อมเสร็จ', at: report.doneAt }
  ];
  const canceled = report.status === 3;
  const current = canceled ? -1 : report.doneAt ? 2 : report.startedAt ? 1 : 0;
  const check = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  return `<h2 id="${headingId}">ความคืบหน้า</h2>${canceled ? '<p class="progress-canceled">เรื่องแจ้งนี้ถูกยกเลิก</p>' : ''}<ol>${steps.map((step, i) => {
    const recorded = Number.isFinite(Number(step.at)) && Number(step.at) > 0;
    return `<li class="${recorded ? 'is-complete' : ''}"${i === current ? ' aria-current="step"' : ''}><span class="progress-step-dot" aria-hidden="true">${recorded ? check : ''}</span><div><strong>${step.title}</strong><p>${recorded ? `<time datetime="${new Date(Number(step.at)).toISOString()}">${date(Number(step.at))}</time>` : canceled ? 'ไม่ได้ดำเนินการ' : 'รอดำเนินการ'}</p></div></li>`;
  }).join('')}</ol>`;
}
