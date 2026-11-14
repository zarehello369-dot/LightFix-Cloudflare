import {api,post,esc} from './shared.js';

export function avatarMarkup(profile) {
  return profile.avatar_url?`<img src="${esc(profile.avatar_url)}" alt="">`:esc((profile.display_name||profile.name||'?').replace(/^[เแโใไ]/u,'').slice(0,1));
}

export async function prepareAvatar(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('เลือกรูป JPG, PNG หรือ WebP');
  if(file.size>25_000_000)throw new Error('เลือกรูปขนาดไม่เกิน 25 MB');
  const source=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=source;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d'),side=Math.min(image.width,image.height);
    ctx.fillStyle='#fff';ctx.fillRect(0,0,256,256);ctx.drawImage(image,(image.width-side)/2,(image.height-side)/2,side,side,0,0,256,256);
    for(const quality of [.85,.65,.45]){const result=canvas.toDataURL('image/jpeg',quality);if(result.length*.75<100_000)return result;}
    throw new Error('ย่อรูปไม่สำเร็จ กรุณาเลือกรูปอื่น');
  }catch(e){throw new Error(e.message.includes('กรุณา')?e.message:'อ่านรูปไม่ได้ กรุณาเลือกรูปอื่น');}
  finally{URL.revokeObjectURL(source);}
}

export function profileEditor(root,onSaved) {
  let dialog,busy=false,loading=false,disposed=false;
  async function open(){
    if(loading||disposed)return;
    if(dialog?.open){dialog.focus();return;}
    loading=true;
    try{
      const me=await api('/api/chat/profile');if(disposed)return;
      dialog=document.createElement('dialog');dialog.className='dialog chat-profile-dialog';dialog.setAttribute('aria-labelledby','chat-profile-title');
      dialog.innerHTML=`<form><div class="chat-profile-title"><h2 id="chat-profile-title">โปรไฟล์ของฉัน</h2><button class="button ghost small" type="button" data-close>ปิด</button></div><p class="muted">ชื่อและรูปนี้แสดงให้เจ้าหน้าที่และช่างในทีมเห็น</p><div class="chat-profile-photo"><span class="chat-avatar">${avatarMarkup(me)}</span><div><label class="button outline small" for="profile-photo">เลือกรูปใหม่</label><input class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" id="profile-photo"><button class="button ghost small" type="button" data-remove>ลบรูปโปรไฟล์</button></div></div><p class="small muted">ระบบครอบรูปตรงกลางเป็นสี่เหลี่ยมและย่อก่อนส่ง</p><div class="chat-profile-account"><strong>${esc(me.display_name)}</strong><p>ชื่อผู้ใช้: ${esc(me.username)}</p><span class="small muted">ใช้ชื่อตามบัญชี เปลี่ยนได้เฉพาะรูปโปรไฟล์</span></div><p class="field-error" role="status" data-error></p><button class="button primary" type="submit">บันทึกโปรไฟล์</button></form>`;
      root.append(dialog);const current=dialog,form=current.querySelector('form'),status=current.querySelector('[data-error]'),save=current.querySelector('[type=submit]');
      let photo,removePhoto=false;
      const setBusy=value=>{busy=value;save.disabled=value;current.querySelectorAll('[data-close],[data-remove],input').forEach(e=>e.disabled=value);};
      current.querySelector('[data-close]').onclick=()=>{if(!busy)current.close();};
      current.oncancel=event=>{if(busy)event.preventDefault();};
      current.onclose=()=>{current.remove();if(dialog===current)dialog=null;};
      current.querySelector('[data-remove]').onclick=()=>{photo=undefined;removePhoto=true;current.querySelector('.chat-avatar').innerHTML=esc(me.display_name.slice(0,1));current.querySelector('#profile-photo').value='';status.textContent='รูปจะถูกลบเมื่อกดบันทึกโปรไฟล์';};
      current.querySelector('#profile-photo').onchange=async event=>{
        const file=event.target.files[0];if(!file)return;setBusy(true);status.textContent='กำลังเตรียมรูป…';
        try{const prepared=await prepareAvatar(file);if(disposed||!current.isConnected)return;photo=prepared;removePhoto=false;current.querySelector('.chat-avatar').innerHTML=`<img src="${prepared}" alt="รูปโปรไฟล์ที่เลือก">`;status.textContent='รูปพร้อมแล้ว กดบันทึกเพื่อเปลี่ยนโปรไฟล์';}
        catch(e){status.textContent=e.message+' · ยังเก็บรูปก่อนหน้านี้ไว้';}
        finally{if(current.isConnected)setBusy(false);}
      };
      form.onsubmit=async event=>{
        event.preventDefault();if(busy)return;setBusy(true);status.textContent='กำลังบันทึก…';
        try{const saved=await post('/api/chat/profile',{...(photo?{photo}:{}),removePhoto});if(disposed)return;onSaved(saved);current.close();}
        catch(e){if(current.isConnected)status.textContent=e.message+' · โปรไฟล์ยังไม่บันทึก ลองอีกครั้งได้';}
        finally{if(current.isConnected)setBusy(false);}
      };
      current.showModal();
    }finally{loading=false;}
  }
  return {open,destroy(){disposed=true;dialog?.remove();}};
}
