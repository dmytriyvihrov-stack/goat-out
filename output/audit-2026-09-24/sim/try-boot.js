const { load } = require('./load.js');
const root = process.argv[2];
const L = load(root);
L.run(`var __c = document.getElementById('game'); window.game = new Game(__c); 'ok'`);
const g = L.grab('game');
console.log('state', g.state);
