const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(__dirname+path.sep)){res.writeHead(403);return res.end();}
 if(path.extname(file)==='.mp4'){
  fs.stat(file,(error,stat)=>{
   if(error||!stat.isFile()){res.writeHead(404);return res.end('Not found');}
   const size=stat.size;
   const headers={'Content-Type':'video/mp4','Accept-Ranges':'bytes','Cache-Control':'no-store'};
   let start=0,end=size-1;
   if(req.headers.range){
    const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(range&&(range[1]||range[2])){
     start=range[1]?Number(range[1]):Math.max(0,size-Number(range[2]));
     end=range[1]&&range[2]?Math.min(end,Number(range[2])):end;
    }
    if(!range||(!range[1]&&!range[2])||start>=size||start>end){
     res.writeHead(416,{'Content-Range':'bytes */'+size});return res.end();
    }
    headers['Content-Range']='bytes '+start+'-'+end+'/'+size;
   }
   headers['Content-Length']=end-start+1;
   res.writeHead(req.headers.range?206:200,headers);
   if(req.method==='HEAD')return res.end();
   const stream=fs.createReadStream(file,{start,end});
   stream.on('error',error=>res.destroy(error));
   res.on('close',()=>stream.destroy());
   stream.pipe(res);
  });
  return;
 }
 fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json'})[path.extname(file)]||'application/octet-stream');
 res.setHeader('Cache-Control','no-store');res.end(data);});
}).listen(4174,'127.0.0.1',()=>console.log('Mission Centre 3D: http://127.0.0.1:4174'));
