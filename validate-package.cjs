const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const b=fs.readFileSync(path.join(__dirname,'mission-centre.glb'));
assert.equal(b.readUInt32LE(0),0x46546c67);assert.equal(b.readUInt32LE(8),b.length);
const size=b.readUInt32LE(12),scene=JSON.parse(b.subarray(20,20+size));
assert.equal(scene.asset.version,'2.0');
for(const view of scene.bufferViews)assert(view.byteOffset+view.byteLength<=scene.buffers[0].byteLength);
for(const acc of scene.accessors){assert(acc.count>0);assert(scene.bufferViews[acc.bufferView]);}
const html=fs.readFileSync(path.join(__dirname,'PLAY.html'),'utf8');
assert(!html.includes('src="game.js"'));assert(!html.includes('@import'));
assert(html.includes('<style>:root{'),'Bundled CSS must begin with its complete root rule.');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];assert.equal(scripts.length,1);
new vm.Script(scripts[0][1]);
console.log('PASS: GLB header, buffer bounds, '+scene.nodes.length+' model nodes; self-contained HTML and embedded JS syntax.');
