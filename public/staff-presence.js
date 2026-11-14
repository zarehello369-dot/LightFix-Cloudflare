import {api} from './shared.js';

export function mountPresence(){
  const tabId=crypto.randomUUID();let stopped=false,inFlight=false;
  const send=visible=>api('/api/chat/presence',{method:'POST',body:JSON.stringify({tabId,visible}),keepalive:!visible});
  async function heartbeat(){
    if(stopped||document.hidden||inFlight)return;inFlight=true;
    try{await send(true);if(stopped||document.hidden)await send(false);}catch{}finally{inFlight=false;}
  }
  const leave=()=>{send(false).catch(()=>{});};
  const visibility=()=>document.hidden?leave():heartbeat();
  const timer=setInterval(heartbeat,25_000);heartbeat();
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',leave);window.addEventListener('pageshow',heartbeat);
  return ()=>{stopped=true;clearInterval(timer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',heartbeat);leave();};
}
