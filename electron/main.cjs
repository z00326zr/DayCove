const {app,BrowserWindow,ipcMain,dialog,protocol,Menu,shell}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {Library}=require('./library.cjs');
const {Security}=require('./security.cjs');
const {restore}=require('./storage.cjs');
const {randomUUID}=require('node:crypto');
protocol.registerSchemesAsPrivileged([{scheme:'ediary-asset',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
app.setName('拾日匣');
app.setPath('userData',require('./release-policy.cjs').dataRoot(app.getPath('appData'),process.env.EDIARY_DATA_DIR));
let win,library,security,backups,timer,quitReady=false,preferenceWrites=Promise.resolve();
const hasLock=app.requestSingleInstanceLock();
if(!hasLock)app.quit();
app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.show();win.focus();}});
const mainFile=path.join(__dirname,'../dist/index.html');
const mainURL=pathToFileURL(mainFile).href;
const backupName=()=>new Date().toISOString().replace(/[:.]/g,'-');
async function automaticBackup(prefix='auto'){return backups.create(prefix);}

function register(name,handler,protectedCall=true){ipcMain.handle(name,(event,...args)=>{
 if(event.sender!==win.webContents||!event.senderFrame||event.senderFrame.url!==mainURL||event.senderFrame!==win.webContents.mainFrame)throw Error('请求来源无效');
 if(protectedCall)security.requireUnlocked();return handler(...args);
});}
function setMenu(){const send=name=>()=>win?.webContents.send('menu-action',name);Menu.setApplicationMenu(Menu.buildFromTemplate([
 ...(process.platform==='darwin'?[{label:'拾日匣',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'hideOthers'},{type:'separator'},{role:'quit'}]}]:[]),
 {label:'文件',submenu:[{label:'新建记录',accelerator:'CmdOrCtrl+N',click:send('new')},{label:'保存',accelerator:'CmdOrCtrl+S',click:send('save')},{type:'separator'},{label:'备份日记库',click:send('backup')},{label:'从备份导入',click:send('restore')},{type:'separator'},process.platform==='darwin'?{role:'close'}:{role:'quit'}]},
 {label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},
 {label:'视图',submenu:[{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{type:'separator'},{role:'togglefullscreen'}]},
 {label:'工具',submenu:[{label:'配置',click:send('settings')},{label:'使用说明书',click:send('manual')}]}]));}
if(hasLock)app.whenReady().then(async()=>{
 const root=app.getPath('userData');security=await new Security(root).open();library=await new Library(root).open({applicationVersion:app.getVersion()});
 backups=await new (require('./backups.cjs').Backups)(root,library).open();
 protocol.handle('ediary-asset',async request=>{try{security.requireUnlocked();const asset=await library.readAsset(request.url);return new Response(asset.bytes,{headers:{'Content-Type':asset.mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}catch{return new Response('附件不可用',{status:404});}});
 win=new BrowserWindow({width:1380,height:900,minWidth:1000,minHeight:680,show:false,title:'拾日匣 '+app.getVersion(),backgroundColor:'#f1f5f4',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
 register('auth-status',()=>security.status(),false);register('auth-unlock',password=>security.unlock(password),false);register('auth-update',options=>security.update(options),false);
 const {entryMarkdown}=await import('./entry-format.mjs');const prefsModule=await import('./preferences.mjs');const prefsFile=path.join(root,'preferences.json');let preferences;try{preferences=prefsModule.validatePreferences(JSON.parse(await fs.readFile(prefsFile,'utf8')));}catch(error){if(error.code!=='ENOENT'){if(error instanceof SyntaxError||error.message==='写作配置无效')await fs.copyFile(prefsFile,prefsFile+'.invalid-'+Date.now());else throw error;}preferences={...prefsModule.defaultPreferences};}
 register('preferences-load',()=>preferences);register('preferences-save',value=>{const next=prefsModule.validatePreferences(value);const task=preferenceWrites.then(async()=>{const temp=prefsFile+'.'+randomUUID()+'.tmp';await fs.writeFile(temp,JSON.stringify(next),{mode:0o600});await fs.rename(temp,prefsFile);preferences=next;return preferences;});preferenceWrites=task.catch(()=>{});return task;});
 register('load',async()=>({data:await library.load(),path:library.file}));register('save',data=>library.save(data));
 register('add-image',dataURL=>library.putImage(dataURL));
 register('pick-image',async()=>{const result=await dialog.showOpenDialog(win,{filters:[{name:'图片',extensions:['png','jpg','jpeg','webp','gif']}],properties:['openFile']});if(result.canceled)return;const file=result.filePaths[0];const stat=await fs.stat(file);if(stat.size>8*1024*1024)throw Error('请选择小于 8 MB 的图片');const mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif'}[path.extname(file).toLowerCase()];if(!mime)throw Error('图片格式无效');return library.putImage(`data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`);});
 register('backup',async()=>{const result=await dialog.showSaveDialog(win,{defaultPath:`日记备份-${backupName()}.ediary`,filters:[{name:'日记备份',extensions:['ediary']}]});if(result.canceled)return;await fs.writeFile(result.filePath,await library.createBackup(),{mode:0o600});return result.filePath;});
 async function restoreRaw(raw){const info=require('./backups.cjs').summary(raw);const answer=await dialog.showMessageBox(win,{type:'question',buttons:['取消','合并导入'],defaultId:0,cancelId:0,message:`导入 ${info.count} 篇记录？`,detail:`日期：${info.start||'无'} 至 ${info.end||'无'}\n保留现有记录，冲突另存副本；导入前自动备份。`});if(answer.response!==1)return;await automaticBackup('before-import');return library.importBackup(raw);}
 register('restore',async()=>{const result=await dialog.showOpenDialog(win,{filters:[{name:'日记备份',extensions:['ediary']}],properties:['openFile']});if(result.canceled)return;return restoreRaw(await fs.readFile(result.filePaths[0],'utf8'));});
 register('backups-info',()=>backups.info());register('backups-create',()=>automaticBackup('manual'));
 register('backups-open',async()=>{await fs.mkdir(backups.root,{recursive:true});const error=await shell.openPath(backups.root);if(error)throw Error(error);});
 register('backups-restore',async name=>restoreRaw(await backups.read(name)));
 register('export-md',async({id,markdown})=>{const data=await library.portable();const entry=data.entries.find(e=>e.id===id);if(!entry)throw Error('记录不存在');const text=entryMarkdown(entry,entry.markdown??await library.portableText(typeof markdown==='string'?markdown:entry.content));const result=await dialog.showSaveDialog(win,{defaultPath:'日记.md',filters:[{name:'Markdown',extensions:['md']}]});if(!result.canceled){await fs.writeFile(result.filePath,text,{mode:0o600});return true;}});
 register('import-md',async()=>{const result=await dialog.showOpenDialog(win,{filters:[{name:'Markdown',extensions:['md','markdown','txt']}],properties:['openFile']});if(result.canceled)return;return {name:path.basename(result.filePaths[0],path.extname(result.filePaths[0])),text:await fs.readFile(result.filePaths[0],'utf8')};});
 win.webContents.on('did-start-navigation',(_event,_url,_inPlace,isMainFrame)=>{if(isMainFrame)security.reset();});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',event=>event.preventDefault());
 win.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
 win.webContents.on('will-prevent-unload',event=>{const choice=dialog.showMessageBoxSync(win,{type:'warning',buttons:['继续等待','退出'],defaultId:0,cancelId:0,message:'还有内容尚未保存成功',detail:'退出将放弃尚未写入的修改。'});if(choice===1)event.preventDefault();});
 win.once('ready-to-show',()=>win.show());setMenu();await win.loadFile(mainFile);
 try{await automaticBackup();}catch(error){console.error('自动备份失败：',error.message);}
 timer=setInterval(()=>{if(security.unlocked)automaticBackup().catch(error=>console.error('自动备份失败：',error.message));},60*60*1000);timer.unref();
 win.on('closed',()=>{win=null;});
}).catch(async error=>{dialog.showErrorBox('日记库打开失败',error.message);await library?.close();app.quit();});
app.on('window-all-closed',()=>app.quit());
app.on('will-quit',event=>{if(quitReady||!library)return;event.preventDefault();clearInterval(timer);Promise.allSettled([backups?.queue.catch(()=>{}).then(()=>library.close()),preferenceWrites,security.queue]).finally(()=>{quitReady=true;app.exit(0);});});
