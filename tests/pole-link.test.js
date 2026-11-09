import test from 'node:test';
import assert from 'node:assert/strict';
import { poleFromPage } from '../public/pole-link.js';

test('page link selects the matching pole number', () => {
  assert.equal(poleFromPage('?page=1'), 'T0001');
  assert.equal(poleFromPage('?page=50'), 'T0050');
  assert.equal(poleFromPage('?page=9999'), 'T9999');
});

test('invalid page links leave the pole input empty', () => {
  for (const query of ['', '?page=0', '?page=-1', '?page=1.5', '?page=10000', '?page=T0001', '?page=abc']) {
    assert.equal(poleFromPage(query), '', query);
  }
});
