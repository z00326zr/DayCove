const {createHash}=require('node:crypto');
const path=require('node:path');
function releaseConfig(version,base={}){
 if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('发布版本号无效');
 const bytes=createHash('sha1').update(Buffer.from('50e065bc313411e69bab38c9862bdaf3','hex')).update('local.ediary.plus').digest().subarray(0,16);bytes[6]=(bytes[6]&15)|80;bytes[8]=(bytes[8]&63)|128;const hex=bytes.toString('hex');const guid=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
 return {...base,appId:'local.ediary.plus',productName:'拾日匣',artifactName:'${productName}-${version}-${os}-${arch}.${ext}',directories:{...base.directories,output:`release/${version}`},nsis:{...base.nsis,guid,allowToChangeInstallationDirectory:false,shortcutName:'拾日匣',uninstallDisplayName:'拾日匣',deleteAppDataOnUninstall:false}};
}
const dataRoot=(appData,override)=>override?path.resolve(override):path.join(appData,'ediary-plus');
module.exports={releaseConfig,dataRoot};
