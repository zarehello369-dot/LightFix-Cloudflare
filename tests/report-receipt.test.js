import test from 'node:test';
import assert from 'node:assert/strict';
import { reportReceiptMarkup } from '../public/report-receipt.js';
const receipt={id:'0123456789abcdef0123456789abcdef',pole:'T0001',url:'https://example.test/track?id=0123456789abcdef0123456789abcdef',saved:true,sentAt:Date.UTC(2026,10,12,6,17)};
test('receipt preserves the returned tracking identifier and URL while escaping untrusted values',()=>{
 const html=reportReceiptMarkup({...receipt,pole:'<img src=x onerror=alert(1)>',id:'<script>bad</script>'});
 assert.ok(html.includes('href="'+receipt.url+'"'));
 assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
 assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.equal(html.includes('<img src=x'),false);
});
test('receipt does not claim the link was saved when device storage was unavailable',()=>{
 const html=reportReceiptMarkup({...receipt,saved:false});
 assert.ok(html.includes('เบราว์เซอร์นี้บันทึกประวัติไม่ได้'));
 assert.equal(html.includes('บันทึกลิงก์ไว้ในเรื่องล่าสุดของอุปกรณ์นี้แล้ว'),false);
 assert.ok(html.includes(receipt.id));
});
