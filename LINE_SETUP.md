# เชื่อม LINE OA กับ LightFix (แจ้งเรื่องใหม่เข้ากลุ่มเจ้าหน้าที่)

ระบบแจ้งเฉพาะหมายเลขเสา อาการ และลิงก์เข้าหน้าเจ้าหน้าที่ ไม่ส่งชื่อ เบอร์โทร อีเมล หรือ LINE ID ของผู้แจ้ง การส่งทำหลังบันทึกเรื่องสำเร็จ จึงไม่ทำให้หน้าแจ้งเหตุรอ LINE

## 1. ตั้งคีย์ใน Cloudflare

ที่ Cloudflare Dashboard เปิด **Workers & Pages → lightfix → Settings → Variables and Secrets** แล้วเพิ่มชนิด **Secret** สองรายการ:

- `LINE_CHANNEL_SECRET` = Channel secret ในแท็บ **Basic settings** ของ Messaging API channel ที่ผูกกับ LINE OA นี้
- `LINE_CHANNEL_ACCESS_TOKEN` = Channel access token ของ Messaging API channel เดียวกัน

กด Deploy เพื่อให้ค่าเริ่มใช้ ห้ามใส่คีย์ใน GitHub หรือส่งผ่านแชต ถ้า OA เดิมใช้ token อยู่กับระบบเก่า ให้ตรวจผลกระทบก่อนออก token ใหม่ เพราะการออก long-lived token ใหม่อาจยกเลิกตัวเดิม

## 2. ตั้ง Webhook ใน LINE Developers

เปิด Messaging API channel เดียวกัน แล้วตั้ง Webhook URL เป็น:

`https://lightfix.service-fix.workers.dev/api/line/webhook`

กด **Verify** และเปิด **Use webhook** จากนั้นเปิด **Allow bot to join group chats** ในแท็บ Messaging API

## 3. เลือกกลุ่มและทดสอบ

เชิญ LINE OA เข้ากลุ่มเจ้าหน้าที่ในแอป LINE แล้วส่งข้อความหนึ่งครั้ง เปิด LightFix ด้วยบัญชีเจ้าหน้าที่ → **แจ้งเตือน LINE** → **โหลดกลุ่มใหม่** → **ใช้กลุ่มนี้** → **ส่งข้อความทดสอบ** ตรวจว่ากลุ่มได้รับ “✅ ทดสอบแจ้งเตือน LightFix สำเร็จ”

หากไม่พบกลุ่ม ให้ตรวจว่า OA อยู่ในกลุ่ม, Webhook เปิดอยู่, ใช้ Channel secret ถูก channel และส่งข้อความในกลุ่มหลังตั้ง Webhook แล้ว หาก LINE ตอบ HTTP 401/403 ในการทดสอบ ให้ตรวจ Channel access token และสิทธิ์ของ OA ในกลุ่ม

เรื่องแจ้งที่เกิดก่อนเลือกกลุ่มจะไม่ถูกส่งย้อนหลัง การปิดแจ้งเตือนทำได้ด้วยปุ่ม **หยุดแจ้งเตือน** ในหน้าเดียวกัน
