import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultPreferences,validatePreferences} from '../electron/preferences.mjs';
test('旧配置缺失的写作项采用默认值，返回独立配置对象',()=>{const legacy={fontSize:18};const result=validatePreferences(legacy);assert.equal(result.fontSize,18);assert.equal(result.defaultMode,'visual');result.fontSize=20;assert.equal(defaultPreferences.fontSize,16);assert.equal(legacy.fontSize,18);});
test('配置边界拒绝非数值字号、非法 CSS 内容与未知字段',()=>{for(const input of [null,[],{fontSize:'18'},{lineHeight:0},{fontFamily:'url(https://example.com)'},{pageWidth:'999999px'},{defaultMode:'unknown'},{unexpected:true}])assert.throws(()=>validatePreferences(input));});
