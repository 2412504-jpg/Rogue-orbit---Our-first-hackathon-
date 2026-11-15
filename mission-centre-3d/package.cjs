const fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const css=read('style.css').replace(/^@import[^\r\n]*\r?\n/,'');
const code=read('game.js');
const html=read('index.html').replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>').replace('<script src="game.js"></script>',()=>'<script>'+code.replace(/<\/script/gi,'<\\/script')+'</script>');
fs.writeFileSync(path.join(__dirname,'PLAY.html'),html);
console.log('Built PLAY.html with bundled CSS and JavaScript:',Buffer.byteLength(html),'bytes.');
