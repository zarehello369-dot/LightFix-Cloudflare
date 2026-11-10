import { $, control, esc, date, badge, api, post, shell, toast, showError, photoData, icon, reveal } from './shared.js';
import { installMobilePickers } from './mobile-picker.js';
import { staffPage } from './staff.js';
import { readRecentReports, rememberReport, clearRecentReports, trackingPath } from './tracking.js';
import { createLatestRequest } from './requests.js';
import { poleFromPage } from './pole-link.js';

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
  shell(`<div class="shell report-hero report-redesign">
    <header class="report-intro">
      <h1 id="report-heading" class="page-title">แจ้งไฟเสีย</h1>
      <p class="lead">ระบุหมายเลขเสา เลือกอาการ แล้วส่งเรื่องได้เลย ไม่ต้องสมัครบัญชี</p>
      <ol class="report-steps" role="progressbar" aria-label="ความครบถ้วนของข้อมูลแจ้งเหตุ" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0">${['หมายเลขเสา','อาการ','ช่องทางติดต่อ','พร้อมส่ง'].map((label,index)=>`<li aria-hidden="true"><span class="report-step-marker" aria-hidden="true">${index+1}</span><span class="visually-hidden">${label} </span><span class="visually-hidden" data-progress-state>ยังไม่ครบ</span></li>`).join('')}</ol>
    </header>
    <section class="report-main" aria-labelledby="report-heading">
      <form id="report-form" novalidate>
        <div class="form-grid">
          <div class="field full" id="pole-field"><label for="pole"><span class="section-number" aria-hidden="true">1</span> หมายเลขเสา <span class="required">*</span></label>
            <input class="input pole-input" id="pole" name="pole" placeholder="T0001" autocomplete="off" inputmode="text" maxlength="5" required aria-describedby="pole-help pole-error">
            <span id="pole-help" class="field-note">ดูหมายเลขบนป้ายที่เสาไฟ เช่น T0001 หรือเปิดลิงก์/QR ประจำเสาเพื่อตั้งเลขอัตโนมัติ</span>
            <span id="pole-error" class="field-error" role="status"></span></div>
          <div class="field full"><span class="label" id="symptom-label"><span class="section-number" aria-hidden="true">2</span> อาการที่พบ <span class="required">*</span></span>
            <div class="symptoms" role="radiogroup" aria-labelledby="symptom-label">${symptoms.map((s, index) => `<label class="symptom${index === 4 ? ' symptom-hazard' : ''}"><input type="radio" name="symptom" value="${esc(s)}"><span><svg class="symptom-check" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 10 4 4 8-8"/></svg><span class="symptom-icon" aria-hidden="true"><img src="/icons/${['lightbulb-off','lightbulb','sun-dim','lamp-wall-down','zap','ellipsis'][index]}.svg" alt="" width="28" height="28"></span><span class="symptom-text">${esc(s)}${index === 4 ? '<small>อันตราย! อย่าเข้าใกล้ และโทรแจ้งเจ้าหน้าที่</small>' : ''}</span></span></label>`).join('')}</div>
            <span id="symptom-error" class="field-error" role="status"></span></div>
          <div class="emergency-warning full" id="emergency-warning" hidden role="alert"><strong>อันตราย: อย่าเข้าใกล้หรือสัมผัสเสาและสายไฟ</strong><p>ถอยออกจากจุดอันตรายและแจ้งหน่วยงานฉุกเฉินในพื้นที่ทันที แบบฟอร์มนี้เป็นการแจ้งซ่อม ไม่ใช่ช่องทางรับเหตุฉุกเฉิน</p><span>หากสะดวก โปรดให้เบอร์หรือ LINE เพื่อให้เจ้าหน้าที่สอบถามตำแหน่งเพิ่มเติม</span></div>
          <div class="field full" id="other-symptom-field" hidden><label for="other-symptom">อธิบายอาการเพิ่มเติม <span class="required">*</span></label><textarea id="other-symptom" rows="2" maxlength="250" placeholder="เช่น โคมหลุดจากแขนเสา" aria-describedby="other-symptom-error"></textarea><span id="other-symptom-error" class="field-error" role="status"></span></div>
          <div class="field"><label for="contact-type"><span class="section-number" aria-hidden="true">3</span> ช่องทางติดต่อ</label><select id="contact-type" name="contactType" aria-describedby="contact-help"><option value="none">ติดตามผ่านลิงก์เท่านั้น</option><option value="phone">เบอร์โทรศัพท์</option><option value="line">LINE ID</option><option value="email">อีเมล</option></select><span class="field-note" id="contact-help">ทุกเรื่องจะได้รับลิงก์ติดตามหลังส่งสำเร็จ เลือกเบอร์โทร LINE หรืออีเมล หากต้องการให้ติดต่อกลับ</span></div>
          <div class="field" id="contact-value-field" hidden><label for="contact-value" id="contact-value-label">เบอร์โทรศัพท์</label><input class="input" id="contact-value" name="contactValue" autocomplete="tel" inputmode="tel" placeholder="เบอร์ที่ติดต่อได้" aria-describedby="contact-error"><span id="contact-error" class="field-error" role="status"></span></div>
          <div class="field full"><span class="label"><span class="section-number" aria-hidden="true">4</span> รูปประกอบ <span class="muted small">(ถ้ามี)</span></span><div class="upload"><p class="field-note photo-privacy" id="photo-privacy">รูปจะปรากฏบนหน้าสาธารณะ กรุณาหลีกเลี่ยงใบหน้า เอกสาร และข้อมูลบัญชี</p><input aria-describedby="photo-privacy" class="visually-hidden" id="photo" aria-label="เลือกรูปจุดที่เสีย" name="photo" type="file" accept="image/jpeg,image/png,image/webp"><input class="visually-hidden" id="camera" aria-label="ถ่ายรูปจุดที่เสีย" aria-describedby="photo-privacy" type="file" accept="image/*" capture="environment"><label class="upload-button" for="camera">ถ่ายรูป</label><label class="upload-button" for="photo">เลือกรูป</label><span class="upload-info"><span id="photo-name" role="status">ยังไม่ได้เลือกรูป</span> · JPG, PNG หรือ WebP สูงสุด 25 MB</span><div id="photo-preview" hidden><button class="button ghost small" id="remove-photo" type="button">เอารูปออก</button></div></div></div>
          <div class="report-summary full" id="report-summary" role="status"><strong>สรุปก่อนส่ง</strong><span>เลือกเสาและอาการเพื่อดูข้อมูลที่กรอก</span></div>
        </div>
        <div id="form-error" class="field-error" role="alert"></div>
        <div class="form-actions"><button class="button primary" type="submit" id="submit-report">ส่งเรื่องแจ้งไฟเสีย <span aria-hidden="true">→</span></button><span class="small muted">อาการและรูปอาจแสดงบนหน้าสาธารณะ ข้อมูลผู้แจ้งเห็นเฉพาะเจ้าหน้าที่</span></div>
      </form>
    </section>
    <aside class="report-overview" aria-labelledby="overview-title"><h2 id="overview-title">สรุปก่อนส่ง</h2><dl><div><dt>หมายเลขเสา</dt><dd id="overview-pole">ยังไม่ระบุเสา</dd></div><div><dt>อาการที่พบ</dt><dd id="overview-symptom">ยังไม่เลือกอาการ</dd></div><div><dt>การติดต่อกลับ</dt><dd id="overview-contact">ติดตามผ่านลิงก์</dd></div><div><dt>รูปประกอบ</dt><dd id="overview-photo">ยังไม่ได้แนบรูป</dd></div></dl><p class="overview-privacy"><strong>ข้อมูลติดต่อเห็นเฉพาะเจ้าหน้าที่</strong><br>อาการและรูปอาจแสดงบนหน้าสาธารณะ</p></aside>
    <details class="report-help"><summary>วิธีใช้งานและสถานะการซ่อม</summary><div class="route-panel"><h2>จากเสาที่เสีย<br>ไปสู่งานซ่อม</h2>
      <ol class="route-steps"><li><b>1</b><div><strong>ระบุเสา</strong><span>ใส่หมายเลขบนป้าย</span></div></li><li><b>2</b><div><strong>บอกอาการ</strong><span>เลือกสิ่งที่พบและช่องทางติดต่อ</span></div></li><li><b>3</b><div><strong>เก็บลิงก์</strong><span>ดูสถานะได้หลังส่งเรื่อง</span></div></li></ol>
      <div class="help-statuses"><h3>สถานะของเรื่องแจ้ง</h3><div class="status-legend">${[0,1,2].map(badge).join('')}</div><p>เก็บลิงก์หลังส่งเรื่องไว้ หรือเปิดเรื่องล่าสุดในอุปกรณ์นี้จากหน้าติดตาม</p><a href="/track">ไปหน้าติดตามเรื่อง</a></div></div></details>
  </div><section class="shell recent-section" id="recent-reports" aria-label="เรื่องล่าสุดในอุปกรณ์นี้"></section>`, 'report');
  $('.report-help').open = false;
  renderRecentReports($('#recent-reports'), true);
  const form = $('#report-form');
  const pole = $('#pole');
  const contact = $('#contact-value');
  const summary = () => {
    const picked = form.querySelector('input[name=symptom]:checked')?.value;
    const pickedDescription = picked === 'อื่น ๆ' ? `อื่น ๆ: ${$('#other-symptom').value.trim() || 'ยังไม่ระบุรายละเอียด'}` : picked || 'ยังไม่เลือกอาการ';
    const hasPole = /^T\d{4}$/.test(getPole(pole.value));
    const hasSymptom = !!picked && (picked !== 'อื่น ๆ' || !!$('#other-symptom').value.trim());
    const hasContact = $('#contact-type').value === 'none' || !!contact.value.trim();
    $('#overview-pole').textContent = getPole(pole.value) || 'ยังไม่ระบุเสา';
    $('#overview-symptom').textContent = pickedDescription;
    $('#overview-contact').textContent = $('#contact-type').value === 'none' ? 'ติดตามผ่านลิงก์' : $('#contact-type').selectedOptions[0].textContent;
    $('#overview-photo').textContent = photoPending ? 'กำลังย่อรูป…' : reportPhoto ? 'แนบรูปแล้ว' : photoFailed ? 'รูปยังไม่พร้อมส่ง' : 'ยังไม่ได้แนบรูป';
    $('#report-summary').innerHTML = `<strong>สรุปก่อนส่ง</strong><span>${getPole(pole.value) ? `เสา ${esc(getPole(pole.value))}` : 'ยังไม่ระบุเสา'} · ${esc(pickedDescription)}</span>`;
    const completedParts = [hasPole,hasSymptom,hasContact,hasPole&&hasSymptom&&hasContact&&!photoPending&&!photoFailed].filter(Boolean).length;
    $('.report-steps').setAttribute('aria-valuenow', String(completedParts));
    document.querySelectorAll('.report-steps li').forEach((step,index)=>{
      const complete=index<completedParts;
      step.dataset.complete=String(complete);
      step.querySelector('.report-step-marker').textContent=complete?'✓':String(index+1);
      step.querySelector('[data-progress-state]').textContent=complete?'กรอกแล้ว':'ยังไม่ครบ';
    });
  };
  form.addEventListener('input',summary);
  const selectPhoto = async event => {
    const file = event.target.files[0]; if (!file) return;
    const generation = ++photoGeneration; reportPhoto = ''; photoFailed = false; photoPending = true; $('#photo-preview').hidden = true; $('#preview-image')?.remove(); $('#photo-name').textContent = 'กำลังย่อรูป…';
    try { const data = await photoData(file); if (generation !== photoGeneration) return; reportPhoto = data; const image = document.createElement('img'); image.id = 'preview-image'; image.alt = 'รูปจุดที่เสียที่เลือกไว้'; image.src = data; $('#photo-preview').prepend(image); $('#photo-preview').hidden = false; $('#photo-name').textContent = 'รูปพร้อมส่ง · ย่อรูปแล้ว'; reveal($('#photo-preview')); }
    catch (error) { if (generation === photoGeneration) { photoFailed = true; $('#photo-name').textContent = error.message + ' หรือกดเอารูปออกเพื่อส่งโดยไม่แนบรูป'; $('#photo-preview').hidden = false; } }
    finally { if (generation === photoGeneration) { photoPending = false; summary(); } }
  };
  $('#photo').addEventListener('change', selectPhoto); $('#camera').addEventListener('change', selectPhoto);
  $('#remove-photo').addEventListener('click', () => { photoGeneration++; photoPending = false; photoFailed = false; reportPhoto = ''; $('#photo').value = ''; $('#camera').value = ''; $('#photo-preview').hidden = true; $('#preview-image')?.remove(); $('#photo-name').textContent = 'ยังไม่ได้เลือกรูป'; summary(); });
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
  const linkedPole = poleFromPage(location.search);
  if (linkedPole) {
    pole.value = linkedPole;
    pole.dispatchEvent(new Event('input', { bubbles: true }));
    pole.dispatchEvent(new Event('blur'));
  }
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
    shell(`<section class="shell report-result"><div class="success-panel"><div class="success-icon" aria-hidden="true">${icon}</div><h1 class="page-title" style="margin-top:22px">ส่งเรื่องเรียบร้อย</h1><p class="lead">เราได้รับแจ้งเสา <strong>${esc(pole)}</strong> แล้ว เก็บลิงก์นี้ไว้เพื่อติดตามงาน</p><div class="track-link number">${esc(url)}</div><div class="inline"><a class="button primary" href="${esc(url)}">ดูสถานะเรื่องนี้</a><button class="button outline" id="copy-track" type="button">คัดลอกลิงก์</button>${typeof navigator.share === 'function' ? '<button class="button outline" id="share-track" type="button">แชร์ลิงก์</button>' : ''}</div><p class="small muted">${saved ? 'บันทึกลิงก์ในเรื่องล่าสุดของอุปกรณ์นี้แล้ว เก็บไว้ไม่เกิน 30 วัน หากใช้เครื่องร่วมกับผู้อื่น สามารถล้างประวัติได้ที่หน้าติดตาม' : 'เบราว์เซอร์นี้บันทึกประวัติไม่ได้ กรุณาคัดลอกลิงก์หรือเพิ่มหน้านี้ในบุ๊กมาร์ก'}</p><p class="small muted">หากไม่เห็นสถานะใหม่ทันที โปรดกลับมาตรวจอีกครั้งภายหลัง</p></div></section>`, 'track');
    $('#copy-track').addEventListener('click', async () => { try { await navigator.clipboard.writeText(url); toast('คัดลอกลิงก์แล้ว'); } catch { toast('คัดลอกไม่ได้ กรุณาเลือกข้อความลิงก์ด้านบน'); } });
    $('.success-panel .lead').insertAdjacentHTML('afterend', `<p class="report-summary">เลขเรื่อง: <strong class="number">${esc(data.id)}</strong></p>`);
    $('#share-track')?.addEventListener('click', async () => {
      try { await navigator.share({ title: `ติดตามเรื่องแจ้งเสา ${pole} · LightFix`, url }); }
      catch (error) { if (error.name !== 'AbortError') toast('แชร์ไม่ได้ กรุณาใช้ปุ่มคัดลอกลิงก์'); }
    });
    document.title = 'ส่งเรื่องเรียบร้อย · LightFix';
    window.scrollTo({top:0,behavior:'instant'});
    $('.success-panel h1').tabIndex = -1; $('.success-panel h1').focus({preventScroll:true});
  } catch (error) {
    $('#form-error').textContent = error.message;
    button.disabled = false; button.textContent = 'ส่งเรื่องแจ้งไฟเสีย →';
  }
}

async function boardPage() {
  document.title = 'ความคืบหน้าการซ่อม · LightFix';
  shell(`<section class="shell page"><h1 class="page-title">งานซ่อมในชุมชน</h1><p class="lead">ดูเรื่องแจ้งไฟถนนและสถานะล่าสุด ข้อมูลผู้แจ้งจะไม่แสดงที่นี่</p><div class="toolbar"><label class="eyeless" for="board-pole">กรองด้วยหมายเลขเสา</label><input id="board-pole" class="input" placeholder="ค้นหาเสา เช่น T0001"><button class="button outline" id="board-search">ค้นหา</button><button class="button ghost" id="board-clear">แสดงทั้งหมด</button></div><div id="board-list" class="record-list"><p class="loading" role="status">กำลังโหลดรายการ…</p></div></section>`, 'board');
  const list = $('#board-list');
  const requests = createLatestRequest();
  async function load() {
    const pole = getPole($('#board-pole').value);
    list.innerHTML = '<p class="loading" role="status">กำลังโหลดรายการ…</p>';
    await requests.run(() => api(`/api/reports${pole ? `?pole=${encodeURIComponent(pole)}` : ''}`), rows => {
      list.innerHTML = rows.length ? rows.map(r => `<a class="record" href="/track?id=${esc(r.id)}"><span class="record-title number">${esc(r.pole)}</span><span class="record-detail">${esc(r.symptom)} · ${date(r.at)}</span>${badge(r.status)}</a>`).join('') : '<div class="empty">ยังไม่มีเรื่องแจ้งในรายการนี้ <a href="/">แจ้งไฟเสีย</a></div>';
    }, error => showError(list, error));
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
  const requests = createLatestRequest();
  async function load() {
    const value = $('#track-id').value.trim().toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(value)) { requests.invalidate(); target.innerHTML = '<div class="error-box" role="alert">กรุณาใช้ลิงก์ติดตามจากหน้าส่งเรื่องสำเร็จ</div>'; return; }
    target.innerHTML = '<p class="loading" role="status">กำลังตรวจสถานะ…</p>';
    await requests.run(() => api(`/api/reports/${value}`), r => {
      history.replaceState({}, '', `/track?id=${value}`);
      const steps = [{ title: 'รับเรื่องแจ้ง', time: r.at }, { title: 'เริ่มงานซ่อม', time: r.startedAt }, { title: 'ซ่อมเสร็จ', time: r.doneAt }];
      target.innerHTML = `<div class="detail-grid"><article class="panel"><div class="inline" style="justify-content:space-between"><h2 class="section-heading number" style="margin:0">เสา ${esc(r.pole)}</h2>${badge(r.status)}</div><p>${esc(r.symptom)}</p>${r.note ? `<p><strong>บันทึกงาน:</strong> ${esc(r.note)}</p>` : ''}${r.cause ? `<p><strong>สาเหตุ:</strong> ${esc(r.cause)} ${esc(r.causeDetail)}</p>` : ''}<div class="photo-pair">${r.hasBefore ? `<figure><a href="/media/${value}/before" target="_blank" rel="noopener" aria-label="เปิดรูปก่อนซ่อมเสา ${esc(r.pole)} ขนาดเต็มในแท็บใหม่"><img src="/media/${value}/before" alt="รูปก่อนซ่อมเสา ${esc(r.pole)}"></a><figcaption>ก่อนซ่อม · เลือกภาพเพื่อเปิดขนาดเต็ม</figcaption></figure>` : ''}${r.hasAfter ? `<figure><a href="/media/${value}/after" target="_blank" rel="noopener" aria-label="เปิดรูปหลังซ่อมเสา ${esc(r.pole)} ขนาดเต็มในแท็บใหม่"><img src="/media/${value}/after" alt="รูปหลังซ่อมเสา ${esc(r.pole)}"></a><figcaption>หลังซ่อม · เลือกภาพเพื่อเปิดขนาดเต็ม</figcaption></figure>` : ''}</div></article><aside class="panel"><h2 class="section-heading">เส้นทางของเรื่องนี้</h2><ol class="timeline">${steps.map((s, i) => `<li><strong>${s.title}</strong><div class="small muted">${s.time ? date(s.time) : 'รอดำเนินการ'}</div></li>`).join('')}</ol><div class="road-line"></div></aside></div>`;
    }, error => showError(target, error));
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

installMobilePickers();
const path = location.pathname;
if (path === '/' || path === '/index.html') reportPage();
else if (path === '/board') boardPage();
else if (path === '/track') trackPage();
else if (['/admin','/admin/','/technician','/technician/'].includes(path)) staffPage(path.split('/')[1]);
else { shell(`<section class="shell page"><h1 class="page-title">ไม่พบหน้านี้</h1><p class="lead">ตรวจสอบที่อยู่เว็บ หรือกลับไปหน้าแจ้งไฟเสีย</p><a class="button primary" href="/">กลับหน้าแรก</a></section>`); }
