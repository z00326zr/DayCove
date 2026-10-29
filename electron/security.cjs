const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
class Security {
 constructor(root){this.file=path.join(root,'security.json');this.failures=0;this.nextAttempt=0;this.queue=Promise.resolve();}
 async open(){this.auth=await import('./auth.mjs');try{this.settings=this.auth.validateSettings(JSON.parse(await fs.readFile(this.file,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;this.settings=this.auth.emptySettings();}this.reset();return this;}
 reset(){this.unlocked=!this.settings.credential;}
 status(){return {hasPassword:!!this.settings.credential,skipPrompt:this.settings.skipPrompt,unlocked:this.unlocked};}
 requireUnlocked(){if(!this.unlocked)throw Error('请先解锁日记本');}
 async verify(password){if(Date.now()<this.nextAttempt)throw Error('尝试过于频繁，请稍后再试');if(!await this.auth.verifyCredential(password,this.settings.credential)){this.failures++;this.nextAttempt=Date.now()+Math.min(30000,this.failures*1000);throw Error('密码不正确，请重试');}this.failures=0;this.nextAttempt=0;}
 async unlock(password){if(this.settings.credential)await this.verify(password);this.unlocked=true;return this.status();}
 update(options){const task=this.queue.then(async()=>{this.requireUnlocked();if(!options||!['set','disable','skip'].includes(options.action))throw Error('操作无效');let next;if(options.action==='skip'){if(this.settings.credential)throw Error('请在配置中管理密码');next={...this.settings,skipPrompt:!!options.skipPrompt};}else{if(this.settings.credential)await this.verify(options.currentPassword);next={version:1,skipPrompt:options.action==='disable',credential:options.action==='set'?await this.auth.createCredential(options.password):null};}const temporary=this.file+'.'+randomUUID()+'.tmp';await fs.mkdir(path.dirname(this.file),{recursive:true});const handle=await fs.open(temporary,'wx',0o600);try{await handle.writeFile(JSON.stringify(next));await handle.sync();}finally{await handle.close();}try{await fs.rename(temporary,this.file);}catch(error){await fs.rm(temporary,{force:true});throw error;}this.settings=next;return this.status();});this.queue=task.catch(()=>{});return task;}
}
module.exports={Security};
