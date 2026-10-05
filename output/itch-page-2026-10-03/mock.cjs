// node mock.cjs → mock.html: the itch page as the theme below would draw it (column, sidebar, the
// description from description.html), to look at before anything is uploaded.
const fs = require('fs');
const THEME = { bg: '#140d12', bg2: '#1f151a', bg2Alpha: 0.9, text: '#e8dfcc', link: '#f0c050', headers: '#e8dfcc', buttons: '#8a1d23' };
const desc = fs.readFileSync(__dirname + '/description.html', 'utf8');
const rgba = (h, a) => `rgba(${[1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16)).join(',')},${a})`;
fs.writeFileSync(__dirname + '/mock.html', `<!doctype html><meta charset="utf-8"><title>Itch page mock</title>
<link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;700&family=Pixelify+Sans:wght@500&display=swap" rel="stylesheet">
<style>
body{margin:0;background:${THEME.bg} url(bg-motifs.png) repeat;color:${THEME.text};font:18px/1.55 Alegreya,serif;image-rendering:pixelated}
.col{width:960px;margin:40px auto;background:${rgba(THEME.bg2, THEME.bg2Alpha)}}
.col>img{display:block}
.embed{height:420px;margin:0;background:#000;display:flex;align-items:center;justify-content:center}
.embed button{background:${THEME.buttons};color:#fff;border:0;font:500 22px 'Pixelify Sans';padding:14px 28px;border-radius:3px}
.cols{display:flex;gap:20px;padding:20px}
.left{width:620px} .right{width:280px} .right img{width:100%;margin-bottom:10px;display:block}
.left img{max-width:100%} a{color:${THEME.link}} p{margin:0 0 14px}
h2{font:500 22px 'Pixelify Sans';color:${THEME.headers}}
</style>
<div class="col"><img src="header.png" alt="">
<div class="embed"><button>Run game</button></div>
<div class="cols"><div class="left">${desc}</div>
<div class="right"><img src="../fanart-2026-09-26/goat-vs-cult.png"><img src="../fanart-2026-09-26/goat-vs-ogre.png"><img src="../fanart-2026-09-26/side.png"></div></div>
<div style="padding:0 20px 20px"><h2>More information</h2></div></div>`);
console.log('mock.html');
