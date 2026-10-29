const pkg=require('./package.json');
module.exports=require('./electron/release-policy.cjs').releaseConfig(pkg.version,pkg.build);
