// Capture the form synchronously: Event.currentTarget is cleared after dispatch.
export async function submitStaffForm(event, task, onError) {
  event.preventDefault();
  const form = event.currentTarget;
  if (form.dataset.saving === 'true') return;
  const button = form.querySelector('button:not([type="button"])');
  const label = button?.textContent;
  form.dataset.saving = 'true';
  if (button) { button.disabled = true; button.textContent = 'กำลังบันทึก…'; }
  try { await task(form); }
  catch (error) { onError(form, error); }
  finally {
    delete form.dataset.saving;
    if (button && form.dataset.unavailable !== 'true') { button.disabled = false; button.textContent = label; }
  }
}

const DRAFT_LIFETIME = 24 * 60 * 60 * 1000;
export function readWorkDraft(storage, key, now = Date.now()) {
  try {
    const value = JSON.parse(storage.getItem(key) || 'null');
    if (!value || typeof value.updatedAt !== 'number' || now - value.updatedAt > DRAFT_LIFETIME || value.updatedAt > now + 60000) return null;
    const fields = {};
    for (const name of ['note', 'cause', 'causeDetail']) if (typeof value.fields?.[name] === 'string') fields[name] = value.fields[name].slice(0, 2000);
    return { fields, hasPhoto: value.hasPhoto === true, updatedAt: value.updatedAt };
  } catch { return null; }
}
export function saveWorkDraft(storage, key, fields, hasPhoto, now = Date.now()) {
  try { storage.setItem(key, JSON.stringify({ fields, hasPhoto, updatedAt: now })); return true; }
  catch { return false; }
}

export function selectPoleReports(reports, pole) {
  return reports.filter(report => report.pole === pole && report.status < 2).map(report => report.id);
}
