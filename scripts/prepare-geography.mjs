// Usage: node scripts/prepare-geography.mjs COUNTY_GEOJSON PROVINCE_GEOJSON CITY_GEOJSON
// Source: chinese-global-compliant-geodata@1.0.0, chn-level-3.json (MIT).
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const raw=fs.readFileSync(process.argv[2]);
const source=JSON.parse(raw),regions=JSON.parse(fs.readFileSync('src/data/regions.json'));
for(const province of regions)for(const city of province.children)if(city.children.length&&city.children.every(area=>area.code.length>6))city.children=[{code:city.code+'00',name:city.name+'（不设区县）'}];
const project=([lon,lat])=>[(lon-72)*13,(55-lat)*12];
function simplify(points,tolerance=.12){
 if(points.length<4)return points;
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]],square=tolerance*tolerance;
 while(stack.length){const [first,last]=stack.pop(),a=points[first],b=points[last],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;let max=square,index=-1;
 for(let i=first+1;i<last;i++){const p=points[i],t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0,d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>max){max=d;index=i;}}
 if(index!==-1){keep.add(index);stack.push([first,index],[index,last]);}}
 return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
}
function paths(geometry,tolerance=.12){const lines=geometry.type==='MultiPolygon'?geometry.coordinates.flat():geometry.type==='Polygon'?geometry.coordinates:geometry.type==='MultiLineString'?geometry.coordinates:[geometry.coordinates];const closed=geometry.type.includes('Polygon');let bounds=[Infinity,Infinity,-Infinity,-Infinity];
 const path=lines.map(line=>{const points=line.map(project);for(const [x,y] of points){bounds=[Math.min(bounds[0],x),Math.min(bounds[1],y),Math.max(bounds[2],x),Math.max(bounds[3],y)];}return simplify(points,tolerance).map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)).join('')+(closed?'Z':'');}).join('');return {path,bounds,center:[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2]};}
const features=source.features.map(f=>({code:f.properties.gb?.slice(-6)||null,name:f.properties.full_name||f.properties.name,province:f.properties.province,...paths(f.geometry)}));
// Hong Kong's districts are present in the boundary source, supplementing the mainland catalog.
if(!regions.some(p=>p.code==='81')){regions.push({code:'81',name:'香港特别行政区',children:[{code:'8101',name:'香港特别行政区',children:features.filter(f=>f.code?.startsWith('81')).map(f=>({code:f.code,name:f.name}))}]});}
fs.writeFileSync('src/data/regions.json',JSON.stringify(regions));
const provinceRaw=fs.readFileSync(process.argv[3]);
function labelPoint(geometry,bounds){const polygons=geometry.type==='MultiPolygon'?geometry.coordinates:geometry.type==='Polygon'?[geometry.coordinates]:[];let best=0,point=null;for(const polygon of polygons){const ring=polygon[0].map(project);let area=0,x=0,y=0;for(let i=0;i<ring.length-1;i++){const [ax,ay]=ring[i],[bx,by]=ring[i+1],cross=ax*by-bx*ay;area+=cross;x+=(ax+bx)*cross;y+=(ay+by)*cross;}if(Math.abs(area)>best){best=Math.abs(area);point=[x/(3*area),y/(3*area)];}}return point||[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2];}
for(let i=0;i<features.length;i++)features[i].center=labelPoint(source.features[i].geometry,features[i].bounds);
const provinces=JSON.parse(provinceRaw).features.map(f=>{const geometry=paths(f.geometry,.04);return {code:f.properties.gb?.slice(3,5)||null,name:f.properties.name||f.properties.full_name,...geometry,center:labelPoint(f.geometry,geometry.bounds)};});
const cityRaw=fs.readFileSync(process.argv[4]);
const cities=JSON.parse(cityRaw).features.filter(f=>f.properties.gb?.endsWith('00')).map(f=>{const geometry=paths(f.geometry,.04);return {code:f.properties.gb.slice(3,7),name:f.properties.full_name||f.properties.name,...geometry,center:labelPoint(f.geometry,geometry.bounds)};});
const detail=Object.fromEntries(source.features.filter(f=>f.properties.gb).map(f=>[f.properties.gb.slice(-6),paths(f.geometry,.004).path]));
fs.writeFileSync('src/data/map-detail.json',JSON.stringify(detail));
fs.writeFileSync('src/data/map.json',JSON.stringify({version:'2024-05',source:'chinese-global-compliant-geodata@1.0.0',sha256:createHash('sha256').update(raw).digest('hex'),provinceSha256:createHash('sha256').update(provinceRaw).digest('hex'),citySha256:createHash('sha256').update(cityRaw).digest('hex'),viewBox:[0,0,850,650],provinces,cities,features}));
console.log('Bundled map:',features.length,'features;',fs.statSync('src/data/map.json').size,'bytes');
