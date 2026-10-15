// Packs the image_gen alternatives into square native frames; originals are preserved.
const fs=require('fs'),path=require('path');
const {Img,decode,text}=require('../../pixel-claude-2026-09-24/png.cjs');
const {atlasImg}=require('../../factory-2026-10-11/lib.cjs');
const jobs=JSON.parse(fs.readFileSync(path.join(__dirname,'prompts.json'))),items=[];
const sheet=new Img(1536,620,'#242220');
for(let k=0;k<jobs.length;k++){
 const j=jobs[k],im=decode(fs.readFileSync(path.join(__dirname,'source',j.id+'.png')));
 let x0=im.w,y0=im.h,x1=-1,y1=-1;
 for(let y=0;y<im.h;y++)for(let x=0;x<im.w;x++)if(im.data[(y*im.w+x)*4+3]>=128){x0=Math.min(x,x0);x1=Math.max(x,x1);y0=Math.min(y,y0);y1=Math.max(y,y1);}
 const sw=x1-x0+1,sh=y1-y0+1,s=Math.min(144/sw,144/sh),w=Math.round(sw*s),h=Math.round(sh*s);
 const native=new Img(160,160),dx=Math.round((160-w)/2),dy=152-h;
 native.blit(im,x0,y0,sw,sh,dx,dy,w,h);
 for(let a=3;a<native.data.length;a+=4)native.data[a]=native.data[a]>=128?255:0;
 fs.writeFileSync(path.join(__dirname,'native',j.id+'.png'),native.png());
 const big=new Img(640,640);big.blit(native,0,0,160,160,0,0,640,640);fs.writeFileSync(path.join(__dirname,j.id+'-4x.png'),big.png());
 sheet.blit(native,0,0,160,160,k*512+16,56,480,480);
 text(sheet,j.letter+' / '+['CORNER CAGE','GIRDER FRAME','BRACED FRAME'][k],k*512+24,22,'#e6c9aa',2);
 text(sheet,'160 X 160 / SPRITE 144 MAX',k*512+24,549,'#c7bca8',1);
 const g=atlasImg('goat',1),gw=Math.round(g.im.w*g.k*2),gh=Math.round(g.im.h*g.k*2);
 sheet.blit(g.im,0,0,g.im.w,g.im.h,k*512+420,566-gh,gw,gh);
 text(sheet,'GOAT 2X',k*512+412,580,'#9e9386',1);
 const a={id:j.id,title:j.title,file:'native/'+j.id+'.png',canvas:[160,160],contentRect:[dx,dy,w,h],sourceRect:[x0,y0,sw,sh],suggestedTexelScale:1.35,visibleWorldExtent:[+(w*1.35).toFixed(1),+(h*1.35).toFixed(1)],frameWorldSize:[216,216],status:'alternative-not-yet-selected'};
 items.push(a);
}
fs.writeFileSync(path.join(__dirname,'comparison.png'),sheet.png());
const scale=new Img(800,280,'#282522');text(scale,'SCALE 1X / TILE 32 / GAME GOAT',20,14,'#e6c9aa',2);
for(let k=0;k<3;k++){const im=decode(fs.readFileSync(path.join(__dirname,items[k].file)));scale.blit(im,0,0,160,160,18+k*260,36,216,216);text(scale,['A','B','C'][k],28+k*260,260,'#e6c9aa',1);const g=atlasImg('goat',1),w=Math.round(g.im.w*g.k),h=Math.round(g.im.h*g.k);scale.blit(g.im,0,0,g.im.w,g.im.h,212+k*260,248-h,w,h);}
fs.writeFileSync(path.join(__dirname,'scale-1x.png'),scale.png());
fs.writeFileSync(path.join(__dirname,'manifest.json'),JSON.stringify({tileWorldPx:32,generator:'built-in image_gen',nativeAlpha:'binary',items},null,2));
const html=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Автоматон — железная рамка и плоть по бокам</title><style>body{background:#1e1c1b;color:#e7ddcc;font:16px/1.6 system-ui;margin:32px auto;padding:0 24px;max-width:1500px}h1{font-size:32px}p{max-width:950px;color:#bdb2a1}a{color:#e6bb87}img{image-rendering:pixelated;max-width:100%;height:auto}.options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.card{background:#272422;padding:16px;border:1px solid #493d33}.card img{width:100%}.native{overflow:auto;background:#272422;padding:12px}.native img{max-width:none}.links{display:flex;gap:24px;flex-wrap:wrap}button{padding:8px 16px;background:#44372d;border:1px solid #a07651;color:#eadcc8;cursor:pointer}@media(max-width:850px){.options{grid-template-columns:1fr}}</style><h1>Квадратная железная рамка. Плоть выступает из боков.</h1><p>Три исправленных варианта: верхняя рамка, углы, стойки и ноги полностью железные. Мясо выпирает между стойками через боковые проёмы. Все варианты на четырёх длинных разнесённых ногах.</p><div class="links"><a href="HANDOFF_CLAUDE.md">Инструкция для Клода</a><a href="manifest.json">Размеры PNG</a><a href="prompts.json">Промпты image_gen</a></div><div class="options">${items.map(a=>`<article class="card"><h2>${a.title}</h2><img src="${a.id}-4x.png" alt="${a.title}"><a href="${a.file}">PNG 160 × 160</a> · <a href="source/${a.id}.png">Исходник</a></article>`).join('')}</div><h2>Сравнение с игровым козлом</h2><p>Тайл 32 px, козёл из текущего игрового атласа. Прозрачный кадр 160 × 160; силуэт до 144 px. Это статические арт-варианты, вариант для игры ещё не выбран.</p><button onclick="document.getElementById('scale').style.width='800px'">1×</button> <button onclick="document.getElementById('scale').style.width='1600px'">2×</button><div class="native"><img id="scale" src="scale-1x.png" width="800" alt="Три автоматона рядом с козлом при игровом масштабе"></div>`;
fs.writeFileSync(path.join(__dirname,'index.html'),html);
console.log(JSON.stringify(items.map(a=>({id:a.id,canvas:a.canvas,content:a.contentRect})),null,2));
