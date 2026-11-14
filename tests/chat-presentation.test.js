import test from 'node:test';
import assert from 'node:assert/strict';
import {messageDay,emojiOnly} from '../public/chat-presentation.js';
test('date separators use Bangkok calendar days at midnight',()=>{
 assert.equal(messageDay(Date.parse('2026-11-13T16:59:59Z')),'13 พ.ย. 2569');
 assert.equal(messageDay(Date.parse('2026-11-13T17:00:00Z')),'14 พ.ย. 2569');
});
test('emoji treatment supports modifiers and joined sequences without enlarging ordinary text',()=>{
 for(const value of ['🙏 👍','👨‍🔧','👍🏽','🇹🇭'])assert.equal(emojiOnly(value),true,value);
 for(const value of ['ซ่อมแล้ว 👍','T0002','123',''])assert.equal(emojiOnly(value),false,value);
});
