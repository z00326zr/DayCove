import {regions,cityName,catalogPlace} from './regions.js';
import {placeLabel,placeKey} from '../electron/places.mjs';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createPlacePicker({getSettings,onFavorites}){
 const dialog=document.createElement('dialog');dialog.className='place-picker';dialog.setAttribute('aria-labelledby','place-picker-title');
 dialog.innerHTML=`<header><h2 id="place-picker-title">选择地点</h2><button type="button" data-close aria-label="关闭地点选择">关闭</button></header><section class="place-favorites"><h3>常用地点</h3><div data-favorites></div></section><div class="place-cascade"><label>省 / 直辖市<select data-province aria-label="省或直辖市"></select></label><label>市<select data-city aria-label="市"></select></label><label>区 / 县<select data-county aria-label="区或县"></select></label></div><div class="place-selection" data-selection></div><div class="place-picker-error" role="alert"></div><footer><button type="button" data-favorite>收藏此地点</button><span></span><button type="button" data-clear>清除</button><button type="button" class="primary" data-apply>确定</button></footer>`;
 document.body.append(dialog);const $=s=>dialog.querySelector(s);let options={};
 const province=()=>regions.find(p=>p.code===$('[data-province]').value);
 const city=()=>province()?.children.find(c=>c.code===$('[data-city]').value);
 const selected=()=>{if(!province())return null;return catalogPlace(province().code,city()?.code||null,$('[data-county]').value||null);};
 function update(){const value=selected();$('[data-selection]').textContent=value?placeLabel(value):'选择地点';$('[data-apply]').disabled=!value;const favorite=!!value&&getSettings().favorites.some(p=>placeKey(p)===placeKey(value));$('[data-favorite]').disabled=!value;$('[data-favorite]').textContent=favorite?'取消收藏':'收藏此地点';}
 function counties(code){$('[data-county]').innerHTML=`<option value="">${city()?'全市（市级）':'先选择市'}</option>`+(city()?.children||[]).map(c=>`<option value="${c.code}">${escape(c.name)}</option>`).join('');$('[data-county]').value=code||'';$('[data-county]').disabled=!city();update();}
 function cities(code,county){$('[data-city]').innerHTML=`<option value="">${province()?'全省（省级）':'先选择省'}</option>`+(province()?.children||[]).map(c=>`<option value="${c.code}">${escape(cityName(province(),c))}</option>`).join('');$('[data-city]').value=code||'';$('[data-city]').disabled=!province();counties(county);}
 function set(value){$('[data-province]').value=value?.province.code||getSettings().home?.province.code||'';if(!province())$('[data-province]').value='';cities(value?.city?.code,value?.county?.code);}
 function favorites(){const items=getSettings().favorites;$('[data-favorites]').innerHTML=items.length?items.map((p,i)=>`<button type="button" data-pick-favorite="${i}">${escape(placeLabel(p))}</button>`).join(''):'<span class="muted">暂无收藏</span>';dialog.querySelectorAll('[data-pick-favorite]').forEach(button=>button.onclick=()=>set(items[Number(button.dataset.pickFavorite)]));}
 async function act(fn){try{$('.place-picker-error').textContent='';await fn();}catch(error){$('.place-picker-error').textContent=error.message;}}
 $('[data-province]').innerHTML='<option value="">选择省 / 直辖市</option>'+regions.map(p=>`<option value="${p.code}">${escape(p.name)}</option>`).join('');
 $('[data-province]').onchange=()=>cities();$('[data-city]').onchange=()=>counties();$('[data-county]').onchange=update;
 $('[data-close]').onclick=()=>dialog.close();
 $('[data-favorite]').onclick=()=>act(async()=>{const value=selected();if(!value)return;const items=getSettings().favorites,exists=items.some(p=>placeKey(p)===placeKey(value));await onFavorites(exists?items.filter(p=>placeKey(p)!==placeKey(value)):[...items,value]);favorites();update();});
 $('[data-apply]').onclick=()=>act(async()=>{const value=selected();if(!value)return;await options.onSelect(value);dialog.close();});
 $('[data-clear]').onclick=()=>act(async()=>{await options.onSelect(null);dialog.close();});
 return {dialog,open(next){options=next;$('#place-picker-title').textContent=next.title||'选择地点';$('.place-picker-error').textContent='';favorites();set(next.value);dialog.showModal();}};
}
