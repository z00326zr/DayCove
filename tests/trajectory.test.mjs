import test from 'node:test';
import assert from 'node:assert/strict';
import {trajectory,trajectoryYears} from '../src/trajectory.js';
import {homeSnapshot,isLocal,validatePlaces} from '../electron/places.mjs';
const place=(p='32',c='3201',a='320102')=>({province:{code:p,name:p},city:{code:c,name:c},county:{code:a,name:a}});
const entry=(date,p,id=date)=>({id,date,type:'diary',place:p,homeSnapshot:null});

test('到过哪里标哪里：跨省、市、区县均保留，同一区县重复记录只标一处',()=>{
 const chengdu=place('51','5101','510104'),deyang=place('51','5106','510603'),nanjing=place();
 const rows=[entry('2026-10-01',chengdu),entry('2026-10-02',deyang),entry('2026-10-03',chengdu),entry('2026-10-04',nanjing)];
 const before=structuredClone(rows),result=trajectory(rows,2026);
 assert.deepEqual(result.places.map(marker=>marker.code),['320102','510104','510603']);
 assert.deepEqual(result.places.find(marker=>marker.code==='510104').entryIds,['2026-10-01','2026-10-03']);
 assert.deepEqual(Object.keys(result).sort(),['places','unlocatedEntryIds','year']);
 assert.deepEqual(Object.keys(result.places[0]).sort(),['code','entryIds','place']);
 assert.deepEqual(rows,before);
});
test('按年度只标注当年实际记录的地点，不补全跨年或漏写期间的足迹',()=>{
 const rows=[entry('2025-12-30',place()),entry('2027-01-03',place('33','3301','330102'))];
 assert.deepEqual(trajectory(rows,2026),{year:2026,places:[],unlocatedEntryIds:[]});
 assert.equal(trajectory(rows,2025).places[0].code,'320102');
 assert.equal(trajectory(rows,2027).places[0].code,'330102');
});
test('排除回收站、周记和随笔；仅旧文本地点保留待完善，不猜测坐标',()=>{
 const p=place(),rows=[entry('2026-01-01',p,'diary'),{...entry('2026-01-01',p,'trash'),deleted:true},{...entry('2026-01-01',p,'weekly'),type:'weekly'},{...entry('2026-01-01',p,'note'),type:'note'},{...entry('2026-01-02',null,'legacy'),location:'南京'},entry('2026-01-03',{...p,county:null},'city')];
 const result=trajectory(rows,2026);
 assert.deepEqual(result.places.find(item=>item.code==='320102').entryIds,['diary']);
 assert.deepEqual(result.places.find(item=>item.code==='3201').entryIds,['city']);
 assert.deepEqual(result.unlocatedEntryIds,['legacy']);
 assert.equal(rows[4].location,'南京');
});
test('归属地及其历史变更不影响已记录地点的标注，返回的数据与原记录隔离',()=>{
 const p=place(),rows=[{...entry('2026-01-01',p),homeSnapshot:{...p,county:null}},{...entry('2026-01-02',p),homeSnapshot:place('33','3301','330102')}];
 const result=trajectory(rows,2026);
 assert.equal(result.places.length,1);
 assert.deepEqual(result.places[0].entryIds,['2026-01-01','2026-01-02']);
 result.places[0].place.county.name='changed';
 assert.equal(rows[0].place.county.name,'320102');
});
test('年度选项包含当年和有效日记年份，去重降序；拒绝非法年份',()=>{
 const rows=[entry('2020-01-01',place()),entry('2020-02-01',place()),{...entry('1999-01-01',place()),deleted:true},{...entry('1998-01-01',place()),type:'weekly'}];
 assert.deepEqual(trajectoryYears(rows),[new Date().getFullYear(),2020]);
 for(const year of [NaN,2026.5,'2026',0,10000])assert.throws(()=>trajectory(rows,year),/年份无效/);
});
test('city home includes all counties, snapshot remains unchanged after settings edits',()=>{const home={...place(),county:null},snapshot=homeSnapshot(home);home.city.name='changed';assert.notEqual(snapshot.city.name,'changed');assert.equal(isLocal(place('32','3201','320106'),snapshot),true);assert.equal(isLocal(place('32','3205','320508'),snapshot),false);assert.equal(isLocal(place(),null),null);});
test('settings reject duplicate favorites and inconsistent hierarchy',()=>{const p=place();assert.throws(()=>validatePlaces({home:p,favorites:[p,p]}));assert.throws(()=>validatePlaces({home:place('33'),favorites:[]}));});
