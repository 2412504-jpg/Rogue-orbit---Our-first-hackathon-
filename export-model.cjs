// Portable glTF 2.0 scene, generated from the same geometry used by the game.
const {draws}=require('./validate.cjs'),fs=require('node:fs'),path=require('node:path');
const gltf={asset:{version:'2.0',generator:'Protect Our Home original procedural scene'},scene:0,scenes:[{nodes:[]}],nodes:[],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[]};
const chunks=[],geometry=new Map(),materials=new Map(),meshes=new Map(),groups=new Map();let length=0;
function accessor(data){
 const b=Buffer.from(new Float32Array(data).buffer),view=gltf.bufferViews.length;
 gltf.bufferViews.push({buffer:0,byteOffset:length,byteLength:b.length,target:34962});chunks.push(b);length+=b.length;
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];data.forEach((v,i)=>{min[i%3]=Math.min(min[i%3],v);max[i%3]=Math.max(max[i%3],v);});
 return gltf.accessors.push({bufferView:view,componentType:5126,count:data.length/3,type:'VEC3',min,max})-1;
}
for(const d of draws){
 if(!geometry.has(d.vertices))geometry.set(d.vertices,{POSITION:accessor(d.vertices),NORMAL:accessor(d.normals)});
 const matKey=d.color.join(',');if(!materials.has(matKey)){materials.set(matKey,gltf.materials.length);gltf.materials.push({name:'Surface '+matKey,pbrMetallicRoughness:{baseColorFactor:[...d.color,1],metallicFactor:.12,roughnessFactor:.7},doubleSided:false});}
 const attributes=geometry.get(d.vertices),material=materials.get(matKey),meshKey=attributes.POSITION+':'+material;
 if(!meshes.has(meshKey)){meshes.set(meshKey,gltf.meshes.length);gltf.meshes.push({primitives:[{attributes,material}]});}
 if(!groups.has(d.group)){const id=gltf.nodes.length;groups.set(d.group,id);gltf.nodes.push({name:d.group,children:[]});gltf.scenes[0].nodes.push(id);}
 const id=gltf.nodes.length;gltf.nodes.push({name:d.group+'_'+id,mesh:meshes.get(meshKey),matrix:d.matrix});gltf.nodes[groups.get(d.group)].children.push(id);
}
gltf.buffers=[{byteLength:length}];
let json=Buffer.from(JSON.stringify(gltf));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);
const bin=Buffer.concat(chunks),header=Buffer.alloc(12),jh=Buffer.alloc(8),bh=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+json.length+bin.length,8);
jh.writeUInt32LE(json.length,0);jh.writeUInt32LE(0x4e4f534a,4);bh.writeUInt32LE(bin.length,0);bh.writeUInt32LE(0x004e4942,4);
const output=path.join(__dirname,'mission-centre.glb');fs.writeFileSync(output,Buffer.concat([header,jh,json,bh,bin]));
console.log('Exported',output,'with',gltf.nodes.length,'nodes and',gltf.meshes.length,'shared meshes.');
