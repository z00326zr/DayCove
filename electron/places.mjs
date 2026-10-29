// Codes and names are stored together to preserve historical place snapshots.
export function validatePlace(value,{county=false}={}){
 if(value===null)return null;
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('地点信息无效');
 const result={};
 for(const [level,length] of [['province',2],['city',4],['county',6]]){
  const item=value[level];
  if(item===null&&level!=='province'){if(county)throw Error('请选择区县');result[level]=null;continue;}
  if(!item||typeof item.code!=='string'||!new RegExp('^\\d{'+length+'}$').test(item.code)||typeof item.name!=='string'||!item.name.trim()||item.name.length>60)throw Error('地点信息无效');
  result[level]={code:item.code,name:item.name};
 }
 if((result.city&&!result.city.code.startsWith(result.province.code))||(result.county&&(!result.city||!result.county.code.startsWith(result.city.code))))throw Error('地点层级不一致');
 return result;
}
export const emptyPlaces=()=>({home:null,favorites:[]});
export const placeKey=place=>place?.county?.code||place?.city?.code||place?.province?.code||null;
export const placeName=place=>place?.county?.name||place?.city?.name||place?.province?.name||'';
export const placeLevel=place=>place?.county?'county':place?.city?'city':place?.province?'province':null;
export function validatePlaces(value){
 if(!value||!Array.isArray(value.favorites)||value.favorites.length>100)throw Error('地点配置无效');
 const home=validatePlace(value.home),seen=new Set();
 const favorites=value.favorites.map(item=>{const place=validatePlace(item),key=placeKey(place);if(!key||seen.has(key))throw Error('常用地点无效或重复');seen.add(key);return place;});
 return {home,favorites};
}
export function placeLabel(place){return place?[place.province?.name,place.city?.name,place.county?.name].filter((name,index,all)=>name&&all.indexOf(name)===index).join(' · '):'';}
export function placeContext(place){return place?.county?placeLabel({...place,county:null}):place?.city?place.province.name+' · 市级地点':'省级地点';}
export function isLocal(place,home){
 if(!place||!home)return null;
 if(place.province.code!==home.province.code)return false;
 if(!home.city)return true;
 if(!place.city)return null;
 if(place.city.code!==home.city.code)return false;
 if(!home.county)return true;
 if(!place.county)return null;
 return place.county.code===home.county.code;
}
export function homeSnapshot(home){return home?structuredClone(validatePlace(home)):null;}
