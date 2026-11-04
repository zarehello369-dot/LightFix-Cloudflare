// Motion never gates content, focus, or a saved result.
const running = new WeakMap();
const ease = 'cubic-bezier(.16,1,.3,1)';
const reduced = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export function reveal(element) {
  if (!element?.animate) return;
  running.get(element)?.cancel();
  running.delete(element);
  if (reduced()) return;
  const animation = element.animate([
    { opacity: .7 },
    { opacity: 1 },
  ], { duration:180, easing:ease, fill:'backwards' });
  running.set(element,animation);
  animation.finished.catch(()=>{}).finally(()=>{ if(running.get(element)===animation)running.delete(element); });
}
