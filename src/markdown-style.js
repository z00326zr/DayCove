import {marked} from 'marked';
export function safeStyleColor(value){return typeof value==='string'&&(/^(#[0-9a-f]{3,8}|rgba?\([0-9.,%\s]+\)|[a-z]+)$/i).test(value)?value:null;}
export function styledMarkdown(node,helpers){const styles=[];const color=safeStyleColor(node.attrs?.color);const background=safeStyleColor(node.attrs?.backgroundColor);if(color)styles.push('color: '+color);if(background)styles.push('background-color: '+background);const children=helpers.renderChildren(node);return styles.length?`<span style="${styles.join('; ')}">${marked.parseInline(children)}</span>`:children;}

export function coloredMarkdown(source){return source.replace(/(<span style="[^"]*">)([\s\S]*?)(<\/span>)/g,(_,open,body,close)=>open+marked.parseInline(body)+close);}
