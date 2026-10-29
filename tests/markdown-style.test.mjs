import {test} from 'node:test';
import assert from 'node:assert/strict';
import {styledMarkdown,safeStyleColor} from '../src/markdown-style.js';
test('彩色 Markdown 以 HTML 保留加粗斜体，避免 HTML span 内显示 Markdown 标记',()=>{const result=styledMarkdown({attrs:{color:'#2463a8',backgroundColor:'#fff2b3'}},{renderChildren:()=> '用 **Markdown** 和 *斜体* 写作'});assert.ok(result.includes('<strong>Markdown</strong>'));assert.ok(result.includes('<em>斜体</em>'));assert.ok(result.includes('background-color: #fff2b3'));assert.ok(!result.includes('**'));});
test('拒绝注入 CSS，普通文字中的转义星号不被误改成格式',()=>{assert.equal(safeStyleColor('red; background:url(https://example.com)'),null);const result=styledMarkdown({attrs:{color:'#2463a8'}},{renderChildren:()=> '\\*\\*原样星号\\*\\*'});assert.ok(result.includes('**原样星号**'));assert.ok(!result.includes('<strong>'));});

test("最终标记流转换保留 span 内加粗",async()=>{const {coloredMarkdown}=await import("../src/markdown-style.js");assert.equal(coloredMarkdown('<span style="color: #2463a8">用 **Markdown** 写作</span>'),'<span style="color: #2463a8">用 <strong>Markdown</strong> 写作</span>');});
