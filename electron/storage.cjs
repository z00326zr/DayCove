const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {validatePlace,validatePlaces,placeKey}=require('./places.mjs');
const stableEntry=entry=>JSON.stringify(Object.fromEntries(Object.entries(entry).sort(([a],[b])=>a.localeCompare(b))));
function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return !Number.isNaN(date.valueOf())&&date.toISOString().slice(0,10)===value;}
function validate(data) {
 if (!data || data.version !== 1 || !Array.isArray(data.entries)) throw Error('无法识别日记库格式');
 if(data.places!==undefined)validatePlaces(data.places);
 const ids = new Set();
 for (const e of data.entries) {
  if (!e || typeof e.id !== 'string' || !e.id || ids.has(e.id) || typeof e.title !== 'string' || typeof e.content !== 'string' || !['diary','weekly','note'].includes(e.type) || !validDate(e.date) || (typeof e.updated !== 'string' || Number.isNaN(Date.parse(e.updated))) || (e.markdown !== undefined && typeof e.markdown !== 'string') || typeof e.tags !== 'string' || typeof e.deleted !== 'boolean') throw Error('日记数据不完整或存在重复记录');
  if((e.location!==undefined&&(typeof e.location!=='string'||e.location.length>200))||(e.weather!==undefined&&(typeof e.weather!=='string'||e.weather.length>40))||(e.temperature!==undefined&&e.temperature!==null&&(!Number.isFinite(e.temperature)||e.temperature< -100||e.temperature>70)))throw Error('地点或天气信息无效');
  if(e.mood!==undefined&&(typeof e.mood!=='string'||e.mood.length>40))throw Error('心情信息无效');
  if(e.place!==undefined)validatePlace(e.place);
  if(e.homeSnapshot!==undefined)validatePlace(e.homeSnapshot);
  ids.add(e.id);
 }
 return data;
}
async function atomicWrite(file, data) {
 await fs.mkdir(path.dirname(file), { recursive:true });
 const tmp = file + '.' + crypto.randomUUID() + '.tmp';
 const handle = await fs.open(tmp, 'wx');
 try { await handle.writeFile(JSON.stringify(validate(data))); await handle.sync(); } finally { await handle.close(); }
 await fs.rename(tmp, file);
}
function backup(data) {
 const payload = JSON.stringify(validate(data));
 return JSON.stringify({format:'ediary-plus-backup',version:1,created:new Date().toISOString(),sha256:crypto.createHash('sha256').update(payload).digest('hex'),payload});
}
function restore(raw) {
 const b = JSON.parse(raw);
 if(b.format !== 'ediary-plus-backup' || b.version !== 1 || typeof b.payload !== 'string' || b.sha256 !== crypto.createHash('sha256').update(b.payload).digest('hex')) throw Error('备份格式无效或校验失败');
 return validate(JSON.parse(b.payload));
}
function merge(current, incoming) {
 const result = structuredClone(validate(current)); let added=0, conflicts=0;
 for(const entry of validate(incoming).entries) {
  const fingerprint=crypto.createHash('sha256').update(stableEntry(entry)).digest('hex');
  if(result.entries.some(e=>e.importFingerprint===fingerprint))continue;
  const old = result.entries.find(e=>e.id===entry.id);
  if(!old) { result.entries.push(entry); added++; }
  else if(stableEntry(old)!==stableEntry(entry)) { result.entries.push({...entry,id:crypto.randomUUID(),title:entry.title+'（导入副本）',importFingerprint:fingerprint}); conflicts++; }
 }
 if(incoming.places){if(!result.places)result.places=structuredClone(incoming.places);else{const seen=new Set(result.places.favorites.map(p=>placeKey(p)));for(const place of incoming.places.favorites)if(!seen.has(placeKey(place))&&result.places.favorites.length<100){result.places.favorites.push(structuredClone(place));seen.add(placeKey(place));}}}
 return {data:result,added,conflicts};
}
module.exports={validate,atomicWrite,backup,restore,merge};
