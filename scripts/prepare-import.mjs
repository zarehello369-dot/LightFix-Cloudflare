import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes, pbkdf2Sync } from 'node:crypto';
import { resolve } from 'node:path';

function parseCsv(input) {
  const rows = [];
  let row = [], value = '', quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quoted) {
      if (c === '"' && input[i + 1] === '"') { value += '"'; i++; }
      else if (c === '"') quoted = false;
      else value += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(value); value = ''; }
    else if (c === '\n') { row.push(value); rows.push(row); row = []; value = ''; }
    else if (c !== '\r') value += c;
  }
  if (quoted) throw new Error('CSV มีเครื่องหมายคำพูดไม่ครบ');
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

function records(path, expected) {
  const [headers, ...rows] = parseCsv(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  if (!headers || expected.some(x => !headers.includes(x))) throw new Error(`${path}: ไม่พบหัวคอลัมน์ ${expected.join(', ')}`);
  return rows.filter(row => row.some(Boolean)).map(row => Object.fromEntries(headers.map((key, i) => [key, row[i] ?? ''])));
}

const sql = value => `'${String(value ?? '').replaceAll("'", "''")}'`;
const number = value => value === '' || value == null ? 'NULL' : Number.isFinite(Number(value)) ? String(Number(value)) : (() => { throw new Error(`เลขไม่ถูกต้อง: ${value}`); })();
const [polesPath, accountsPath, outputPath] = process.argv.slice(2);
if (!polesPath || !accountsPath || !outputPath) {
  console.error('ใช้: node scripts/prepare-import.mjs Poles.csv Accounts.csv import.sql');
  process.exit(1);
}
const poles = records(resolve(polesPath), ['pole', 'lat', 'lng', 'location', 'active', 'model', 'installedAt', 'notes']);
const accounts = records(resolve(accountsPath), ['id', 'username', 'role']);
const output = [];
const seenPoles = new Set(), seenNames = new Set();
const stamp = Date.now();
for (const p of poles) {
  const pole = String(p.pole).trim().toUpperCase();
  if (!/^T\d{4}$/.test(pole) || seenPoles.has(pole)) throw new Error(`หมายเลขเสาซ้ำหรือไม่ถูกต้อง: ${pole}`);
  seenPoles.add(pole);
  const active = /^(false|0)$/i.test(p.active) ? 0 : 1;
  output.push(`INSERT INTO poles(pole,location,lat,lng,model,installed_at,notes,active,created_at,updated_at) VALUES(${sql(pole)},${sql(p.location || '')},${number(p.lat)},${number(p.lng)},${sql(p.model || '')},${sql(p.installedAt || '')},${sql(p.notes || '')},${active},${stamp},${stamp}) ON CONFLICT(pole) DO UPDATE SET location=excluded.location,lat=excluded.lat,lng=excluded.lng,model=excluded.model,installed_at=excluded.installed_at,notes=excluded.notes,active=excluded.active,updated_at=excluded.updated_at;`);
}
for (const a of accounts) {
  const username = String(a.username || '').trim().toLowerCase();
  const role = String(a.role || '').trim();
  const accountId = String(a.id || '').replaceAll('-', '').toLowerCase();
  if (!/^[a-z0-9._-]{3,40}$/.test(username) || seenNames.has(username) || !['admin', 'technician'].includes(role) || !/^[a-f0-9]{32}$/.test(accountId)) throw new Error(`บัญชีไม่ถูกต้องหรือชื่อผู้ใช้ซ้ำ: ${username}`);
  seenNames.add(username);
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(randomBytes(32), salt, 100000, 32, 'sha256').toString('hex');
  output.push(`INSERT INTO users(id,username,display_name,role,password_hash,salt,iterations,must_change_password,active,created_at) VALUES(${sql(accountId)},${sql(username)},${sql(username)},${sql(role)},${sql(hash)},${sql(salt.toString('base64'))},100000,1,0,${stamp}) ON CONFLICT(username) DO NOTHING;`);
}
writeFileSync(resolve(outputPath), output.join('\n') + '\n', { mode: 0o600 });
console.log(`เตรียมข้อมูลเสา ${poles.length} ต้น และชื่อผู้ใช้ ${accounts.length} บัญชี ลง ${outputPath}`);

export { parseCsv };
