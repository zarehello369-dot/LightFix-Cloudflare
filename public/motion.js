// Motion never gates content, focus, or a saved result.
const running = new WeakMap();
const active = new Set();
const ease = 'cubic-bezier(.16,1,.3,1)';
const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function play(element, frames, duration, delay = 0) {
  if (!element?.animate) return;
  running.get(element)?.cancel();
  running.delete(element);
  if (reduced()) return;
  const animation = element.animate(frames, { duration, delay, easing:ease, fill:'backwards' });
  running.set(element, animation);
  active.add(animation);
  animation.finished.catch(()=>{}).finally(()=>{
    active.delete(animation);
    if(running.get(element)===animation) running.delete(element);
  });
}

export function reveal(element) {
  play(element, [
    { opacity: .7 },
    { opacity: 1 },
  ], 180);
}

// Animate local records only: never hide the page or duplicate a text layer.
export function settle(element, delay = 0) {
  play(element, [{ transform:'translateY(8px)' }, { transform:'translateY(0)' }], 260, Math.min(100, Math.max(0, delay)));
}

let installed = false;
export function installMotion() {
  if (installed || !globalThis.document || !globalThis.MutationObserver) return;
  installed = true;
  const candidates = '.record,.work-card,.report-help,.recent-section,.login-wrap>.panel,#track-detail .panel,.empty';
  const watched = new Set(), seen = new WeakSet();
  const cancelAll = () => { for (const animation of active) animation.cancel(); active.clear(); };
  const preference = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  preference?.addEventListener?.('change', event => { if (event.matches) cancelAll(); });
  document.addEventListener('visibilitychange', () => {
    document.documentElement.toggleAttribute('data-motion-paused', document.hidden);
    if (document.hidden) cancelAll();
  });

  const observer = globalThis.IntersectionObserver ? new IntersectionObserver(entries => {
    let order = 0;
    for (const entry of entries) {
      if (!watched.has(entry.target) || !entry.isIntersecting || entry.target.hidden) continue;
      observer.unobserve(entry.target); watched.delete(entry.target);
      if (!document.hidden) settle(entry.target, order++ * 20);
    }
  }, { threshold:0, rootMargin:'0px 0px -16px 0px' }) : null;

  function scan(root, initial = false) {
    if (root.nodeType !== 1) return;
    const items = [...(root.matches(candidates) ? [root] : []), ...root.querySelectorAll(candidates)];
    let order = 0;
    for (const element of items) {
      if (seen.has(element) || element.closest('dialog') || element.hidden) continue;
      seen.add(element);
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (rect.top >= innerHeight && observer) { watched.add(element); observer.observe(element); }
      else if (!initial && rect.bottom > 0 && rect.top < innerHeight && !document.hidden) settle(element, order++ * 20);
    }
  }
  scan(document.body, true);
  const pending = new Set();
  let frame = 0;
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'childList') {
        for (const node of record.addedNodes) if (node.nodeType === 1) pending.add(node);
      } else if (record.attributeName === 'hidden' && !record.target.hidden
        && record.target.matches('#emergency-warning,#other-symptom-field,#contact-value-field')) reveal(record.target);
    }
    if (frame || !pending.size) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      for (const element of watched) if (!element.isConnected) { observer?.unobserve(element); watched.delete(element); }
      for (const element of pending) if (element.isConnected) scan(element);
      pending.clear();
    });
  }).observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden'] });
}
