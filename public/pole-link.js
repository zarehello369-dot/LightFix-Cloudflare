export function poleFromPage(search) {
  const page = new URLSearchParams(search).get('page');
  if (!page || !/^[0-9]{1,4}$/.test(page)) return '';
  const number = Number(page);
  return number > 0 ? `T${String(number).padStart(4, '0')}` : '';
}
