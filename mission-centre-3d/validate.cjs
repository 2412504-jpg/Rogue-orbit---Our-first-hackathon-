// Local simulation/geometry tests. No browser automation or external packages.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const elements=new Map(),buffers=[],draws=[];let bound,attribs={},model,color,currentFrame;
const gl=new Proxy({ARRAY_BUFFER:1,STATIC_DRAW:2,FLOAT:3,TRIANGLES:4,COMPILE_STATUS:5,
 createShader:()=>({}),getShaderParameter:()=>true,createProgram:()=>({}),getUniformLocation:(_,s)=>s,getAttribLocation:(_,s)=>s,
 createBuffer:()=>{const b={};buffers.push(b);return b;},bindBuffer:(_,b)=>bound=b,bufferData:(_,a)=>bound.data=Array.from(a),
 vertexAttribPointer:name=>attribs[name]=bound,
 uniformMatrix4fv:(name,_,a)=>{if(name==='model')model=Array.from(a);},uniform3fv:(name,a)=>{if(name==='color')color=Array.from(a);},
 drawArrays:()=>draws.push({vertices:attribs.position.data,normals:attribs.normal.data,matrix:model,color,group:context.window.drawGroup||'Architecture'})
},{get:(o,k)=>k in o?o[k]:()=>{}});
function element(id){if(!elements.has(id))elements.set(id,{style:{},dataset:{},classList:{add(){},remove(){},toggle(){}},textContent:'',innerHTML:'',open:false,addEventListener(){},querySelector:element,append(){},focus(){},showModal(){this.open=true},close(){this.open=false},getContext:()=>id==='#world'?gl:null,play:()=>Promise.resolve(),pause(){}});return elements.get(id);}
const context={console,Math,JSON,Map,Set,Float32Array,parseInt,Number,String,Array,Error,Infinity,URLSearchParams,location:{search:''},
 document:{body:{classList:{toggle(){},add(){},remove(){}}},querySelector:element,querySelectorAll:()=>[],createElement:()=>element('generated'+elements.size)},window:{addEventListener(){}},
 matchMedia:()=>({matches:false}),performance:{now:()=>0},localStorage:{getItem:()=>null,setItem(){}},
 requestAnimationFrame:f=>{currentFrame=f;return 1},setTimeout:()=>0,clearTimeout(){},innerWidth:1280,innerHeight:720,devicePixelRatio:1};
vm.createContext(context);
let code=fs.readFileSync(path.join(__dirname,'game.js'),'utf8');
code=code.replace('globe(time);spacecraft(',"window.drawGroup='Earth';globe(time);window.drawGroup='WorkbenchSatellite';spacecraft(").replace('function rocket(t){',"function rocket(t){window.drawGroup='Rocket';").replace('function character(x,z,color,angle,walk,t,name){','function character(x,z,color,angle,walk,t,name){window.drawGroup=name;');
code=code.replace('window.missionScene={','window.test={initial,player,route,move,blocked,wetCells,dem,channel,neighbors,colliders,crew,transition,takeTurn,cost,mass,budget,loop,enterGame,openMenu,getMenu:()=>menuOpen,getState:()=>state,setState:s=>state=s,getPath:()=>waypoints,getDraws:()=>staticObjects};window.missionScene={');
vm.runInContext(code,context);
const t=context.window.test;
assert(t.getMenu());assert(element('#start-screen').open,'Start screen opens before gameplay');
t.enterGame();assert(!t.getMenu());assert(!element('#start-screen').open);
t.openMenu();assert(t.getMenu());assert(element('#start-game').innerHTML.includes('Resume mission'));t.enterGame();
for(let n=0;n<3;n++){
 t.player.x=-.8;t.player.z=7.1;t.route(n);const route=t.getPath();assert(route.length>0,'Room route must exist');
 for(const [x,z] of route)assert(!t.blocked(x,z),'Route must avoid furniture and walls');
 const end=route.at(-1);assert(Math.hypot(end[0]-t.crew[n].x,end[1]-t.crew[n].z)<2,'Route reaches interaction range');
}
const low=t.wetCells(.4),high=t.wetCells(1.8);assert(high.filter(Boolean).length>low.filter(Boolean).length);
low.forEach((wet,i)=>{if(wet)assert(high[i],'Flood extent must be monotonic');});
// Every newly wet cell must connect back to a river seed.
const reachable=new Set(),queue=[];t.channel.forEach((wet,i)=>{if(wet){queue.push(i);reachable.add(i);}});
for(let q=0;q<queue.length;q++)for(const j of t.neighbors(queue[q]))if(high[j]&&!reachable.has(j)){reachable.add(j);queue.push(j);}
assert.equal(reachable.size,high.filter(Boolean).length);
function campaign(actions,config,chapter=0){const s=t.initial();s.stage=4;s.chapter=chapter;s.config=config;s.battery=config.power?22:14;t.setState(s);for(const a of actions)t.takeTurn(a);return t.getState();}
const none={radar:false,power:false,radio:false,shield:false};
let s=campaign(['observe','observe','send','rest','observe','send','observe','send'],none);assert.equal(s.stage,5);assert.equal(s.outcome,'success');assert.equal(s.science,13);
s=campaign(Array(8).fill('rest'),none);assert.equal(s.outcome,'failure');assert.equal(s.trust,55);
for(let chapter=0;chapter<3;chapter++){
 s=campaign(['observe','observe','send','rest','observe','send','observe','send'],{...none,radar:true,power:true},chapter);
 assert.equal(s.outcome,'success');assert.equal(s.science,20);assert(t.cost()<=t.budget());assert(t.mass()<=16);
}
s=t.initial();s.config={radar:true,power:true,radio:true,shield:true};t.setState(s);assert(t.cost()>t.budget());assert(t.mass()>16);
t.transition('design');assert.equal(s.stage,0,'Cannot approve invalid design');
t.setState(t.initial());t.player.x=-.8;t.player.z=7.1;t.loop(0);
assert(draws.length>400,'Scene contains real 3D draws');
for(const d of draws){assert(d.matrix.every(Number.isFinite));assert(d.vertices.every(Number.isFinite));assert.equal(d.vertices.length,d.normals.length);}
fs.writeFileSync(path.join(__dirname,'scene-source.json'),JSON.stringify(context.window.missionScene));
module.exports={draws,scene:context.window.missionScene};
console.log('PASS: 3 room routes, connected/monotonic inundation, success/failure, all chapters, budget/mass guards, 3D geometry. Draw calls:',draws.length);
