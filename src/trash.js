// Only records already in the recycle bin can be permanently removed.
export function purgeTrash(entries,ids){
 const targets=new Set(ids);
 return entries.filter(entry=>!entry.deleted||!targets.has(entry.id));
}
