const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const legacy=require('./storage.cjs');
const extensions={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'};
const mimeByExt=Object.fromEntries(Object.entries(extensions).map(([mime,ext])=>[ext,mime]));
const assetPattern=/ediary-asset:\/\/image\/[a-f0-9]{64}\.(?:png|jpg|webp|gif)/g;
const embeddedPattern=/data:image\/(?:png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+/g;
const assetName=/^[a-f0-9]{64}\.(png|jpg|webp|gif)$/;
async function recoveryBackup(root){let files;try{files=await fs.readdir(path.join(root,'backups'),{withFileTypes:true});}catch(error){if(error.code==='ENOENT')return null;throw error;}const candidates=[];for(const file of files)if(file.isFile()&&file.name.endsWith('.ediary')){const full=path.join(root,'backups',file.name);candidates.push({file:full,modified:(await fs.stat(full)).mtimeMs});}candidates.sort((a,b)=>b.modified-a.modified);for(const item of candidates){try{const raw=await fs.readFile(item.file,'utf8');legacy.restore(raw);return {...item,raw};}catch{}}if(candidates.length)throw Error('本地日记库缺失，且没有可用的完整备份；原备份已保留');return null;}

class Library {
 constructor(root){this.root=root;this.file=path.join(root,'library.sqlite');this.attachments=path.join(root,'attachments');this.queue=Promise.resolve();this.closed=false;this.cache=new Map();}
 async open({applicationVersion}={}){
  if(applicationVersion&&!/^\d+\.\d+\.\d+$/.test(applicationVersion))throw Error('应用版本无效');
  await fs.mkdir(this.attachments,{recursive:true});
  let exists=false;try{await fs.stat(this.file);exists=true;}catch(error){if(error.code!=='ENOENT')throw error;}
  let recovery=null;if(!exists){let hasLegacy=false;try{await fs.stat(path.join(this.root,'library.json'));hasLegacy=true;}catch(error){if(error.code!=='ENOENT')throw error;}if(!hasLegacy)recovery=await recoveryBackup(this.root);}
  if(exists){this.db=new DatabaseSync(this.file,{readOnly:true});try{const schema=this.db.prepare('PRAGMA user_version').get().user_version;if(schema>1)throw Error('日记库版本较新，请更新软件后打开');if(applicationVersion){const previous=this.db.prepare("SELECT value FROM metadata WHERE key='application-version'").get()?.value;if(previous!==applicationVersion){const folder=path.join(this.root,'backups');await fs.mkdir(folder,{recursive:true});const file=path.join(folder,`before-upgrade-${applicationVersion}-${Date.now()}.ediary`);const handle=await fs.open(file+'.tmp','wx',0o600);try{await handle.writeFile(await this.createBackup());await handle.sync();}finally{await handle.close();}await fs.rename(file+'.tmp',file);}}}finally{this.db.close();this.db=null;}}
  await fs.mkdir(this.attachments,{recursive:true});this.db=new DatabaseSync(this.file);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const version=this.db.prepare('PRAGMA user_version').get().user_version;if(version>1)throw Error('日记库版本较新，请更新软件后打开');
  this.db.exec(`CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, date TEXT NOT NULL, type TEXT NOT NULL, deleted INTEGER NOT NULL, updated TEXT NOT NULL, document TEXT NOT NULL); CREATE INDEX IF NOT EXISTS entries_by_date ON entries(date,deleted); CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY,value TEXT NOT NULL); PRAGMA user_version=1;`);
  if(!this.db.prepare("SELECT value FROM metadata WHERE key='legacy-imported'").get()){
   let original;try{original=await fs.readFile(path.join(this.root,'library.json'),'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}
   if(original){const data=legacy.validate(JSON.parse(original));await fs.mkdir(path.join(this.root,'backups'),{recursive:true});await fs.writeFile(path.join(this.root,'backups',`before-sqlite-${Date.now()}.ediary`),legacy.backup(data));await this.save(data);}
   this.db.prepare("INSERT INTO metadata(key,value) VALUES('legacy-imported','1')").run();
  }
  if(recovery){try{await this.importBackup(recovery.raw);this.db.prepare("INSERT INTO metadata(key,value) VALUES('recovered-from',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(path.basename(recovery.file));}catch(error){await this.close();for(const suffix of ['', '-wal','-shm'])await fs.rm(this.file+suffix,{force:true});throw error;}}
  if(applicationVersion)this.db.prepare("INSERT INTO metadata(key,value) VALUES('application-version',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(applicationVersion);
  return this;
 }
 enqueue(action){const next=this.queue.then(()=>{if(this.closed)throw Error('日记库已关闭');return action();});this.queue=next.catch(()=>{});return next;}
 async putImage(dataURL){
  const match=/^data:(image\/(?:png|jpeg|webp|gif));base64,([a-zA-Z0-9+/=]+)$/.exec(dataURL);
  if(!match)throw Error('图片格式无效');const bytes=Buffer.from(match[2],'base64');
  if(!bytes.length||bytes.length>8*1024*1024||bytes.toString('base64')!==match[2])throw Error('图片无效或超过 8 MB');
  const name=createHash('sha256').update(bytes).digest('hex')+'.'+extensions[match[1]];
  try{await fs.writeFile(path.join(this.attachments,name),bytes,{flag:'wx',mode:0o600});}catch(e){if(e.code!=='EEXIST')throw e;}
  return 'ediary-asset://image/'+name;
 }
 async externalize(entry){const result={...entry};for(const field of ['content','markdown']){if(typeof result[field]!=='string')continue;for(const source of new Set(result[field].match(embeddedPattern)||[])){const url=await this.putImage(source);result[field]=result[field].replaceAll(source,url);}for(const url of new Set(result[field].match(assetPattern)||[])){await fs.access(this.resolveAsset(url));}}return result;}
 resolveAsset(url){let parsed;try{parsed=new URL(url);}catch{throw Error('附件地址无效');}const name=parsed.pathname.slice(1);if(parsed.protocol!=='ediary-asset:'||parsed.hostname!=='image'||parsed.search||parsed.hash||!assetName.test(name))throw Error('附件地址无效');return path.join(this.attachments,name);}
 async readAsset(url){const file=this.resolveAsset(url);return {bytes:await fs.readFile(file),mime:mimeByExt[path.extname(file).slice(1)]};}
 save(data){legacy.validate(data);const snapshot=structuredClone(data);return this.enqueue(async()=>{
  const records=[];for(const e of snapshot.entries){const fingerprint=JSON.stringify(e);if(this.cache.get(e.id)===fingerprint)continue;const canonical=await this.externalize(e);records.push([canonical,fingerprint]);}
  const statement=this.db.prepare('INSERT INTO entries(id,date,type,deleted,updated,document) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET date=excluded.date,type=excluded.type,deleted=excluded.deleted,updated=excluded.updated,document=excluded.document WHERE entries.document<>excluded.document');
  this.db.exec('BEGIN IMMEDIATE');try{for(const [e] of records)statement.run(e.id,e.date,e.type,Number(e.deleted),e.updated,JSON.stringify(e));if(snapshot.places!==undefined)this.writePlaces(snapshot.places);this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');throw error;}
  for(const [e,fingerprint] of records)this.cache.set(e.id,fingerprint);
 });}
 writePlaces(places){this.db.prepare("INSERT INTO metadata(key,value) VALUES('places',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(places));}
 readData(){const data={version:1,entries:this.db.prepare('SELECT document FROM entries ORDER BY date DESC,updated DESC').all().map(row=>JSON.parse(row.document))};const row=this.db.prepare("SELECT value FROM metadata WHERE key='places'").get();if(row)data.places=JSON.parse(row.value);return legacy.validate(data);}
 async load(){await this.queue;return this.readData();}
 async portableText(text){for(const url of new Set(text.match(assetPattern)||[])){const {bytes,mime}=await this.readAsset(url);text=text.replaceAll(url,`data:${mime};base64,${bytes.toString('base64')}`);}return text;}
 async portable(){const data=await this.load();for(const e of data.entries)for(const field of ['content','markdown'])if(typeof e[field]==='string')e[field]=await this.portableText(e[field]);return data;}
 async createBackup(){return legacy.backup(await this.portable());}
 importBackup(raw){return this.enqueue(async()=>{
  const incoming=legacy.restore(raw);const canonical={version:1,entries:[]};if(incoming.places)canonical.places=incoming.places;for(const e of incoming.entries)canonical.entries.push(await this.externalize(e));
  const current=this.readData();
  const result=legacy.merge(current,canonical);const stmt=this.db.prepare('INSERT INTO entries(id,date,type,deleted,updated,document) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING');this.db.exec('BEGIN IMMEDIATE');try{for(const e of result.data.entries)stmt.run(e.id,e.date,e.type,Number(e.deleted),e.updated,JSON.stringify(e));if(result.data.places)this.writePlaces(result.data.places);this.db.exec('COMMIT');}catch(error){this.db.exec('ROLLBACK');throw error;}this.cache.clear();return result;
 });}
 async close(){await this.queue;if(this.db&&!this.closed){this.db.close();this.closed=true;}}
}
module.exports={Library};
