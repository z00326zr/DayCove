const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {restore}=require('./storage.cjs');
class Backups {
 constructor(root,library){this.root=path.join(root,'backups');this.library=library;this.queue=Promise.resolve();this.statusFile=path.join(root,'backup-status.json');this.last=null;}
 async open(){try{this.last=JSON.parse(await fs.readFile(this.statusFile,'utf8'));}catch(e){if(e.code!=='ENOENT'&&!(e instanceof SyntaxError))throw e;}return this;}
 async record(value){this.last=value;const temp=this.statusFile+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify(value),{mode:0o600});await fs.rename(temp,this.statusFile);}
 create(prefix='manual'){if(!['auto','manual','before-import'].includes(prefix))return Promise.reject(Error('备份类型无效'));const task=this.queue.catch(()=>{}).then(async()=>{let temp;try{await fs.mkdir(this.root,{recursive:true});const name=`${prefix}-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID()}.ediary`;const target=path.join(this.root,name);temp=target+'.tmp';const raw=await this.library.createBackup();restore(raw);const handle=await fs.open(temp,'wx',0o600);try{await handle.writeFile(raw);await handle.sync();}finally{await handle.close();}await fs.rename(temp,target);await this.record({ok:true,time:new Date().toISOString(),name});if(prefix==='auto'){const files=(await this.list()).filter(f=>f.name.startsWith('auto-'));for(const file of files.slice(30))await fs.unlink(path.join(this.root,file.name));}return target;}catch(error){if(temp)await fs.rm(temp,{force:true}).catch(()=>{});await this.record({ok:false,time:new Date().toISOString(),error:error.message}).catch(()=>{});throw error;}});this.queue=task;return task;}
 async list(){let names;try{names=await fs.readdir(this.root,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return [];throw e;}const files=[];for(const item of names){if(!item.isFile()||!item.name.endsWith('.ediary'))continue;try{const stat=await fs.lstat(path.join(this.root,item.name));if(stat.isFile())files.push({name:item.name,size:stat.size,time:stat.mtime.toISOString()});}catch(e){if(e.code!=='ENOENT')throw e;}}return files.sort((a,b)=>b.time.localeCompare(a.time)||b.name.localeCompare(a.name));}
 async info(){return {last:this.last,files:await this.list(),path:this.root,keep:30};}
 async read(name){if(typeof name!=='string'||path.basename(name)!==name||!name.endsWith('.ediary'))throw Error('备份名称无效');const target=path.join(this.root,name);const stat=await fs.lstat(target);if(!stat.isFile()||stat.isSymbolicLink())throw Error('备份文件无效');const raw=await fs.readFile(target,'utf8');restore(raw);return raw;}
}
function summary(raw){const data=restore(raw);const dates=data.entries.map(e=>e.date).sort();return {count:data.entries.length,start:dates[0]||'',end:dates.at(-1)||''};}
module.exports={Backups,summary};
