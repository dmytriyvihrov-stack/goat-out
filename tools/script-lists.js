// The one reader of which scripts the game loads. `tools/check-sync.js` and the publish/push guard
// (`tools/hooks/guard.js`) both ask it, so the two can never disagree about what "loaded" means.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARTIFACT_URL = 'https://claude.ai/code/artifact/098e742b-e742-4ce7-8499-a303fa5db021';

// Every `<script src>` of an HTML file at the root, in load order.
const scriptsOf = (file) => (fs.readFileSync(path.join(ROOT, file), 'utf8')
  .match(/<script src="([^"]+)"><\/script>/g) || []).map(s => s.match(/src="([^"]+)"/)[1]);

// Every script in js/, as the HTML files name them.
const jsOnDisk = () => fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).map(f => `js/${f}`).sort();

module.exports = { ROOT, ARTIFACT_URL, scriptsOf, jsOnDisk };
