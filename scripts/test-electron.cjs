const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const tests=fs.readdirSync('tests').filter(file=>file.endsWith('.test.mjs')).map(file=>'tests/'+file);
const result=spawnSync(require('electron'),['--test',...tests],{stdio:'inherit',env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}});
if(result.error)throw result.error;process.exit(result.status??1);
