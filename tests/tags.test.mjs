import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTags,serializeTags,hasTag,tagCatalog,suggestTags,splitTagDraft,hasTagSeparator} from '../src/tags.js';
import {createRequire} from 'node:module';
const {backup,restore}=createRequire(import.meta.url)('../electron/storage.cjs');
test('兼容旧逗号标签、中英文分隔符和换行，不拆分标签内空格',()=>{assert.deepEqual(parseTags(' 工作,生活，读书；旅行、工作\n Project Alpha ; '),['工作','生活','读书','旅行','Project Alpha']);assert.deepEqual(parseTags(''),[]);});
test('重复和大小写标签合并，Unicode正规化，序列化保留首个显示文本',()=>{assert.deepEqual(parseTags('Work,work,WORK,Café,Café'),['Work','Café']);assert.equal(serializeTags(['生活',' 工作 ','生活','读书']), '生活,工作,读书');});
test('标签筛选完整匹配，避免工作匹配到工作计划',()=>{assert.equal(hasTag('工作计划,生活','工作'),false);assert.equal(hasTag('生活，Work','work'),true);assert.equal(hasTag('工作,生活','工作'),true);});
test('标签目录按日记计数并排除回收站，不改变原始记录',()=>{const entries=[{tags:'生活,生活,work'},{tags:'生活，Work'},{tags:'旅行',deleted:true}];const original=structuredClone(entries);assert.deepEqual(tagCatalog(entries),[{name:'生活',count:2},{name:'work',count:2}]);assert.deepEqual(entries,original);});
test('推荐匹配输入且排除已添加标签，最多8条',()=>{const entries=[{tags:'工作,工作计划,生活'},{tags:'工作,读书'}];assert.deepEqual(suggestTags(entries,['工作'],'工'),[{name:'工作计划',count:1}]);assert.deepEqual(suggestTags(entries,['生活'],'生活'),[]);assert.equal(suggestTags(Array.from({length:15},(_,i)=>({tags:'标签'+i})),[]).length,8);});
test('标签仍按字符串备份，旧库无需迁移',()=>{const entry={id:'tag-legacy',title:'旧记录',type:'diary',date:'2026-10-28',content:'<p>正文</p>',tags:'生活，工作,读书',deleted:false,updated:'2026-10-28T00:00:00Z'};const data=restore(backup({version:1,entries:[entry]}));assert.equal(data.entries[0].tags,entry.tags);assert.deepEqual(parseTags(data.entries[0].tags),['生活','工作','读书']);});

test('输入草稿保留英语单词与空格，仅确认分隔符之前的标签',()=>{assert.deepEqual(splitTagDraft('Reading and Writing'),{confirmed:[],draft:'Reading and Writing'});assert.deepEqual(splitTagDraft('工作，旅行,Project Planning'),{confirmed:['工作','旅行'],draft:'Project Planning'});assert.equal(hasTagSeparator('Reading'),false);assert.equal(hasTagSeparator('工作\n生活'),true);});
