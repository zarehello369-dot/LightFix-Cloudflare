// One compact, filled icon family for LightFix controls. The logo remains its own mark.
const shapes = {
  arrowRight:'<path d="M5 11h11.2l-4.1-4.1 1.4-1.4L20 12l-6.5 6.5-1.4-1.4 4.1-4.1H5z"/>',
  arrowLeft:'<path d="M19 11H7.8l4.1-4.1-1.4-1.4L4 12l6.5 6.5 1.4-1.4L7.8 13H19z"/>',
  external:'<path d="M13 4h7v7h-2V7.4l-8.3 8.3-1.4-1.4L16.6 6H13z"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5v2H6v10h10v-5z"/>',
  check:'<path d="m9.3 17.7-5.6-5.6 1.6-1.6 4 4 9.4-9.4 1.6 1.6z"/>',
  checks:'<path d="m5.5 11 3.1 3.1 7.6-7.6 1.4 1.4-9 9L4 12.4zm5.2 5.3 1.4-1.4 1.2 1.2 7.6-7.6 1.4 1.4-9 9z"/>',
  close:'<path d="m5.4 4 6.6 6.6L18.6 4 20 5.4 13.4 12l6.6 6.6-1.4 1.4-6.6-6.6L5.4 20 4 18.6l6.6-6.6L4 5.4z"/>',
  send:'<path d="M5 5.25c0-2.75 3.1-4.25 5.3-2.65l9.8 7.1a2.83 2.83 0 0 1 0 4.6l-9.8 7.1C8.1 23 5 21.5 5 18.75Z"/>',
  work:'<path fill-rule="evenodd" d="M7 6a5 5 0 0 1 10 0h-1.8a3.2 3.2 0 0 0-6.4 0Z"/><path d="M2 12V9.5A4.5 4.5 0 0 1 6.5 5h11A4.5 4.5 0 0 1 22 9.5V12ZM2 13.7h9.1v.8a.9.9 0 0 0 1.8 0v-.8H22v4.8a4.5 4.5 0 0 1-4.5 4.5h-11A4.5 4.5 0 0 1 2 18.5Z"/>',
  search:'<path fill-rule="evenodd" d="M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm0 3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z"/><path d="m15.3 14 5.4 5.4-1.4 1.4-5.4-5.4z"/>',
  chat:'<path d="M12 3a9 9 0 0 0-8 13.2L2.8 21l5.1-1.1A9 9 0 1 0 12 3Zm-4 7h8v2H8Zm0 4h6v2H8Z"/>',
  user:'<circle cx="12" cy="7.5" r="4.3"/><path d="M4 21v-2.5a8 8 0 0 1 16 0V21z"/>',
  users:'<circle cx="8" cy="8" r="3.3"/><circle cx="17" cy="8" r="3.3"/><path d="M1.5 20v-2a6.5 6.5 0 0 1 10-5.5A6.5 6.5 0 0 1 14 18v2zm12.5 0v-2a8 8 0 0 0-1-4 6.5 6.5 0 0 1 9.5 5.8V20z"/>',
  location:'<path d="M12 2a8 8 0 0 0-8 8c0 5.2 8 12 8 12s8-6.8 8-12a8 8 0 0 0-8-8Zm0 11.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"/>',
  calendar:'<path d="M7 2h2v3h6V2h2v3h2a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h2zm13 9H4v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1z"/>',
  bell:'<path d="M12 2a6 6 0 0 0-6 6v4.4c0 1.7-.6 3.3-1.7 4.5L3 18h18l-1.3-1.1a6.7 6.7 0 0 1-1.7-4.5V8a6 6 0 0 0-6-6Zm-2.5 18h5a2.5 2.5 0 0 1-5 0Z"/>',
  clock:'<path fill-rule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 4h2v5.5l3.5 2.1-1 1.7L11 12.6Z"/>',
  image:'<path fill-rule="evenodd" d="M5 2h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3Zm12 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM4 18l5.3-5.5 3 3 2.6-2.6L20 18H4Z"/>',
  warning:'<path fill-rule="evenodd" d="M10.2 3.1a2.1 2.1 0 0 1 3.6 0l9.4 16.2a2.1 2.1 0 0 1-1.8 3.2H2.6a2.1 2.1 0 0 1-1.8-3.2Zm1.8 3.2L4.7 19h14.6ZM11 10h2v5h-2zm0 6.5h2v2h-2z"/>',
  camera:'<path d="M7 5h3l1-2h5l1 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm5 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z"/>',
  copy:'<path d="M8 3h11a2 2 0 0 1 2 2v12h-2V5H8z"/><path d="M5 7h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm0 2v11h11V9z"/>',
  lock:'<path fill-rule="evenodd" d="M7 9V7a5 5 0 0 1 10 0v2h1a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3zm2 0h6V7a3 3 0 0 0-6 0zM6 11v9h12v-9zm6 2a1.5 1.5 0 0 1 1 2.6V18h-2v-2.4a1.5 1.5 0 0 1 1-2.6Z"/>',
  refresh:'<path d="M20 4v6h-6l2.3-2.3A7 7 0 1 0 19 14h2a9 9 0 1 1-3.3-7.7z"/>',
  share:'<circle cx="18" cy="4" r="3"/><circle cx="5" cy="12" r="3"/><circle cx="18" cy="20" r="3"/><path d="m7 10 8.4-5 1 1.7-8.4 5zm1 2.3 8.4 5-1 1.7-8.4-5z"/>',
  zoom:'<circle cx="10" cy="10" r="6.5"/><path d="m15 14 6 6-1.5 1.5-6-6z"/><path d="M9 6.5h2v2.5h2.5v2H11v2.5H9V11H6.5V9H9z"/>',
  eye:'<path d="M12 4C5 4 1 12 1 12s4 8 11 8 11-8 11-8-4-8-11-8Zm0 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/>',
  eyeOff:'<path d="m3.4 2 18.6 18.6-1.4 1.4-3.2-3.2A11 11 0 0 1 12 20C5 20 1 12 1 12a18 18 0 0 1 4-5.1L2 3.4zM12 4c7 0 11 8 11 8a18 18 0 0 1-3.1 4.3l-3-3A5 5 0 0 0 10.7 7L8.8 5.1A11 11 0 0 1 12 4Z"/>',
  inbox:'<path d="M4 3h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v10h4l1.5 2h5l1.5-2h4V5z"/>',
  list:'<path d="M4 5h3v3H4zm5 0h11v3H9zM4 11h3v3H4zm5 0h11v3H9zM4 17h3v3H4zm5 0h11v3H9z"/>',
  settings:'<path d="m10 2 4 0 .5 2.2 2 .9 1.9-1.2 2.8 2.8-1.2 1.9.9 2L23 11v4l-2.2.5-.9 2 1.2 1.9-2.8 2.8-1.9-1.2-2 .9L14 23h-4l-.5-2.2-2-.9-1.9 1.2-2.8-2.8 1.2-1.9-.9-2L1 15v-4l2.2-.5.9-2-1.2-1.9 2.8-2.8 1.9 1.2 2-.9zm2 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/>',
  wrench:'<path d="M8.6 1.5c.7-.4 1.4.2 1.4 1v5.2a2 2 0 0 0 4 0V2.5c0-.8.7-1.4 1.4-1C19.5 3.7 22 7.6 22 12a10 10 0 0 1-5.4 8.9c-.4.2-.6.6-.6 1.1v.5c0 .8-.7 1.5-1.5 1.5h-5c-.8 0-1.5-.7-1.5-1.5V22c0-.5-.2-.9-.6-1.1A10 10 0 0 1 2 12c0-4.4 2.5-8.3 6.6-10.5Z"/>',
  history:'<path d="M12 3a9 9 0 1 1-8.8 11H5a7 7 0 1 0 1.8-6.2L9 10H2V3l2.3 2.3A9 9 0 0 1 12 3Zm-1 4h2v5l3.5 2.1-1 1.7L11 13z"/>',
  bolt:'<path d="M13.3 1 4 13h6l-1.3 10L20 9h-6z"/>',
  bulb:'<path d="M12 2a7 7 0 0 0-4.7 12.2C8.5 15.3 9 16 9 17h6c0-1 .5-1.7 1.7-2.8A7 7 0 0 0 12 2ZM9 18h6v2H9zm1 3h4v2h-4z"/>',
  bulbOff:'<path d="m3 2 19 19-1.4 1.4-4.2-4.2H9v-1.3c0-1.3-.5-2-1.7-3.1A7 7 0 0 1 6 5.8L1.6 3.4zm9 0a7 7 0 0 1 4.7 12.2l-.5.5-2.4-2.4A5 5 0 0 0 8.7 7.2L7 5.5A7 7 0 0 1 12 2ZM9 19h6v2H9z"/>',
  dim:'<path d="M12 3a7 7 0 0 0-4.7 12.2C8.5 16.3 9 17 9 18h6c0-1 .5-1.7 1.7-2.8A7 7 0 0 0 12 3Zm-3 16h6v2H9z"/><circle cx="12" cy="10" r="2"/>',
  lamp:'<path d="M3 21h2V7a3 3 0 0 1 3-3h8v2H8a1 1 0 0 0-1 1v14h2v2H3zM15 3h6v6h-6zM13 9h10l-2 4h-6z"/>',
  cable:'<path d="M2 6c7 0 8 8 20 6v3C10 17 8 9 2 9zM2 11c7 0 8 8 20 6v3C10 22 8 14 2 14z"/>',
  more:'<circle cx="5" cy="12" r="2.3"/><circle cx="12" cy="12" r="2.3"/><circle cx="19" cy="12" r="2.3"/>'
};

export function uiIcon(name, size = 20, className = '') {
  if (!Object.hasOwn(shapes, name)) throw new Error(`Unknown LightFix icon: ${name}`);
  return `<svg class="ui-icon${className ? ` ${className}` : ''}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${shapes[name]}</svg>`;
}
