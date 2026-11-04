// Optional standalone local preview. No app dependencies or live server changes.
import {createServer} from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,relative,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webp':'image/webp','.png':'image/png','.md':'text/plain; charset=utf-8'};
export function createPreviewServer(){
  return createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
      if(pathname==='/' || pathname==='/atlas'){res.writeHead(302,{Location:'/atlas/index.html'});res.end();return;}
      if(!pathname.startsWith('/atlas/')){res.writeHead(404);res.end('Not found');return;}
      const name=pathname.slice('/atlas/'.length)||'index.html';
      if(name.includes('..')||name.includes('\\')||name.includes('\0')){res.writeHead(403);res.end('Unavailable');return;}
      const file=await realpath(resolve(root,name));
      const rel=relative(root,file);
      if(rel==='..'||rel.startsWith('..'+sep)||resolve(root,rel)!==file){res.writeHead(403);res.end('Unavailable');return;}
      const bytes=await readFile(file);
      res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream'});
      res.end(req.method==='HEAD'?undefined:bytes);
    }catch(error){res.writeHead(error instanceof URIError?400:404);res.end('Not found');}
  });
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.argv[2]??3014);
  const server=createPreviewServer();
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
  server.listen(port,'127.0.0.1',()=>console.log(`Atlas preview: http://127.0.0.1:${port}/atlas/index.html`));
}
