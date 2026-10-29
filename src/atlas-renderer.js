import {mapPlaceIndex} from './map-places.js';
import {placeName,placeLevel} from '../electron/places.mjs';
import {countyZoom,countyLabelZoom,transformFor,screenPoint,visibleBounds,intersects,spatialIndex} from './map-viewport.js';
import {mapPalette,mapTheme} from './map-theme.js';
export {mapColors} from './map-theme.js';
const font='-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif';
export function createAtlasRenderer(canvas,map,{onFrame}={}){
 const locations=mapPlaceIndex(map);
 const ctx=canvas.getContext('2d',{alpha:false}),countyByCode=new Map(map.features.filter(f=>f.code).map(f=>[f.code,f])),query=spatialIndex([...countyByCode.values()]);
 const paths=new Map(),precisePaths=new Map(),provincePaths=new Map();let details=null,box=[0,0,850,650],markers=[],markerOrder=[],markerCodes=new Set(),selected=null,width=0,height=0,frame=null,disposed=false;
 const pathFor=(feature,precise)=>{const cache=precise&&details?.[feature.code]?precisePaths:paths;if(!cache.has(feature.code))cache.set(feature.code,new Path2D(cache===precisePaths?details[feature.code]:feature.path));return cache.get(feature.code);};
 const metrics=()=>({width,height,transform:transformFor(box,width,height)});
 function resize(){const rect=canvas.getBoundingClientRect();width=rect.width;height=rect.height;if(width>0&&height>0){const ratio=Math.max(1,Math.min(3,window.devicePixelRatio||1));canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);schedule();}}
 function draw(){frame=null;if(disposed||!width||!height)return;const start=performance.now(),ratio=canvas.width/width,transform=transformFor(box,width,height),{scale,x,y}=transform,bounds=visibleBounds(transform,width,height),zoom=850/box[2];
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=mapTheme.water;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.setTransform(ratio*scale,0,0,ratio*scale,ratio*x,ratio*y);ctx.lineJoin='round';ctx.lineCap='round';
  const provinces=map.provinces.filter(f=>intersects(f.bounds,bounds));
  for(const feature of provinces){if(!provincePaths.has(feature))provincePaths.set(feature,new Path2D(feature.path));if(feature.code){ctx.fillStyle=mapTheme.land;ctx.fill(provincePaths.get(feature),'evenodd');}}
  const counties=zoom>=countyZoom?query(bounds):[];
  for(const item of [...markers].sort((a,b)=>Number(a.code===selected)-Number(b.code===selected)||a.code.length-b.code.length)){const feature=locations.get(item.code);if(!feature||!intersects(feature.bounds,bounds))continue;const path=pathFor(feature,zoom>=6);const palette=mapPalette[Number(item.place.province.code)%mapPalette.length];ctx.fillStyle=item.code===selected?mapTheme.selectedFill:palette.fill;ctx.globalAlpha=placeLevel(item.place)==='county'?1:placeLevel(item.place)==='city'?.75:.55;ctx.fill(path,'evenodd');ctx.globalAlpha=1;ctx.lineWidth=(item.code===selected?2:1)/scale;ctx.strokeStyle=item.code===selected?mapTheme.selectedInk:palette.ink;if(!feature.composite||zoom>=countyZoom)ctx.stroke(path);}
  if(counties.length){ctx.lineWidth=.65/scale;ctx.strokeStyle=mapTheme.countyBorder;for(const feature of counties)ctx.stroke(pathFor(feature,zoom>=6));}
  ctx.strokeStyle=mapTheme.provinceBorder;ctx.lineWidth=(zoom>=countyZoom?1.1:.9)/scale;for(const feature of provinces)ctx.stroke(provincePaths.get(feature));
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.lineJoin='round';const occupied=[];
  function label(text,point,{size=12,bold=false,color=mapTheme.text,force=false,bubble=false,active=false}={}){
   const [px,py]=point;ctx.font=`${bold?600:500} ${size}px ${font}`;const tw=ctx.measureText(text).width,padding=bubble?8:3,rect=[px-padding,py-size-(bubble?6:3),px+tw+padding,py+(bubble?9:5)];
   if(rect[0]<0||rect[2]>width||rect[1]<0||rect[3]>height||(!force&&occupied.some(other=>intersects(rect,other))))return;
   occupied.push(rect);
   if(bubble){ctx.beginPath();ctx.roundRect(rect[0],rect[1],rect[2]-rect[0],rect[3]-rect[1],5);ctx.fillStyle=active?mapTheme.tipSelectedBackground:mapTheme.tipBackground;ctx.fill();ctx.strokeStyle=active?mapTheme.tipSelectedBorder:mapTheme.tipBorder;ctx.lineWidth=active?2:1.5;ctx.stroke();}
   else{ctx.lineWidth=2;ctx.strokeStyle=mapTheme.tipHalo;ctx.strokeText(text,px,py);}
   ctx.fillStyle=bubble?(active?'#ffffff':mapTheme.tipText):color;ctx.fillText(text,px,py);
  }
  // Quiet region fills and matching tips keep the current location distinct.
  for(const item of markerOrder){
   const feature=locations.get(item.code);if(!feature)continue;const [px,py]=screenPoint(feature.center,transform);if(px< -10||py< -10||px>width+10||py>height+10)continue;
   const active=item.code===selected,palette=mapPalette[Number(item.place.province.code)%mapPalette.length];
   if(active){ctx.beginPath();ctx.arc(px,py,10,0,Math.PI*2);ctx.fillStyle=mapTheme.selectedFill;ctx.fill();}
   ctx.beginPath();ctx.arc(px,py,active?6.5:5.5,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=active?mapTheme.selectedInk:mapTheme.tipBorder;ctx.stroke();
   ctx.beginPath();ctx.arc(px,py,active?4.2:3.6,0,Math.PI*2);ctx.fillStyle=active?mapTheme.selectedInk:palette.ink;ctx.fill();
   const text=placeName(item.place);ctx.font=`600 13px ${font}`;const labelX=px+ctx.measureText(text).width+30>width?px-ctx.measureText(text).width-22:px+20;
   label(text,[labelX,py+4],{size:13,bold:true,bubble:true,active,force:active});
  }
  if(zoom>=countyLabelZoom){for(const feature of counties){if(markerCodes.has(feature.code))continue;const [l,t,r,b]=feature.bounds;if((r-l)*scale<55&&(b-t)*scale<45)continue;label(feature.name,screenPoint(feature.center,transform),{size:12,color:mapTheme.text});}}
  else{for(const feature of provinces.filter(f=>f.code).sort((a,b)=>(b.bounds[2]-b.bounds[0])*(b.bounds[3]-b.bounds[1])-(a.bounds[2]-a.bounds[0])*(a.bounds[3]-a.bounds[1]))){const [px,py]=screenPoint(feature.center,transform);const offsets={'11':[-12,-9],'12':[8,7],'31':[7,0],'81':[6,10],'82':[-35,13]};const [dx,dy]=offsets[feature.code]||[0,0];label(feature.name,[px+dx,py+dy],{size:zoom<2?12:13});}}
  canvas.dataset.detail=zoom>=countyZoom?'county':'province';onFrame?.({duration:performance.now()-start,counties:counties.length,zoom,precise:!!details&&zoom>=6});
 }
 function schedule(){if(!disposed&&frame===null)frame=requestAnimationFrame(draw);}
 const observer=new ResizeObserver(resize);observer.observe(canvas);resize();
 function hit(point){const transform=transformFor(box,width,height);let nearest=null,distance=144;for(const item of markers){const feature=locations.get(item.code);if(!feature)continue;const [x,y]=screenPoint(feature.center,transform),d=(x-point[0])**2+(y-point[1])**2;if(d<=distance){nearest=item.code;distance=d;}}if(nearest)return nearest;const world=[(point[0]-transform.x)/transform.scale,(point[1]-transform.y)/transform.scale];ctx.setTransform(1,0,0,1,0,0);for(const item of markers){const feature=locations.get(item.code);if(feature&&intersects(feature.bounds,[...world,...world])&&ctx.isPointInPath(pathFor(feature,850/box[2]>=6),world[0],world[1],'evenodd'))return item.code;}return null;}
 return {metrics,hit,setView(value){box=[...value];schedule();},setMarkers(value,code){markers=value;selected=code;markerCodes=new Set(value.map(item=>item.code));markerOrder=[...value].sort((a,b)=>Number(b.code===code)-Number(a.code===code));schedule();},setDetails(value){details=value;schedule();},hasCode:code=>locations.has(code),feature:code=>locations.get(code),destroy(){disposed=true;observer.disconnect();if(frame!==null)cancelAnimationFrame(frame);},drawNow(){if(frame!==null)cancelAnimationFrame(frame);draw();}};
}
