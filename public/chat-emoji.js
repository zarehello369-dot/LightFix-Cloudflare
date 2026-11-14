const choices=[['😀','ยิ้มกว้าง'],['😊','ยิ้ม'],['😂','หัวเราะ'],['🥰','รัก'],['😅','ยิ้มเหงื่อตก'],['🤔','กำลังคิด'],['😮','ประหลาดใจ'],['😢','เศร้า'],['🙏','ขอบคุณ'],['👍','ตกลง'],['👎','ไม่เห็นด้วย'],['👌','โอเค'],['✌️','สู้ ๆ'],['👏','ปรบมือ'],['💪','ให้กำลังใจ'],['👋','ทักทาย'],['❤️','หัวใจ'],['💛','หัวใจสีเหลือง'],['✅','เรียบร้อย'],['❌','ยกเลิก'],['🎉','ฉลอง'],['💡','หลอดไฟ'],['🔧','ประแจ'],['⚡','ไฟฟ้า'],['📍','ตำแหน่ง'],['📷','กล้อง'],['🚧','กำลังทำงาน'],['⏰','เวลา'],['🌧️','ฝนตก'],['☀️','แดดออก'],['🚗','รถยนต์'],['🏠','บ้าน']];

export function installEmojiPicker(thread){
  const toggle=thread.querySelector('.chat-emoji-toggle'),input=thread.querySelector('#chat-input'),panel=thread.querySelector('.chat-emoji-panel');
  toggle.onclick=()=>{
    const opening=panel.hidden;panel.hidden=!opening;toggle.setAttribute('aria-expanded',String(opening));
    if(opening){
      panel.innerHTML=`<div class="chat-emoji-head"><strong>เลือกอีโมจิ</strong><button class="button ghost small" type="button" data-close-emoji>ปิด</button></div><div class="chat-emoji-grid">${choices.map(([emoji,label],i)=>`<button type="button" data-emoji="${i}" aria-label="${label}">${emoji}</button>`).join('')}</div>`;
      panel.querySelector('[data-close-emoji]').onclick=close;
      panel.querySelectorAll('[data-emoji]').forEach(button=>button.onclick=()=>{
        const emoji=choices[Number(button.dataset.emoji)][0];
        if(input.value.length-(input.selectionEnd-input.selectionStart)+emoji.length>input.maxLength)return;
        input.setRangeText(emoji,input.selectionStart,input.selectionEnd,'end');input.dispatchEvent(new Event('input',{bubbles:true}));close();input.focus({preventScroll:true});
      });
      panel.querySelector('[data-emoji]').focus({preventScroll:true});
    }
  };
  function close(){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus({preventScroll:true});}
  panel.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();close();}};
}
