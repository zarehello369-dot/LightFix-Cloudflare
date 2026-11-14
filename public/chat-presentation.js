const calendar=new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Bangkok'});
export const messageDay=time=>calendar.format(new Date(time));
export const emojiOnly=text=>/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(text)&&/^[\p{Emoji}\p{Emoji_Component}\s]+$/u.test(text);
