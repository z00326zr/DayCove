import {placeKey} from '../electron/places.mjs';
// The map represents recorded places only. It never infers travel between dates.
export function trajectory(entries,year){
 if(!Number.isInteger(year)||year<1||year>9999)throw Error('年份无效');
 const prefix=String(year).padStart(4,'0')+'-';
 const records=entries.filter(entry=>!entry.deleted&&entry.type==='diary'&&entry.date.startsWith(prefix)).slice().sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
 const places=new Map(),unlocatedEntryIds=[];
 for(const entry of records){
  const code=placeKey(entry.place);
  if(!code){unlocatedEntryIds.push(entry.id);continue;}
  if(!places.has(code))places.set(code,{code,place:structuredClone(entry.place),entryIds:[]});
  const marker=places.get(code);
  marker.place=structuredClone(entry.place);
  marker.entryIds.push(entry.id);
 }
 return {year,places:[...places.values()].sort((a,b)=>a.code.localeCompare(b.code)),unlocatedEntryIds};
}
export function trajectoryYears(entries){return [...new Set([new Date().getFullYear(),...entries.filter(entry=>!entry.deleted&&entry.type==='diary').map(entry=>Number(entry.date.slice(0,4)))])].sort((a,b)=>b-a);}
