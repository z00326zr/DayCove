export const tagKey=value=>value.trim().normalize('NFC').toLocaleLowerCase();
const separators=/[,，;；、\r\n]+/;
export const hasTagSeparator=value=>separators.test(value);
export function splitTagDraft(value){const parts=value.split(separators);const draft=parts.pop();return {confirmed:parseTags(parts.join(',')),draft};}
export function parseTags(value){
 const result=[],seen=new Set();
 for(const part of String(value??'').split(separators)){const tag=part.trim().normalize('NFC');const key=tagKey(tag);if(key&&!seen.has(key)){result.push(tag);seen.add(key);}}
 return result;
}
export const serializeTags=tags=>parseTags(tags.join(',')).join(',');
export const hasTag=(value,tag)=>parseTags(value).some(item=>tagKey(item)===tagKey(tag));
export function tagCatalog(entries){
 const catalog=new Map();
 for(const entry of entries){if(entry.deleted)continue;for(const name of parseTags(entry.tags)){const key=tagKey(name);const item=catalog.get(key)||{name,count:0};item.count++;catalog.set(key,item);}}
 return [...catalog.values()].sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-CN'));
}
export function suggestTags(entries,selected,query=''){
 const used=new Set(selected.map(tagKey));const term=tagKey(query);
 return tagCatalog(entries).filter(item=>!used.has(tagKey(item.name))&&tagKey(item.name).includes(term)).slice(0,8);
}
