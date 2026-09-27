const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);
const rooms = new Map();
const clients = new Map();

function cleanCode(v){ return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6); }
function safeName(v){ return String(v||'Player').replace(/[<>]/g,'').trim().slice(0,18) || 'Player'; }
function makeId(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4); }
function send(ws,data){ try{ if(ws && ws.readyState===1) ws.send(JSON.stringify(data)); }catch(_){} }
function roomBroadcast(room,data,except){ for(const ws of room.players.values()) if(ws!==except) send(ws,data); }
function roomSize(room){ return room.players.size + 1; }
function destroyRoom(roomCode,reason='host-left'){
  const room=rooms.get(roomCode); if(!room) return;
  for(const ws of room.players.values()){ send(ws,{t:reason}); try{ws.close()}catch(_){} clients.delete(ws); }
  try{room.host.close()}catch(_){} clients.delete(room.host);
  rooms.delete(roomCode);
}
function leaveClient(ws){
  const meta=clients.get(ws); if(!meta) return;
  clients.delete(ws);
  if(meta.role==='host'){
    destroyRoom(meta.room,'host-left');
    return;
  }
  const room=rooms.get(meta.room); if(!room) return;
  room.players.delete(meta.clientId);
  send(room.host,{t:'peer-left',id:meta.clientId});
}

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/health'){
    res.writeHead(200,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
    return res.end(JSON.stringify({ok:true,service:'grammar-skyfall-multiplayer',rooms:rooms.size}));
  }
  const requested=url.pathname==='/'?'/index.html':url.pathname;
  const file=path.resolve(ROOT,'.'+requested);
  if(!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file,(err,st)=>{
    if(err || !st.isFile()){ res.writeHead(404); return res.end('Not found'); }
    const ext=path.extname(file).toLowerCase();
    const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.mp3':'audio/mpeg','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[ext] || 'application/octet-stream';
    res.writeHead(200,{'content-type':mime,'cache-control':'no-cache'});
    fs.createReadStream(file).pipe(res);
  });
});

const wss=new WebSocketServer({server,path:'/ws',maxPayload:2*1024*1024});
wss.on('connection',ws=>{
  clients.set(ws,{role:'unknown',room:null,clientId:null});

  ws.on('message',raw=>{
    let msg; try{ msg=JSON.parse(raw.toString()); }catch(_){ return; }
    const meta=clients.get(ws); if(!meta) return;

    if(msg.t==='create'){
      const code=cleanCode(msg.room);
      if(code.length!==6) return send(ws,{t:'error',message:'INVALID ROOM CODE'});
      if(rooms.has(code)) return send(ws,{t:'error',message:'ROOM CODE BUSY'});
      const room={host:ws,players:new Map(),createdAt:Date.now()};
      rooms.set(code,room); meta.role='host'; meta.room=code;
      return send(ws,{t:'created',room,players:1});
    }

    if(msg.t==='join'){
      const code=cleanCode(msg.room), room=rooms.get(code);
      if(!room) return send(ws,{t:'error',message:'ROOM NOT FOUND'});
      if(roomSize(room)>=6) return send(ws,{t:'error',message:'ROOM FULL'});
      const clientId=makeId();
      room.players.set(clientId,ws);
      meta.role='client'; meta.room=code; meta.clientId=clientId;
      send(ws,{t:'joined',room,clientId});
      send(room.host,{t:'peer-join',id:clientId,name:safeName(msg.name)});
      return;
    }

    if(msg.t==='fromClient' && meta.role==='client'){
      const room=rooms.get(meta.room);
      if(room) send(room.host,{t:'fromClient',from:meta.clientId,data:msg.data});
      return;
    }
    if(msg.t==='toClient' && meta.role==='host'){
      const room=rooms.get(meta.room), target=room?.players.get(String(msg.to));
      if(target) send(target,{t:'fromHost',data:msg.data});
      return;
    }
    if(msg.t==='broadcast' && meta.role==='host'){
      const room=rooms.get(meta.room);
      if(room) roomBroadcast(room,{t:'fromHost',data:msg.data});
      return;
    }
    if(msg.t==='kick' && meta.role==='host'){
      const room=rooms.get(meta.room), target=room?.players.get(String(msg.to));
      if(target){ send(target,{t:'kicked'}); try{target.close()}catch(_){} room.players.delete(String(msg.to)); clients.delete(target); }
      return;
    }
  });

  ws.on('close',()=>leaveClient(ws));
  ws.on('error',()=>{});
});

server.listen(PORT,()=>console.log(`GRAMMAR SKYFALL online server listening on port ${PORT}`));
