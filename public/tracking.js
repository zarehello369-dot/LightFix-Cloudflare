const STORAGE_KEY = 'lightfix:recent-reports:v1';
const MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const MAX_REPORTS = 10;

function safeRows(rows, time) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  return rows.filter(row => row && /^[a-f0-9]{32}$/.test(row.id) && /^T\d{4}$/.test(row.pole)
    && Number.isSafeInteger(row.at) && row.at <= time && row.at > time - MAX_AGE)
    .sort((a, b) => b.at - a.at)
    .filter(row => { if (seen.has(row.id)) return false; seen.add(row.id); return true; })
    .slice(0, MAX_REPORTS).map(({ id, pole, at }) => ({ id, pole, at }));
}

export function readRecentReports(storage, time = Date.now()) {
  try {
    const store = storage || globalThis.localStorage;
    const raw = store.getItem(STORAGE_KEY) || '[]';
    const rows = safeRows(JSON.parse(raw), time);
    // Purge expired/unrecognized fields when storage permits; reading still works if writes are blocked.
    if (raw !== JSON.stringify(rows)) { try { store.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch {} }
    return rows;
  }
  catch { return []; }
}

export function rememberReport(report, storage, time = Date.now()) {
  try {
    const store = storage || globalThis.localStorage;
    const rows = safeRows([{ id: report.id, pole: report.pole, at: time }, ...readRecentReports(store, time)], time);
    if (!rows.some(row => row.id === report.id)) return false;
    store.setItem(STORAGE_KEY, JSON.stringify(rows));
    return true;
  } catch { return false; }
}

export function clearRecentReports(storage) {
  try { (storage || globalThis.localStorage).removeItem(STORAGE_KEY); return true; }
  catch { return false; }
}

export const trackingPath = id => `/track?id=${encodeURIComponent(id)}`;
