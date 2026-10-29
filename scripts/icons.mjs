import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('build',{recursive:true});
const source='public/logo.svg';
await sharp(source).resize(1024).png().toFile('build/icon.png');
const chunks=[];
for(const [size,type] of [[16,'icp4'],[32,'icp5'],[64,'icp6'],[128,'ic07'],[256,'ic08'],[512,'ic09'],[1024,'ic10']]){const png=await sharp(source).resize(size).png().toBuffer();const header=Buffer.alloc(8);header.write(type,0,4,'ascii');header.writeUInt32BE(png.length+8,4);chunks.push(header,png);}
const header=Buffer.alloc(8);header.write('icns');header.writeUInt32BE(8+chunks.reduce((n,b)=>n+b.length,0),4);await writeFile('build/icon.icns',Buffer.concat([header,...chunks]));
const sizes=[16,24,32,48,64,128,256];const icoHeader=Buffer.alloc(6+16*sizes.length);icoHeader.writeUInt16LE(1,2);icoHeader.writeUInt16LE(sizes.length,4);const images=[];let offset=icoHeader.length;
for(let i=0;i<sizes.length;i++){const size=sizes[i];const png=await sharp(source).resize(size).png().toBuffer();const base=6+16*i;icoHeader[base]=size===256?0:size;icoHeader[base+1]=size===256?0:size;icoHeader.writeUInt16LE(1,base+4);icoHeader.writeUInt16LE(32,base+6);icoHeader.writeUInt32LE(png.length,base+8);icoHeader.writeUInt32LE(offset,base+12);images.push(png);offset+=png.length;}
await writeFile('build/icon.ico',Buffer.concat([icoHeader,...images]));console.log('Generated macOS, Windows and PNG app icons.');
