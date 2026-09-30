(function(){
  const NET={peer:null,host:false,roomCode:null,connections:{},hostConn:null,connected:false};
  window.PSR_NET=NET;
  NET.broadcast=msg=>Object.values(NET.connections).forEach(c=>{try{if(c.open)c.send(msg)}catch(_){}});
  NET.sendHost=msg=>{if(NET.host){window.PSR_GAME?.handleNetMessage?.(msg,null);return}try{if(NET.hostConn?.open)NET.hostConn.send(msg)}catch(_){}};
  function makeCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let out='';for(let i=0;i<6;i++)out+=chars[Math.floor(Math.random()*chars.length)];return out}
  NET.create=(name,cb)=>{
    if(!window.Peer){cb({ok:false,error:'PeerJS did not load. Online mode needs internet.'});return}
    const code=makeCode();
    try{
      NET.peer=new Peer('grammarskyfall-'+code.toLowerCase());NET.host=true;NET.roomCode=code;
      NET.peer.on('open',()=>{NET.connected=true;cb({ok:true,code,name})});
      NET.peer.on('connection',conn=>{
        conn.on('open',()=>{NET.connections[conn.peer]=conn;conn.send({type:'roomWelcome',roomCode:NET.roomCode});window.PSR_GAME?.onlinePlayerConnected?.(conn)});
        conn.on('data',data=>window.PSR_GAME?.handleNetMessage?.(data,conn));
        conn.on('close',()=>{delete NET.connections[conn.peer];window.PSR_GAME?.onlinePlayerDisconnected?.(conn.peer)});
      });
      NET.peer.on('error',err=>window.PSR_GAME?.netError?.(err));
    }catch(e){cb({ok:false,error:e.message})}
  };
  NET.join=(code,name,cb)=>{
    if(!window.Peer){cb({ok:false,error:'PeerJS did not load. Online mode needs internet.'});return}
    try{
      NET.peer=new Peer();NET.host=false;NET.roomCode=code.toUpperCase().trim();
      NET.peer.on('open',()=>{
        NET.hostConn=NET.peer.connect('grammarskyfall-'+NET.roomCode.toLowerCase(),{reliable:true});
        NET.hostConn.on('open',()=>{NET.connected=true;NET.hostConn.send({type:'joinRequest',name});cb({ok:true,code:NET.roomCode,name})});
        NET.hostConn.on('data',data=>window.PSR_GAME?.handleNetMessage?.(data,NET.hostConn));
        NET.hostConn.on('close',()=>{NET.connected=false;window.PSR_GAME?.netError?.({message:'The host closed the room.'})});
      });
      NET.peer.on('error',err=>cb({ok:false,error:err.message||'Could not connect to room.'}));
    }catch(e){cb({ok:false,error:e.message})}
  };
  NET.close=()=>{try{Object.values(NET.connections).forEach(c=>c.close());NET.hostConn?.close();NET.peer?.destroy()}catch(_){}Object.assign(NET,{peer:null,host:false,roomCode:null,connections:{},hostConn:null,connected:false})};
})();
