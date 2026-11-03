import test from 'node:test';
import assert from 'node:assert/strict';
import { readRecentReports, rememberReport, clearRecentReports } from '../public/tracking.js';

function memory() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), data };
}
const time = Date.UTC(2026, 10, 3);
const report = n => ({ id: n.toString(16).padStart(32, '0'), pole: 'T0001' });

test('recent tracking keeps only identifiers, deduplicates and bounds device history', () => {
  const store = memory();
  for (let n = 1; n <= 12; n++) rememberReport({ ...report(n), contactValue: 'private', photo: 'private', symptom: 'private' }, store, time + n);
  const rows = readRecentReports(store, time + 20);
  assert.equal(rows.length, 10);
  assert.equal(rows[0].id, report(12).id);
  assert.deepEqual(Object.keys(rows[0]).sort(), ['at', 'id', 'pole']);
  assert.equal([...store.data.values()].join('').includes('private'), false);
  rememberReport(report(12), store, time + 21);
  assert.equal(readRecentReports(store, time + 22).length, 10);
  assert.equal(readRecentReports(store, time + 31 * 86400000).length, 0);
  assert.equal(clearRecentReports(store), true);
  assert.deepEqual(readRecentReports(store, time + 22), []);
});

test('blocked, malformed and hostile device storage cannot break reporting', () => {
  const blocked = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); }, removeItem() { throw Error('blocked'); } };
  assert.deepEqual(readRecentReports(blocked, time), []);
  assert.equal(rememberReport(report(1), blocked, time), false);
  assert.equal(clearRecentReports(blocked), false);
  assert.deepEqual(readRecentReports({ getItem: () => '{' }, time), []);
  assert.deepEqual(readRecentReports({ getItem: () => JSON.stringify([{ id: 'javascript:bad', pole: '<script>', at: time }]) }, time), []);
  assert.equal(rememberReport({ id: 'bad', pole: 'T0001' }, memory(), time), false);
});
