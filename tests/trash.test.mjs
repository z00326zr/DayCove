import {test} from 'node:test';
import assert from 'node:assert/strict';
import {purgeTrash} from '../src/trash.js';
test('单篇删除只移除指定回收站记录，保留正常记录及其他回收站记录',()=>{
 const entries=[{id:'a',deleted:false},{id:'b',deleted:true},{id:'c',deleted:true}];
 assert.deepEqual(purgeTrash(entries,['a','b','missing']),[entries[0],entries[2]]);
 assert.equal(entries.length,3);
});
test('清空回收站保留全部正常记录，空回收站操作幂等',()=>{
 const entries=[{id:'a',deleted:false},{id:'b',deleted:true},{id:'c'}];
 const result=purgeTrash(entries,entries.filter(e=>e.deleted).map(e=>e.id));
 assert.deepEqual(result,[entries[0],entries[2]]);
 assert.deepEqual(purgeTrash(result,[]),result);
});
