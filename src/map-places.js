import {placeKey} from '../electron/places.mjs';
export function mapPlaceIndex(map){
 const index=new Map();
 for(const feature of [...map.provinces,...(map.cities||[]),...map.features])if(feature.code)index.set(feature.code,feature);
 // Municipalities use the same area at province and city levels.
 for(const code of ['11','12','31','50','81']){const province=index.get(code);if(province&&!index.has(code+'01'))index.set(code+'01',{...province,code:code+'01'});}
 // Virtual prefectures (e.g. Hainan's directly administered counties) are a
 // collection of their real county polygons, never an arbitrary single child.
 const groups=new Map();for(const feature of map.features){if(!feature.code)continue;const code=feature.code.slice(0,4);if(index.has(code))continue;if(!groups.has(code))groups.set(code,[]);groups.get(code).push(feature);}
 for(const [code,children] of groups){const bounds=[Math.min(...children.map(f=>f.bounds[0])),Math.min(...children.map(f=>f.bounds[1])),Math.max(...children.map(f=>f.bounds[2])),Math.max(...children.map(f=>f.bounds[3]))];const largest=children.reduce((a,b)=>(b.bounds[2]-b.bounds[0])*(b.bounds[3]-b.bounds[1])>(a.bounds[2]-a.bounds[0])*(a.bounds[3]-a.bounds[1])?b:a);index.set(code,{code,bounds,center:largest.center,path:children.map(f=>f.path).join(''),composite:true});}
 return {get:code=>index.get(code),forPlace:place=>index.get(placeKey(place)),has:code=>index.has(code)};
}
