import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve('site');
const requested=process.argv.indexOf('--port'),port=requested<0?4194:Number(process.argv[requested+1]);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview port');
http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const path=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));if(!path.startsWith(root+sep))throw Error();const data=await readFile(path);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml'})[extname(path)]||'text/plain','Cache-Control':'no-store'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log('Learning Lab http://127.0.0.1:'+port));


