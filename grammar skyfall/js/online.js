(function(){
  const NET={
    peer:null,host:false,roomCode:null,connections:{},hostConn:null,
    connected:false,connecting:false,joinTimer:null,retryTimer:null,
    transport:'relay',ws:null,clientId:null
  };
  window.PSR_NET=NET;

  const safe=(fn,...args)=>{try{return fn?.(...args)}catch(_){return undefined}};
  const closeConn=c=>{try{c?.close?.()}catch(_) {}};
  const closeWs=ws=>{try{ws?.close?.()}catch(_) {}};
  function clearTimers(){
    if(NET.joinTimer){clearTimeout(NET.joinTimer);NET.joinTimer=null}
    if(NET.retryTimer){clearTimeout(NET.retryTimer);NET.retryTimer=null}
  }
  function cleanCode(v){return String(v||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6)}
  function makeCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s}
  function relayUrl(){
    if(window.PSR_CONFIG?.relayUrl)return String(window.PSR_CONFIG.relayUrl);
    const proto=location.protocol==='https:'?'wss:':'ws:';
    return `${proto}//${location.host}/ws`;
  }
  function report(message){
    safe(window.PSR_GAME?.netError,{message:String(message||'ONLINE CONNECTION ERROR')});
    safe(window.PSR_GAME?.netToast,String(message||'ONLINE CONNECTION ERROR'));
  }
  function openWs(){
    if(typeof WebSocket==='undefined'){report('YOUR BROWSER DOES NOT SUPPORT WEBSOCKETS.');return null}
    try{return new WebSocket(relayUrl())}catch(e){report('COULD NOT OPEN THE MULTIPLAYER SERVER CONNECTION.');return null}
  }
  function virtualHostConn(id){
    return {
      peer:String(id),open:true,
      send:data=>{if(NET.ws?.readyState===1)NET.ws.send(JSON.stringify({t:'toClient',to:String(id),data}))},
      close:()=>{if(NET.ws?.readyState===1)NET.ws.send(JSON.stringify({t:'kick',to:String(id)}))}
    }
  }
  function virtualClientConn(){
    return {peer:'host',open:true,send:data=>{if(NET.ws?.readyState===1)NET.ws.send(JSON.stringify({t:'fromClient',data}))},close:()=>closeWs(NET.ws)}
  }

  NET.broadcast=msg=>{
    if(NET.host&&NET.ws?.readyState===1){NET.ws.send(JSON.stringify({t:'broadcast',data:msg}));return}
    Object.values(NET.connections).forEach(conn=>{try{if(conn?.open)conn.send(msg)}catch(_){}})
  };
  NET.sendHost=msg=>{
    if(NET.host){safe(window.PSR_GAME?.handleNetMessage,msg,null);return}
    try{
      if(NET.hostConn?.open){NET.hostConn.send(msg);return}
      report('NOT CONNECTED TO THE HOST YET.');
    }catch(e){report(e?.message||'FAILED TO SEND TO HOST.')}
  };

  NET.create=(name,cb)=>{
    NET.close();
    const code=makeCode(),ws=openWs();
    if(!ws){safe(cb,{ok:false,error:'MULTIPLAYER SERVER NOT AVAILABLE.'});return}
    NET.ws=ws;NET.host=true;NET.roomCode=code;NET.connecting=true;
    let finished=false;
    const finish=r=>{if(finished)return;finished=true;safe(cb,r)};
    ws.onopen=()=>{
      try{ws.send(JSON.stringify({t:'create',room:code,name:String(name||'Player').slice(0,18)}));}
      catch(e){finish({ok:false,error:e.message});return}
      NET.joinTimer=setTimeout(()=>finish({ok:false,error:'MULTIPLAYER SERVER DID NOT CONFIRM THE ROOM.'}),8000);
    };
    ws.onmessage=ev=>{
      let msg;try{msg=JSON.parse(ev.data)}catch(_){return}
      if(msg.t==='created'){NET.connected=true;NET.connecting=false;clearTimers();finish({ok:true,code,name,transport:'relay'});return}
      if(msg.t==='peer-join'){
        const id=String(msg.id),conn=virtualHostConn(id);NET.connections[id]=conn;
        safe(window.PSR_GAME?.handleNetMessage,{type:'joinRequest',roomCode:NET.roomCode,name:String(msg.name||'Player'),clientId:id},conn);
        safe(window.PSR_GAME?.onlinePlayerConnected,conn);return
      }
      if(msg.t==='fromClient'){
        const conn=NET.connections[String(msg.from)]||virtualHostConn(msg.from);safe(window.PSR_GAME?.handleNetMessage,msg.data,conn);return
      }
      if(msg.t==='peer-left'){
        delete NET.connections[String(msg.id)];safe(window.PSR_GAME?.onlinePlayerDisconnected,String(msg.id));return
      }
      if(msg.t==='error'){finish({ok:false,error:String(msg.message||'ROOM ERROR')});return}
      if(msg.t==='host-left')report('THE MULTIPLAYER SERVER CLOSED THIS ROOM.');
    };
    ws.onerror=()=>{if(!finished)finish({ok:false,error:'MULTIPLAYER SERVER CONNECTION FAILED. CHECK THE SERVER URL.'});else report('MULTIPLAYER SERVER CONNECTION LOST.')};
    ws.onclose=()=>{NET.connected=false;clearTimers();if(!finished)finish({ok:false,error:'MULTIPLAYER SERVER CLOSED BEFORE ROOM CREATION.'})};
  };

  NET.join=(code,name,cb)=>{
    NET.close();code=cleanCode(code);
    if(code.length!==6){safe(cb,{ok:false,error:'ROOM CODE MUST HAVE 6 CHARACTERS.'});return}
    const ws=openWs();if(!ws){safe(cb,{ok:false,error:'MULTIPLAYER SERVER NOT AVAILABLE.'});return}
    NET.ws=ws;NET.host=false;NET.roomCode=code;NET.connecting=true;
    let finished=false;
    const finish=r=>{if(finished)return;finished=true;clearTimers();safe(cb,r)};
    ws.onopen=()=>{try{ws.send(JSON.stringify({t:'join',room:code,name:String(name||'Player').slice(0,18)}))}catch(e){finish({ok:false,error:e.message})}};
    ws.onmessage=ev=>{
      let msg;try{msg=JSON.parse(ev.data)}catch(_){return}
      if(msg.t==='joined'){NET.clientId=msg.clientId;NET.hostConn=virtualClientConn();return}
      if(msg.t==='fromHost'){
        if(msg.data?.type==='assigned'){NET.connected=true;NET.connecting=false;clearTimers();safe(window.PSR_GAME?.handleNetMessage,msg.data,NET.hostConn);finish({ok:true,code,name,transport:'relay'});return}
        safe(window.PSR_GAME?.handleNetMessage,msg.data,NET.hostConn);return
      }
      if(msg.t==='kicked'){finish({ok:false,error:'THE HOST REMOVED YOU FROM THE ROOM.'});return}
      if(msg.t==='host-left'){finish({ok:false,error:'THE HOST CLOSED THE ROOM.'});return}
      if(msg.t==='error'){finish({ok:false,error:String(msg.message||'COULD NOT JOIN THE ROOM.')});return}
    };
    ws.onerror=()=>{if(!finished)finish({ok:false,error:'MULTIPLAYER SERVER CONNECTION FAILED. CHECK THE SERVER URL.'});else report('MULTIPLAYER SERVER CONNECTION LOST.')};
    ws.onclose=()=>{NET.connected=false;clearTimers();if(!finished)finish({ok:false,error:'CONNECTION CLOSED BEFORE JOINING THE ROOM.'});else safe(window.PSR_GAME?.netError,{message:'THE MULTIPLAYER SERVER CONNECTION CLOSED.'})};
    NET.joinTimer=setTimeout(()=>{if(!finished)finish({ok:false,error:'JOIN TIMEOUT — MULTIPLAYER SERVER DID NOT RESPOND.'})},12000);
  };

  NET.close=()=>{
    clearTimers();
    try{Object.values(NET.connections).forEach(closeConn)}catch(_){}
    closeConn(NET.hostConn);closeWs(NET.ws);
    Object.assign(NET,{peer:null,host:false,roomCode:null,connections:{},hostConn:null,connected:false,connecting:false,joinTimer:null,retryTimer:null,transport:'relay',ws:null,clientId:null});
  };
})();
