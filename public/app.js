import { $, control, esc, date, badge, api, post, shell, toast, showError, photoData } from './shared.js';
import { staffPage } from './staff.js';
import { readRecentReports, rememberReport, clearRecentReports, trackingPath } from './tracking.js';

const symptoms = ['ไฟไม่ติด', 'ไฟติด ๆ ดับ ๆ', 'ไฟสว่างน้อย', 'เสาหรือโคมชำรุด', 'สายไฟหลุดหรือห้อยต่ำ', 'อื่น ๆ'];
let reportPhoto = '', photoPending = false, photoFailed = false, photoGeneration = 0, reportRequestId = '';
const getPole = value => {
  const text = String(value || '').trim().toUpperCase();
  const digits = text.startsWith('T') ? text.slice(1) : text;

  return /^\d{1,4}$/.test(digits)
    ? `T${digits.padStart(4, '0')}`
    : text;
};


function reportPage() {
  reportPhoto = ''; photoPending = false; photoFailed = false; reportRequestId = crypto.randomUUID();
  document.title = 'แจ้งไฟถนนเสีย · LightFix';
  shell(`<div class="shell report-hero">
    <section class="report-main" aria-labelledby="report-heading">
      <h1 id="report-heading" class="page-title">พบไฟถนนเสีย<br>แจ้งได้ตรงเสา</h1>
      <p class="lead">ใช้หมายเลขบนเสาแจ้งเหตุได้ทันที ไม่ต้องสมัครบัญชี เมื่อส่งแล้วจะได้ลิงก์ติดตามงานซ่อม</p>
      <form id="report-form" novalidate>
        <div class="form-grid">
          <div class="field full" id="pole-field"><label for="pole">หมายเลขเสา <span class="required">*</span></label>
            <input class="input pole-input" id="pole" name="pole" placeholder="T0001" autocomplete="off" inputmode="text" maxlength="5" required aria-describedby="pole-help pole-error">
            <span id="pole-help" class="field-note">ดูหมายเลขบนป้ายที่เสาไฟ เช่น T0001</span><span id="pole-error" class="field-error" role="status"></span></div>
          <div class="field full"><span class="label" id="symptom-label">อาการที่พบ <span class="required">*</span></span>
            <div class="symptoms" role="radiogroup" aria-labelledby="symptom-label">${symptoms.map(s => `<label class="symptom"><input type="radio" name="symptom" value="${esc(s)}"><span><svg class="symptom-check" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 10 4 4 8-8"/></svg><span class="symptom-text">${esc(s)}</span></span></label>`).join('')}</div>
            <span id="symptom-error" class="field-error" role="status"></span></div>
          <div class="emergency-warning full" id="emergency-warning" hidden role="status"><strong>อย่าเข้าใกล้หรือสัมผัสเสาและสายไฟ</strong><p>ถอยออกจากจุดอันตรายและแจ้งหน่วยงานฉุกเฉินในพื้นที่ทันที แบบฟอร์มนี้เป็นการแจ้งซ่อม ไม่ใช่ช่องทางรับเหตุฉุกเฉิน</p><span class="small">หากสะดวก โปรดให้เบอร์หรือ LINE เพื่อให้เจ้าหน้าที่สอบถามตำแหน่งเพิ่มเติม</span></div>
          <div class="field full" id="other-symptom-field" hidden><label for="other-symptom">อธิบายอาการเพิ่มเติม <span class="required">*</span></label><textarea id="other-symptom" rows="2" maxlength="250" placeholder="เช่น โคมหลุดจากแขนเสา" aria-describedby="other-symptom-error"></textarea><span id="other-symptom-error" class="field-error" role="status"></span></div>
          <div class="field"><label for="contact-type">ให้เจ้าหน้าที่ติดต่อกลับทางไหน?</label><select id="contact-type" name="contactType"><option value="none">ติดตามผ่านลิงก์ ไม่ขอรับการติดต่อกลับ</option><option value="phone">เบอร์โทรศัพท์</option><option value="line">LINE ID</option><option value="email">อีเมล</option></select><span class="field-note" id="contact-help">ทุกเรื่องจะได้รับลิงก์ติดตามหลังส่งสำเร็จ</span></div>
          <div class="field" id="contact-value-field" hidden><label for="contact-value" id="contact-value-label">เบอร์โทรศัพท์</label><input class="input" id="contact-value" name="contactValue" autocomplete="tel" inputmode="tel" placeholder="เบอร์ที่ติดต่อได้" aria-describedby="contact-error"><span id="contact-error" class="field-error" role="status"></span></div>
          <div class="field full"><span class="label">รูปจุดที่เสีย <span class="muted small">(ถ้ามี)</span></span><p class="field-note" id="photo-privacy">รูปที่แนบจะแสดงบนหน้าสาธารณะ กรุณาหลีกเลี่ยงใบหน้า เอกสาร และข้อมูลบัญชี</p><div class="upload"><input aria-describedby="photo-privacy" class="visually-hidden" id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp"><input class="visually-hidden" id="camera" aria-describedby="photo-privacy" type="file" accept="image/*" capture="environment"><label class="upload-button" for="camera">ถ่ายรูป</label><label class="upload-button" for="photo">เลือกรูป</label><span class="upload-name" id="photo-name" role="status">ยังไม่ได้เลือกรูป</span><span class="field-note">ระบบย่อรูปให้ก่อนส่ง · JPG, PNG หรือ WebP สูงสุด 25 MB</span><div id="photo-preview" hidden><img id="preview-image" alt="รูปจุดที่เสียที่เลือกไว้"><button class="button ghost small" id="remove-photo" type="button">เอารูปออก</button></div></div></div>
          <div class="report-summary full" id="report-summary" role="status">เลือกเสาและอาการเพื่อดูสรุปก่อนส่ง</div>
        </div>
        <div id="form-error" class="field-error" role="alert"></div>
        <div class="form-actions"><button class="button primary" type="submit" id="submit-report">ส่งเรื่องแจ้งไฟเสีย <span aria-hidden="true">→</span></button><span class="small muted">อาการและรูปอาจแสดงบนหน้าสาธารณะ ข้อมูลผู้แจ้งเห็นเฉพาะเจ้าหน้าที่</span></div>
      </form>
    </section>
    <details class="report-help"><summary>วิธีใช้งานและสถานะการซ่อม</summary><div class="route-panel"><h2>จากเสาที่เสีย<br>ไปสู่งานซ่อม</h2>
      <ol class="route-steps"><li><b>1</b><div><strong>ระบุเสา</strong><span>ใส่หมายเลขบนป้าย</span></div></li><li><b>2</b><div><strong>บอกอาการ</strong><span>เลือกสิ่งที่พบและช่องทางติดต่อ</span></div></li><li><b>3</b><div><strong>เก็บลิงก์</strong><span>ดูสถานะได้หลังส่งเรื่อง</span></div></li></ol>
      <div class="help-statuses"><h3>สถานะของเรื่องแจ้ง</h3><div class="status-legend">${[0,1,2].map(badge).join('')}</div><p>เก็บลิงก์หลังส่งเรื่องไว้ หรือเปิดเรื่องล่าสุดในอุปกรณ์นี้จากหน้าติดตาม</p><a href="/track">ไปหน้าติดตามเรื่อง</a></div></div></details>
  </div><section class="shell recent-section" id="recent-reports" aria-label="เรื่องล่าสุดในอุปกรณ์นี้"></section>`, 'report');
  $('.report-help').open = matchMedia('(min-width: 900px)').matches;
  renderRecentReports($('#recent-reports'), true);
  const form = $('#report-form');
  const pole = $('#pole');
  const contact = $('#contact-value');
  const summary = () => { const picked = form.querySelector('input[name=symptom]:checked')?.value; $('#report-summary').textContent = `${getPole(pole.value) || 'ยังไม่ระบุเสา'} · ${picked || 'ยังไม่เลือกอาการ'} · ${$('#contact-type').value === 'none' ? 'ติดตามผ่านลิงก์' : 'ให้เจ้าหน้าที่ติดต่อกลับ'}`; };
  const selectPhoto = async event => {
    const file = event.target.files[0]; if (!file) return;
    const generation = ++photoGeneration; reportPhoto = ''; photoFailed = false; photoPending = true; $('#photo-preview').hidden = true; $('#photo-name').textContent = 'กำลังย่อรูป…';
    try { const data = await photoData(file); if (generation !== photoGeneration) return; reportPhoto = data; $('#preview-image').src = data; $('#photo-preview').hidden = false; $('#photo-name').textContent = 'รูปพร้อมส่ง · ย่อรูปแล้ว'; }
    catch (error) { if (generation === photoGeneration) { photoFailed = true; $('#photo-name').textContent = error.message + ' หรือกดเอารูปออกเพื่อส่งโดยไม่แนบรูป'; $('#photo-preview').hidden = false; $('#preview-image').removeAttribute('src'); } }
    finally { if (generation === photoGeneration) photoPending = false; }
  };
  $('#photo').addEventListener('change', selectPhoto); $('#camera').addEventListener('change', selectPhoto);
  $('#remove-photo').addEventListener('click', () => { photoGeneration++; photoPending = false; photoFailed = false; reportPhoto = ''; $('#photo').value = ''; $('#camera').value = ''; $('#photo-preview').hidden = true; $('#preview-image').removeAttribute('src'); $('#photo-name').textContent = 'ยังไม่ได้เลือกรูป'; });
  $('#contact-type').addEventListener('change', e => {
    const type = e.target.value;
    $('#contact-value-field').hidden = type === 'none'; contact.required = type !== 'none'; $('#contact-error').textContent = ''; contact.setAttribute('aria-invalid', 'false');
    $('#contact-value-label').textContent = ({phone:'เบอร์โทรศัพท์',line:'LINE ID',email:'อีเมล'})[type] || 'ช่องทางติดต่อ';
    contact.placeholder = ({ phone: 'เบอร์ที่ติดต่อได้', line: 'LINE ID', email: 'อีเมลที่ติดต่อได้', name: 'ชื่อผู้แจ้ง' })[type];
    contact.inputMode = type === 'phone' ? 'tel' : type === 'email' ? 'email' : 'text';
    contact.autocomplete = type === 'phone' ? 'tel' : type === 'email' ? 'email' : 'off';
    summary();
  });
  
  pole.addEventListener('input', () => {
    pole.value = pole.value.toUpperCase();
    $('#pole-error').textContent = '';
    pole.setAttribute('aria-invalid', 'false'); summary();
  });

  form.querySelectorAll('input[name=symptom]').forEach(radio => radio.addEventListener('change', () => {
    const other = radio.value === 'อื่น ๆ' && radio.checked;
    $('#other-symptom-field').hidden = !other;
    $('#other-symptom').required = other;
    $('#other-symptom').setAttribute('aria-invalid', 'false');
    $('#other-symptom-error').textContent = '';
    $('#symptom-error').textContent = '';
    $('#emergency-warning').hidden = !['เสาหรือโคมชำรุด', 'สายไฟหลุดหรือห้อยต่ำ'].includes(radio.value); summary();
  }));
  
  pole.addEventListener('blur', async () => {
    pole.value = getPole(pole.value);
    if (!/^T\d{4}$/.test(pole.value)) return;
    const message = $('#pole-error');
    const checkedPole = pole.value;
    try {
      const result = await api(`/api/poles/check?pole=${encodeURIComponent(checkedPole)}`);
      if (pole.value !== checkedPole) return;
      message.className = result.found ? 'field-note valid-note' : 'field-error';
      message.textContent = result.found ? (result.location ? `พบเสา: ${result.location}` : 'พบหมายเลขเสานี้') : 'ไม่พบหมายเลขเสานี้ กรุณาตรวจสอบป้าย';
    } catch {
      if (pole.value !== checkedPole) return;
      message.className = 'field-note';
      message.textContent = 'ยังตรวจหมายเลขเสาไม่ได้ ระบบจะตรวจอีกครั้งเมื่อส่งเรื่อง';
    }
  });
  form.addEventListener('submit', submitReport);
}

async function submitReport(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const pole = getPole(control(form, 'pole').value);
  const picked = form.querySelector('input[name=symptom]:checked')?.value || '';
  const otherDetail = $('#other-symptom').value.trim();
  const symptom = picked === 'อื่น ๆ' ? `อื่น ๆ: ${otherDetail}` : picked;
  const contactType = control(form, 'contactType').value;
  const contactValue = control(form, 'contactValue').value.trim();
  $('#pole-error').className = 'field-error';
  $('#pole-error').textContent = /^T\d{4}$/.test(pole) ? '' : 'กรอกหมายเลขเสารูปแบบ T0001';
  $('#symptom-error').textContent = !picked ? 'เลือกอาการที่พบ' : '';
  $('#other-symptom-error').textContent = picked === 'อื่น ๆ' && !otherDetail ? 'อธิบายอาการเพิ่มเติมก่อนส่งเรื่อง' : '';
  $('#other-symptom').setAttribute('aria-invalid', String(picked === 'อื่น ๆ' && !otherDetail));
  $('#contact-error').textContent = contactType === 'none' || contactValue ? '' : 'กรอกช่องทางที่เจ้าหน้าที่ติดต่อได้';
  control(form, 'pole').setAttribute('aria-invalid', String(!/^T\d{4}$/.test(pole)));
  control(form, 'contactValue').setAttribute('aria-invalid', String(contactType !== 'none' && !contactValue));
  $('#form-error').textContent = '';
  if (!/^T\d{4}$/.test(pole)) return control(form, 'pole').focus();
  if (!picked) return form.querySelector('input[name=symptom]').focus();
  if (picked === 'อื่น ๆ' && !otherDetail) return $('#other-symptom').focus();
  if (contactType !== 'none' && !contactValue) return control(form, 'contactValue').focus();
  if (photoFailed) { $('#form-error').textContent = 'รูปยังไม่พร้อม กรุณาเลือกรูปใหม่หรือกดเอารูปออก'; return; }
  if (photoPending) { $('#form-error').textContent = 'กำลังเตรียมรูป กรุณารอสักครู่แล้วส่งอีกครั้ง'; return; }
  const button = $('#submit-report');
  button.disabled = true; button.textContent = 'กำลังส่งเรื่อง…';
  try {
    const photo = reportPhoto;
    const requestId = reportRequestId;
    const data = await post('/api/reports', { pole, symptom, contactType, contactValue, photo, requestId });
    const url = `${location.origin}${trackingPath(data.id)}`;
    const saved = rememberReport({ id: data.id, pole });
    history.replaceState({}, '', trackingPath(data.id));
    shell(`<section class="shell report-result"><div class="success-panel"><div class="success-icon" aria-hidden="true">✓</div><h1 class="page-title" style="margin-top:22px">ส่งเรื่องเรียบร้อย</h1><p class="lead">เราได้รับแจ้งเสา <strong>${esc(pole)}</strong> แล้ว เก็บลิงก์นี้ไว้เพื่อติดตามงาน</p><div class="track-link number">${esc(url)}</div><div class="inline"><a class="button primary" href="${esc(url)}">ดูสถานะเรื่องนี้</a><button class="button outline" id="copy-track" type="button">คัดลอกลิงก์</button>${typeof navigator.share === 'function' ? '<button class="button outline" id="share-track" type="button">แชร์ลิงก์</button>' : ''}</div><p class="small muted">${saved ? 'บันทึกลิงก์ในเรื่องล่าสุดของอุปกรณ์นี้แล้ว เก็บไว้ไม่เกิน 30 วัน หากใช้เครื่องร่วมกับผู้อื่น สามารถล้างประวัติได้ที่หน้าติดตาม' : 'เบราว์เซอร์นี้บันทึกประวัติไม่ได้ กรุณาคัดลอกลิงก์หรือเพิ่มหน้านี้ในบุ๊กมาร์ก'}</p><p class="small muted">หากไม่เห็นสถานะใหม่ทันที โปรดกลับมาตรวจอีกครั้งภายหลัง</p></div></section>`, 'track');
    $('#copy-track').addEventListener('click', async () => { try { await navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว'); } catch { toast('คัดลอกไม่ได้ กรุณาเลือกข้อความลิงก์ด้านบน'); } });
    $('.success-panel .lead').insertAdjacentHTML('afterend', `<p class="report-summary">เลขเรื่อง: <strong class="number">${esc(data.id)}</strong></p>`);
    $('#share-track')?.addEventListener('click', async () => {
      try { await navigator.share({ title: `ติดตามเรื่องแจ้งเสา ${pole} · LightFix`, url }); }
      catch (error) { if (error.name !== 'AbortError') toast('แชร์ไม่ได้ กรุณาใช้ปุ่มคัดลอกลิงก์'); }
    });
    document.title = 'ส่งเรื่องเรียบร้อย · LightFix';
    $('.success-panel h1').tabIndex = -1; $('.success-panel h1').focus();
  } catch (error) {
    $('#form-error').textContent = error.message;
    button.disabled = false; button.textContent = 'ส่งเรื่องแจ้งไฟเสีย →';
  }
}

async function boardPage() {
  document.title = 'ความคืบหน้าการซ่อม · LightFix';
  shell(`<section class="shell page"><h1 class="page-title">งานซ่อมในชุมชน</h1><p class="lead">ดูเรื่องแจ้งไฟถนนและสถานะล่าสุด ข้อมูลผู้แจ้งจะไม่แสดงที่นี่</p><div class="toolbar"><label class="eyeless" for="board-pole">กรองด้วยหมายเลขเสา</label><input id="board-pole" class="input" placeholder="ค้นหาเสา เช่น T0001"><button class="button outline" id="board-search">ค้นหา</button><button class="button ghost" id="board-clear">แสดงทั้งหมด</button></div><div id="board-list" class="record-list"><p class="loading" role="status">กำลังโหลดรายการ…</p></div></section>`, 'board');
  const list = $('#board-list');
  async function load() {
    const pole = getPole($('#board-pole').value);
    list.innerHTML = '<p class="loading" role="status">กำลังโหลดรายการ…</p>';
    try {
      const rows = await api(`/api/reports${pole ? `?pole=${encodeURIComponent(pole)}` : ''}`);
      list.innerHTML = rows.length ? rows.map(r => `<a class="record" href="/track?id=${esc(r.id)}"><span class="record-title number">${esc(r.pole)}</span><span class="record-detail">${esc(r.symptom)} · ${date(r.at)}</span>${badge(r.status)}</a>`).join('') : '<div class="empty">ยังไม่มีเรื่องแจ้งในรายการนี้ <a href="/">แจ้งไฟเสีย</a></div>';
    } catch (error) { showError(list, error); }
  }
  $('#board-search').addEventListener('click', load);
  $('#board-pole').addEventListener('keydown', e => { if (e.key === 'Enter') load(); });
  $('#board-clear').addEventListener('click', () => { $('#board-pole').value = ''; load(); });
  await load();
}

async function trackPage() {
  document.title = 'ติดตามเรื่อง · LightFix';
  const id = new URLSearchParams(location.search).get('id') || '';
  shell(`<section class="shell page"><h1 class="page-title">ติดตามเรื่องแจ้ง</h1><p class="lead">เปิดลิงก์ที่ได้หลังส่งเรื่อง หรือใส่รหัสจากลิงก์เพื่อตรวจสถานะ</p><div class="toolbar"><label class="eyeless" for="track-id">รหัสเรื่องแจ้ง</label><input id="track-id" class="input number" placeholder="รหัสเรื่องแจ้ง" value="${esc(id)}"><button class="button primary" id="track-search">ดูสถานะ</button></div><div id="track-detail"></div><section class="recent-section" id="recent-reports" aria-label="เรื่องล่าสุดในอุปกรณ์นี้"></section></section>`, 'track');
  renderRecentReports($('#recent-reports'));
  const target = $('#track-detail');
  async function load() {
    const value = $('#track-id').value.trim().toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(value)) { target.innerHTML = '<div class="error-box" role="alert">กรุณาใช้ลิงก์ติดตามจากหน้าส่งเรื่องสำเร็จ</div>'; return; }
    target.innerHTML = '<p class="loading" role="status">กำลังตรวจสถานะ…</p>';
    try {
      const r = await api(`/api/reports/${value}`);
      history.replaceState({}, '', `/track?id=${value}`);
      const steps = [{ title: 'รับเรื่องแจ้ง', time: r.at }, { title: 'เริ่มงานซ่อม', time: r.startedAt }, { title: 'ซ่อมเสร็จ', time: r.doneAt }];
      target.innerHTML = `<div class="detail-grid"><article class="panel"><div class="inline" style="justify-content:space-between"><h2 class="section-heading number" style="margin:0">เสา ${esc(r.pole)}</h2>${badge(r.status)}</div><p>${esc(r.symptom)}</p>${r.note ? `<p><strong>บันทึกงาน:</strong> ${esc(r.note)}</p>` : ''}${r.cause ? `<p><strong>สาเหตุ:</strong> ${esc(r.cause)} ${esc(r.causeDetail)}</p>` : ''}<div class="photo-pair">${r.hasBefore ? `<figure><a href="/media/${value}/before" target="_blank" rel="noopener" aria-label="เปิดรูปก่อนซ่อมเสา ${esc(r.pole)} ขนาดเต็มในแท็บใหม่"><img src="/media/${value}/before" alt="รูปก่อนซ่อมเสา ${esc(r.pole)}"></a><figcaption>ก่อนซ่อม · เลือกภาพเพื่อเปิดขนาดเต็ม</figcaption></figure>` : ''}${r.hasAfter ? `<figure><a href="/media/${value}/after" target="_blank" rel="noopener" aria-label="เปิดรูปหลังซ่อมเสา ${esc(r.pole)} ขนาดเต็มในแท็บใหม่"><img src="/media/${value}/after" alt="รูปหลังซ่อมเสา ${esc(r.pole)}"></a><figcaption>หลังซ่อม · เลือกภาพเพื่อเปิดขนาดเต็ม</figcaption></figure>` : ''}</div></article><aside class="panel"><h2 class="section-heading">เส้นทางของเรื่องนี้</h2><ol class="timeline">${steps.map((s, i) => `<li><strong>${s.title}</strong><div class="small muted">${s.time ? date(s.time) : 'รอดำเนินการ'}</div></li>`).join('')}</ol><div class="road-line"></div></aside></div>`;
    } catch (error) { showError(target, error); }
  }
  $('#track-search').addEventListener('click', load);
  $('#track-id').addEventListener('keydown', e => { if (e.key === 'Enter') load(); });
  if (id) await load();
}

function renderRecentReports(target, hideEmpty = false) {
  const rows = readRecentReports();
  if (!rows.length && hideEmpty) { target.hidden = true; return; }
  target.hidden = false;
  target.innerHTML = `<div class="section-head"><h2 class="section-heading">เรื่องล่าสุดในอุปกรณ์นี้</h2>${rows.length ? '<button class="button outline small" id="clear-recent" type="button">ล้างประวัติในอุปกรณ์นี้</button>' : ''}</div><p class="small muted">เก็บเฉพาะเลขเรื่อง หมายเลขเสา และเวลาที่ส่ง ไม่เกิน 10 เรื่อง ภายใน 30 วัน ไม่เก็บข้อมูลติดต่อหรือรูปในประวัตินี้ การล้างประวัติไม่ยกเลิกเรื่องแจ้ง</p>${rows.length ? `<div class="record-list">${rows.map(row => `<a class="record" href="${trackingPath(row.id)}"><strong class="record-title number">${esc(row.pole)}</strong><span>ดูสถานะ</span><span class="record-detail">ส่งเมื่อ ${date(row.at)} · เลขเรื่อง ${esc(row.id)}</span></a>`).join('')}</div>` : '<p class="empty">ยังไม่มีเรื่องที่บันทึกไว้ในเบราว์เซอร์นี้ หากส่งจากเครื่องอื่น ให้เปิดลิงก์ติดตามที่เก็บไว้</p>'}<p class="small muted">หากใช้เครื่องร่วมกับผู้อื่น ให้ล้างประวัติหลังใช้งาน</p>`;
  $('#clear-recent')?.addEventListener('click', () => {
    if (!clearRecentReports()) { toast('ล้างประวัติไม่ได้ กรุณาตรวจการอนุญาตเก็บข้อมูลของเบราว์เซอร์'); return; }
    renderRecentReports(target, hideEmpty); toast('ล้างประวัติในอุปกรณ์นี้แล้ว เรื่องแจ้งยังอยู่ในระบบ');
  });
}

const path = location.pathname;
if (path === '/' || path === '/index.html') reportPage();
else if (path === '/board') boardPage();
else if (path === '/track') trackPage();
else if (['/admin','/admin/','/technician','/technician/'].includes(path)) staffPage(path.split('/')[1]);
else { shell(`<section class="shell page"><h1 class="page-title">ไม่พบหน้านี้</h1><p class="lead">ตรวจสอบที่อยู่เว็บ หรือกลับไปหน้าแจ้งไฟเสีย</p><a class="button primary" href="/">กลับหน้าแรก</a></section>`); }
