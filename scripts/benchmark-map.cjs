// Development-only native Chromium rendering benchmark; uses synthetic diary locations.
const {app,BrowserWindow}=require('electron');
app.setName('地图性能验收');app.setPath('userData','/tmp/ediary-map-benchmark');
const mode=process.argv.includes('baseline')?'baseline':'layered';
app.whenReady().then(async()=>{const win=new BrowserWindow({width:1380,height:900,show:true,webPreferences:{sandbox:true,backgroundThrottling:false}});win.on('page-title-updated',(event,title)=>{if(title.startsWith('MAP_RESULT:')){event.preventDefault();console.log(title);app.quit();}});await win.loadURL('http://127.0.0.1:5175/validation-0.2.11/map-check.html?auto=1'+(mode==='baseline'?'&baseline=1':''));});
setTimeout(()=>{console.error('Benchmark timeout');app.exit(1);},25000).unref();app.on('window-all-closed',()=>app.quit());
