// Motion never gates content, focus, or a saved result.
const running = new WeakMap();
const ease = 'cubic-bezier(.16,1,.3,1)';
const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function reveal(element, kind = 'content', delay = 0) {
  if (!element?.animate) return;
  running.get(element)?.cancel();
  running.delete(element);
  if (reduced()) return;
  const sheet = kind === 'sheet';
  const animation = element.animate([
    { opacity: .55, transform: `translateY(${sheet ? 12 : 5}px)`, ...(sheet ? {clipPath:'inset(0 0 8% 0 round 16px)'} : {}) },
    { opacity: 1, transform: 'translateY(0)', ...(sheet ? {clipPath:'inset(0 round 16px)'} : {}) },
  ], { duration:sheet ? 260 : 210, delay:Math.min(120,Math.max(0,delay)), easing:ease, fill:'backwards' });
  running.set(element,animation);
  animation.finished.catch(()=>{}).finally(()=>{ if(running.get(element)===animation)running.delete(element); });
}

export function revealRecords(root) {
  if (!root || reduced()) return;
  // A large workspace gets the same animation budget as a small one.
  [...root.querySelectorAll('.record,.work-card')].slice(0,6).forEach((card,index)=>reveal(card,'content',index*24));
}
