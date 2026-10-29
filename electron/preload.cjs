const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('diary',{
 authStatus:()=>ipcRenderer.invoke('auth-status'),unlock:password=>ipcRenderer.invoke('auth-unlock',password),updateSecurity:options=>ipcRenderer.invoke('auth-update',options),
 loadPreferences:()=>ipcRenderer.invoke('preferences-load'),savePreferences:value=>ipcRenderer.invoke('preferences-save',value),load:()=>ipcRenderer.invoke('load'),save:data=>ipcRenderer.invoke('save',data),addImage:dataURL=>ipcRenderer.invoke('add-image',dataURL),pickImage:()=>ipcRenderer.invoke('pick-image'),
 backupInfo:()=>ipcRenderer.invoke('backups-info'),createLocalBackup:()=>ipcRenderer.invoke('backups-create'),openBackupFolder:()=>ipcRenderer.invoke('backups-open'),restoreLocalBackup:name=>ipcRenderer.invoke('backups-restore',name),
 backup:()=>ipcRenderer.invoke('backup'),restore:()=>ipcRenderer.invoke('restore'),exportMarkdown:(id,markdown)=>ipcRenderer.invoke('export-md',{id,markdown}),importMarkdown:()=>ipcRenderer.invoke('import-md'),
 onMenuAction:callback=>{const listener=(_event,action)=>callback(action);ipcRenderer.on('menu-action',listener);return ()=>ipcRenderer.removeListener('menu-action',listener);}
});
