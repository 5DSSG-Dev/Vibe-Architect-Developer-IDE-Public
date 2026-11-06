import type { Server } from 'node:http';

/** Bound local HTTP fixture ownership; closes even sockets left active by an interrupted request. */
export async function listenLoopback(server:Server, port = 0):Promise<void> {
 await new Promise<void>((resolve,reject)=>{
  const failed=(error:Error)=>{server.off('listening',ready);reject(error);};
  const ready=()=>{server.off('error',failed);resolve();};
  server.once('error',failed);server.once('listening',ready);server.listen(port,'127.0.0.1');
 });
}
export async function closeHttpServer(server:Server):Promise<void> {
 if(!server.listening){server.closeAllConnections();return;}
 await new Promise<void>((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Owned HTTP server failed to close within 5 seconds')),5000);
  server.close(error=>{clearTimeout(timer);if(error)reject(error);else resolve();});
  // close() first stops admission; then release active/idle keep-alive sockets.
  server.closeAllConnections();
 });
}
