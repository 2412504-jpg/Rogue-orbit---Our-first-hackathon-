'use strict';
(()=>{
const canvas=document.querySelector('#world'),gl=canvas.getContext('webgl',{antialias:true,alpha:false});
if(!gl){document.querySelector('#fallback').hidden=false;return;}
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const vertex=`attribute vec3 position;attribute vec3 normal;uniform mat4 model;uniform mat4 viewProjection;varying vec3 vNormal;varying vec3 vPosition;void main(){vec4 world=model*vec4(position,1.);vPosition=world.xyz;vNormal=normalize(mat3(model)*normal);gl_Position=viewProjection*world;}`;
const fragment=`precision mediump float;varying vec3 vNormal;varying vec3 vPosition;uniform vec3 color;uniform float glow;uniform vec3 eye;void main(){vec3 n=normalize(vNormal);vec3 sun=normalize(vec3(-.5,1.,.4));float diffuse=max(dot(n,sun),0.);float hemisphere=.55+.45*n.y;vec3 c=color*(.30+diffuse*.54+hemisphere*.28);float rim=pow(1.-max(dot(n,normalize(eye-vPosition)),0.),3.);c+=vec3(.20,.37,.40)*rim*.22;float localLight=max(0.,1.-length(vPosition-vec3(5.,3.,-3.))/8.);c+=color*vec3(.04,.22,.25)*localLight;c=mix(c,color*1.23,glow);float fog=clamp((length(eye-vPosition)-30.)/70.,0.,.4);gl_FragColor=vec4(mix(c,vec3(.07,.13,.19),fog),1.);}`;
function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);gl.useProgram(program);
const locations={};for(const name of ['model','viewProjection','color','glow','eye'])locations[name]=gl.getUniformLocation(program,name);
const positionLocation=gl.getAttribLocation(program,'position'),normalLocation=gl.getAttribLocation(program,'normal');
gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(.065,.12,.17,1);
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function transform(x,y,z,sx=1,sy=1,sz=1,ry=0,rx=0,rz=0){
  const c=Math.cos(ry),s=Math.sin(ry),cx=Math.cos(rx),ss=Math.sin(rx),cz=Math.cos(rz),zs=Math.sin(rz);
  const translation=identity();translation[12]=x;translation[13]=y;translation[14]=z;
  const yaw=new Float32Array([c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]);
  const pitch=new Float32Array([1,0,0,0,0,cx,ss,0,0,-ss,cx,0,0,0,0,1]);
  const roll=new Float32Array([cz,zs,0,0,-zs,cz,0,0,0,0,1,0,0,0,0,1]);
  const scale=identity();scale[0]=sx;scale[5]=sy;scale[10]=sz;
  return multiply(translation,multiply(yaw,multiply(pitch,multiply(roll,scale))));
}
const subtract=(a,b)=>a.map((v,i)=>v-b[i]);
const normalize=a=>{const d=Math.hypot(...a);return a.map(v=>v/(d||1));};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
function lookAt(eye,target){const z=normalize(subtract(eye,target)),x=normalize(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
function perspective(aspect){const f=1/Math.tan(.64/2),near=.1,far=150;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);}
function mesh(vertices,normals){const buffers=[vertices,normals].map(data=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return b;});return {buffers,count:vertices.length/3};}
const shapes={};
{
  const vertices=[],normals=[];
  const faces=[[[1,0,0],[[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5],[.5,-.5,.5]]],[[-1,0,0],[[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]]],[[0,1,0],[[-.5,.5,-.5],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5]]],[[0,-1,0],[[-.5,-.5,.5],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5]]],[[0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]],[[0,0,-1],[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]]];
  for(const [normal,points] of faces)for(const i of [0,1,2,0,2,3]){vertices.push(...points[i]);normals.push(...normal);}
  shapes.box=mesh(vertices,normals);
}
function sphereMesh(segments=24,rings=16){
  const vertices=[],normals=[];
  const point=(i,j)=>{const latitude=i/rings*Math.PI,longitude=j/segments*Math.PI*2;return [Math.sin(latitude)*Math.cos(longitude),Math.cos(latitude),Math.sin(latitude)*Math.sin(longitude)];};
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
    const points=[point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1)];
    for(const k of [0,2,1,0,3,2]){vertices.push(...points[k]);normals.push(...points[k]);}
  }
  return mesh(vertices,normals);
}
shapes.sphere=sphereMesh();shapes.globe=sphereMesh(64,40);
function cylinderMesh(top=1,segments=24){
  const vertices=[],normals=[];
  function tri(points,ns){for(let i=0;i<3;i++){vertices.push(...points[i]);normals.push(...ns[i]);}}
  for(let j=0;j<segments;j++){
    const a=j/segments*Math.PI*2,b=(j+1)/segments*Math.PI*2;
    const p=[Math.cos(a),-.5,Math.sin(a)],q=[Math.cos(b),-.5,Math.sin(b)],r=[Math.cos(b)*top,.5,Math.sin(b)*top],s=[Math.cos(a)*top,.5,Math.sin(a)*top];
    const na=normalize([Math.cos(a),1-top,Math.sin(a)]),nb=normalize([Math.cos(b),1-top,Math.sin(b)]);
    tri([p,r,q],[na,nb,nb]);tri([p,s,r],[na,na,nb]);tri([[0,.5,0],r,s],[[0,1,0],[0,1,0],[0,1,0]]);tri([[0,-.5,0],p,q],[[0,-1,0],[0,-1,0],[0,-1,0]]);
  }
  return mesh(vertices,normals);
}
shapes.cylinder=cylinderMesh();shapes.cone=cylinderMesh(0);
const colors=new Map();
function rgb(hex){if(colors.has(hex))return colors.get(hex);const v=parseInt(hex.slice(1),16),c=[(v>>16&255)/255,(v>>8&255)/255,(v&255)/255];colors.set(hex,c);return c;}
let lastShape;
function draw(shape,matrix,color,glow=0){
  const geometry=shapes[shape];
  if(lastShape!==shape){for(let i=0;i<2;i++){gl.bindBuffer(gl.ARRAY_BUFFER,geometry.buffers[i]);const location=i?normalLocation:positionLocation;gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,3,gl.FLOAT,false,0,0);}lastShape=shape;}
  gl.uniformMatrix4fv(locations.model,false,matrix);gl.uniform3fv(locations.color,rgb(color));gl.uniform1f(locations.glow,glow);gl.drawArrays(gl.TRIANGLES,0,geometry.count);
}
const staticObjects=[],colliders=[];
function object(shape,x,y,z,sx,sy,sz,color,ry=0,rx=0,rz=0,glow=0){
  staticObjects.push({shape,matrix:transform(x,y,z,sx,sy,sz,ry,rx,rz),color,glow,x,y,z,sx,sy,sz,ry,rx,rz});}
const box=(x,y,z,w,h,d,color,rotation=0,glow=0)=>object('box',x,y,z,w,h,d,color,rotation,0,0,glow);
const ball=(x,y,z,r,color)=>object('sphere',x,y,z,r,r,r,color);
function collider(x,z,w,d){colliders.push({x,z,w:w/2+.26,d:d/2+.26});}
const palette={floor:'#aab7af',wall:'#285061',trim:'#d8e4d5',teal:'#55cdb8',dark:'#183648',gold:'#eab67b'};
// The architecture is a roofless interior with lowered foreground walls.
box(0,-.55,0,30,1.05,22,'#1b3348');box(0,-.08,0,29.3,.12,21.3,palette.floor);
for(let x=-14;x<15;x+=2)for(let z=-10;z<11;z+=2)box(x,.005,z,1.97,.015,1.97,((x+z)%4===0)?'#a3b2ac':'#acbab1');
box(-9,.02,-2,10,.05,12,'#99b8ad');box(1.3,.02,-4.5,8.4,.05,7,'#9ba8b0');box(9,.02,-2,9,.05,13,'#3a6370');
box(0,.03,6.7,28,.06,2.6,'#536d73');
for(let x=-13;x<=13;x+=2)box(x,.07,6.7,.8,.03,.04,'#8cdcc5',0,.4);
box(0,1.6,-10.5,29.4,3.2,.25,palette.wall);collider(0,-10.5,29.4,.25);
box(-14.6,1.2,0,.25,2.4,21,palette.wall);box(14.6,.8,0,.25,1.6,21,palette.wall);
box(0,.24,10.5,29.4,.48,.25,'#416574');box(-14.6,2.45,0,.3,.12,21,'#8edac3');
for(const x of [-3.6,4.2]){box(x,1.3,-6.8,.22,2.6,7.2,palette.wall);box(x,.55,2.8,.22,1.1,4,palette.wall);collider(x,-6.8,.22,7.2);collider(x,2.8,.22,4);box(x,2.65,-6.8,.27,.1,7.2,'#b1ded1');}
// Windows, mullions and mountains visible through the space room.
for(let x=-12;x<14;x+=4){
  box(x,1.9,-10.31,3.35,2.0,.04,'#739dad',0,.2);
  box(x,1.9,-10.24,.06,2.05,.08,'#bed4cc');box(x,1.9,-10.23,3.4,.05,.07,'#bed4cc');
}
for(let i=0;i<12;i++){object('cone',-23+i*4,2.3+(i%3),-23-(i%2)*3,4+i%3,8+i%4,4,'#487582');}
// Office desks, terminal screens and task lamps.
function desk(x,z,rotation=0){
  box(x,.9,z,2.3,.17,1.15,'#eadbc0',rotation);box(x,.45,z,1.8,.8,.78,'#254758',rotation);collider(x,z,2.3,1.2);
  box(x,1.38,z-.29,1.05,.72,.09,'#163142',rotation);box(x,1.39,z-.225,.92,.58,.02,'#559aa4',rotation,.5);
  for(let i=0;i<4;i++)box(x-.26+i*.16,1.39,z-.205,.06,.19+i*.055,.015,'#a2e7d3',rotation,.8);
  box(x,.997,z+.2,.75,.04,.27,'#526676',rotation);
  object('cylinder',x+.8,1.07,z+.2,.1,.25,.1,'#e0a276');
}
function chair(x,z){
  object('cylinder',x,.1,z,.38,.1,.38,'#22384a');object('cylinder',x,.32,z,.055,.45,.055,'#a1b9bd');
  box(x,.58,z,.65,.16,.65,'#417888');box(x,.99,z+.28,.64,.72,.15,'#417888');
}
desk(-11,-7);desk(-7.5,-7);chair(-11,-5.85);chair(-7.5,-5.85);
box(-10,.8,-.8,3.7,.19,2.1,'#e8ddbf');collider(-10,-.8,3.7,2.1);
box(-10,.9,-.8,2.9,.025,1.6,'#427f88');
for(let i=0;i<8;i++)box(-11.1+i*.31,.93,-.9+Math.sin(i)*.35,.22,.03,.18,'#88c9ab');
chair(-10,1.2);chair(-12.3,-.8);
// Office bookcase, sofa, plants, shelves.
box(-13.8,1.15,-2.5,.65,2.3,3.2,'#355967');
for(let j=0;j<3;j++)for(let k=0;k<7;k++)box(-13.39,.4+j*.65,-3.7+k*.37,.2,.42,.19,['#e9b77a','#6fc5b2','#8db4c8'][k%3]);
box(-8,.4,3.5,3.5,.8,1,'#497b79');box(-8,.93,3.86,3.5,.8,.27,'#497b79');collider(-8,3.5,3.5,1);
for(let i=0;i<3;i++)box(-9.1+i*1.1,.87,3.43,1,.1,.75,'#73a69c');
function plant(x,z){
  object('cylinder',x,.32,z,.33,.6,.33,'#d0bca0');
  for(let i=0;i<5;i++)object('sphere',x+Math.sin(i*2)*.24,.8+i*.12,z+Math.cos(i*2)*.2,.18,.46,.14,i%2?'#5d9d79':'#3a806b',i,0,.4);
}
for(const [x,z] of [[-13,-9],[-5,-9],[-5,3.8],[3,-9],[13,-9],[13,4],[-13,8],[13,8]])plant(x,z);
// Engineering room and its spacecraft assembly bench.
desk(.1,-8.7);chair(.1,-7.4);
box(.1,.72,-3.2,4.4,.18,2.4,'#c6c3af');box(.1,.35,-3.2,3.8,.6,1.9,'#314e61');collider(.1,-3.2,4.4,2.4);
for(let i=0;i<4;i++){box(2.9,.37,-6.8+i*.78,.65,.7,.65,'#688897');box(2.9,.76,-6.8+i*.78,.5,.07,.5,'#e8b67b');}
box(.1,1.85,-5,4.5,.5,.24,'#1e4055');box(.1,1.85,-4.85,4,.29,.03,'#93ddcb',0,.6);
// Central globe pedestal and orbital mission consoles.
object('cylinder',9,.2,-3.2,2.1,.4,2.1,'#203e52');object('cylinder',9,.45,-3.2,1.7,.16,1.7,'#658a96');object('cylinder',9,.58,-3.2,1.48,.08,1.48,'#65e0cf',0,0,0,.8);collider(9,-3.2,3.7,3.7);
desk(6.2,-8.7);desk(10.3,-8.7);chair(6.2,-7.5);chair(10.3,-7.5);
box(12.7,1.5,-5.8,.9,3,1.2,'#1b3448');for(let i=0;i<7;i++)box(12.72,.35+i*.37,-5.18,.72,.07,.03,i%3?'#54cebe':'#f1ba79',0,.7);
// Mission room border lights and landing model.
for(let z=-8;z<=3;z+=2)box(4.8,.09,z,.06,.04,.8,'#75ead2',0,.8);
for(let x=6;x<13;x+=2)box(x,.09,4,.8,.04,.06,'#75ead2',0,.8);
object('cylinder',8,.15,2,1.5,.3,1.5,'#24485b');collider(8,2,2.8,2.8);
const roomLabels=[{name:'BRIEFING OFFICE',x:-9,y:.12,z:5,color:'#b7e5d6'},{name:'ENGINEERING',x:.1,y:.12,z:2,color:'#eac99d'},{name:'SPACE ROOM',x:9,y:.12,z:5,color:'#a2d9e9'}];
const crew=[{name:'Ayla',role:'Mission director',x:-7.4,z:-.5,color:'#5ccbb7'},{name:'Zara',role:'Spacecraft engineer',x:.1,z:-.7,color:'#efa86e'},{name:'Hamza',role:'Flight director',x:10.6,z:1.8,color:'#80a9dc'}];
const player={x:-.8,z:7.1,angle:Math.PI,y:0};
let cameraAngle=.55,cameraDistance=30,cameraTarget=[0,0,0],eye=[0,0,0],viewProjection=identity(),follow=false;
let target=null,waypoints=[],nearby=-1,keys=new Set(),moving=false,clock=0,last=performance.now(),frame;
const panel=document.querySelector('#panel'),content=document.querySelector('#panel-content');
const chapters=[{title:'Before the rain',target:'river bend',place:'Swat Valley',story:'Heavy rain is approaching Swat. The response team needs observations of the river bend before the next storm.',water:1.2,goal:12},{title:'The roads home',target:'riverside roads',place:'Swat Valley',story:'The flood is receding. Map the riverside roads so the recovery team can plan its next survey.',water:.7,goal:14},{title:'A shared sky',target:'coastal watershed',place:'Partner coastal watershed',story:'A coastal response team asks for help. Apply what Swat taught you to a new watershed.',water:1.6,goal:15}];
const initial=()=>({version:1,chapter:0,stage:0,allocation:110,config:{radar:false,power:false,radio:false,shield:false},trust:70,turn:0,battery:14,stored:0,science:0,priority:0,points:[],fault:'battery',checks:{},flightLog:[]});
let state=initial(),hasSave=false,menuOpen=true,hasStarted=false,hudHidden=false;
const startScreen=document.querySelector('#start-screen');
const menuIntro=document.querySelector('#menu-intro');
const skipIntro=document.querySelector('#skip-intro');
const startContent=startScreen.querySelector('.start-content');
const startButton=document.querySelector('#start-game');
let introTimer, introState='idle';

function revealStartMenu(){
  if(introState!=='playing')return;
  clearTimeout(introTimer);
  introState='menu';
  menuIntro.pause();
  const restoreFocus=document.activeElement===skipIntro;
  skipIntro.hidden=true;
  startContent.inert=false;
  startScreen.classList.remove('intro-playing');
  if(restoreFocus)startButton.focus({preventScroll:true});
}

function showFinalFrame(){
  if(menuIntro.readyState===0){
    menuIntro.addEventListener('loadedmetadata',showFinalFrame,{once:true});
    return;
  }
  if(Number.isFinite(menuIntro.duration)&&menuIntro.duration>0)
    menuIntro.currentTime=Math.max(0,menuIntro.duration-1);
}

function finishIntroEarly(){
  if(introState!=='playing')return;
  introState='holding';
  menuIntro.pause();
  showFinalFrame();
  if(menuIntro.readyState>0&&Math.abs(menuIntro.currentTime-(menuIntro.duration-1))<.05)
    revealHeldMenu();
}

function revealHeldMenu(){
  if(introState==='holding'){
    introState='playing';
    revealStartMenu();
  }
}

function skipOpening(){
  if(introState!=='playing')return;
  showFinalFrame();
  revealStartMenu();
}

function prepareStartScreen(){
  if(introState!=='idle')return;
  menuIntro.muted=true;
  const useStill=reduced||new URLSearchParams(location.search).has('menu');
  if(useStill){
    introState='menu';
    menuIntro.src=menuIntro.dataset.src;
    menuIntro.preload='auto';
    menuIntro.load();
    showFinalFrame();
    return;
  }
  introState='playing';
  startContent.inert=true;
  startScreen.classList.add('intro-playing');
  skipIntro.hidden=false;
  skipIntro.focus({preventScroll:true});
  menuIntro.src=menuIntro.dataset.src;
  introTimer=setTimeout(skipOpening,14000);
  menuIntro.play().catch(()=>{
    if(introState==='playing')skipOpening();
  });
}

menuIntro.addEventListener('loadeddata',()=>{
  if(introState==='playing')startScreen.classList.add('has-intro-image');
});
menuIntro.addEventListener('seeked',()=>{
  startScreen.classList.add('has-intro-image');
  revealHeldMenu();
});
menuIntro.addEventListener('timeupdate',()=>{
  if(introState==='playing'&&menuIntro.duration>0&&menuIntro.currentTime>=menuIntro.duration-1)
    finishIntroEarly();
});
menuIntro.addEventListener('ended',finishIntroEarly);
menuIntro.addEventListener('error',()=>{
  startScreen.classList.remove('has-intro-image');
  if(introState==='playing')revealStartMenu();
});
skipIntro.addEventListener('click',skipOpening);
try{const saved=JSON.parse(localStorage.getItem('protect-home-3d'));if(saved?.version===1&&Number.isInteger(saved.chapter)&&saved.chapter>=0&&saved.chapter<3&&saved.config&&Number.isInteger(saved.stage)&&saved.stage>=0&&saved.stage<=5){state=saved;hasSave=true;}}catch{}
function save(){try{localStorage.setItem('protect-home-3d',JSON.stringify(state));hasSave=true;}catch{toast('Progress could not be saved on this browser.');}}
function openMenu(){
  if(launchStart!==null)return;
  keys.clear();waypoints=[];target=null;menuOpen=true;window.speechSynthesis?.cancel();
  document.body.classList.add('menu-open');
  document.querySelector('#start-game').innerHTML=(hasStarted?'Resume mission':hasSave?'Continue mission':'Start game')+' <span aria-hidden="true">→</span>';
  document.querySelector('#reset').hidden=!hasSave&&!hasStarted;
  document.querySelector('#save-summary').textContent=hasSave?'Chapter '+(state.chapter+1)+' · '+chapter().title+' · Saved on this device':'Your mission begins at the briefing office.';
  if(!startScreen.open)startScreen.showModal();
  prepareStartScreen();
}
function enterGame(){menuOpen=false;hasStarted=true;startScreen.close();document.body.classList.remove('menu-open');canvas.focus();save();}
const chapter=()=>chapters[state.chapter];
const budget=()=>state.allocation??(110+(state.chapter*5)+(state.trust>=80?5:0));
const cost=()=>78+Number(state.config.radar)*16+Number(state.config.power)*12+Number(state.config.radio)*9+Number(state.config.shield)*8;
const mass=()=>9+Number(state.config.radar)*3+Number(state.config.power)*2+Number(state.config.radio)+Number(state.config.shield)*2;
const batteryMax=()=>state.config.power?22:14;
let audioEnabled=false,audioContext,toastTimer,launchStart=null;
function beep(frequency=600){
  if(!audioEnabled)return;
  try{audioContext??=new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.value=frequency;g.gain.setValueAtTime(.045,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.15);o.connect(g);g.connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.16);}catch{}
}
function toast(message){const element=document.querySelector('#toast');element.textContent=message;element.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.remove('visible'),3000);}
function updateHUD(){
  const goals=['Meet Ayla in the briefing office.','Explore the flood model with Ayla.','Build your satellite with Zara.','Complete flight checks with Hamza.','Check in with Hamza and operate the satellite.','Review the mission with Ayla.'];
  document.querySelector('#chapter').textContent='CHAPTER '+String(state.chapter+1).padStart(2,'0')+' / 03';
  document.querySelector('#mission-title').textContent=chapter().title;
  document.querySelector('#objective').textContent=goals[state.stage];
  document.querySelector('#progress-fill').style.width=(8+state.stage*18)+'%';
  document.querySelector('#status').textContent='Agency trust '+state.trust+' · '+(state.stage<4?budget()+' credits allocated':state.science+' / '+chapter().goal+' science delivered');
  document.querySelectorAll('[data-destination]').forEach((el,i)=>el.classList.toggle('active',i===activeCrew()));
}
function activeCrew(){return state.stage<=1||state.stage===5?0:state.stage===2?1:2;}
function narrate(){if(!audioEnabled||!window.speechSynthesis)return;window.speechSynthesis.cancel();const line=content.querySelector('.lead')?.textContent;if(line){const speech=new SpeechSynthesisUtterance(line);speech.rate=.94;window.speechSynthesis.speak(speech);}}
function show(html){keys.clear();waypoints=[];panel.dataset.scene='room';content.innerHTML=html;if(!panel.open)panel.showModal();beep();narrate();}
function speaker(index){const p=crew[index],hair=index===2?'#dce5df':'#273843';return '<div class="speaker"><div class="portrait" style="background:'+p.color+'"><svg viewBox="0 0 80 80" aria-hidden="true"><path d="M10 85Q10 56 40 56Q70 56 70 85" fill="'+p.color+'"/><ellipse cx="40" cy="35" rx="24" ry="28" fill="'+hair+'"/><rect x="34" y="49" width="12" height="15" rx="4" fill="#c78c6d"/><ellipse cx="40" cy="35" rx="20" ry="23" fill="#dba580"/><path d="M19 31Q16 4 41 8Q66 6 62 29L48 18Q37 29 19 31" fill="'+hair+'"/><g class="portrait-eyes" fill="#26394b"><ellipse cx="32" cy="35" rx="2.5" ry="3.2"/><ellipse cx="49" cy="35" rx="2.5" ry="3.2"/></g><path d="M35 47Q41 52 47 46" fill="none" stroke="#8d5348" stroke-width="2" stroke-linecap="round"/><path d="M40 37L38 42H42" fill="none" stroke="#ba7f61" stroke-width="1.5"/><path d="M32 61L40 68L48 61" fill="none" stroke="#e6f3df" stroke-width="3"/></svg></div><span class="eyebrow">'+p.role+'</span><h2>'+p.name+'</h2></div>';}
function button(action,label,primary=false,disabled=false){return '<button data-action="'+action+'" class="'+(primary?'primary':'')+'" '+(disabled?'disabled':'')+'>'+label+'</button>';}
function stats(entries){return '<div class="stats">'+entries.map(([name,value])=>'<div><small>'+name+'</small><strong>'+value+'</strong></div>').join('')+'</div>';}
const cubeSatPdf = 'https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf';
function cubeSatSource(page, section) {
  return '<a class="cubesat-link" href="'+cubeSatPdf+'#page='+page+'" target="_blank" rel="noopener noreferrer">NASA CubeSat 101 · '+section+' (PDF)</a>';
}

function missionPlan() {
  return '<details class="cubesat-guide"><summary>Mission plan</summary>'
    +'<p><strong>Target:</strong> '+chapter().target+'. <strong>Success:</strong> deliver '+chapter().goal+' science points to the response team.</p>'
    +'<p><strong>Flight plan:</strong> Select an imaging payload and reserve power for imaging and radio. Verify the design on the ground, deploy from the dispenser, check in with the ground station, then collect and send observations.</p>'
    +'<p>Keep a reserve for unexpected problems. A mission plan helps the team agree on what the satellite must do and how they will tell if it worked.</p>'
    +cubeSatSource(19,'Concept development and funding')+'</details>';
}

const flightChecks = [
  ['fit', 'Dispenser fit', 'Check stowed fit'],
  ['power', 'Power and payload', 'Run bench test'],
  ['link', 'Ground station', 'Test command and reply']
];
const observationEnergy = () => state.config.radar ? 5 : 3;
const solarCharge = () => state.config.power ? 4 : 2;
const downlinkLimit = () => state.config.radio ? 3 : 2;
const dispenserLimit = [36,24,12];
function stowedDimensions() {
  return [34+Number(state.config.radar)*2,22+Number(state.config.power)*2+Number(state.config.shield),11+Number(state.config.radio)];
}
const fitsDispenser = () => stowedDimensions().every((dimension,i) => dimension<=dispenserLimit[i]);
const launchLimitsMet = () => cost()<=budget() && mass()<=16 && fitsDispenser();
const readyToLaunch = () => launchLimitsMet() && flightChecks.every(([id]) => state.checks?.[id]===true);

function designStatus() {
  if(cost()>budget()) return 'Over budget. Remove an upgrade.';
  if(mass()>16) return 'Too heavy for the launcher. Remove an upgrade.';
  if(!fitsDispenser()) return 'Too wide for the dispenser. Choose the larger array or the protected frame.';
  return 'Your design fits the budget, mass and dispenser limits.';
}

function stowedFit() {
  return '<p><strong>Stowed size:</strong> '+stowedDimensions().join(' × ')+' cm. <strong>Game dispenser:</strong> '+dispenserLimit.join(' × ')+' cm (length × width × height).</p>';
}

function launchReview() {
  const checks = flightChecks.map(([id, name, label]) => {
    const passed = state.checks?.[id] === true;
    const status = passed ? 'Passed' : 'Pending';
    return '<li><div><strong>'+name+' · '+status+'</strong>'
      +(passed ? '<small>'+flightCheckResult(id)+'</small>' : '')+'</div>'
      +button('check-'+id,label,false,passed)+'</li>';
  }).join('');
  show(speaker(2)
    +'<h3>Flight readiness review</h3><p class="lead">Check that our design fits the launch slot, runs on battery power, and can talk to Earth.</p>'
    +stats([['Mass',mass()+' / 16 kg'],['Spent',cost()+' / '+budget()+' cr'],['Battery',batteryMax()]])
    +stowedFit()+'<p class="'+(launchLimitsMet()?'':'warning')+'">'+designStatus()+'</p>'
    +'<ul class="flight-checks" aria-label="Prelaunch checks">'+checks+'</ul>'
    +'<div class="row">'+button('launch','Launch the mission',true,!readyToLaunch())
    +button('revise','Revise spacecraft')+'</div>'
    +'<details class="cubesat-guide"><summary>How a real launch review works</summary>'
    +'<p>A dispenser secures the CubeSat to the rocket and releases it in orbit. Deployable panels and antennas stay folded inside it during launch.</p>'
    +'<p>On real missions, the launch provider sets the interface requirements. Teams verify dimensions and mass, test the mission sequence with the ground station, and test the spacecraft against launch vibration and its expected environment. They also check applicable radio and imaging permissions.</p>'
    +'<p>The checks here simulate fit, a battery-powered imaging cycle, and a command and reply. The game uses its own launch slot and limits.</p>'
    +cubeSatSource(33,'Readiness and dispenser integration')+' · '+cubeSatSource(67,'Flight testing')+' · '
    +cubeSatSource(51,'Licensing')+'</details>');
}

function flightCheckResult(id) {
  if(id==='fit') return 'Panels and antenna stowed. The spacecraft fits the slot and is within the mass limit.';
  if(id==='power') return 'One test observation drew '+observationEnergy()+' energy. Battery fell from '+batteryMax()+' to '+(batteryMax()-observationEnergy())+' in simulated shadow.';
  return 'Ground station sent a command and received a reply. This radio can send '+downlinkLimit()+' observations per contact.';
}

function runFlightCheck(id) {
  if(state.stage!==3 || state.checks?.[id] || !flightChecks.some(([key])=>key===id)) return;
  if(id==='fit' && !launchLimitsMet()){
    toast(designStatus());
    return;
  }
  state.checks ??= {};
  state.checks[id] = true;
  save();
  launchReview();
  const nextControl = content.querySelector('.flight-checks button:not(:disabled), [data-action="launch"]:not(:disabled)');
  nextControl?.focus({preventScroll:true});
}

function interact(index=nearby){
  if(menuOpen||index<0||launchStart!==null)return;
  if(index===0){
    if(state.stage===5){report();return;}
    show(speaker(0)+'<p class="lead">'+chapter().story+'</p><p>We can help by delivering useful satellite observations. First, look at the valley: where will rising river water spread?</p>'+stats([['Destination',chapter().place],['Science goal',chapter().goal],['Budget',budget()+' cr']])+'<div class="row">'+button('map','Explore the flood model',true)+button('close','Back to the office')+'</div>'+missionPlan());
  }else if(index===1){
    if(state.stage<2){show(speaker(1)+'<p class="lead">Ayla has your mission brief. Talk to her before we select the spacecraft parts.</p>'+button('close','I’ll find Ayla',true));return;}
    if(state.stage>=4){show(speaker(1)+'<p>Your satellite is already in orbit. Hamza has the live operations panel.</p>'+button('close','Back',true));return;}
    workshop();
  }else{
    if(state.stage===4){operations();return;}
    if(state.stage===5){report();return;}
    if(state.stage!==3){show(speaker(2)+'<p class="lead">The launch crew is waiting for the spacecraft design. Meet Ayla, then Zara, to prepare it.</p>'+button('close','Back',true));return;}
    launchReview();
  }
}
const cubeSatGuide = `
  <details class="cubesat-guide">
    <summary>CubeSat 101 · Why these parts matter</summary>
    <p>A CubeSat is a small satellite built in standard sizes. One unit (1U) is roughly 10 cm on each side.</p>
    <dl>
      <dt>Payload</dt>
      <dd>The payload does the mission's main job. Here, an optical camera or radar gathers observations of the valley.</dd>
      <dt>Power</dt>
      <dd>Solar panels generate electricity in sunlight, and batteries store energy. In this mission, the larger array upgrade also gives you a bigger battery.</dd>
      <dt>Communication</dt>
      <dd>A ground station uses a radio and antenna to exchange signals with the satellite. In this mission, the fast radio sends more observations on each contact pass.</dd>
      <dt>Data and pointing</dt>
      <dd>The onboard computer stores observations until a downlink. An attitude control system helps point the instrument toward its target and solar panels toward the Sun. In this game, pointing is automatic.</dd>
      <dt>Launch limits</dt>
      <dd>Satellites must meet their launcher's size and mass limits. A larger solar array or a protected frame takes up more space in this mission's dispenser.</dd>
    </dl>
    <p class="cubesat-source">Credits, dimensions, mass limits and energy figures are simplified for gameplay.</p>
    <a href="https://science.nasa.gov/wp-content/uploads/2023/06/nasa_csli_cubesat_101_508.pdf#page=12" target="_blank" rel="noopener noreferrer">Source: NASA CubeSat 101 (PDF, opens in a new tab)</a>
  </details>`;

function workshop(){
  const choices=[['radar','Radar instrument','Cloud-capable · +16 cr · +3 kg'],['power','Larger solar array','22 battery / +4 charge · +12 cr · +2 kg'],['radio','Fast radio','Sends 3 observations · +9 cr · +1 kg'],['shield','Protected frame','Reduces fault losses · +8 cr · +2 kg']];
  const partButtons = choices.map(([id,name,hint])=>
    '<button data-part="'+id+'" class="'+(state.config[id]?'chosen':'')+'" aria-pressed="'+state.config[id]+'">'
    +'<strong>'+(state.config[id]?'✓ ':'＋ ')+name+'</strong><small>'+hint+'</small></button>'
  ).join('');
  const valid = launchLimitsMet();
  show(speaker(1)+'<p class="lead">Build for the mission. Check what you’ll need to collect data and send it home.</p>'
    +'<div class="parts">'+partButtons+'</div>'
    +stats([['Budget used',cost()+' / '+budget()],['Launch mass',mass()+' / 16 kg'],['Battery',batteryMax()]])
    +stowedFit()
    +'<p class="hint">The base build includes an optical camera, solar panels, battery, radio and frame. Radar improves cloudy observations at a higher energy cost. Hamza tests the approved build before launch.</p>'
    +'<p role="status" class="'+(valid?'':'warning')+'">'+designStatus()+'</p>'
    +'<div class="row">'+button('design','Approve design',true,!valid)+button('close','Inspect the spacecraft')+'</div>'+cubeSatGuide);
}
// Connected inundation on a synthetic elevation grid. Flow follows steepest descent.
const N=70,M=42,dem=[],channel=[],drains=[];
function river(y){return 31+8*Math.sin(y*.13)+3*Math.cos(y*.33);}
for(let y=0;y<M;y++)for(let x=0;x<N;x++){const distance=Math.abs(x-river(y)),i=y*N+x;dem[i]=(M-y)*.045+Math.max(0,distance-1.1)*(.14+.025*Math.sin(x*.6+y*.3))+Math.max(0,distance-8)**1.3*.025;channel[i]=distance<1.35;}
function neighbors(i){const x=i%N,y=Math.floor(i/N),a=[];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){if(x+dx>=0&&x+dx<N&&y+dy>=0&&y+dy<M)a.push((y+dy)*N+x+dx);}return a;}
for(const i of dem.map((_,i)=>i).sort((a,b)=>dem[a]-dem[b])){let low=i;for(const j of neighbors(i))if(dem[j]<dem[low])low=j;drains[i]=channel[i]||(low!==i&&drains[low]);}
let water=chapter().water,mapLayer='depth',floodPlaying=false;
function wetCells(level){
  const wet=channel.slice(),queue=[];wet.forEach((v,i)=>{if(v)queue.push(i);});
  for(let i=0;i<queue.length;i++)for(const j of neighbors(queue[i]))if(!wet[j]&&dem[j]<(M-Math.floor(j/N))*.045+level){wet[j]=true;queue.push(j);}
  return wet;
}
function mapView(){
  if(state.stage===0){state.stage=1;save();updateHUD();}
  show(speaker(0)+'<p class="lead">Watch the river reach the low ground.</p><div class="map-controls">'+['depth','elevation','drainage'].map(layer=>'<button data-layer="'+layer+'" class="'+(mapLayer===layer?'selected':'')+'">'+({depth:'Flood depth',elevation:'Elevation',drainage:'Watershed'})[layer]+'</button>').join('')+'</div><canvas id="dem" width="640" height="300" aria-label="Synthetic river valley elevation and connected flood model"></canvas><label for="water">River rise <output id="water-label">'+water.toFixed(2)+'</output> model units</label><input id="water" type="range" min="0" max="2" step=".05" value="'+water+'"><div class="readout" id="map-readout"></div><p class="hint">Water spreads from the river into connected low cells. The elevation grid is synthetic, inspired by Swat. This is an educational model, not a real flood forecast.</p><div class="row">'+button('water','Animate rising water')+button('brief','Confirm target: '+chapter().target,true)+'</div>');drawDEM();
}
function drawDEM(){
  const c=document.querySelector('#dem');if(!c)return;const ctx=c.getContext('2d'),wet=wetCells(water);
  ctx.fillStyle='#0e2839';ctx.fillRect(0,0,640,300);
  const project=(x,y,h)=>[24+x*7.2+y*2.1,140+y*3.5-h*10];
  const flooded=wet.reduce((count,isWet,i)=>count+Number(isWet&&!channel[i]),0);
  for(let y=0;y<M-1;y++)for(let x=0;x<N-1;x++){
    const i=y*N+x,h=dem[i],flood=wet[i],surface=(M-y)*.045+water;
    let color='hsl('+Math.max(36,150-h*11)+' 30% '+(29+h*4)+ '%)';
    if(mapLayer==='drainage'&&drains[i])color='#69bda4';
    if(channel[i]||(mapLayer==='depth'&&flood))color=channel[i]?'#187da9':'hsl('+(185+Math.min(17,(surface-h)*13))+' 74% '+(60-Math.min(26,(surface-h)*17))+'%)';
    const points=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]].map(([a,b])=>{const elevation=dem[b*N+a];return project(a,b,mapLayer==='depth'&&flood?Math.max((M-b)*.045+water,elevation):elevation);});
    ctx.beginPath();points.forEach(([a,b],j)=>j?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=.5;ctx.stroke();
  }
  const [px,py]=project(river(22),22,(M-22)*.045+water);ctx.fillStyle='#ffcf87';ctx.beginPath();ctx.arc(px,py-9,5,0,Math.PI*2);ctx.fill();ctx.font='bold 13px system-ui';ctx.strokeStyle='#0d2636';ctx.lineWidth=4;ctx.strokeText('PRIORITY · '+chapter().target.toUpperCase(),px+12,py-6);ctx.fillText('PRIORITY · '+chapter().target.toUpperCase(),px+12,py-6);
  document.querySelector('#map-readout').textContent=(flooded/(N*M)*100).toFixed(1)+'% of model cells newly wet · '+(mapLayer==='drainage'?'Mint cells drain into the channel.':'Cyan shows connected flooding. Darker blue is deeper.');
  document.querySelector('#water-label').textContent=water.toFixed(2);
}
let tableLevel=-1;
function terrainTable(){
  if(Math.abs(water-tableLevel)>.09){
    tableLevel=water;const wet=wetCells(water),groups=[{v:[],n:[]},{v:[],n:[]},{v:[],n:[]}];
    for(let y=0;y<M-1;y++)for(let x=0;x<N-1;x++){
      const i=y*N+x,flood=wet[i],group=groups[flood?2:dem[i]>4?1:0];
      const points=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]].map(([a,b])=>[-11.4+a*.04,.92+(flood?Math.max(dem[b*N+a],(M-b)*.045+water):dem[b*N+a])*.065,-1.64+b*.04]);
      for(const indexes of [[0,2,1],[0,3,2]]){const n=normalize(cross(subtract(points[indexes[1]],points[indexes[0]]),subtract(points[indexes[2]],points[indexes[0]])));for(const k of indexes){group.v.push(...points[k]);group.n.push(...n);}}
    }
    groups.forEach((g,i)=>{if(shapes['terrain'+i])shapes['terrain'+i].buffers.forEach(b=>gl.deleteBuffer(b));shapes['terrain'+i]=mesh(g.v,g.n);});lastShape=null;
  }
  ['#83af86','#c1c59b','#57bad2'].forEach((c,i)=>draw('terrain'+i,identity(),c,i===2?.2:0));
}
const commissioningSteps = [
  ['Confirm dispenser release', 'The rocket has reached orbit. Confirm the dispenser released the CubeSat before deploying its antenna.'],
  ['Receive beacon', 'The antenna is extended. Listen for a beacon so the ground station can identify the satellite.'],
  ['Verify telemetry', 'The beacon is received. Check the battery reading and confirm that the satellite responds before starting the imaging mission.']
];
const commissioningPending = () => Number.isInteger(state.commission) && state.commission < commissioningSteps.length;

function commissioning() {
  const [label, instruction] = commissioningSteps[state.commission];
  show(speaker(2)+'<h3>First contact · '+(state.commission+1)+' / '+commissioningSteps.length+'</h3>'
    +'<p class="lead">'+instruction+'</p>'
    +stats([['Battery',state.battery+' / '+batteryMax()],['Link',state.commission===2?'Beacon heard':'Waiting']])
    +button('commission-'+state.commission,label,true)
    +'<p>'+cubeSatSource(37,'Early mission operations')+'</p>');
  panel.dataset.scene='orbit';
}

const passes = [
  { cloud:true,  sun:true,  contact:false },
  { cloud:false, sun:true,  contact:false },
  { cloud:false, sun:true,  contact:true },
  { cloud:true,  sun:false, contact:false },
  { cloud:false, sun:true,  contact:false, fault:true },
  { cloud:false, sun:true,  contact:true },
  { cloud:false, sun:false, contact:false },
  { cloud:false, sun:true,  contact:true }
];
const flightActions = {observe:'Observe',send:'Downlink',rest:'Rest'};
function batteryAfterPass(pass, action, spent) {
  const faultLoss = pass.fault && action!=='rest' ? (state.config.shield?1:4) : 0;
  const afterUse = Math.max(0,state.battery-spent-faultLoss);
  return Math.min(batteryMax(),afterUse+(pass.sun?solarCharge():0));
}

function passPlan() {
  return '<details class="cubesat-guide"><summary>Plan the remaining passes</summary>'
    +'<p>During eclipse, Earth blocks sunlight and the spacecraft runs on stored energy. Downlink is available only when the ground station can contact the satellite.</p>'
    +'<ol class="pass-plan" start="'+(state.turn+1)+'">'+passes.slice(state.turn).map(pass=>
      '<li>'+(pass.sun?'Sunlight':'Eclipse')+' · '+(pass.cloud?'Cloudy target':'Clear target')+' · '+(pass.contact?'Ground contact':'No contact')+'</li>'
    ).join('')+'</ol><p>The pass schedule and energy figures are set for this simulation.</p>'
    +cubeSatSource(37,'Tracking and mission operations')+'</details>';
}

function operations(){
  if(commissioningPending()){commissioning();return;}
  const pass = passes[state.turn];
  const canObserve = state.points.length<3 && state.battery>=observationEnergy();
  const canSend = pass.contact && state.points.length>0 && state.battery>=2;
  let line = pass.contact ? 'The ground station is in range. Send stored observations while you have contact.'
    : pass.cloud ? 'Clouds cover the target. Radar can still collect detailed observations.'
    : 'Clear skies over the target. Consider collecting an observation.';
  if(pass.fault) line = 'Battery fault. Rest to avoid extra drain, or continue with the loss shown below.';
  const forecast = [
    canObserve && 'Observe '+batteryAfterPass(pass,'observe',observationEnergy()),
    canSend && 'Downlink '+batteryAfterPass(pass,'send',2),
    'Rest '+batteryAfterPass(pass,'rest',0)
  ].filter(Boolean).join(' · ');
  show(speaker(2)+'<span class="eyebrow">ORBITAL PASS '+(state.turn+1)+' / '+passes.length+'</span>'
    +'<p class="lead">'+line+'</p>'
    +stats([['Battery',state.battery+' / '+batteryMax()],['Stored observations',state.points.length+' / 3'],['Delivered science',state.science+' / '+chapter().goal]])
    +'<p><strong>Power:</strong> '+(pass.sun?'Sunlight restores '+solarCharge()+' energy after the action.':'Eclipse: no solar charge this pass.')
    +' <strong>Radio:</strong> '+(pass.contact?'Up to '+downlinkLimit()+' observations per downlink.':'Outside ground station range.')+'</p>'
    +'<p>Imaging costs '+observationEnergy()+' energy. Downlink costs 2. <strong>Battery after this pass:</strong> '+forecast+'.</p>'
    +'<div class="row">'+button('observe','Observe '+chapter().target,true,!canObserve)
    +button('send','Transmit to Earth',false,!canSend)+button('rest',pass.sun?'Rest and recharge':'Rest in eclipse')+'</div>'
    +'<p class="hint">'+(state.last||'Only transmitted data can help the response team.')+'</p>'+passPlan());
  panel.dataset.scene='orbit';
}
function takeTurn(action){
  if(state.stage!==4||state.turn>=passes.length||commissioningPending())return;
  const pass = passes[state.turn];
  let spent = 0, delivered = 0;
  if(action==='observe'){
    spent=observationEnergy();
    if(state.points.length>=3||state.battery<spent)return;
    state.points.push(state.config.radar?5:pass.cloud?1:4);
    state.last='Observation collected. It is stored onboard until transmission.';
    beep(770);
  }else if(action==='send'){
    spent=2;
    if(!pass.contact||!state.points.length||state.battery<spent)return;
    delivered=state.points.splice(0,downlinkLimit()).reduce((a,b)=>a+b,0);
    state.science+=delivered;
    state.last=delivered+' science points reached the response team.';
    beep(990);
  }else if(action==='rest'){
    state.last=pass.sun?'Instrument rested while the battery recharged.':'Instrument rested in eclipse.';
  }else return;
  if(pass.fault&&action!=='rest')state.last+=' Battery fault added '+(state.config.shield?1:4)+' to the energy cost.';
  state.battery=batteryAfterPass(pass,action,spent);
  state.flightLog ??= [];
  state.flightLog.push({pass:state.turn+1,action,battery:state.battery,delivered});
  state.turn++;
  if(state.turn===passes.length){state.stage=5;state.outcome=state.science>=chapter().goal?'success':state.science>=chapter().goal*.5?'partial':'failure';state.trust=Math.max(0,Math.min(100,state.trust+({success:10,partial:-5,failure:-15})[state.outcome]));report();}
  else operations();save();updateHUD();
}
function flightRecord() {
  const entries = state.flightLog || [];
  const rows = entries.map(entry=>'<tr><td>'+Number(entry.pass)+'</td><td>'+flightActions[entry.action]+'</td><td>'+Number(entry.battery)+'</td><td>'+Number(entry.delivered)+'</td></tr>').join('');
  return '<details class="cubesat-guide"><summary>Flight log and mission closeout</summary>'
    +(rows ? '<table class="flight-log"><caption>Recorded passes</caption><thead><tr><th scope="col">Pass</th><th scope="col">Action</th><th scope="col">Battery left</th><th scope="col">Science sent</th></tr></thead><tbody>'+rows+'</tbody></table>' : '')
    +'<p>Compare battery readings after imaging, downlink, and rest. The science column shows how much data reached the response team on each recorded pass.</p>'
    +'<p>Real mission teams also plan end-of-life steps to reduce orbital debris. This simulation ends after the eighth pass.</p>'
    +cubeSatSource(37,'Mission operations')+' · '+cubeSatSource(62,'Orbital debris planning')+'</details>';
}
function report(){
  const effective=Math.min(100,Math.round(state.science/chapter().goal*100)),efficiency=Math.round(effective*(.65+.20*Math.max(0,budget()-cost())/budget()+.15*state.battery/batteryMax()));
  show(speaker(0)+'<h2>'+({success:'A clearer picture for home',partial:'Useful data, with gaps',failure:'The mission needs another attempt'}[state.outcome]||'Mission report')+'</h2>'+stats([['Effectiveness',effective+'%'],['Efficiency',efficiency+'%'],['Agency trust',state.trust]])+'<p>'+state.science+' science points reached the team. '+state.points.length+' observations remained onboard. '+(state.outcome==='success'?'Your partners can plan the next survey with greater confidence.':state.outcome==='partial'?'The next mission continues, but uncertainty remains.':'The agency loses trust. Review your power and transmission plan before retrying.')+'</p><p class="hint">Clouds reduce optical quality. Full storage prevents observing. Radio windows limit transmission. Budget and battery reserves influence efficiency.</p><div class="row">'+button(state.outcome==='failure'?'retry':'next',state.outcome==='failure'?'Revise spacecraft':state.chapter===2?'Complete campaign':'Continue the story',true)+button('close','Back to the centre')+'</div>'+flightRecord());
}
function transition(action){
  if(action==='close'){panel.close();return;}
  if(action==='map'){mapView();return;}
  if(action==='water'){floodPlaying=!floodPlaying;if(floodPlaying)water=0;return;}
  if(action==='brief'){state.stage=Math.max(2,state.stage);save();updateHUD();panel.close();toast('Priority set. Meet Zara in engineering.');return;}
  if(action==='design'){if(![2,3].includes(state.stage)||!launchLimitsMet())return;state.stage=3;save();updateHUD();panel.close();toast('Design approved. Complete the flight checks with Hamza.');return;}
  if(action==='revise'&&state.stage===3){state.stage=2;save();updateHUD();panel.close();return;}
  if(action.startsWith('check-')){runFlightCheck(action.slice(6));return;}
  if(action==='launch'){
    if(state.stage!==3||!readyToLaunch())return;
    panel.close();state.allocation=budget();state.stage=4;state.turn=0;state.battery=batteryMax();state.points=[];state.science=0;state.last='';
    state.commission=0;state.flightLog=[];
    save();updateHUD();launchStart=clock;document.querySelector('#cinematic').hidden=false;beep(250);return;
  }
  if(action==='commission-'+state.commission&&state.stage===4&&launchStart===null&&commissioningPending()){
    state.commission++;
    save();
    operations();
    return;
  }
  if(['observe','send','rest'].includes(action)){takeTurn(action);return;}
  if(action==='retry'){state.stage=2;state.points=[];state.turn=0;state.science=0;state.checks={};state.flightLog=[];save();updateHUD();panel.close();return;}
  if(action==='next'){
    if(state.chapter===2){show(speaker(0)+'<h2>You brought the mission home.</h2><p class="lead">Three chapters. One shared sky.</p><p>Your decisions connected spacecraft engineering to useful observations on Earth. Your agency finishes with '+state.trust+' trust.</p>'+button('close','Explore your mission centre',true));return;}
    state.chapter++;state.allocation=110+state.chapter*5+(state.trust>=80?5:0);state.stage=0;state.turn=0;state.points=[];state.science=0;state.checks={};state.flightLog=[];water=chapter().water;save();updateHUD();panel.close();toast('New chapter unlocked. Ayla has your next mission.');return;
  }
}
content.onclick=event=>{
  const element=event.target.closest('button');
  if(!element)return;
  if(element.dataset.part){
    state.config[element.dataset.part]=!state.config[element.dataset.part];
    state.checks={};
    const guideOpen=content.querySelector('.cubesat-guide').open;
    save();
    workshop();
    content.querySelector('.cubesat-guide').open=guideOpen;
    content.querySelector('[data-part="'+element.dataset.part+'"]').focus({preventScroll:true});
    return;
  }
  if(element.dataset.layer){mapLayer=element.dataset.layer;mapView();return;}
  if(element.dataset.action)transition(element.dataset.action);
};
content.oninput=event=>{if(event.target.id==='water'){water=Number(event.target.value);floodPlaying=false;drawDEM();}};
document.querySelector('.close').onclick=()=>panel.close();
panel.addEventListener('close',()=>{floodPlaying=false;window.speechSynthesis?.cancel();canvas.focus();});
document.querySelector('#skip').onclick=()=>{launchStart=null;document.querySelector('#cinematic').hidden=true;operations();};
document.querySelector('#sound').onclick=event=>{audioEnabled=!audioEnabled;event.target.textContent=audioEnabled?'Sound on':'Sound off';event.target.setAttribute('aria-pressed',String(audioEnabled));if(!audioEnabled)window.speechSynthesis?.cancel();else if(panel.open)narrate();beep();};
document.querySelector('#help').onclick=()=>show('<span class="eyebrow">WELCOME, COMMANDER</span><h2>Your mission centre</h2><p class="lead">Walk through the centre to meet your crew.</p><p><b>WASD / arrows</b> move your character. <b>E</b> talks to the nearby crew member. <b>Q / R</b> rotate the camera. Scroll or use + / − to zoom. Hold Shift to run. The room buttons walk your character to a station.</p><p>Follow the gold diamond. Ayla briefs you and shows the flood model. Zara helps build your spacecraft. Hamza launches it and guides orbital operations.</p><p>Flood terrain and orbit schedules are simplified educational models.</p>'+button('close','Let’s explore',true));
document.querySelector('#reset').onclick=()=>show('<h2>Start a new campaign?</h2><p>This replaces the saved progress for this 3D edition on this device.</p><div class="row"><button id="confirm-reset" class="primary">Start again</button>'+button('close','Keep playing')+'</div>');
content.addEventListener('click',event=>{if(event.target.id==='confirm-reset'){state=initial();save();updateHUD();panel.close();player.x=-.8;player.z=7.1;player.angle=Math.PI;cameraAngle=.55;cameraDistance=30;follow=false;document.querySelector('#overview').textContent='Follow player';water=chapter().water;enterGame();}});
document.querySelector('#start-game').onclick=enterGame;
document.querySelector('#menu').onclick=openMenu;
document.querySelector('#start-help').onclick=()=>document.querySelector('#help').onclick();
startScreen.addEventListener('cancel',event=>{
  event.preventDefault();
  if(introState==='playing')skipOpening();
  else if(hasStarted)enterGame();
});
function toggleHUD(){hudHidden=!hudHidden;document.body.classList.toggle('hud-hidden',hudHidden);const b=document.querySelector('#hud-toggle');b.textContent=hudHidden?'Show HUD':'Hide HUD';b.setAttribute('aria-pressed',String(hudHidden));}
document.querySelector('#hud-toggle').onclick=toggleHUD;
function blocked(x,z){return x<-14.1||x>14.1||z<-9.95||z>10||colliders.some(c=>Math.abs(x-c.x)<c.w&&Math.abs(z-c.z)<c.d);}
function move(dx,dz){if(!blocked(player.x+dx,player.z))player.x+=dx;if(!blocked(player.x,player.z+dz))player.z+=dz;}
function route(index){
  const p=crew[index],step=.45,toCell=(x,z)=>[Math.round(x/step),Math.round(z/step)],key=(x,z)=>x+','+z;
  const start=toCell(player.x,player.z),goal=toCell(p.x,p.z+1.15),queue=[start],came=new Map([[key(...start),null]]);
  let end=null;
  for(let n=0;n<queue.length&&n<7000;n++){
    const cell=queue[n];
    if(Math.hypot(cell[0]-goal[0],cell[1]-goal[1])<1.1){end=cell;break;}
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const next=[cell[0]+dx,cell[1]+dz],id=key(...next);
      if(!came.has(id)&&!blocked(next[0]*step,next[1]*step)){came.set(id,cell);queue.push(next);}
    }
  }
  waypoints=[];
  if(end){while(came.get(key(...end))){waypoints.unshift([end[0]*step,end[1]*step]);end=came.get(key(...end));}target=index;}
  else toast('Walk a little into the open walkway, then try again.');
  canvas.focus();
}
document.querySelectorAll('[data-destination]').forEach(button=>button.onclick=()=>route(Number(button.dataset.destination)));
document.querySelector('#interact').onclick=()=>interact();
document.querySelector('#zoom-in').onclick=()=>cameraDistance=Math.max(16,cameraDistance-3);
document.querySelector('#zoom-out').onclick=()=>cameraDistance=Math.min(48,cameraDistance+3);
document.querySelector('#overview').onclick=()=>{follow=!follow;document.querySelector('#overview').textContent=follow?'View whole centre':'Follow player';};
canvas.addEventListener('wheel',event=>{event.preventDefault();cameraDistance=Math.max(16,Math.min(48,cameraDistance+event.deltaY*.02));},{passive:false});
const keyMap={w:'up',s:'down',a:'left',d:'right',arrowup:'up',arrowdown:'down',arrowleft:'left',arrowright:'right'};
window.addEventListener('keydown',event=>{if(panel.open||menuOpen||event.ctrlKey||event.altKey||event.metaKey)return;const key=event.key.toLowerCase();if(key==='escape'){event.preventDefault();openMenu();return;}if(key==='h'&&!event.repeat){toggleHUD();return;}if(keyMap[key]){event.preventDefault();keys.add(keyMap[key]);waypoints=[];}if(key==='q'||key==='r'||key==='shift'){keys.add(key);event.preventDefault();}if(key==='e'&&!event.repeat)interact();});
window.addEventListener('keyup',event=>keys.delete(keyMap[event.key.toLowerCase()]||event.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
document.querySelectorAll('[data-dir]').forEach(button=>{button.onpointerdown=event=>{button.setPointerCapture(event.pointerId);waypoints=[];keys.add(button.dataset.dir);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>keys.delete(button.dataset.dir);});
// Rounded 3D character assembled around shoulder and hip pivots.
function character(x,z,color,angle,walk,t,name){
  const root=transform(x,0,z,1,1,1,angle),bob=reduced?0:walk?Math.abs(Math.sin(t*11))*.055:Math.sin(t*2.2)*.018;
  const local=(shape,x,y,z,sx,sy,sz,c,rx=0,rz=0)=>draw(shape,multiply(root,transform(x,y+bob,z,sx,sy,sz,0,rx,rz)),c);
  local('cylinder',0,.025,0,.4,.015,.27,'#69847f');
  const swing=walk&&!reduced?Math.sin(t*11)*.54:0;
  for(const side of [-1,1]){
    const hip=multiply(root,transform(side*.14,.63+bob,0,1,1,1,0,side*swing));
    draw('box',multiply(hip,transform(0,-.23,0,.2,.45,.23)),'#233a51');
    draw('sphere',multiply(hip,transform(0,-.46,.075,.14,.1,.2)),'#163041');
    const shoulder=multiply(root,transform(side*.31,1.16+bob,0,1,1,1,0,-side*swing*.8,side*.09));
    draw('sphere',multiply(shoulder,transform(0,-.12,0,.115,.25,.12)),color);
    draw('sphere',multiply(shoulder,transform(0,-.36,.025,.09,.10,.09)),'#cf987a');
  }
  local('sphere',0,.98,0,.3,.4,.21,color);
  local('box',0,.82,.17,.48,.08,.07,'#e2e7cf');
  local('box',-.12,1.09,.201,.1,.12,.025,'#e3f5dd');
  local('sphere',0,1.48,0,.255,.29,.24,'#d8a080');
  local('sphere',0,1.66,-.025,.27,.15,.25,name==='Hamza'?'#d7e3da':'#263644');
  if(name==='Ayla')local('sphere',0,1.49,-.20,.22,.29,.1,'#263644');
  for(const side of [-1,1])local('sphere',side*.09,1.5,.217,.027,.035,.023,'#213444');
  local('sphere',0,1.43,.25,.045,.045,.045,'#bd8069');
}
function spacecraft(x,y,z,t,large=false){
  const root=transform(x,y,z,1,1,1,t*.35),wing=state.config.power?1.4:1;
  draw('box',multiply(root,transform(0,0,0,.65,.7,.65)),state.config.shield?'#e2cba4':'#e8b66e');
  draw('cylinder',multiply(root,transform(0,0,.37,.18,.1,.18,0,Math.PI/2)),state.config.radar?'#d6e7dd':'#183c53');
  for(const side of [-1,1]){
    draw('box',multiply(root,transform(side*(.38+wing*.5),0,0,wing,.055,.64)),'#224f78');
    for(let i=0;i<5;i++)draw('box',multiply(root,transform(side*(.42+i*wing/5),.034,0,.018,.018,.63)),'#76bdce');
  }
}
// Sphere geometry is shaded in world space. Raised continent patches rotate with it.
const continents=[
  [[-168,65],[-132,70],[-106,71],[-80,60],[-60,49],[-80,25],[-98,18],[-123,40],[-147,57]],
  [[-81,11],[-65,10],[-48,1],[-35,-7],[-50,-29],[-69,-54],[-74,-35],[-80,-10]],
  [[-18,15],[-8,35],[13,37],[33,30],[43,12],[50,10],[35,-14],[29,-33],[18,-35],[8,-3],[-7,4]],
  [[-10,36],[-2,49],[19,70],[45,67],[73,73],[112,73],[147,65],[178,60],[144,42],[122,29],[108,6],[99,1],[89,22],[80,8],[71,20],[55,27],[44,12],[36,36],[21,39]],
  [[112,-22],[130,-12],[142,-12],[153,-27],[146,-39],[131,-34],[115,-35]],
  [[-54,60],[-23,71],[-26,82],[-58,83],[-71,72]]
];
function inside(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[c,d]=p[j];if(((b>y)!==(d>y))&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
const earthSurfaces=['#d9e7dd','#b9bc91','#70b499'].map(color=>({color,vertices:[],normals:[]}));
const earthPoint=(lat,lon)=>{const a=lat*Math.PI/180,b=lon*Math.PI/180;return [Math.cos(a)*Math.sin(b),Math.sin(a),Math.cos(a)*Math.cos(b)];};
for(let lat=-90;lat<90;lat+=2)for(let lon=-180;lon<180;lon+=2){
  if(lat<-68||continents.some(p=>inside(lon+1,lat+1,p))){
    const group=earthSurfaces[Math.abs(lat)>66?0:lat>12&&lat<35?1:2],points=[earthPoint(lat,lon),earthPoint(lat,lon+2),earthPoint(lat+2,lon+2),earthPoint(lat+2,lon)];
    for(const i of [0,1,2,0,2,3]){group.vertices.push(...points[i].map(v=>v*1.826));group.normals.push(...points[i]);}
  }
}
earthSurfaces.forEach((surface,i)=>{shapes['land'+i]=mesh(surface.vertices,surface.normals);});
function globe(t){
  const root=transform(9,3.25,-3.2,1,1,1,t*.08,.12);
  draw('globe',multiply(root,transform(0,0,0,1.82,1.82,1.82)),'#397b9b');
  earthSurfaces.forEach((surface,i)=>draw('land'+i,root,surface.color));
  for(let i=0;i<72;i++){
    const a=i/72*Math.PI*2,r=2.3;
    draw('sphere',transform(9+Math.cos(a)*r,3.25+Math.sin(a)*.8,-3.2+Math.sin(a)*r*.8,.026,.026,.026),'#7acac6',.6);
  }
  const orbit=t*.45;
  spacecraft(9+Math.cos(orbit)*2.3,3.25+Math.sin(orbit)*.8,-3.2+Math.sin(orbit)*2.3*.8,t);
}
function rocket(t){
  const rise=launchStart===null?0:Math.max(0,(clock-launchStart)-.8)**2*1.8;
  const x=8,z=2,y=1.8+rise;
  draw('cylinder',transform(x,y,z,.43,2.5,.43),'#e7dfc5');
  draw('cone',transform(x,y+1.67,z,.43,.9,.43),'#d7e4df');
  draw('cylinder',transform(x,y-.76,z,.445,.29,.445),'#e19470');
  draw('sphere',transform(x,y+.65,z+.42,.16,.18,.035),'#244f6c');
  for(let i=0;i<3;i++){const a=i/3*Math.PI*2;draw('box',transform(x+Math.sin(a)*.44,y-.95,z+Math.cos(a)*.44,.12,.8,.55,a),'#c98264');}
  if(launchStart!==null){
    draw('cone',transform(x,y-2.2,z,.3,1.8+(Math.sin(t*33)+1)*.2,.3,0,Math.PI),'#ffc773',1);
    for(let i=0;i<12;i++){const r=(clock-launchStart)*.35+i*.17;draw('sphere',transform(x+Math.sin(i*3.1)*r,.2+(i%3)*.12,z+Math.cos(i*3.1)*r,.35+r*.2,.17,.35+r*.2),'#c8c9bc');}
  }
}
function launchLandscape(){
  draw('box',transform(8,-.35,2,80,.5,80),'#547b6c');
  draw('cylinder',transform(8,-.02,2,4,.12,4),'#789195');
  draw('cylinder',transform(8,.08,2,2.7,.12,2.7),'#d7cbb1');
  draw('box',transform(4,3.4,2,.35,7,.35),'#71848b');draw('box',transform(4,3.4,.4,.35,7,.35),'#71848b');
  for(let i=0;i<7;i++){draw('box',transform(4,.4+i,1.2,.4,.18,2.2),'#e6b882');draw('box',transform(4,.9+i,1.2,.13,1.8,.13,0,Math.PI/4),'#b8c4bf');}
  draw('box',transform(5.6,5.7,1.2,3.2,.2,1.1),'#cbd6c8');
  for(let i=0;i<10;i++)draw('cone',transform(-22+i*7,2,-24-i%3*3,7,12+i%4*2,7),'#3c6370');
  for(let i=0;i<7;i++)draw('sphere',transform(-8+i*5,13+i%3,-18,.9+i%3,.35,1.1),'#b9d6d6');
}
const labelRoot=document.querySelector('#npc-labels');
const labels=crew.map(p=>{const el=document.createElement('div');el.className='label';labelRoot.append(el);return el;});
const roomEls=roomLabels.map(p=>{const el=document.createElement('div');el.className='label room-label';el.innerHTML='<strong style="font-size:10px;letter-spacing:.08em;color:'+p.color+'">'+p.name+'</strong>';labelRoot.append(el);return el;});
function projected(x,y,z){
  const v=[x,y,z,1],r=[0,0,0,0];for(let row=0;row<4;row++)for(let k=0;k<4;k++)r[row]+=viewProjection[k*4+row]*v[k];
  return [(r[0]/r[3]*.5+.5)*innerWidth,(-r[1]/r[3]*.5+.5)*innerHeight,r[3]];
}
function placeLabel(el,x,y,z){const p=projected(x,y,z);el.style.left=p[0]+'px';el.style.top=p[1]+'px';el.hidden=p[2]<0||p[0]<0||p[0]>innerWidth||p[1]<80||p[1]>innerHeight-100;}
let lastActive=-1,stepSound=0,lastMapDraw=0;
function loop(now){
  const dt=Math.min(.04,(now-last)/1000);last=now;clock+=dt;
    if(!menuOpen&&!panel.open&&launchStart===null){
    if(keys.has('q'))cameraAngle-=dt*.8;if(keys.has('r'))cameraAngle+=dt*.8;
    let right=Number(keys.has('right'))-Number(keys.has('left')),forward=Number(keys.has('down'))-Number(keys.has('up'));
    let dx=right*Math.cos(cameraAngle)+forward*Math.sin(cameraAngle),dz=-right*Math.sin(cameraAngle)+forward*Math.cos(cameraAngle);
    if(waypoints.length){const p=waypoints[0];dx=p[0]-player.x;dz=p[1]-player.z;if(Math.hypot(dx,dz)<.12){waypoints.shift();if(!waypoints.length&&target!==null){const index=target;target=null;interact(index);}dx=dz=0;}}
    const length=Math.hypot(dx,dz);moving=length>.01;
    if(moving){const step=Math.min(waypoints.length?length:Infinity,dt*(keys.has('shift')?6:3.8));move(dx/length*step,dz/length*step);player.angle=Math.atan2(dx,dz);stepSound+=dt;if(stepSound>.3){beep(140);stepSound=0;}}
  }else moving=false;
  nearby=crew.findIndex(p=>Math.hypot(p.x-player.x,p.z-player.z)<2);
  const interactButton=document.querySelector('#interact');interactButton.disabled=nearby<0;const prompt=nearby<0?'Walk up to a crew member':'E · Talk to '+crew[nearby].name;if(interactButton.textContent!==prompt)interactButton.textContent=prompt;
  const room=player.z>5?'CENTRAL WALKWAY':player.x<-3.6?'BRIEFING OFFICE':player.x<4.2?'ENGINEERING':'SPACE ROOM';document.querySelector('#room-name').textContent=room;
  const dpr=Math.min(devicePixelRatio||1,1.5),w=Math.round(innerWidth*dpr),h=Math.round(innerHeight*dpr);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
  const orbitMode=panel.open&&panel.dataset.scene==='orbit';
  const goal=orbitMode?[11.8,3.25,-2]:follow?[player.x,0,player.z]:[0,.2,0];
  for(let i=0;i<3;i++)cameraTarget[i]+=(goal[i]-cameraTarget[i])*Math.min(1,dt*4);
  let distance=orbitMode?13:cameraDistance;
  if(innerWidth<750)distance*=1.25;
  if(launchStart!==null){cameraTarget[0]+=(8-cameraTarget[0])*dt*5;cameraTarget[1]+=(3+Math.max(0,clock-launchStart-.8)**2*1.5-cameraTarget[1])*dt*4;cameraTarget[2]+=(2-cameraTarget[2])*dt*5;distance=22;}
  eye=[cameraTarget[0]+Math.sin(cameraAngle)*distance*.66,cameraTarget[1]+distance*.76,cameraTarget[2]+Math.cos(cameraAngle)*distance*.66];
  viewProjection=multiply(perspective(w/h),lookAt(eye,cameraTarget));
  gl.clearColor(...(orbitMode?[.025,.05,.09,1]:launchStart!==null?[.15,.27,.35,1]:[.065,.12,.17,1]));
  gl.uniformMatrix4fv(locations.viewProjection,false,viewProjection);gl.uniform3fv(locations.eye,eye);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const time=reduced?0:clock;
  if(launchStart!==null){launchLandscape();rocket(time);}
  else if(orbitMode){
    for(let i=0;i<100;i++)draw('sphere',transform(9+Math.sin(i*14.5)*15,3+Math.cos(i*3.4)*12,-12-Math.sin(i*8)*4,.018+i%3*.012,.018+i%3*.012,.018+i%3*.012),'#bedfe3',.8);
    globe(time);
  }else{
    for(const o of staticObjects)draw(o.shape,o.matrix,o.color,o.glow);
    terrainTable();globe(time);spacecraft(.1,1.6+Math.sin(time*1.4)*.07,-3.2,time);rocket(time);
    crew.forEach((p,i)=>character(p.x,p.z,p.color,i===0?.5:i===1?0:-.7,false,time,p.name));character(player.x,player.z,'#f1c984',player.angle,moving,time,'You');
  }
  document.body.classList.toggle('cinema-mode',launchStart!==null||orbitMode);
  const active=activeCrew();
  if(active!==lastActive){crew.forEach((p,i)=>labels[i].innerHTML=(i===active?'<span class="diamond">◆</span>':'')+'<strong>'+p.name+'</strong><small>'+p.role+'</small>');lastActive=active;}
  crew.forEach((p,i)=>{labels[i].classList.toggle('nearby',i===nearby);placeLabel(labels[i],p.x,2.1,p.z);});roomLabels.forEach((p,i)=>placeLabel(roomEls[i],p.x,p.y,p.z));
  if(floodPlaying&&panel.open){water=Math.min(2,water+dt*.35);if(now-lastMapDraw>100){drawDEM();document.querySelector('#water').value=water;lastMapDraw=now;}if(water>=2)floodPlaying=false;}
  if(launchStart!==null&&clock-launchStart>(reduced?.5:5)){launchStart=null;document.querySelector('#cinematic').hidden=true;operations();}
  frame=requestAnimationFrame(loop);
}
updateHUD();openMenu();frame=requestAnimationFrame(loop);
// Exported scene data allows rebuilding the architecture in Blender without a browser dependency.
window.missionScene={objects:staticObjects.map(({matrix,...obj})=>obj),crew,chapters};
})();
