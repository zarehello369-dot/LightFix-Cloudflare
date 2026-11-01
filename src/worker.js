const COOKIE = 'lf_session';
const SESSION_MS = 8 * 60 * 60 * 1000;
const PASSWORD_ITERATIONS = 100000;
const MAX_PHOTO_BYTES = 1_500_000;
const CAUSES = ['หลอดไฟหมดอายุ', 'ชุดควบคุม/ไดรเวอร์ชำรุด', 'สายไฟ/จุดต่อชำรุด', 'น้ำเข้า/ความชื้น', 'ไฟฟ้ากระชาก', 'อุบัติเหตุ/แรงกระแทก', 'ยังไม่ทราบสาเหตุ', 'อื่น ๆ'];
const textEncoder = new TextEncoder();

class HttpError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

const clean = (value, max = 500) => String(value ?? '').trim().slice(0, max);
const now = () => Date.now();
const id = () => crypto.randomUUID().replaceAll('-', '');
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
const sha256 = async value => hex(await crypto.subtle.digest('SHA-256', textEncoder.encode(value)));
const bytesToBase64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const base64ToBytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));

async function passwordHash(password, salt, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: base64ToBytes(salt), iterations }, key, 256));
}

function equalHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', ...headers }
});
async function asset(request, env) {
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);
  headers.set('x-content-type-options', 'nosniff');
  headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  headers.set('content-security-policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
const ok = (data, status = 200, headers = {}) => json({ ok: true, data }, status, headers);
const fail = e => json({ ok: false, error: typeof e.code === 'string' ? e.code : 'INTERNAL', message: e.status ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่' }, e.status || 500);
const one = async (db, sql, ...args) => db.prepare(sql).bind(...args).first();
const all = async (db, sql, ...args) => (await db.prepare(sql).bind(...args).all()).results;
const run = async (db, sql, ...args) => db.prepare(sql).bind(...args).run();

async function body(request) {
  if (Number(request.headers.get('content-length') || 0) > 2_300_000) throw new HttpError(413, 'TOO_LARGE', 'ข้อมูลมีขนาดใหญ่เกินไป');
  let data;
  try { data = await request.json(); } catch { throw new HttpError(400, 'INVALID_JSON', 'ข้อมูลที่ส่งมาไม่ถูกต้อง'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'INVALID_JSON', 'ข้อมูลที่ส่งมาไม่ถูกต้อง');
  return data;
}

function assertOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, 'BAD_ORIGIN', 'คำขอจากเว็บไซต์อื่นไม่ได้รับอนุญาต');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && !['same-origin', 'none'].includes(fetchSite)) throw new HttpError(403, 'BAD_ORIGIN', 'คำขอจากเว็บไซต์อื่นไม่ได้รับอนุญาต');
}

function cookieValue(request, name) {
  const prefix = name + '=';
  return (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(prefix))?.slice(prefix.length) || '';
}
function sessionCookie(token, maxAge) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

async function actor(request, env, admin = false, allowPasswordChange = false) {
  const token = cookieValue(request, COOKIE);
  if (!/^[a-f0-9]{64}$/.test(token)) throw new HttpError(401, 'LOGIN_REQUIRED', 'กรุณาเข้าสู่ระบบ');
  const user = await one(env.DB, `SELECT u.id,u.username,u.display_name,u.role,u.active,u.must_change_password,s.expires_at
    FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?`, await sha256(token));
  if (!user || !user.active || user.expires_at < now()) throw new HttpError(401, 'LOGIN_REQUIRED', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
  if (user.must_change_password && !allowPasswordChange) throw new HttpError(403, 'PASSWORD_CHANGE_REQUIRED', 'กรุณาตั้งรหัสผ่านใหม่ก่อนใช้งาน');
  if (admin && user.role !== 'admin') throw new HttpError(403, 'FORBIDDEN', 'ไม่มีสิทธิ์ผู้ดูแล');
  return user;
}

async function audit() {}

function contact(type, value) {
  const v = clean(value, 150);
  if (!v) throw new HttpError(400, 'CONTACT_REQUIRED', 'กรอกข้อมูลผู้แจ้ง');
  if (type === 'phone' && !/^[+\d][\d\s()-]{7,19}$/.test(v)) throw new HttpError(400, 'CONTACT_INVALID', 'ตรวจสอบเบอร์โทรศัพท์');
  if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new HttpError(400, 'CONTACT_INVALID', 'ตรวจสอบอีเมล');
  if (type === 'line' && v.length < 2) throw new HttpError(400, 'CONTACT_INVALID', 'ตรวจสอบ LINE ID');
  if (type === 'name' && v.length < 2) throw new HttpError(400, 'CONTACT_INVALID', 'กรอกชื่ออย่างน้อย 2 ตัวอักษร');
  if (!['name', 'phone', 'email', 'line'].includes(type)) throw new HttpError(400, 'CONTACT_INVALID', 'เลือกประเภทข้อมูลผู้แจ้ง');
  return v;
}

function poleNumber(value) {
  const pole = clean(value, 20).toUpperCase();
  if (!/^T\d{4}$/.test(pole)) throw new HttpError(400, 'INVALID_POLE', 'หมายเลขเสาต้องมีรูปแบบ T0001');
  return pole;
}

function decodePhoto(value) {
  if (!value) return null;
  const match = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new HttpError(400, 'PHOTO_INVALID', 'รูปต้องเป็น JPG หรือ PNG');
  if (match[2].length > Math.ceil(MAX_PHOTO_BYTES * 4 / 3) + 4) throw new HttpError(413, 'PHOTO_TOO_LARGE', 'รูปใหญ่เกิน 1.5 MB');
  let bytes;
  try { bytes = base64ToBytes(match[2]); }
  catch { throw new HttpError(400, 'PHOTO_INVALID', 'ข้อมูลรูปไม่ถูกต้อง'); }
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new HttpError(413, 'PHOTO_TOO_LARGE', 'รูปใหญ่เกิน 1.5 MB');
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if ((match[1] === 'jpeg' && !jpeg) || (match[1] === 'png' && !png)) throw new HttpError(400, 'PHOTO_INVALID', 'ไฟล์รูปไม่ตรงกับชนิดที่ระบุ');
  return { bytes, type: `image/${match[1]}`, ext: match[1] === 'jpeg' ? 'jpg' : 'png' };
}

async function throttle(request, env, scope, limit, windowMs) {
  const host = new URL(request.url).hostname;
  const salt = clean(env.RATE_SALT, 150);
  if (!salt && host !== 'localhost' && host !== '127.0.0.1') throw new HttpError(503, 'RATE_NOT_CONFIGURED', 'ระบบรับข้อมูลยังไม่พร้อม');
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const key = await sha256(`${salt || 'local'}:${scope}:${ip}`);
  const time = now();
  const row = await one(env.DB, `INSERT INTO rate_limits(key,hits,resets_at) VALUES(?,1,?)
    ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN resets_at<? THEN 1 ELSE hits+1 END,
    resets_at=CASE WHEN resets_at<? THEN excluded.resets_at ELSE resets_at END
    RETURNING hits`, key, time + windowMs, time, time);
  if (row.hits > limit) throw new HttpError(429, 'SLOW_DOWN', 'ส่งบ่อยเกินไป กรุณาลองใหม่ภายหลัง');
}

function publicReport(r) {
  return {
    id: r.id, pole: r.pole, symptom: r.symptom, status: r.status, at: r.created_at,
    startedAt: r.started_at || null, doneAt: r.completed_at || null, note: r.job_note || r.public_note || '',
    hasBefore: !!r.before_photo_key, hasAfter: !!r.after_photo_key,
    cause: r.cause || '', causeDetail: r.cause_detail || ''
  };
}
const PUBLIC_REPORT_SQL = `SELECT r.*,j.started_at,j.completed_at,j.after_photo_key,j.public_note AS job_note,j.cause,j.cause_detail
  FROM reports r LEFT JOIN jobs j ON j.id=r.job_id`;

async function health(env) {
  await one(env.DB, 'SELECT 1 AS ready');
  return { version: '4.0.0', ready: true };
}

async function checkPole(env, value) {
  const pole = poleNumber(value);
  const row = await one(env.DB, 'SELECT pole,location FROM poles WHERE pole=? AND active=1', pole);
  return { found: !!row, location: row?.location || '' };
}

async function poleHistory(env, value) {
  const pole = poleNumber(value);
  const found = await one(env.DB, 'SELECT pole,location FROM poles WHERE pole=?', pole);
  if (!found) throw new HttpError(404, 'NO_POLE', 'ไม่พบหมายเลขเสานี้');
  const jobs = await all(env.DB, `SELECT completed_at,cause,cause_detail,public_note FROM jobs
    WHERE pole=? AND status=2 ORDER BY completed_at DESC LIMIT 100`, pole);
  return { pole, location: found.location, jobs };
}

async function createReport(env, data) {
  const pole = poleNumber(data.pole);
  const symptom = clean(data.symptom, 300);
  if (!symptom) throw new HttpError(400, 'SYMPTOM_REQUIRED', 'เลือกอาการหรืออธิบายปัญหา');
  const type = clean(data.contactType, 10);
  const value = contact(type, data.contactValue);
  const requestId = clean(data.requestId, 80);
  if (!/^[a-zA-Z0-9-]{20,80}$/.test(requestId)) throw new HttpError(400, 'INVALID_REQUEST', 'กรุณาลองส่งเรื่องใหม่');
  const prior = await one(env.DB, 'SELECT id FROM reports WHERE request_id=?', requestId);
  if (prior) return { id: prior.id, pole, duplicate: true };
  const found = await one(env.DB, 'SELECT pole FROM poles WHERE pole=? AND active=1', pole);
  if (!found) throw new HttpError(400, 'NO_POLE', 'ไม่พบหมายเลขเสานี้ กรุณาตรวจสอบอีกครั้ง');
  const open = await one(env.DB, 'SELECT COUNT(*) AS count FROM reports WHERE pole=? AND status<2', pole);
  if (open.count >= 3) throw new HttpError(409, 'POLE_LIMIT', 'เสานี้มีเรื่องรอดำเนินการหลายรายการแล้ว กรุณาดูหน้าติดตาม');
  const photo = decodePhoto(data.photo);
  const reportId = id();
  const key = photo ? `unrepaired/${reportId}.${photo.ext}` : null;
  if (photo) await env.PHOTOS.put(key, photo.bytes, { httpMetadata: { contentType: photo.type } });
  try {
    await run(env.DB, `INSERT INTO reports(id,pole,symptom,contact_type,contact_value,before_photo_key,status,created_at,request_id)
      VALUES(?,?,?,?,?,?,0,?,?)`, reportId, pole, symptom, type, value, key, now(), requestId);
  } catch (error) {
    if (photo) await env.PHOTOS.delete(key);
    const duplicate = await one(env.DB, 'SELECT id FROM reports WHERE request_id=?', requestId);
    if (duplicate) return { id: duplicate.id, pole, duplicate: true };
    throw error;
  }
  await audit(env.DB, 'public', 'report', reportId);
  return { id: reportId, pole, duplicate: false };
}

async function board(env, query) {
  const pole = clean(query.get('pole'), 20).toUpperCase();
  const rows = await all(env.DB, `${PUBLIC_REPORT_SQL} WHERE r.status<>3 ${pole ? 'AND r.pole=?' : ''} ORDER BY r.created_at DESC LIMIT 250`, ...(pole ? [pole] : []));
  return rows.map(publicReport);
}

async function detail(env, reportId) {
  const row = await one(env.DB, `${PUBLIC_REPORT_SQL} WHERE r.id=?`, reportId);
  if (!row) throw new HttpError(404, 'NOT_FOUND', 'ไม่พบเรื่องแจ้งนี้');
  return publicReport(row);
}

async function media(env, reportId, kind) {
  if (!['before', 'after'].includes(kind)) throw new HttpError(404, 'NOT_FOUND', 'ไม่พบรูป');
  const row = await one(env.DB, `${PUBLIC_REPORT_SQL} WHERE r.id=? AND r.status<>3`, reportId);
  const key = kind === 'before' ? row?.before_photo_key : row?.after_photo_key;
  if (!key) throw new HttpError(404, 'NOT_FOUND', 'ยังไม่มีรูป');
  const object = await env.PHOTOS.get(key);
  if (!object) throw new HttpError(404, 'NOT_FOUND', 'ไม่พบรูป');
  return new Response(object.body, {
    headers: { 'content-type': object.httpMetadata?.contentType || 'image/jpeg', 'cache-control': 'public, max-age=300', 'x-content-type-options': 'nosniff' }
  });
}

async function login(request, env, data, expectedRole) {
  const username = clean(data.username, 80).toLowerCase();
  const password = String(data.password || '');
  const role = clean(data.role, 20);
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || role !== expectedRole || !password) throw new HttpError(401, 'BAD_LOGIN', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  const attempt = await one(env.DB, 'SELECT attempts,window_start FROM login_attempts WHERE username=?', username);
  if (attempt && attempt.attempts >= 8 && attempt.window_start > now() - 600_000) throw new HttpError(429, 'LOGIN_LOCKED', 'ลองใหม่อีกครั้งใน 10 นาที');
  const user = await one(env.DB, 'SELECT * FROM users WHERE username=? AND role=?', username, role);
  const dummySalt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const usable = !!user?.active && Number.isInteger(user.iterations) && user.iterations > 0 && user.iterations <= PASSWORD_ITERATIONS;
  const actualHash = await passwordHash(password, usable ? user.salt : dummySalt, usable ? user.iterations : PASSWORD_ITERATIONS);
  const valid = usable && equalHex(actualHash, user.password_hash);
  if (!valid) {
    await run(env.DB, `INSERT INTO login_attempts(username,window_start,attempts) VALUES(?,?,1)
      ON CONFLICT(username) DO UPDATE SET window_start=CASE WHEN window_start<? THEN excluded.window_start ELSE window_start END,
      attempts=CASE WHEN window_start<? THEN 1 ELSE attempts+1 END`, username, now(), now() - 600_000, now() - 600_000);
    throw new HttpError(401, 'BAD_LOGIN', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
  }
  await run(env.DB, 'DELETE FROM login_attempts WHERE username=?', username);
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await run(env.DB, 'INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)', await sha256(token), user.id, now() + SESSION_MS, now());
  await audit(env.DB, username, 'login', user.id);
  return ok({ user: { id: user.id, username, name: user.display_name, role, mustChangePassword: !!user.must_change_password } }, 200, { 'set-cookie': sessionCookie(token, SESSION_MS / 1000) });
}

async function changePassword(request, env, data, expectedRole) {
  const user = await actor(request, env, false, true);
  if (user.role !== expectedRole) throw new HttpError(403, 'FORBIDDEN', 'ไม่มีสิทธิ์ใช้ทางเข้านี้');
  const password = String(data.password || '');
  if (password.length < 12 || password.length > 200) throw new HttpError(400, 'PASSWORD_INVALID', 'รหัสผ่านใหม่ต้องมี 12 ถึง 200 ตัวอักษร');
  const salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await passwordHash(password, salt);
  await run(env.DB, `UPDATE users SET password_hash=?,salt=?,iterations=?,must_change_password=0 WHERE id=?`, hash, salt, PASSWORD_ITERATIONS, user.id);
  await audit(env.DB, user.username, 'change_password', user.id);
  return true;
}

async function logout(request, env) {
  const token = cookieValue(request, COOKIE);
  if (token) await run(env.DB, 'DELETE FROM sessions WHERE token_hash=?', await sha256(token));
  return ok(true, 200, { 'set-cookie': sessionCookie('', 0) });
}

async function workspace(request, env, expectedRole) {
  const user = await actor(request, env);
  if (user.role !== expectedRole) throw new HttpError(403, 'FORBIDDEN', 'ไม่มีสิทธิ์เข้าพื้นที่นี้');
  const admin = user.role === 'admin';
  const reports = await all(env.DB, `${PUBLIC_REPORT_SQL} ${admin ? '' : 'WHERE (r.status=0 AND (r.assigned_user_id IS NULL OR r.assigned_user_id=?) OR j.technician_id=? OR j.assigned_user_id=?)'} ORDER BY r.created_at DESC LIMIT 500`, ...(admin ? [] : [user.id, user.id, user.id]));
  const jobs = await all(env.DB, `SELECT j.*,u.display_name AS technician_name FROM jobs j LEFT JOIN users u ON u.id=j.technician_id ${admin ? '' : 'WHERE j.technician_id=? OR j.assigned_user_id=?'} ORDER BY j.started_at DESC LIMIT 500`, ...(admin ? [] : [user.id, user.id]));
  const poles = await all(env.DB, `SELECT p.*,(SELECT COUNT(*) FROM reports r WHERE r.pole=p.pole AND r.status<>3) AS report_count,
    (SELECT COUNT(*) FROM reports r WHERE r.pole=p.pole AND r.status<2) AS open_count,
    (SELECT COUNT(*) FROM jobs j WHERE j.pole=p.pole AND j.status=2) AS repair_count,
    (SELECT COUNT(*) FROM reports r WHERE r.pole=p.pole) AS total_report_count,
    (SELECT COUNT(*) FROM jobs j WHERE j.pole=p.pole) AS job_count
    FROM poles p ORDER BY p.pole LIMIT 1000`);
  const notifications = await all(env.DB, `SELECT id,title,body,report_ids,created_at,read_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100`, user.id);
  const result = {
    user: { id: user.id, username: user.username, name: user.display_name, role: user.role },
    reports: reports.map(r => ({ ...publicReport(r), contactType: r.contact_type, contactValue: r.contact_value,
      jobId: r.job_id, assignedId: r.assigned_user_id, instructions: r.instructions, dueAt: r.due_at })),
    jobs, poles, notifications, causes: CAUSES
  };
  if (admin) {
    result.users = await all(env.DB, `SELECT u.id,u.username,u.display_name,u.role,u.active,u.created_at,
      (SELECT COUNT(*) FROM reports r WHERE r.assigned_user_id=u.id) AS report_count,
      (SELECT COUNT(*) FROM jobs j WHERE j.technician_id=u.id OR j.assigned_user_id=u.id) AS job_count
      FROM users u ORDER BY u.created_at DESC LIMIT 500`);
    result.registrations = await all(env.DB, `SELECT r.*,u.username,u.display_name FROM registrations r JOIN users u ON u.id=r.user_id ORDER BY r.requested_at DESC LIMIT 500`);
  }
  return result;
}

async function register(env, data, expectedRole) {
  const username = clean(data.username, 80).toLowerCase();
  const name = clean(data.name, 100);
  const password = String(data.password || '');
  const role = clean(data.role, 20);
  const contactInfo = clean(data.contact, 150);
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || !name || role !== expectedRole || password.length < 12 || !contactInfo) {
    throw new HttpError(400, 'INVALID_REGISTRATION', 'ตรวจสอบชื่อผู้ใช้ ชื่อแสดง ช่องทางติดต่อ และรหัสผ่านอย่างน้อย 12 ตัวอักษร');
  }
  if (await one(env.DB, 'SELECT id FROM users WHERE username=?', username)) throw new HttpError(409, 'USERNAME_EXISTS', 'ชื่อผู้ใช้นี้ถูกใช้แล้ว');
  const salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = PASSWORD_ITERATIONS;
  const hash = await passwordHash(password, salt, iterations);
  const userId = id(), registrationId = id(), time = now();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO users(id,username,display_name,role,password_hash,salt,iterations,active,created_at)
      VALUES(?,?,?,?,?,?,?,0,?)`).bind(userId, username, name, role, hash, salt, iterations, time),
    env.DB.prepare(`INSERT INTO registrations(id,user_id,requested_role,status,requested_at,contact)
      VALUES(?,?,?,'pending',?,?)`).bind(registrationId, userId, role, time, contactInfo)
  ]);
  await audit(env.DB, username, 'register_pending', userId);
  return { pending: true };
}

async function upsertPole(request, env, data) {
  const user = await actor(request, env, true);
  const pole = poleNumber(data.pole);
  const location = clean(data.location, 200);
  const model = clean(data.model, 100);
  const installedAt = clean(data.installedAt, 30);
  const notes = clean(data.notes, 1000);
  const lat = data.lat === '' || data.lat == null ? null : Number(data.lat);
  const lng = data.lng === '' || data.lng == null ? null : Number(data.lng);
  if ((lat === null) !== (lng === null) || (lat !== null && (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180))) {
    throw new HttpError(400, 'INVALID_COORDINATES', 'ตรวจสอบพิกัดละติจูดและลองจิจูด');
  }
  const active = data.active === false ? 0 : 1;
  const time = now();
  await run(env.DB, `INSERT INTO poles(pole,location,lat,lng,model,installed_at,notes,active,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(pole) DO UPDATE SET location=excluded.location,lat=excluded.lat,lng=excluded.lng,
    model=excluded.model,installed_at=excluded.installed_at,notes=excluded.notes,active=excluded.active,updated_at=excluded.updated_at`,
    pole, location, lat, lng, model, installedAt, notes, active, time, time);
  await audit(env.DB, user.username, 'save_pole', pole);
  return { pole };
}

async function deletePole(request, env, poleValue, data) {
  const admin = await actor(request, env, true);
  const pole = poleNumber(poleValue);
  if (clean(data.confirm, 20).toUpperCase() !== pole) throw new HttpError(400, 'CONFIRM_REQUIRED', 'พิมพ์หมายเลขเสาให้ตรงก่อนลบ');
  const found = await one(env.DB, `SELECT p.pole,
    (SELECT COUNT(*) FROM reports WHERE pole=p.pole) AS report_count,
    (SELECT COUNT(*) FROM jobs WHERE pole=p.pole) AS job_count
    FROM poles p WHERE p.pole=?`, pole);
  if (!found) throw new HttpError(404, 'NOT_FOUND', 'ไม่พบเสานี้');
  if (found.report_count || found.job_count) throw new HttpError(409, 'POLE_HAS_HISTORY', 'เสานี้มีเรื่องแจ้งหรือประวัติซ่อม กรุณาปิดใช้งานแทนการลบ');
  const result = await run(env.DB, `DELETE FROM poles WHERE pole=?
    AND NOT EXISTS(SELECT 1 FROM reports WHERE pole=?)
    AND NOT EXISTS(SELECT 1 FROM jobs WHERE pole=?)`, pole, pole, pole);
  if (!result.meta.changes) throw new HttpError(409, 'STATUS_CHANGED', 'ข้อมูลเสาเปลี่ยนไป กรุณารีเฟรช');
  await audit(env.DB, admin.username, 'delete_pole', pole);
  return { pole };
}

async function startJob(request, env, data) {
  const user = await actor(request, env);
  const pole = poleNumber(data.pole);
  const ids = data.reportIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || new Set(ids).size !== ids.length || ids.some(x => !/^[a-f0-9]{32}$/.test(x))) {
    throw new HttpError(400, 'INVALID_SELECTION', 'เลือกเรื่องแจ้ง 1 ถึง 3 เรื่องของเสาเดียวกัน');
  }
  const reports = await all(env.DB, `SELECT id,pole,status,assigned_user_id FROM reports WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
  if (reports.length !== ids.length || reports.some(r => r.pole !== pole || r.status !== 0 || (user.role !== 'admin' && r.assigned_user_id && r.assigned_user_id !== user.id))) {
    throw new HttpError(409, 'STATUS_CHANGED', 'รายการเปลี่ยนไปแล้ว กรุณารีเฟรช');
  }
  const jobId = id(), time = now();
  const placeholders = ids.map(() => '?').join(',');
  const allowed = user.role === 'admin' ? '' : 'AND (assigned_user_id IS NULL OR assigned_user_id=?)';
  const statements = [env.DB.prepare(`INSERT INTO jobs(id,pole,status,started_at,technician_id,assigned_user_id)
    SELECT ?,?,1,?,?,? WHERE (SELECT COUNT(*) FROM reports WHERE id IN (${placeholders}) AND pole=? AND status=0 ${allowed})=?`)
    .bind(jobId, pole, time, user.id, reports[0].assigned_user_id || null, ...ids, pole, ...(user.role === 'admin' ? [] : [user.id]), ids.length)];
  for (const reportId of ids) statements.push(env.DB.prepare(`UPDATE reports SET status=1,job_id=? WHERE id=? AND status=0 AND EXISTS(SELECT 1 FROM jobs WHERE id=?)`).bind(jobId, reportId, jobId));
  const result = await env.DB.batch(statements);
  if (!result[0].meta.changes) throw new HttpError(409, 'STATUS_CHANGED', 'รายการเปลี่ยนไปแล้ว กรุณารีเฟรช');
  await audit(env.DB, user.username, 'start', jobId);
  return { id: jobId };
}

async function saveNote(request, env, jobId, data) {
  const user = await actor(request, env);
  const job = await one(env.DB, 'SELECT id,technician_id,assigned_user_id,status FROM jobs WHERE id=?', jobId);
  if (!job || job.status !== 1 || (user.role !== 'admin' && job.technician_id !== user.id && job.assigned_user_id !== user.id)) {
    throw new HttpError(403, 'FORBIDDEN', 'ไม่มีสิทธิ์อัปเดตงานนี้');
  }
  await run(env.DB, 'UPDATE jobs SET public_note=? WHERE id=?', clean(data.note, 500), jobId);
  await audit(env.DB, user.username, 'note', jobId);
  return true;
}

async function finishJob(request, env, jobId, data) {
  const user = await actor(request, env);
  const job = await one(env.DB, 'SELECT * FROM jobs WHERE id=?', jobId);
  if (!job || job.status !== 1 || (user.role !== 'admin' && job.technician_id !== user.id && job.assigned_user_id !== user.id)) {
    throw new HttpError(403, 'FORBIDDEN', 'ไม่มีสิทธิ์ปิดงานนี้');
  }
  const cause = clean(data.cause, 100);
  const detail = clean(data.causeDetail, 500);
  if (!CAUSES.includes(cause) || (cause === 'อื่น ๆ' && !detail)) throw new HttpError(400, 'CAUSE_REQUIRED', 'เลือกสาเหตุที่ตรวจพบ');
  const photo = decodePhoto(data.photo);
  if (!photo) throw new HttpError(400, 'PHOTO_REQUIRED', 'เพิ่มรูปหลังซ่อมก่อนปิดงาน');
  const reports = await all(env.DB, 'SELECT id,before_photo_key FROM reports WHERE job_id=? AND status=1', jobId);
  const key = `repaired/after/${jobId}-${id()}.${photo.ext}`;
  const createdKeys = [];
  try {
    await env.PHOTOS.put(key, photo.bytes, { httpMetadata: { contentType: photo.type } });
    createdKeys.push(key);
    const movedPhotos = [];
    for (const report of reports) {
      if (!report.before_photo_key) continue;
      const oldPhoto = await env.PHOTOS.get(report.before_photo_key);
      if (!oldPhoto) throw new HttpError(409, 'PHOTO_MISSING', 'ไม่พบรูปก่อนซ่อม กรุณาแจ้งผู้ดูแลระบบ');
      const newKey = `repaired/before/${report.id}-${id()}.${report.before_photo_key.split('.').at(-1)}`;
      await env.PHOTOS.put(newKey, await oldPhoto.arrayBuffer(), { httpMetadata: oldPhoto.httpMetadata });
      createdKeys.push(newKey);
      movedPhotos.push({ id: report.id, oldKey: report.before_photo_key, newKey });
    }
    const result = await env.DB.batch([
      env.DB.prepare(`UPDATE jobs SET status=2,completed_at=?,after_photo_key=?,cause=?,cause_detail=?,public_note=?
        WHERE id=? AND status=1 AND (SELECT COUNT(*) FROM reports WHERE job_id=? AND status=1)=?`)
        .bind(now(), key, cause, detail, clean(data.note, 500), jobId, jobId, reports.length),
      env.DB.prepare(`UPDATE reports SET status=2 WHERE job_id=? AND status=1
        AND EXISTS(SELECT 1 FROM jobs WHERE id=? AND status=2 AND after_photo_key=?)`).bind(jobId, jobId, key),
      ...movedPhotos.map(({ id: reportId, newKey }) => env.DB.prepare(`UPDATE reports SET before_photo_key=?
        WHERE id=? AND job_id=? AND status=2 AND EXISTS(SELECT 1 FROM jobs WHERE id=? AND after_photo_key=?)`)
        .bind(newKey, reportId, jobId, jobId, key))
    ]);
    if (!result[0].meta.changes) throw new HttpError(409, 'STATUS_CHANGED', 'งานเปลี่ยนสถานะแล้ว กรุณารีเฟรช');
    await Promise.allSettled(movedPhotos.map(({ oldKey }) => env.PHOTOS.delete(oldKey)));
  } catch (e) {
    await Promise.allSettled(createdKeys.map(createdKey => env.PHOTOS.delete(createdKey)));
    throw e;
  }
  await audit(env.DB, user.username, 'finish', jobId);
  return { id: jobId };
}

async function assign(request, env, data) {
  const user = await actor(request, env, true);
  const pole = poleNumber(data.pole);
  const technicianId = clean(data.technicianId, 32);
  const technician = await one(env.DB, `SELECT id,display_name FROM users WHERE id=? AND role='technician' AND active=1`, technicianId);
  if (!technician) throw new HttpError(400, 'TECHNICIAN_UNAVAILABLE', 'ไม่พบช่างที่ใช้งานได้');
  const ids = data.reportIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 3 || new Set(ids).size !== ids.length || ids.some(x => !/^[a-f0-9]{32}$/.test(x))) {
    throw new HttpError(400, 'INVALID_SELECTION', 'เลือกเรื่องแจ้ง 1 ถึง 3 เรื่อง');
  }
  const reports = await all(env.DB, `SELECT id,pole,status,job_id FROM reports WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
  if (reports.length !== ids.length || reports.some(r => r.pole !== pole || r.status > 1)) throw new HttpError(409, 'STATUS_CHANGED', 'รายการเปลี่ยนไปแล้ว กรุณารีเฟรช');
  const instructions = clean(data.instructions, 1000);
  const dueAt = data.dueAt ? Number(data.dueAt) : null;
  if (dueAt !== null && (!Number.isFinite(dueAt) || dueAt <= now())) throw new HttpError(400, 'INVALID_DUE', 'กำหนดส่งต้องเป็นเวลาในอนาคต');
  const statements = ids.map(reportId => env.DB.prepare(`UPDATE reports SET assigned_user_id=?,instructions=?,due_at=? WHERE id=? AND status<2`).bind(technicianId, instructions, dueAt, reportId));
  const jobIds = [...new Set(reports.map(r => r.job_id).filter(Boolean))];
  for (const jobId of jobIds) statements.push(env.DB.prepare(`UPDATE jobs SET assigned_user_id=?,instructions=?,due_at=? WHERE id=? AND status=1`).bind(technicianId, instructions, dueAt, jobId));
  await env.DB.batch(statements);
  await run(env.DB, 'INSERT INTO notifications(id,user_id,created_at,title,body,report_ids) VALUES(?,?,?,?,?,?)', id(), technicianId, now(), `งานมอบหมาย: ${pole}`, instructions || 'มีงานใหม่ กรุณาตรวจสอบรายการงาน', JSON.stringify(ids));
  await audit(env.DB, user.username, 'assign', pole);
  return true;
}

async function reviewRegistration(request, env, registrationId, data) {
  const user = await actor(request, env, true);
  const decision = clean(data.decision, 20);
  if (!['approved', 'rejected'].includes(decision)) throw new HttpError(400, 'INVALID_DECISION', 'เลือกอนุมัติหรือปฏิเสธ');
  const registration = await one(env.DB, `SELECT id,user_id,status FROM registrations WHERE id=?`, registrationId);
  if (!registration || registration.status !== 'pending') throw new HttpError(409, 'STATUS_CHANGED', 'คำขอเปลี่ยนสถานะแล้ว');
  await env.DB.batch([
    env.DB.prepare(`UPDATE registrations SET status=?,reviewed_at=?,reviewed_by=?,reason=? WHERE id=? AND status='pending'`)
      .bind(decision, now(), user.username, clean(data.reason, 500), registrationId),
    env.DB.prepare('UPDATE users SET active=? WHERE id=?').bind(decision === 'approved' ? 1 : 0, registration.user_id)
  ]);
  await audit(env.DB, user.username, `registration_${decision}`, registration.user_id);
  return true;
}

async function updateUser(request, env, userId, data) {
  const admin = await actor(request, env, true);
  const target = await one(env.DB, 'SELECT id,role,active FROM users WHERE id=?', userId);
  if (!target) throw new HttpError(404, 'NOT_FOUND', 'ไม่พบบัญชีนี้');
  const name = clean(data.name, 100);
  const role = clean(data.role, 20);
  const active = data.active === false ? 0 : 1;
  if (!name || !['admin', 'technician'].includes(role)) throw new HttpError(400, 'INVALID_ACCOUNT', 'ตรวจสอบชื่อและบทบาท');
  if (target.id === admin.id && (role !== 'admin' || !active)) throw new HttpError(400, 'SELF_LOCKOUT', 'ไม่สามารถปิดสิทธิ์ผู้ดูแลของตนเอง');
  await run(env.DB, 'UPDATE users SET display_name=?,role=?,active=? WHERE id=?', name, role, active, userId);
  if (!active) await run(env.DB, 'DELETE FROM sessions WHERE user_id=?', userId);
  await audit(env.DB, admin.username, 'save_account', userId);
  return true;
}

async function createUser(request, env, data) {
  const admin = await actor(request, env, true);
  const username = clean(data.username, 80).toLowerCase();
  const name = clean(data.name, 100);
  const role = clean(data.role, 20);
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || !name || !['admin', 'technician'].includes(role)) {
    throw new HttpError(400, 'INVALID_ACCOUNT', 'กรอกชื่อผู้ใช้ 3–40 ตัวอักษร ชื่อที่แสดง และบทบาท');
  }
  const temporaryPassword = bytesToBase64(crypto.getRandomValues(new Uint8Array(20))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  const salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await passwordHash(temporaryPassword, salt);
  const userId = id();
  const result = await run(env.DB, `INSERT INTO users(id,username,display_name,role,password_hash,salt,iterations,must_change_password,active,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(username) DO NOTHING`, userId, username, name, role, hash, salt, PASSWORD_ITERATIONS, 1, 1, now());
  if (!result.meta.changes) throw new HttpError(409, 'USERNAME_EXISTS', 'ชื่อผู้ใช้นี้ถูกใช้แล้ว');
  await audit(env.DB, admin.username, 'create_account', userId);
  return { id: userId, username, temporaryPassword };
}

async function deleteUser(request, env, userId, data) {
  const admin = await actor(request, env, true);
  if (userId === admin.id) throw new HttpError(400, 'SELF_DELETE', 'ไม่สามารถลบบัญชีที่กำลังใช้งาน');
  const target = await one(env.DB, `SELECT u.id,u.username,
    (SELECT COUNT(*) FROM reports WHERE assigned_user_id=u.id) AS report_count,
    (SELECT COUNT(*) FROM jobs WHERE technician_id=u.id OR assigned_user_id=u.id) AS job_count
    FROM users u WHERE u.id=?`, userId);
  if (!target) throw new HttpError(404, 'NOT_FOUND', 'ไม่พบบัญชีนี้');
  if (clean(data.confirm, 80).toLowerCase() !== target.username.toLowerCase()) throw new HttpError(400, 'CONFIRM_REQUIRED', 'พิมพ์ชื่อผู้ใช้ให้ตรงก่อนลบ');
  if (target.report_count || target.job_count) throw new HttpError(409, 'USER_HAS_HISTORY', 'บัญชีนี้เกี่ยวข้องกับงานหรือเรื่องแจ้ง กรุณาปิดใช้งานแทนการลบ');
  try {
    const results = await env.DB.batch([
      env.DB.prepare('DELETE FROM registrations WHERE user_id=?').bind(userId),
      env.DB.prepare('DELETE FROM users WHERE id=?').bind(userId)
    ]);
    if (!results[1].meta.changes) throw new HttpError(409, 'STATUS_CHANGED', 'ข้อมูลบัญชีเปลี่ยนไป กรุณารีเฟรช');
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (/foreign key constraint failed/i.test(String(error.message))) throw new HttpError(409, 'USER_HAS_HISTORY', 'บัญชีนี้เกี่ยวข้องกับข้อมูลอื่น กรุณาปิดใช้งานแทนการลบ');
    throw error;
  }
  await run(env.DB, 'DELETE FROM login_attempts WHERE username=?', target.username);
  await audit(env.DB, admin.username, 'delete_account', userId);
  return { username: target.username };
}

async function resetPassword(request, env, userId) {
  const admin = await actor(request, env, true);
  const target = await one(env.DB, 'SELECT id FROM users WHERE id=?', userId);
  if (!target) throw new HttpError(404, 'NOT_FOUND', 'ไม่พบบัญชีนี้');
  if (target.id === admin.id) throw new HttpError(400, 'SELF_RESET', 'เปลี่ยนรหัสของตนเองผ่านหน้าบัญชี');
  const temporaryPassword = bytesToBase64(crypto.getRandomValues(new Uint8Array(20))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  const salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await passwordHash(temporaryPassword, salt);
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET password_hash=?,salt=?,iterations=?,must_change_password=1 WHERE id=?`).bind(hash, salt, PASSWORD_ITERATIONS, userId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id=?').bind(userId)
  ]);
  await audit(env.DB, admin.username, 'reset_password', userId);
  return { temporaryPassword };
}

async function notify(request, env, data) {
  const admin = await actor(request, env, true);
  const technician = await one(env.DB, `SELECT id FROM users WHERE id=? AND role='technician' AND active=1`, clean(data.technicianId, 32));
  const title = clean(data.title, 150), message = clean(data.body, 1000);
  if (!technician || !title || !message) throw new HttpError(400, 'INVALID_MESSAGE', 'เลือกช่างและกรอกหัวข้อกับข้อความ');
  await run(env.DB, 'INSERT INTO notifications(id,user_id,created_at,title,body) VALUES(?,?,?,?,?)', id(), technician.id, now(), title, message);
  await audit(env.DB, admin.username, 'message', technician.id);
  return true;
}

async function readNotification(request, env, notificationId) {
  const user = await actor(request, env);
  await run(env.DB, 'UPDATE notifications SET read_at=? WHERE id=? AND user_id=? AND read_at IS NULL', now(), notificationId, user.id);
  return true;
}

async function cancelReports(request, env, data) {
  const user = await actor(request, env, true);
  const pole = poleNumber(data.pole);
  const note = clean(data.note, 500);
  if (!note) throw new HttpError(400, 'NOTE_REQUIRED', 'กรอกเหตุผลที่จะแสดงสาธารณะ');
  await env.DB.batch([
    env.DB.prepare('UPDATE reports SET status=3,public_note=? WHERE pole=? AND status<2').bind(note, pole),
    env.DB.prepare('UPDATE jobs SET status=3,public_note=? WHERE pole=? AND status=1').bind(note, pole)
  ]);
  await audit(env.DB, user.username, 'cancel', pole);
  return true;
}

async function editHistory(request, env, jobId, data) {
  const user = await actor(request, env, true);
  const cause = clean(data.cause, 100);
  const detail = clean(data.causeDetail, 500);
  if (!CAUSES.includes(cause) || (cause === 'อื่น ๆ' && !detail)) throw new HttpError(400, 'CAUSE_REQUIRED', 'เลือกสาเหตุที่ตรวจพบ');
  const job = await one(env.DB, 'SELECT id FROM jobs WHERE id=? AND status=2', jobId);
  if (!job) throw new HttpError(404, 'NOT_FOUND', 'ไม่พบประวัติซ่อม');
  await run(env.DB, 'UPDATE jobs SET cause=?,cause_detail=?,public_note=? WHERE id=?', cause, detail, clean(data.note, 500), jobId);
  await audit(env.DB, user.username, 'correct_repair_history', jobId);
  return true;
}

export const internals = { clean, contact, poleNumber, decodePhoto, publicReport, equalHex, passwordHash };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) {
        return await asset(request, env);
      }
      if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/media/')) return await asset(request, env);
      if (request.method !== 'GET' && request.method !== 'HEAD') assertOrigin(request);
      if (url.pathname.startsWith('/api/jobs/') || url.pathname.startsWith('/api/notifications/')) {
        const staff = await actor(request, env);
        if (staff.role !== 'technician') throw new HttpError(403, 'FORBIDDEN', 'ใช้เส้นทางผู้ดูแลสำหรับบัญชีผู้ดูแล');
      }
      if (request.method === 'GET' && url.pathname === '/api/health') return ok(await health(env));
      if (request.method === 'GET' && url.pathname === '/api/poles/check') return ok(await checkPole(env, url.searchParams.get('pole')));
      if (request.method === 'GET' && /^\/api\/poles\/T\d{4}\/history$/.test(url.pathname)) return ok(await poleHistory(env, url.pathname.split('/')[3]));
      if (request.method === 'GET' && url.pathname === '/api/reports') return ok(await board(env, url.searchParams));
      if (request.method === 'GET' && /^\/api\/reports\/[a-f0-9]{32}$/.test(url.pathname)) return ok(await detail(env, url.pathname.split('/')[3]));
      if (request.method === 'GET' && /^\/media\/[a-f0-9]{32}\/(before|after)$/.test(url.pathname)) return await media(env, url.pathname.split('/')[2], url.pathname.split('/')[3]);
      if (request.method === 'POST' && url.pathname === '/api/reports') { await throttle(request, env, 'report', 10, 3600_000); return ok(await createReport(env, await body(request)), 201); }
      if (request.method === 'POST' && (url.pathname === '/api/auth/login' || url.pathname === '/api/admin/auth/login')) {
        await throttle(request, env, 'login', 30, 900_000);
        return await login(request, env, await body(request), url.pathname.startsWith('/api/admin/') ? 'admin' : 'technician');
      }
      if (request.method === 'POST' && (url.pathname === '/api/auth/logout' || url.pathname === '/api/admin/auth/logout')) return await logout(request, env);
      if (request.method === 'POST' && (url.pathname === '/api/auth/change-password' || url.pathname === '/api/admin/auth/change-password')) return ok(await changePassword(request, env, await body(request), url.pathname.startsWith('/api/admin/') ? 'admin' : 'technician'));
      if (request.method === 'POST' && (url.pathname === '/api/auth/register' || url.pathname === '/api/admin/auth/register')) {
        await throttle(request, env, 'register', 3, 3600_000);
        return ok(await register(env, await body(request), url.pathname.startsWith('/api/admin/') ? 'admin' : 'technician'), 201);
      }
      if (request.method === 'GET' && (url.pathname === '/api/auth/me' || url.pathname === '/api/admin/auth/me')) {
        const u = await actor(request, env, false, true);
        if (u.role !== (url.pathname.startsWith('/api/admin/') ? 'admin' : 'technician')) throw new HttpError(403, 'FORBIDDEN', 'ไม่มีสิทธิ์ใช้ทางเข้านี้');
        return ok({ id: u.id, username: u.username, name: u.display_name, role: u.role, mustChangePassword: !!u.must_change_password });
      }
      if (request.method === 'GET' && url.pathname === '/api/workspace') return ok(await workspace(request, env, 'technician'));
      if (request.method === 'GET' && url.pathname === '/api/admin/workspace') return ok(await workspace(request, env, 'admin'));
      if (request.method === 'POST' && url.pathname === '/api/jobs/start') return ok(await startJob(request, env, await body(request)), 201);
      if (request.method === 'POST' && url.pathname === '/api/admin/jobs/start') return ok(await startJob(request, env, await body(request)), 201);
      if (request.method === 'POST' && /^\/api\/jobs\/[a-f0-9]{32}\/finish$/.test(url.pathname)) return ok(await finishJob(request, env, url.pathname.split('/')[3], await body(request)));
      if (request.method === 'POST' && /^\/api\/admin\/jobs\/[a-f0-9]{32}\/finish$/.test(url.pathname)) return ok(await finishJob(request, env, url.pathname.split('/')[4], await body(request)));
      if (request.method === 'POST' && /^\/api\/jobs\/[a-f0-9]{32}\/note$/.test(url.pathname)) return ok(await saveNote(request, env, url.pathname.split('/')[3], await body(request)));
      if (request.method === 'POST' && /^\/api\/admin\/jobs\/[a-f0-9]{32}\/note$/.test(url.pathname)) return ok(await saveNote(request, env, url.pathname.split('/')[4], await body(request)));
      if (request.method === 'POST' && /^\/api\/notifications\/[a-f0-9]{32}\/read$/.test(url.pathname)) return ok(await readNotification(request, env, url.pathname.split('/')[3]));
      if (request.method === 'POST' && /^\/api\/admin\/notifications\/[a-f0-9]{32}\/read$/.test(url.pathname)) return ok(await readNotification(request, env, url.pathname.split('/')[4]));
      if (request.method === 'POST' && url.pathname === '/api/admin/poles') return ok(await upsertPole(request, env, await body(request)));
      if (request.method === 'DELETE' && /^\/api\/admin\/poles\/T\d{4}$/.test(url.pathname)) return ok(await deletePole(request, env, url.pathname.split('/')[4], await body(request)));
      if (request.method === 'POST' && url.pathname === '/api/admin/assign') return ok(await assign(request, env, await body(request)));
      if (request.method === 'POST' && /^\/api\/admin\/registrations\/[a-f0-9]{32}\/review$/.test(url.pathname)) return ok(await reviewRegistration(request, env, url.pathname.split('/')[4], await body(request)));
      if (request.method === 'POST' && /^\/api\/admin\/users\/[a-f0-9]{32}$/.test(url.pathname)) return ok(await updateUser(request, env, url.pathname.split('/')[4], await body(request)));
      if (request.method === 'POST' && url.pathname === '/api/admin/users') return ok(await createUser(request, env, await body(request)), 201);
      if (request.method === 'DELETE' && /^\/api\/admin\/users\/[a-f0-9]{32}$/.test(url.pathname)) return ok(await deleteUser(request, env, url.pathname.split('/')[4], await body(request)));
      if (request.method === 'POST' && /^\/api\/admin\/users\/[a-f0-9]{32}\/reset-password$/.test(url.pathname)) return ok(await resetPassword(request, env, url.pathname.split('/')[4]));
      if (request.method === 'POST' && url.pathname === '/api/admin/notifications') return ok(await notify(request, env, await body(request)));
      if (request.method === 'POST' && url.pathname === '/api/admin/cancel') return ok(await cancelReports(request, env, await body(request)));
      if (request.method === 'POST' && /^\/api\/admin\/history\/[a-f0-9]{32}$/.test(url.pathname)) return ok(await editHistory(request, env, url.pathname.split('/')[4], await body(request)));
      throw new HttpError(404, 'NOT_FOUND', 'ไม่พบหน้าที่ต้องการ');
    } catch (e) {
      if (!e.status) console.error(e);
      return fail(e);
    }
  }
};
