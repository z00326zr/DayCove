export function monthDays(year, month) {
 const offset=(new Date(year,month,1).getDay()+6)%7;
 const count=new Date(year,month+1,0).getDate();
 return [...Array(offset).fill(null),...Array.from({length:count},(_,i)=>`${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`)];
}
export function diaryDates(entries) {
 const dates=new Map();
 for(const entry of entries) if(entry.type==='diary'&&!entry.deleted)dates.set(entry.date,(dates.get(entry.date)||0)+1);
 return dates;
}
