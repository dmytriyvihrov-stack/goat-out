const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'records');
if(fs.existsSync(dir))for(const n of fs.readdirSync(dir)){if(!n.endsWith('.json'))continue;const r=JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));const target=path.join(__dirname,'images',r.id+'.png');if(!fs.existsSync(target))fs.copyFileSync(r.source,target);}
require('./build-gallery.cjs');
console.log(JSON.stringify(fs.readdirSync(path.join(__dirname,'images')).filter(x=>x.endsWith('.png'))));
