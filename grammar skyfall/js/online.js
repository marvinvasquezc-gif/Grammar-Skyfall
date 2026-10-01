(function(){
  const NET={socket:null,host:false,roomCode:null,connections:{},hostConn:null,connected:false,clientId:null};
  window.PSR_NET=NET;

  function endpoint(){
    if(location.protocol==='file:') return 'ws://localhost:3000/ws';
    const proto=location.protocol==='https:'?'wss':'ws';
    return `${proto}://${location.host}/ws`;
  }
  function safeSend(payload){
    try{if(NET.socket?.readyState===WebSocket.OPEN)NET.socket.send(JSON.stringify(payload));else return false;return true}catch(_){return false}
  }
  function makeWrapper(clientId){
    return {
      peer:clientId,
      open:true,
      send(msg){safeSend({type:'sendToClient',clientId,payload:msg})},
      close(){/* server owns the socket */}
    };
  }
  function setSocket(ws){
    NET.socket=ws;
    ws.addEventListener('message',ev=>{
      let data;try{data=JSON.parse(ev.data)}catch(_){return}
      if(data.type==='roomCreated'){
        NET.connected=true;NET.roomCode=data.code;window.PSR_GAME?.createRoomReady?.(data.code);return;
      }
      if(data.type==='joined'){
        NET.connected=true;NET.roomCode=data.code;NET.clientId=data.clientId;window.PSR_GAME?.joinRoomReady?.(data.code);return;
      }
      if(data.type==='joinRequest'&&NET.host){
        const conn=makeWrapper(data.clientId);NET.connections[data.clientId]=conn;
        window.PSR_GAME?.handleNetMessage?.({type:'joinRequest',name:data.name,clientId:data.clientId},conn);
        return;
      }
      if(data.type==='toHost'&&NET.host){
        const conn=NET.connections[data.clientId]||makeWrapper(data.clientId);NET.connections[data.clientId]=conn;
        window.PSR_GAME?.handleNetMessage?.(data.payload,conn);return;
      }
      if(data.type==='clientClosed'&&NET.host){
        const conn=NET.connections[data.clientId]||{peer:data.clientId};delete NET.connections[data.clientId];
        window.PSR_GAME?.onlinePlayerDisconnected?.(data.clientId);return;
      }
      if(data.type==='broadcast'&&!NET.host){window.PSR_GAME?.handleNetMessage?.(data.payload,null);return;}
      if(data.type==='serverMessage'&&!NET.host){window.PSR_GAME?.handleNetMessage?.(data.payload,NET.socket);return;}
      if(data.type==='roomFull'){NET.connected=false;window.PSR_GAME?.netError?.({message:'ROOM FULL'});return;}
      if(data.type==='hostClosed'){NET.connected=false;window.PSR_GAME?.netError?.({message:'The host closed the room.'});return;}
      if(data.type==='error'){NET.connected=false;window.PSR_GAME?.netError?.({message:data.error||'ONLINE ERROR'});return;}
    });
    ws.addEventListener('close',()=>{
      const wasConnected=NET.connected;NET.connected=false;
      if(wasConnected&&!NET.host)window.PSR_GAME?.netError?.({message:'Connection lost.'});
    });
    ws.addEventListener('error',()=>{
      window.PSR_GAME?.netError?.({message:'WebSocket connection error.'});
    });
  }

  NET.broadcast=msg=>{if(NET.host)safeSend({type:'broadcast',payload:msg})};
  NET.sendHost=msg=>{if(NET.host){window.PSR_GAME?.handleNetMessage?.(msg,null);return}safeSend({type:'toHost',payload:msg})};
  NET.sendTo=(clientId,msg)=>{if(NET.host)safeSend({type:'sendToClient',clientId,payload:msg})};
  NET.close=()=>{
    try{NET.socket?.close()}catch(_){}
    Object.assign(NET,{socket:null,host:false,roomCode:null,connections:{},hostConn:null,connected:false,clientId:null});
  };

  NET.create=(name,cb)=>{
    NET.close();NET.host=true;
    try{
      const ws=new WebSocket(endpoint());setSocket(ws);
      ws.addEventListener('open',()=>{safeSend({type:'createRoom'});NET._createCb=cb;NET._createName=name});
      ws.addEventListener('message',ev=>{
        let data;try{data=JSON.parse(ev.data)}catch(_){return}
        if(data.type==='roomCreated'&&NET._createCb){const fn=NET._createCb;NET._createCb=null;NET.connected=true;NET.roomCode=data.code;fn({ok:true,code:data.code,name});}
      });
    }catch(e){NET.host=false;cb({ok:false,error:e.message||'Could not open online server.'})}
  };

  NET.join=(code,name,cb)=>{
    NET.close();NET.host=false;
    try{
      const ws=new WebSocket(endpoint());setSocket(ws);
      ws.addEventListener('open',()=>{safeSend({type:'joinRoom',code:String(code||'').toUpperCase().trim(),name});NET._joinCb=cb;NET._joinName=name});
      ws.addEventListener('message',ev=>{
        let data;try{data=JSON.parse(ev.data)}catch(_){return}
        if(data.type==='joined'&&NET._joinCb){const fn=NET._joinCb;NET._joinCb=null;NET.connected=true;NET.roomCode=data.code;NET.clientId=data.clientId;fn({ok:true,code:data.code,name});}
      });
    }catch(e){cb({ok:false,error:e.message||'Could not connect to online server.'})}
  };
})();
