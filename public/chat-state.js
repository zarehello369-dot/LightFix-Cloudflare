// Serial reads keep history pagination and background refresh from replacing each other.
export function serialTasks() {
  let tail=Promise.resolve();
  return task=>{const result=tail.then(task);tail=result.catch(()=>{});return result;};
}
export function mergeMessages(current,updates) {
  const records=new Map(current.map(row=>[row.id,row]));
  for(const row of updates)records.set(row.id,row);
  return [...records.values()].sort((a,b)=>a.id-b.id);
}
export function draftMayClear({version,value},sent) {
  return version===sent.version && value===sent.value;
}
export function uncertainInvite(error) {
  // An INTERNAL/unknown error may follow a committed insert with a failed readback.
  return !['WORK_CHANGED','REQUEST_REUSED','INVALID_MESSAGE','INVALID_POLE','FORBIDDEN','ACCOUNT_INACTIVE'].includes(error.code);
}
