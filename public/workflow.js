export function groupReports(rows, jobs = [], users = [], poles = []) {
  const groups = new Map();
  for (const report of rows) {
    if (!groups.has(report.pole)) groups.set(report.pole, { pole: report.pole, reports: [], urgent: false });
    const group = groups.get(report.pole); group.reports.push(report);
    group.urgent ||= /สายไฟ|เสาหรือโคมชำรุด/.test(report.symptom);
  }
  return [...groups.values()].map(group => {
    const open = group.reports.filter(report => report.status < 2);
    const job = jobs.find(job => job.pole === group.pole && job.status === 1);
    const assignedId = job?.assigned_user_id || job?.technician_id || open.find(report => report.assignedId)?.assignedId;
    return { ...group, open, job, assignedId, assignedName: users.find(user => user.id === assignedId)?.display_name || '', location: poles.find(pole => pole.pole === group.pole)?.location || '', dueAt: job?.due_at || open.find(report => report.dueAt)?.dueAt || null, firstAt: Math.min(...group.reports.map(report => report.at)) };
  }).sort((a,b) => Number(b.urgent)-Number(a.urgent) || a.firstAt-b.firstAt);
}

export function readFilters(storage, key) {
  try { const value = JSON.parse(storage.getItem(key) || '{}'); return { reportStatus: ['open','0','1','2','3','all'].includes(value.reportStatus) ? value.reportStatus : 'open', reportQuery: typeof value.reportQuery === 'string' ? value.reportQuery.slice(0,100) : '', poleQuery: typeof value.poleQuery === 'string' ? value.poleQuery.slice(0,100) : '', userQuery: typeof value.userQuery === 'string' ? value.userQuery.slice(0,100) : '' }; }
  catch { return { reportStatus:'open', reportQuery:'', poleQuery:'', userQuery:'' }; }
}

export function queueReports(data, status, query) {
  const rows = data.reports.filter(report => status === 'all' || (status === 'open' ? report.status < 2 : report.status === Number(status)));
  const text = query.trim().toLowerCase();
  const poles = new Set(rows.filter(report => !text || `${report.pole} ${report.symptom} ${data.poles.find(pole => pole.pole === report.pole)?.location || ''}`.toLowerCase().includes(text)).map(report => report.pole));
  return rows.filter(report => poles.has(report.pole));
}
