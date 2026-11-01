import { randomBytes, pbkdf2Sync } from 'node:crypto';

const [username, displayName = username] = process.argv.slice(2);
const password = process.env.LIGHTFIX_BOOTSTRAP_PASSWORD;
if (!username || !displayName || !/^[a-z0-9._-]{3,40}$/i.test(username) || !password || password.length < 12) {
  console.error('กำหนด LIGHTFIX_BOOTSTRAP_PASSWORD (อย่างน้อย 12 ตัวอักษร) แล้วใช้: node scripts/prepare-admin.mjs username "ชื่อแสดง"');
  process.exit(1);
}
const salt = randomBytes(16).toString('base64');
const iterations = 100000;
const hash = pbkdf2Sync(password, Buffer.from(salt, 'base64'), iterations, 32, 'sha256').toString('hex');
const escaped = value => `'${String(value).replaceAll("'", "''")}'`;
console.log(`UPDATE users SET display_name=${escaped(displayName)},password_hash=${escaped(hash)},salt=${escaped(salt)},iterations=${iterations},must_change_password=0,active=1 WHERE username=${escaped(username.toLowerCase())} AND role='admin';`);
