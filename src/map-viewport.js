export const nationalBox=[0,0,850,650];
export const countyZoom=3;
export const countyLabelZoom=9;
export function transformFor(box,width,height){const scale=Math.min(width/box[2],height/box[3]);return {scale,x:(width-box[2]*scale)/2-box[0]*scale,y:(height-box[3]*scale)/2-box[1]*scale};}
export function screenPoint(point,transform){return [point[0]*transform.scale+transform.x,point[1]*transform.scale+transform.y];}
export function worldPoint(point,transform){return [(point[0]-transform.x)/transform.scale,(point[1]-transform.y)/transform.scale];}
export function constrainBox(box){const width=Math.max(1,Math.min(850,box[2])),height=width*650/850;return [Math.max(-width*.12,Math.min(850-width*.88,box[0])),Math.max(-height*.12,Math.min(650-height*.88,box[1])),width,height];}
export function zoomBox(box,factor,anchor=[box[0]+box[2]/2,box[1]+box[3]/2]){const width=Math.max(1,Math.min(850,box[2]*factor)),ratio=width/box[2];return constrainBox([anchor[0]-(anchor[0]-box[0])*ratio,anchor[1]-(anchor[1]-box[1])*ratio,width,width*650/850]);}
export function featureBox(bounds){const [x,y,right,bottom]=bounds,width=Math.min(850,Math.max(1.5,(right-x)*1.8,(bottom-y)*1.8*850/650));return constrainBox([(x+right-width)/2,(y+bottom-width*650/850)/2,width,width*650/850]);}
export function intersects(a,b){return a[0]<=b[2]&&a[2]>=b[0]&&a[1]<=b[3]&&a[3]>=b[1];}
export function visibleBounds(transform,width,height){const first=worldPoint([0,0],transform),last=worldPoint([width,height],transform);return [first[0],first[1],last[0],last[1]];}
export function spatialIndex(features,cell=24){
 const grid=new Map();for(const feature of features){const [x,y,r,b]=feature.bounds;for(let i=Math.floor(x/cell);i<=Math.floor(r/cell);i++)for(let j=Math.floor(y/cell);j<=Math.floor(b/cell);j++){const key=i+','+j;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(feature);}}
 return bounds=>{const found=new Set();const [x,y,r,b]=bounds;for(let i=Math.max(-1,Math.floor(x/cell));i<=Math.min(36,Math.floor(r/cell));i++)for(let j=Math.max(-1,Math.floor(y/cell));j<=Math.min(28,Math.floor(b/cell));j++)for(const feature of grid.get(i+','+j)||[])if(intersects(feature.bounds,bounds))found.add(feature);return [...found];};
}
