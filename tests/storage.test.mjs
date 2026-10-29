import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const {backup,restore,merge,atomicWrite,validate}=createRequire(import.meta.url)('../electron/storage.cjs');
const entry={id:'one',title:'日记',content:'<p>中文记录<img src="data:image/png;base64,YQ=="></p>',type:'diary',date:'2026-10-27',updated:'2026-10-27T00:00:00Z',tags:'生活',deleted:false};
const data={version:1,entries:[entry]};
test('完整备份往返保留中文、图片和元数据',()=>assert.deepEqual(restore(backup(data)),data));
test('拒绝损坏备份和未知版本',()=>{const b=JSON.parse(backup(data));b.payload+=' ';assert.throws(()=>restore(JSON.stringify(b)));assert.throws(()=>validate({...data,version:2}));});
test('导入不覆盖已有记录，冲突保留副本',()=>{assert.equal(merge(data,data).data.entries.length,1);const r=merge(data,{version:1,entries:[{...entry,content:'另一台电脑的内容'}]});assert.equal(r.conflicts,1);assert.equal(r.data.entries.length,2);assert.equal(r.data.entries[0].content,entry.content);assert.notEqual(r.data.entries[1].id,entry.id);});
test('拒绝重复记录和不完整数据',()=>{assert.throws(()=>validate({version:1,entries:[entry,entry]}));assert.throws(()=>validate({version:1,entries:[{...entry,content:null}]}));});
test('磁盘原子保存可重新打开',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'ediary-test-'));try{const file=path.join(dir,'library.json');await atomicWrite(file,data);assert.deepEqual(JSON.parse(await readFile(file,'utf8')),data);await atomicWrite(file,{version:1,entries:[]});assert.deepEqual(JSON.parse(await readFile(file,'utf8')),{version:1,entries:[]});}finally{await rm(dir,{recursive:true,force:true});}});

test('完整备份保留 Markdown 原始格式',()=>{const source='## 标题\n\n- **生活**\n\n```js\nconst n = 1\n```\n';const library={version:1,entries:[{...entry,markdown:source}]};assert.equal(restore(backup(library)).entries[0].markdown,source);assert.throws(()=>validate({version:1,entries:[{...entry,markdown:42}]}));});
test('重复导入冲突备份不再生成重复副本，字段顺序不影响相同记录判断',()=>{const incoming={version:1,entries:[{...entry,content:'另一版内容'}]};const first=merge(data,incoming);assert.equal(first.conflicts,1);const repeated=merge(first.data,incoming);assert.equal(repeated.conflicts,0);assert.equal(repeated.data.entries.length,2);const reordered=Object.fromEntries(Object.entries(entry).reverse());assert.equal(merge(data,{version:1,entries:[reordered]}).conflicts,0);});
