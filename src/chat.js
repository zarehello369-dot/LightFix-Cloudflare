// Staff conversations and job invitations share the existing staff session and work lock.
export async function chatRoute(request, env, h) {
  const { actor, one, all, run, HttpError, commitWork, id } = h;
  const user = await actor(request, env);
  const url = new URL(request.url), path = url.pathname, db = env.DB;
  const reject = (status, code, message) => { throw new HttpError(status, code, message); };
  const presentMessages = async rows => {
    const poles = [...new Set(rows.filter(message=>message.offer_status==='pending').map(message=>message.pole))];
    const revisions = poles.length ? await all(db,`SELECT pole,revision FROM pole_work_state WHERE pole IN (${poles.map(()=>'?').join(',')})`,...poles) : [];
    const current = new Map(revisions.map(work=>[work.pole,work.revision]));
    return rows.map(({request_payload,...message})=>({...message,offer_status:message.offer_status==='pending' && current.get(message.pole)!==message.work_revision ? 'expired' : message.offer_status}));
  };
  if (!['admin','technician'].includes(user.role)) reject(403,'FORBIDDEN','ไม่มีสิทธิ์ใช้แชท');
  if(path==='/api/chat/presence'&&request.method==='POST'){
    const data=await h.body(request);
    if(typeof data.tabId!=='string'||!/^[a-f0-9-]{36}$/.test(data.tabId)||typeof data.visible!=='boolean')reject(400,'INVALID_PRESENCE','สถานะการเชื่อมต่อไม่ถูกต้อง');
    const session=await h.sessionHash();
    if(!data.visible)await run(db,'DELETE FROM staff_presence WHERE session_hash=? AND tab_id=?',session,data.tabId);
    else await db.batch([
      db.prepare('INSERT INTO staff_presence(session_hash,tab_id,user_id,last_seen) VALUES(?,?,?,?) ON CONFLICT(session_hash,tab_id) DO UPDATE SET last_seen=excluded.last_seen').bind(session,data.tabId,user.id,Date.now()),
      db.prepare('DELETE FROM staff_presence WHERE last_seen<?').bind(Date.now()-300_000)
    ]);
    return true;
  }
  const profile=async()=>{
    const record=await one(db,'SELECT u.id,u.username,u.display_name,u.role,p.version,CASE WHEN p.avatar IS NOT NULL THEN 1 ELSE 0 END AS has_avatar FROM users u LEFT JOIN staff_profiles p ON p.user_id=u.id WHERE u.id=?',user.id);
    return {...record,avatar_url:record.has_avatar?`/api/chat/avatars/${record.id}?v=${record.version}`:null};
  };
  if(path==='/api/chat/profile'){
    if(request.method==='GET')return profile();
    if(request.method==='POST'){
      const data=await h.body(request);
      if(data.removePhoto&&data.photo)reject(400,'INVALID_PROFILE','เลือกเปลี่ยนรูปหรือลบรูปอย่างใดอย่างหนึ่ง');
      const photo=data.photo?h.decodePhoto(data.photo):null;
      if(photo&&photo.bytes.length>100_000)reject(413,'PHOTO_TOO_LARGE','รูปโปรไฟล์ใหญ่เกิน 100 KB กรุณาย่อรูปก่อนส่ง');
      const statements=[db.prepare('INSERT INTO staff_profiles(user_id,version) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET version=excluded.version').bind(user.id,id())];
      if(photo||data.removePhoto)statements.push(db.prepare('UPDATE staff_profiles SET avatar=?,avatar_type=? WHERE user_id=?').bind(photo?photo.bytes:null,photo?photo.type:null,user.id));
      await db.batch(statements);
      return profile();
    }
  }
  const avatar=path.match(/^\/api\/chat\/avatars\/([a-f0-9]{32})$/);
  if(request.method==='GET'&&avatar){
    const record=await one(db,'SELECT avatar,avatar_type FROM staff_profiles WHERE user_id=?',avatar[1]);
    if(!record?.avatar)reject(404,'NOT_FOUND','ยังไม่มีรูปโปรไฟล์');
    const bytes=Array.isArray(record.avatar)?Uint8Array.from(record.avatar):record.avatar;
    return new Response(bytes,{headers:{'content-type':record.avatar_type,'cache-control':'private, no-store','x-content-type-options':'nosniff'}});
  }
  if (request.method === 'GET' && path === '/api/chat/contacts') {
    return { profile:await profile(),contacts: await all(db, `SELECT u.id,u.username,u.display_name,u.role,u.active,
      CASE WHEN u.active=1 AND EXISTS(SELECT 1 FROM staff_presence sp JOIN sessions se ON se.token_hash=sp.session_hash WHERE sp.user_id=u.id AND sp.last_seen>${Date.now()-75_000} AND se.expires_at>${Date.now()}) THEN 1 ELSE 0 END AS online,
      CASE WHEN p.avatar IS NOT NULL THEN '/api/chat/avatars/'||u.id||'?v='||p.version ELSE NULL END AS avatar_url,
      (SELECT body FROM chat_messages WHERE (sender_id=u.id AND recipient_id=?) OR (sender_id=? AND recipient_id=u.id) ORDER BY id DESC LIMIT 1) AS preview,
      (SELECT MAX(id) FROM chat_messages WHERE (sender_id=u.id AND recipient_id=?) OR (sender_id=? AND recipient_id=u.id)) AS latest_id,
      (SELECT COUNT(*) FROM chat_messages WHERE sender_id=u.id AND recipient_id=? AND read_at IS NULL) AS unread
      FROM users u LEFT JOIN staff_profiles p ON p.user_id=u.id WHERE u.id<>? AND (u.active=1 OR EXISTS(SELECT 1 FROM chat_messages WHERE (sender_id=u.id AND recipient_id=?) OR (sender_id=? AND recipient_id=u.id)))
      ORDER BY latest_id DESC,u.display_name COLLATE NOCASE LIMIT 1000`,user.id,user.id,user.id,user.id,user.id,user.id,user.id,user.id) };
  }
  const match = path.match(/^\/api\/chat\/([a-f0-9]{32})(?:\/(read|offers))?$/);
  if (match) {
    const peerId = match[1], action = match[2];
    const peer = await one(db,'SELECT id,display_name,role,active FROM users WHERE id=? AND id<>?',peerId,user.id);
    if (!peer) reject(404,'NOT_FOUND','ไม่พบบัญชีคู่สนทนา');
    if (request.method === 'GET' && !action) {
      if (url.searchParams.has('after')) {
        const after=Number(url.searchParams.get('after'));
        if (!Number.isSafeInteger(after)||after<0) reject(400,'INVALID_CURSOR','เลขข้อความไม่ถูกต้อง');
        const messages=await all(db,`SELECT * FROM chat_messages WHERE id>? AND ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) ORDER BY id LIMIT 51`,after,user.id,peerId,peerId,user.id);
        const updates=await all(db,`SELECT * FROM chat_messages WHERE id<=? AND ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) ORDER BY id DESC LIMIT 50`,after,user.id,peerId,peerId,user.id);
        return {peer,messages:await presentMessages(messages.slice(0,50)),updates:await presentMessages(updates),newMore:messages.length>50};
      }
      const before = Number(url.searchParams.get('before') || Number.MAX_SAFE_INTEGER);
      if (!Number.isSafeInteger(before) || before < 1) reject(400,'INVALID_CURSOR','เลขหน้าข้อความไม่ถูกต้อง');
      const rows = await all(db, `SELECT * FROM chat_messages WHERE id<? AND ((sender_id=? AND recipient_id=?) OR (sender_id=? AND recipient_id=?)) ORDER BY id DESC LIMIT 51`,before,user.id,peerId,peerId,user.id);
      return { peer, messages:await presentMessages(rows.slice(0,50).reverse()), more:rows.length>50 };
    }
    const data = await h.body(request);
    if (request.method === 'POST' && action === 'read') {
      if (!Number.isSafeInteger(data.through) || data.through < 1) reject(400,'INVALID_CURSOR','เลขข้อความไม่ถูกต้อง');
      await run(db,'UPDATE chat_messages SET read_at=? WHERE sender_id=? AND recipient_id=? AND id<=? AND read_at IS NULL',Date.now(),peerId,user.id,data.through);
      return true;
    }
    if (request.method === 'POST' && (!action || action==='offers')) {
      if (!peer.active) reject(409,'ACCOUNT_INACTIVE','บัญชีนี้ปิดใช้งานแล้ว ส่งข้อความใหม่ไม่ได้');
      if (typeof data.requestKey !== 'string' || !/^[a-f0-9-]{32,40}$/.test(data.requestKey)) reject(400,'INVALID_MESSAGE','ไม่พบรหัสการส่ง กรุณาลองใหม่');
      let text = typeof data.body==='string' ? data.body.trim() : '';
      if ((!action && !text) || text.length>2000) reject(400,'INVALID_MESSAGE','พิมพ์ข้อความไม่เกิน 2,000 ตัวอักษร');
      const requestPayload=JSON.stringify({recipientId:peerId,kind:action?'offer':'text',body:text,pole:action?h.poleNumber(data.pole):null,revision:action?data.workRevision:null});
      const checked=message=>{
        if (message.request_payload!==requestPayload) reject(409,'REQUEST_REUSED','รหัสการส่งนี้ใช้กับรายละเอียดอื่นแล้ว กรุณาเริ่มรายการใหม่');
        const {request_payload,...publicMessage}=message;return publicMessage;
      };
      const previous = await one(db,'SELECT * FROM chat_messages WHERE sender_id=? AND request_key=?',user.id,data.requestKey);
      if (previous) return checked(previous);
      let pole=null, reportIds=null, revision=null;
      if (action==='offers') {
        if (user.role!=='admin' || peer.role!=='technician') reject(403,'FORBIDDEN','เฉพาะเจ้าหน้าที่ส่งคำเชิญงานให้ช่างได้');
        pole=h.poleNumber(data.pole);
        const work=await one(db,'SELECT revision FROM pole_work_state WHERE pole=?',pole);
        const reports=await all(db,'SELECT id,symptom,assigned_user_id FROM reports WHERE pole=? AND status=0 ORDER BY created_at,id',pole);
        if (!work || data.workRevision!==work.revision || !reports.length || reports.length>3 || reports.some(r=>r.assigned_user_id && r.assigned_user_id!==peerId) || await one(db,'SELECT id FROM jobs WHERE pole=? AND status=1',pole)) reject(409,'WORK_CHANGED','งานเปลี่ยนแปลงหรือมีผู้รับแล้ว โหลดรายการงานล่าสุดก่อนส่ง');
        reportIds=JSON.stringify(reports.map(r=>r.id)); revision=work.revision;
        text=`งานเสา ${pole}\n${[...new Set(reports.map(r=>r.symptom))].join(' · ')}${text?'\n'+text:''}`;
      }
      await run(db,`INSERT INTO chat_messages(sender_id,recipient_id,request_key,body,created_at,kind,pole,report_ids,work_revision,offer_status,request_payload)
        VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(sender_id,request_key) DO NOTHING`,user.id,peerId,data.requestKey,text,Date.now(),action?'offer':'text',pole,reportIds,revision,action?'pending':null,requestPayload);
      return checked(await one(db,'SELECT * FROM chat_messages WHERE sender_id=? AND request_key=?',user.id,data.requestKey));
    }
  }
  const response=path.match(/^\/api\/chat\/offers\/(\d+)\/respond$/);
  if (request.method==='POST' && response) {
    const data=await h.body(request), message=await one(db,"SELECT * FROM chat_messages WHERE id=? AND kind='offer' AND recipient_id=?",Number(response[1]),user.id);
    if (!message || user.role!=='technician') reject(403,'FORBIDDEN','ตอบรับได้เฉพาะช่างที่ได้รับคำเชิญ');
    if (!['accepted','declined'].includes(data.decision)) reject(400,'INVALID_DECISION','เลือกรับงานหรือปฏิเสธ');
    if (message.offer_status===data.decision) return {status:message.offer_status,jobId:message.job_id};
    if (message.offer_status!=='pending') reject(409,'OFFER_CHANGED','คำเชิญนี้ถูกตอบหรือหมดอายุแล้ว');
    const work = await one(db,'SELECT revision FROM pole_work_state WHERE pole=?',message.pole);
    if (!work || work.revision!==message.work_revision) reject(409,'OFFER_CHANGED','คำเชิญนี้หมดอายุแล้ว โหลดข้อความล่าสุด');
    if (data.decision==='declined') {
      const result=await run(db,"UPDATE chat_messages SET offer_status='declined',responded_at=? WHERE id=? AND offer_status='pending'",Date.now(),message.id);
      if (!result.meta.changes) reject(409,'OFFER_CHANGED','คำเชิญเปลี่ยนแปลงแล้ว โหลดข้อความล่าสุด');
      return {status:'declined'};
    }
    const reports=await all(db,'SELECT id,assigned_user_id,instructions,due_at FROM reports WHERE pole=? AND status=0 ORDER BY created_at,id',message.pole);
    const ids=JSON.parse(message.report_ids), jobId=id(), operation=id(), time=Date.now();
    if (reports.length!==ids.length || reports.some(r=>!ids.includes(r.id) || (r.assigned_user_id && r.assigned_user_id!==user.id)) || await one(db,'SELECT id FROM jobs WHERE pole=? AND status=1',message.pole)) reject(409,'WORK_CHANGED','งานนี้เปลี่ยนไปแล้วหรือมีผู้รับแล้ว กรุณาโหลดข้อมูลล่าสุด');
    const instructions=[...new Set([...reports.map(report=>report.instructions).filter(Boolean),message.body])].join('\n');
    const deadlines=reports.map(report=>report.due_at).filter(value=>value!==null);
    const dueAt=deadlines.length?Math.min(...deadlines):null;
    try {
      await commitWork(env,user,message.pole,message.work_revision,[
        db.prepare("INSERT INTO chat_offer_checks(operation_id,valid) VALUES(?,COALESCE((SELECT offer_status='pending' FROM chat_messages WHERE id=?),0))").bind(operation,message.id),
        db.prepare('INSERT INTO jobs(id,pole,status,started_at,technician_id,assigned_user_id,instructions,due_at) VALUES(?,?,1,?,?,?,?,?)').bind(jobId,message.pole,time,user.id,user.id,instructions,dueAt),
        ...ids.map(reportId=>db.prepare('UPDATE reports SET status=1,job_id=?,assigned_user_id=?,instructions=?,due_at=? WHERE id=?').bind(jobId,user.id,instructions,dueAt,reportId)),
        db.prepare("UPDATE chat_messages SET offer_status='accepted',responded_at=?,job_id=? WHERE id=?").bind(time,jobId,message.id),
        db.prepare("UPDATE chat_messages SET offer_status='expired',responded_at=? WHERE pole=? AND kind='offer' AND offer_status='pending'").bind(time,message.pole),
        db.prepare('DELETE FROM chat_offer_checks WHERE operation_id=?').bind(operation)
      ]);
    } catch(error) {
      if (/chat_offer_pending/.test(error.message)) reject(409,'OFFER_CHANGED','คำเชิญนี้มีการตอบรับแล้ว โหลดข้อความล่าสุด');
      throw error;
    }
    return {status:'accepted',jobId};
  }
  reject(404,'NOT_FOUND','ไม่พบหน้าข้อความ');
}
