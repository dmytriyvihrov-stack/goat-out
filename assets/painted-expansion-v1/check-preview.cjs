// Offline inspection of this asset package only; does not load the game.
const {chromium}=require('playwright'),path=require('path'),fs=require('fs');
(async()=>{
 const http=require('http');const server=http.createServer((req,res)=>{
   const file=path.resolve(__dirname,'.'+decodeURIComponent(req.url.split('?')[0]));
   if(!file.startsWith(__dirname+path.sep)){res.writeHead(403);return res.end();}
   fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(data)});
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const page=await browser.newPage({viewport:{width:1280,height:980},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/preview.html');
 await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0)&&animated.every(v=>v.im.complete&&v.im.naturalWidth>0)&&doorViews.every(v=>v.im.complete&&v.im.naturalWidth>0));
 await page.locator('#play').click();
 const a=await page.locator('.unit canvas').first().evaluate(c=>c.toDataURL());
 await page.locator('#step').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const b=await page.locator('.unit canvas').first().evaluate(c=>c.toDataURL());
 if(a===b)errors.push('Step control did not change sheep frame');
 await page.screenshot({path:path.join(__dirname,'preview-dark.png'),fullPage:true});
 await page.locator('#bg').selectOption('#d8d6ce');await page.locator('#doorState').selectOption('2');
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.screenshot({path:path.join(__dirname,'preview-light.png'),fullPage:true});
 const loaded=await page.evaluate(()=>({animatedViews:animated.length,doors:doorViews.length,objects:document.images.length}));
 fs.writeFileSync(path.join(__dirname,'preview-check.json'),JSON.stringify({errors,stepChanged:a!==b,...loaded},null,2));
 await browser.close();server.close();console.log({errors,stepChanged:a!==b,...loaded});if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
