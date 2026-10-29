import {test} from 'node:test';
import assert from 'node:assert/strict';
import {monthDays,diaryDates} from '../src/calendar.js';
test('月历以周一开始并覆盖闰年二月',()=>{const days=monthDays(2024,1);assert.equal(days.filter(Boolean).length,29);assert.deepEqual(days.slice(0,3),[null,null,null]);assert.equal(days.at(-1),'2024-02-29');assert.equal(monthDays(2026,1).filter(Boolean).length,28);});
test('日期标记只统计未删除的日记，保留同日篇数',()=>{const entries=[{type:'diary',date:'2026-10-27'},{type:'diary',date:'2026-10-27'},{type:'weekly',date:'2026-10-26'},{type:'diary',date:'2026-10-25',deleted:true}];assert.deepEqual([...diaryDates(entries)],[['2026-10-27',2]]);});
