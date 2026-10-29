import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readdir,readFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {homeSnapshot,validatePlace} from '../electron/places.mjs';
import {catalogPlace,regions} from '../src/regions.js';
import {trajectory} from '../src/trajectory.js';
const require=createRequire(import.meta.url),{Library}=require('../electron/library.cjs'),{validate,restore}=require('../electron/storage.cjs');
const original={id:'old',title:'保留原文',date:'2026-10-01',type:'diary',tags:'',content:'<p>文字</p>',updated:'2026-10-01T00:00:00Z',deleted:false,location:'南京某处'};
const nanjing=catalogPlace('32','3201'),xuanwu=catalogPlace('32','3201','320102'),chengdu=catalogPlace('51','5101','510104');
test('全国级联目录地点均可验证，直辖市全市归属地与区县代码一致',()=>{for(const province of regions)for(const city of province.children){validatePlace(catalogPlace(province.code,city.code));for(const county of city.children)validatePlace(catalogPlace(province.code,city.code,county.code),{county:true});}assert.equal(catalogPlace('11','1101').city.name,'北京市');assert.throws(()=>catalogPlace('32','3201','510104'));});
test('旧库升级不改原文，新地点和归属地快照随完整备份迁移，配置变更不改历史',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'ediary-places-')),target=await mkdtemp(path.join(tmpdir(),'ediary-places-target-'));let library,other;
 try{
  library=await new Library(root).open({applicationVersion:'0.2.9'});await library.save({version:1,entries:[original]});await library.close();
  library=await new Library(root).open({applicationVersion:'0.2.10'});
  const files=await readdir(path.join(root,'backups'));const upgrade=files.find(file=>file.startsWith('before-upgrade-0.2.10'));
  assert.deepEqual(restore(await readFile(path.join(root,'backups',upgrade),'utf8')).entries,[original]);
  const data=await library.load();assert.deepEqual(data.entries,[original]);data.places={home:nanjing,favorites:[xuanwu]};
  data.entries.push({...original,id:'new',place:chengdu,location:'四川省 · 成都市 · 锦江区',homeSnapshot:homeSnapshot(data.places.home)});await library.save(data);
  data.places.home=chengdu;await library.save(data);await library.close();library=await new Library(root).open({applicationVersion:'0.2.10'});
  const loaded=await library.load();assert.deepEqual(loaded.entries.find(e=>e.id==='old'),original);assert.deepEqual(loaded.entries.find(e=>e.id==='new').homeSnapshot,nanjing);assert.deepEqual(loaded.places.home,chengdu);
  other=await new Library(target).open();const result=await other.importBackup(await library.createBackup());assert.deepEqual(result.data.places,loaded.places);assert.deepEqual((await other.load()).places,loaded.places);assert.deepEqual(trajectory((await other.load()).entries,2026).places.map(p=>p.code),['510104']);
 }finally{await library?.close();await other?.close();await rm(root,{recursive:true,force:true});await rm(target,{recursive:true,force:true});}
});
test('合并备份保留当前归属地并合并去重收藏，旧备份不清空新地点设置',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'ediary-places-merge-'));let library;
 try{library=await new Library(root).open();await library.save({version:1,entries:[],places:{home:nanjing,favorites:[xuanwu]}});const {backup}=require('../electron/storage.cjs');await library.importBackup(backup({version:1,entries:[original],places:{home:chengdu,favorites:[xuanwu,chengdu]}}));const data=await library.load();assert.deepEqual(data.places,{home:nanjing,favorites:[xuanwu,chengdu]});await library.importBackup(backup({version:1,entries:[]}));assert.deepEqual((await library.load()).places,data.places);}finally{await library?.close();await rm(root,{recursive:true,force:true});}
});
test('无效结构化地点与配置被拒绝；schema v1 老记录继续有效',()=>{
 assert.doesNotThrow(()=>validate({version:1,entries:[original]}));
 for(const extra of [{place:{...chengdu,city:null}},{homeSnapshot:{...nanjing,city:{code:'3301',name:'杭州'}}},{places:{home:nanjing,favorites:[xuanwu,xuanwu]}}]){const {places,...entryExtra}=extra;assert.throws(()=>validate({version:1,entries:[{...original,...entryExtra}],...(places?{places}:{})}));}
});
