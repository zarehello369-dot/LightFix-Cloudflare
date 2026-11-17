const encoder = new TextEncoder();
const groupIdPattern = /^C[0-9a-f]{32}$/i;

export class LineError extends Error {
  constructor(status, code, message) { super(message); this.status=status; this.code=code; }
}

export async function verifyLineSignature(bytes, secret, signature) {
  if (!secret || !signature) return false;
  let rawSignature;
  try { rawSignature=Uint8Array.from(atob(signature), character=>character.charCodeAt(0)); }
  catch { return false; }
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',key,rawSignature,bytes);
}

export async function receiveLineWebhook(request, env) {
  if (!env.LINE_CHANNEL_SECRET) throw new LineError(503,'LINE_NOT_READY','ยังไม่ได้ตั้งค่า LINE Channel Secret');
  if (Number(request.headers.get('content-length')||0)>1_000_000) throw new LineError(413,'TOO_LARGE','ข้อมูลมีขนาดใหญ่เกินไป');
  const bytes=await request.arrayBuffer();
  if (bytes.byteLength>1_000_000) throw new LineError(413,'TOO_LARGE','ข้อมูลมีขนาดใหญ่เกินไป');
  if (!await verifyLineSignature(bytes,env.LINE_CHANNEL_SECRET,request.headers.get('x-line-signature'))) {
    throw new LineError(401,'BAD_LINE_SIGNATURE','ตรวจสอบลายเซ็น LINE ไม่ผ่าน');
  }
  let payload;
  try { payload=JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new LineError(400,'INVALID_JSON','ข้อมูล LINE ไม่ถูกต้อง'); }
  if (!Array.isArray(payload.events)) throw new LineError(400,'INVALID_JSON','ข้อมูล LINE ไม่ถูกต้อง');
  for (const event of payload.events) {
    const groupId=event?.source?.type==='group' ? event.source.groupId : '';
    if (!groupIdPattern.test(groupId)) continue;
    if (event.type==='leave') {
      await env.DB.prepare('DELETE FROM line_groups WHERE group_id=?').bind(groupId).run();
    } else {
      await env.DB.prepare(`INSERT INTO line_groups(group_id,last_seen_at) VALUES(?,?)
        ON CONFLICT(group_id) DO UPDATE SET last_seen_at=excluded.last_seen_at`).bind(groupId,Date.now()).run();
    }
  }
  return { received:true };
}

export async function lineStatus(request,env) {
  const groups=(await env.DB.prepare('SELECT group_id,last_seen_at,selected FROM line_groups ORDER BY last_seen_at DESC LIMIT 20').all()).results;
  return { tokenConfigured:!!env.LINE_CHANNEL_ACCESS_TOKEN, secretConfigured:!!env.LINE_CHANNEL_SECRET,
    webhookUrl:new URL('/api/line/webhook',request.url).href,
    groups:groups.map(group=>({ id:group.group_id,lastSeenAt:group.last_seen_at,selected:!!group.selected })) };
}

export async function selectLineGroup(env,groupId) {
  if (groupId!==null && !groupIdPattern.test(groupId)) throw new LineError(400,'INVALID_GROUP','เลือกกลุ่ม LINE จากรายการที่พบ');
  if (groupId!==null) {
    const found=await env.DB.prepare('SELECT group_id FROM line_groups WHERE group_id=?').bind(groupId).first();
    if (!found) throw new LineError(404,'GROUP_NOT_FOUND','ไม่พบกลุ่มนี้ กรุณาส่งข้อความในกลุ่มแล้วโหลดใหม่');
  }
  const statements=[env.DB.prepare('UPDATE line_groups SET selected=0 WHERE selected=1')];
  if (groupId!==null) statements.push(env.DB.prepare('UPDATE line_groups SET selected=1 WHERE group_id=?').bind(groupId));
  await env.DB.batch(statements);
  return true;
}

export async function pushLineText(env,text,send=fetch) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) throw new LineError(503,'LINE_NOT_READY','ยังไม่ได้ตั้งค่า LINE Channel Access Token');
  const group=await env.DB.prepare('SELECT group_id FROM line_groups WHERE selected=1').first();
  if (!group) throw new LineError(409,'LINE_GROUP_NOT_SELECTED','ยังไม่ได้เลือกกลุ่ม LINE');
  let response;
  try {
    response=await send('https://api.line.me/v2/bot/message/push',{
      method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`},
      body:JSON.stringify({to:group.group_id,messages:[{type:'text',text}]}),signal:AbortSignal.timeout(8000)
    });
  } catch { throw new LineError(502,'LINE_UNAVAILABLE','ติดต่อ LINE ไม่ได้ กรุณาลองใหม่'); }
  if (!response.ok) throw new LineError(502,'LINE_SEND_FAILED',`LINE ไม่รับข้อความ (HTTP ${response.status}) กรุณาตรวจ Token และกลุ่ม`);
  return true;
}

export async function notifyLineNewReport(env,reportId,origin,send=fetch) {
  if (!env.LINE_CHANNEL_ACCESS_TOKEN) return false;
  const report=await env.DB.prepare('SELECT pole,symptom FROM reports WHERE id=?').bind(reportId).first();
  if (!report) return false;
  const group=await env.DB.prepare('SELECT group_id FROM line_groups WHERE selected=1').first();
  if (!group) return false;
  const symptom=String(report.symptom).replace(/\s+/g,' ').slice(0,100);
  await pushLineText(env,`💡 มีเรื่องแจ้งไฟถนนเสียใหม่\nเสา ${report.pole}\nอาการ: ${symptom}\nดูคิวงาน: ${new URL('/admin',origin).href}`,send);
  return true;
}
