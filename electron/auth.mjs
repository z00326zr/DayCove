const iterations=600000;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const unhex=value=>Uint8Array.from(value.match(/../g),v=>parseInt(v,16));
function checkPassword(password){if(typeof password!=='string'||password.length<8||password.length>256)throw Error('密码需为 8–256 个字符');}
async function derive(password,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(salt),iterations},key,256));}
export async function createCredential(password){checkPassword(password);const salt=hex(crypto.getRandomValues(new Uint8Array(16)));return {algorithm:'PBKDF2-SHA256',iterations,salt,hash:hex(await derive(password,salt))};}
export function validateSettings(settings){if(!settings||settings.version!==1||typeof settings.skipPrompt!=='boolean')throw Error('密码配置损坏，请保留文件并检查配置');const c=settings.credential;if(c!==null&&(!c||c.algorithm!=='PBKDF2-SHA256'||c.iterations!==iterations||!/^[a-f0-9]{32}$/.test(c.salt)||!/^[a-f0-9]{64}$/.test(c.hash)))throw Error('密码配置损坏，请保留文件并检查配置');return settings;}
export async function verifyCredential(password,credential){if(typeof password!=='string'||password.length>256)return false;validateSettings({version:1,skipPrompt:false,credential});if(!credential)return false;const actual=await derive(password,credential.salt);const expected=unhex(credential.hash);let mismatch=0;for(let i=0;i<actual.length;i++)mismatch|=actual[i]^expected[i];return mismatch===0;}
export const emptySettings=()=>({version:1,skipPrompt:false,credential:null});
