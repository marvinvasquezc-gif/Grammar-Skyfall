(function(){
  const Q=window.PSR_QUESTIONS||{};
  const C=['#ff4e5f','#198eff','#36d879','#f1cf45','#9b5cff','#8a8f98'];
  const LABEL=['RED','BLUE','GREEN','YELLOW','PURPLE','GRAY'];
  const TOKEN=['P1','P2','P3','P4','P5','P6'];
  const $=id=>document.getElementById(id);
  const screen=$('screen'),overlay=$('overlay'),toastEl=$('toast');

  const BOARD_COORDS=[
    [0,0],[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[0,7],[0,8],[0,9],[0,10],
    [1,10],[2,10],[3,10],[4,10],[5,10],[6,10],[7,10],[8,10],[9,10],
    [10,10],[10,9],[10,8],[10,7],[10,6],[10,5],[10,4],[10,3],[10,2],[10,1],[10,0],
    [9,0],[8,0],[7,0],[6,0],[5,0],[4,0],[3,0],[2,0],[1,0]
  ];
  const tiles=Array.from({length:40},(_,i)=>{
    if(i===0)return {type:'start',label:'START',special:'start'};
    if(i===39)return {type:'finish',label:'SKYFALL',special:'finish'};
    const pattern=['routine','question','toxic','routine','question','routine','toxic','question'];
    const type=pattern[(i-1)%pattern.length];
    return {type,label:type==='routine'?'ROUTINE':type==='question'?'QUESTION':'TOXIC'};
  });

  let state={};
  let timers=new Set();
  const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn()},ms);timers.add(id);return id};
  const clearTimers=()=>{timers.forEach(clearTimeout);timers.clear()};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const jsArg=s=>esc(JSON.stringify(String(s)));
  const shuffle=a=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x};
  const living=()=>state.players.filter(p=>p.alive&&p.connected!==false);
  const getPlayer=id=>state.players.find(p=>p.id===id);
  const currentPlayer=()=>getPlayer(state.current);

  function reset(){clearTimers();state={
    phase:'home',online:false,host:false,roomCode:null,myNetId:null,myName:'',players:[],current:0,round:1,turnStage:'roll',roll:0,
    farm:null,mini:null,finishCandidates:[],vote:null,sudden:null,winner:null,draw:false,lastBannerKey:'',localUnlocked:false,scoreOpen:false,skyTimers:{},_miniTimer:null,_moveFx:null,_miniTransitioning:false
  };applyTheme(null)}
  reset();

  function applyTheme(p,force){
    const root=document.documentElement;
    if(force==='sky'){root.style.setProperty('--turnColor','#4e218e');return}
    if(force==='end'){root.style.setProperty('--turnColor',state.winner?.color||'#f1cd45');return}
    root.style.setProperty('--turnColor',p?.color||'#f1cd45');
  }

  function updateHud(){
    $('hudRoom').textContent=state.roomCode||'ONLINE';
    $('hudRound').textContent=(state.phase==='home'||state.phase==='lobby'||state.phase==='localSetup')?'—':state.round;
    $('hudAlive').textContent=state.players.length?living().length:'—';
  }

  function render(){
    updateHud();
    PSR_AUDIO.syncMusicForPhase?.(state.phase);
    const topbar=document.querySelector('.topbar');
    if(topbar)topbar.classList.remove('home-hidden');
    if(state.phase==='home')renderHome();
    else if(state.phase==='lobby')renderLobby();
    else if(state.phase==='localSetup')renderLocalSetup();
    else if(state.phase==='board')renderBoard();
    else if(state.phase==='mini')renderMini();
    else if(state.phase==='suddenVote')renderVote();
    else if(state.phase==='finalReady')renderFinalReady();
    else if(state.phase==='sudden')renderSkyfall();
    else if(state.phase==='end')renderEnd();
  }

  function showCountdown(cb,label='GET READY'){
    const layer=$('countdown'),num=$('countdownNum'),sub=layer.querySelector('.countdown-sub');
    sub.textContent=label;layer.classList.remove('hidden');let n=3;
    const play=()=>{num.textContent=n;PSR_AUDIO.countdown(n);num.style.animation='none';void num.offsetWidth;num.style.animation='countPop .82s cubic-bezier(.2,.8,.2,1)'};
    play();const tick=setInterval(()=>{n--;if(n>0)play();else{clearInterval(tick);num.textContent='GO!';num.style.animation='none';void num.offsetWidth;num.style.animation='countPop .82s cubic-bezier(.2,.8,.2,1)';later(()=>{layer.classList.add('hidden');cb?.()},520)}},850)
  }

  function announceTurn(){
    const p=currentPlayer();if(!p)return;const key=`${state.round}:${p.id}`;
    if(state.lastBannerKey===key)return;state.lastBannerKey=key;
    const old=document.querySelector('.turn-banner');old?.remove();
    const el=document.createElement('div');el.className='turn-banner';el.textContent=`ES TURNO DE ${p.name.toUpperCase()}`;document.body.appendChild(el);
    PSR_AUDIO.point();later(()=>el.remove(),1900);
  }

  function renderHome(){
    applyTheme(null);
    screen.innerHTML=`
      <section class="home-screen">
        <div class="home-topline"><div class="home-kicker">ONLINE ENGLISH GRAMMAR BATTLE • 2–6 PLAYERS</div><button class="how-btn" onclick="PSR_GAME.openHowToPlay()">HOW PLAY?</button></div>
        <div class="home-center">
          <div class="home-symbol">GS</div>
          <div class="home-title">GRAMMAR<br>SKYFALL</div>
          <div class="home-subtitle">— Present Simple EDITION —</div>
          <p class="home-copy">A competitive Present Simple arena built for fast thinking, smart grammar and clean decisions. Spin, answer, survive and reach SKYFALL.</p>
          <div class="home-actions home-online-actions">
            <button class="primary-btn home-main-btn" onclick="PSR_GAME.openCreate()">CREATE ONLINE <span>▶</span></button>
            <button class="secondary-btn home-main-btn" onclick="PSR_GAME.openJoin()">JOIN WITH CODE</button>
            <button class="solo-home-btn" onclick="PSR_SOLO.open()">SOLO QUEST <small>1 PLAYER • PRESENT SIMPLE ARCADE</small></button>
          </div>
        </div>
        <div class="home-footnote">Online mode is the real game. The tiny square in the upper-left opens the hidden local TEST MODE.</div>
        <footer class="site-footer">
          <div class="footer-game">GRAMMAR SKYFALL <span>— PRESENT SIMPLE EDITION —</span></div>
          <div class="footer-creators"><b>CREATORS</b><span>MARVIN VÁSQUEZ</span><span>ELIAS MERINO</span><span>GLENN SARAVIA</span></div>
          <div class="footer-thanks">Thank you for playing, learning and sharing this project with us. Every answer helps the whole room improve.</div>
        </footer>
      </section>`;
  }

  function openHowToPlay(){
    openOverlay(`<div class="modal tutorial-modal">
      <div class="modal-top"><div><div class="tag">HOW TO PLAY</div><h2>GRAMMAR SKYFALL</h2><div class="modal-sub">Everything you need before dropping into the arena.</div></div><button class="secondary-btn" onclick="PSR_GAME.closeOverlay()">✕</button></div>
      <div class="tutorial-grid">
        <div class="tutorial-card"><div class="tutorial-num">01</div><b>MOVE</b><p>The board has <strong>40 tiles (4 × 10)</strong>. On your turn, spin the 1–6 horizontal roulette and move.</p></div>
        <div class="tutorial-card"><div class="tutorial-num">02</div><b>TILE COLORS</b><p><span class="swatch routine-swatch"></span> Routine = lime • <span class="swatch question-swatch"></span> Questions = orange • <span class="swatch toxic-swatch"></span> Toxic = black.</p></div>
        <div class="tutorial-card"><div class="tutorial-num">03</div><b>REWARDS</b><p>Correct farm answer: <strong>+100 PTS + 1 shield + 2 spaces.</strong><br>Correct mini answer: <strong>+25 PTS.</strong></p></div>
        <div class="tutorial-card"><div class="tutorial-num">04</div><b>ELIMINATION</b><p>Lowest mini score is eliminated. <strong>If the lowest score is tied, it is a DRAW</strong>, so nobody leaves.</p></div>
        <div class="tutorial-card"><div class="tutorial-num">05</div><b>TWO SURVIVORS</b><p>When only two remain, the room votes <strong>¿MUERTE SÚBITA?</strong> YES needs a majority. With 1–1, the board continues.</p></div>
        <div class="tutorial-card"><div class="tutorial-num">06</div><b>WIN CONDITION</b><p>The first player to reach the final tile wins. If two players reach it in the same round, compare points. Equal points = <strong>DRAW</strong>.</p></div>
        <div class="tutorial-card tutorial-wide"><div class="tutorial-num">07</div><b>SKYFALL</b><p>Choose the sudden-death route to enter the plane arena: 3 lives, falling Present Simple targets, four speed levels and typing before impact.</p></div>
      </div>
    </div>`);
  }

  function openCreate(){
    openOverlay(`<div class="modal"><div class="modal-top"><div><div class="tag">ONLINE ROOM</div><h2>CREATE A ROOM</h2><div class="modal-sub">You become Player 1. Share the generated room code with 1–5 friends.</div></div><button class="secondary-btn" onclick="PSR_GAME.closeOverlay()">✕</button></div><div class="challenge-card"><label class="micro">YOUR NAME</label><input id="createName" class="answer-input" maxlength="18" placeholder="Player 1" autocomplete="nickname"><div class="home-actions"><button class="primary-btn" onclick="PSR_GAME.createRoom()">GENERATE ROOM CODE</button></div></div></div>`);
  }
  function openJoin(){
    openOverlay(`<div class="modal"><div class="modal-top"><div><div class="tag">ONLINE ROOM</div><h2>JOIN A ROOM</h2><div class="modal-sub">Type the six-character code from the host.</div></div><button class="secondary-btn" onclick="PSR_GAME.closeOverlay()">✕</button></div><div class="challenge-card"><label class="micro">YOUR NAME</label><input id="joinName" class="answer-input" maxlength="18" placeholder="Player 2" autocomplete="nickname"><label class="micro" style="display:block;margin-top:12px">ROOM CODE</label><input id="joinCode" class="answer-input" maxlength="6" placeholder="ABC123" style="text-transform:uppercase;letter-spacing:4px"><div class="home-actions"><button class="primary-btn" onclick="PSR_GAME.joinRoom()">CONNECT TO ROOM</button></div></div></div>`);
  }

  function renderLobby(){
    const host=state.host;
    screen.innerHTML=`<section class="lobby-grid">
      <div class="room-card glass">
        <div class="tag">${host?'HOST ROOM':'ROOM CONNECTED'}</div>
        <div class="room-code"><small>ROOM CODE</small>${esc(state.roomCode||'------')}</div>
        <p class="section-copy">${host?'Share this code. The match unlocks when at least 2 players are connected.':'Connected to the host. Wait for the host to launch the match.'}</p>
        <div class="home-actions">
          ${host?`<button class="primary-btn" ${state.players.length<2?'disabled style="opacity:.45;cursor:not-allowed"':''} onclick="PSR_GAME.startOnline()">START MATCH ✈</button>`:''}
          <button class="secondary-btn" onclick="PSR_GAME.leaveRoom()">LEAVE ROOM</button>
        </div>
        <div class="micro" style="margin-top:14px">6 players maximum • P1 red • P2 blue • P3 green • P4 yellow • P5 purple • P6 gray.</div>
      </div>
      <div class="room-card glass">
        <div class="section-head"><div><div class="tag">ROSTER</div><h2 class="section-title">CONNECTED</h2></div><div class="round-chip">${state.players.length}/6</div></div>
        <div class="lobby-players" style="margin-top:14px">${state.players.map(p=>`<div class="player-card"><span class="dot" style="color:${p.color};background:${p.color}"></span><div><b>${esc(p.name)}</b><small>${TOKEN[p.id]} • ${LABEL[p.id]}</small></div></div>`).join('')||'<div class="lobby-empty" style="grid-column:1/-1">WAITING FOR PLAYERS...</div>'}</div>
      </div>
    </section>`;
  }

  function renderLocalSetup(){
    const n=Math.max(2,state.players.length||2);
    screen.innerHTML=`<section class="room-card glass" style="max-width:980px;margin:auto"><div class="section-head"><div><div class="tag">TEST MODE UNLOCKED</div><h2 class="section-title">LOCAL LAB</h2><p class="section-copy">Same-device testing. This menu is hidden behind the corner code.</p></div><button class="secondary-btn" onclick="PSR_GAME.backHome()">← ONLINE MENU</button></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px"><div class="challenge-card"><label class="micro">PLAYERS</label><input id="localCount" type="number" min="2" max="6" value="${n}" class="answer-input" oninput="PSR_GAME.syncLocalInputs()"><div id="localNames" style="display:grid;gap:9px;margin-top:12px"></div></div><div class="challenge-card"><div class="tag">TEST ONLY</div><h3 style="font-size:28px;margin:10px 0;text-shadow:var(--soft-text)">LOCAL SANDBOX</h3><p class="section-copy">The same complete rules run here, including score system, round ties, the two-player vote and the final plane arena.</p><div class="home-actions"><button class="primary-btn" onclick="PSR_GAME.startLocal()">START TEST MATCH</button></div></div></div></section>`;
    syncLocalInputs();
  }
  function syncLocalInputs(){const wrap=$('localNames');if(!wrap)return;let n=Math.min(6,Math.max(2,Number($('localCount')?.value||2)));const old=[...wrap.querySelectorAll('input')].map(x=>x.value);wrap.innerHTML=Array.from({length:n},(_,i)=>`<input class="answer-input" maxlength="18" value="${esc(old[i]||`Player ${i+1}`)}" placeholder="Player ${i+1}">`).join('')}
  function openSecret(){
    openOverlay(`<div class="modal lock-card"><div class="lock-icon">▦</div><div class="tag">DEVELOPER TEST ACCESS</div><div class="lock-title">ENTER CODE</div><div class="lock-note">This mode is intentionally hidden from the normal online menu.</div><input id="secretCode" class="answer-input code-input" maxlength="6" placeholder="••••••" autocomplete="off"><div class="home-actions" style="justify-content:center"><button class="primary-btn" onclick="PSR_GAME.verifyCode()">VERIFY</button></div></div>`);
    later(()=>$('secretCode')?.focus(),80);
  }
  function verifyCode(){const code=$('secretCode')?.value.trim().toUpperCase();if(code==='67BRO?'.toUpperCase()||code==='67BRO'){PSR_AUDIO.ready();closeOverlay();state.localUnlocked=true;state.online=false;state.phase='localSetup';render();}else{PSR_AUDIO.wrong();toast('ACCESS DENIED','bad')}}

  function startLocal(){
    const n=Math.min(6,Math.max(2,Number($('localCount')?.value||2)));const inputs=[...document.querySelectorAll('#localNames input')];
    state.online=false;state.host=true;state.roomCode=null;state.myNetId=null;state.myName='';
    state.players=Array.from({length:n},(_,i)=>({id:i,name:(inputs[i]?.value||`Player ${i+1}`).trim()||`Player ${i+1}`,pos:0,points:0,shield:0,alive:true,color:C[i],connected:true}));
    state.current=0;state.round=1;state.turnStage='roll';state.roll=0;state.phase='board';state.finishCandidates=[];state.farm=null;state.mini=null;state.vote=null;state.sudden=null;state.winner=null;state.draw=false;state._miniResult=null;state._continueTimer=null;state.lastBannerKey='';state.scoreOpen=false;
    applyTheme(state.players[0]);closeOverlay();showCountdown(()=>{render();announceTurn()});
  }

  function startOnline(){if(!state.host||state.players.length<2)return;state.phase='board';state.round=1;state.current=0;state.turnStage='roll';state.finishCandidates=[];state.lastBannerKey='';broadcastState();PSR_NET.broadcast({type:'countdown'});showCountdown(()=>{render();announceTurn()})}

  function renderScoreList(){return state.players.map(p=>`<div class="score-row ${p.id===state.current?'current':''}" style="opacity:${p.alive?1:.35}"><div class="score-avatar" style="background:${p.color}">${TOKEN[p.id]}</div><div><div class="score-name">${esc(p.name)}</div><div class="tiny">${p.alive?`TILE ${p.pos+1} • 🛡 ${p.shield}`:'ELIMINATED'}</div></div><div class="score-points">${p.points}<div class="tiny">PTS</div></div></div>`).join('')}

  function renderBoard(){
    const p=currentPlayer();applyTheme(p);announceTurn();
    const cells=tiles.map((t,i)=>{
      const [r,c]=BOARD_COORDS[i];
      const ps=state.players.filter(x=>x.alive&&x.pos===i);
      const icon=t.type==='routine'?'↻':t.type==='question'?'?':t.type==='toxic'?'!':i===0?'✦':'★';
      return `<div class="cell ${t.type} ${t.special?'special-'+t.special:''} ${p?.pos===i?'active-step':''}" data-pos="${i}" style="grid-row:${r+1};grid-column:${c+1}"><div class="cell-sheen"></div><span class="cell-num">${String(i+1).padStart(2,'0')}</span><span class="cell-icon">${icon}</span><span class="cell-label">${t.label}</span><div class="tokens">${ps.map(x=>`<div class="token ${x.id===state.current?'current':''}" style="--token-color:${x.color};background:${x.color}" title="${esc(x.name)}"><span>${TOKEN[x.id]}</span></div>`).join('')}</div></div>`;
    }).join('');
    screen.innerHTML=`<section class="board-game-shell"><div class="board-main-zone"><div class="board-header"><div><div class="tag">FARM PHASE • ROUND ${state.round}</div><div class="board-title">SKYBOARD 40</div><div class="board-subline">MONOPOLY-STYLE PERIMETER • 40 TILES</div><div class="board-legend"><span><i class="legend-dot routine-dot"></i>ROUTINE</span><span><i class="legend-dot question-dot"></i>QUESTION</span><span><i class="legend-dot toxic-dot"></i>TOXIC</span></div></div><div class="round-chip">${living().length} SURVIVORS</div></div><div class="board-scroll"><div class="board board-40 perimeter-board"><div class="board-core"><div class="core-mark">GRAMMAR<br>SKYFALL</div><div class="core-rule">PRESENT SIMPLE • STRATEGY • SURVIVAL</div><div class="core-line"><span>SPIN</span><span>ANSWER</span><span>MOVE</span><span>SURVIVE</span></div></div>${cells}</div></div></div><aside class="roulette-side"><div class="roulette-player-color" style="--rc:${p?.color||'#f1cd45'}"><span>${TOKEN[p?.id??0]}</span><b>${esc(p?.name||'—')}</b></div><div class="roulette-turn">${state.turnStage==='roll'?'SPIN FOR YOUR MOVE':state.turnStage==='answer'?'ANSWER YOUR CHALLENGE':'ROULETTE SPINNING'}</div><div class="roulette roulette-big"><div class="roulette-track" id="rouletteTrack">${Array.from({length:30},(_,i)=>`<div class="roulette-number">${(i%6)+1}</div>`).join('')}</div><div class="roulette-window"></div></div><div class="roll-note">HORIZONTAL ROULETTE • 1 — 6</div>${((p&&p.id===state.myNetId)||(!state.online&&p?.id===state.current)||state.host&&p?.id===0)?`<button id="rollButton" class="roll-btn spin-main-btn" onclick="PSR_GAME.rollDice()" ${state.turnStage!=='roll'?'disabled':''}>SPIN NUMBERS <span>↻</span></button>`:`<div class="wait-turn">WAITING FOR ${esc(p?.name||'PLAYER').toUpperCase()}</div>`}<div class="roulette-hint">Correct farm: <b>+100 PTS</b> • +1 shield • +2 spaces<br>Wrong: <b>−3 spaces</b></div></aside><button class="score-toggle ${state.scoreOpen?'open':''}" onclick="PSR_GAME.toggleScoreboard()" aria-label="Toggle scoreboard">${state.scoreOpen?'≫':'≪'}</button><aside class="score-drawer ${state.scoreOpen?'open':''}"><div class="score-drawer-head"><div><div class="tag">SURVIVORS</div><h3>SCOREBOARD</h3></div><button class="drawer-close" onclick="PSR_GAME.toggleScoreboard()">≫</button></div><div class="score-list">${renderScoreList()}</div></aside></section>`;
  }

  function toggleScoreboard(){state.scoreOpen=!state.scoreOpen;renderBoard()}

  function animateRoulette(result,done){
    const track=$('rouletteTrack');if(!track){done();return}PSR_AUDIO.roulette();const item=track.querySelector('.roulette-number');const step=item?.getBoundingClientRect().width||68;const index=12+(result-1);track.style.transition='none';track.style.transform='translateX(0)';void track.offsetWidth;track.style.transition='transform .95s cubic-bezier(.12,.88,.2,1)';track.style.transform=`translateX(${-index*step+(step/2)}px)`;later(()=>done(),980)}

  function rollDice(){
    if(state.phase!=='board'||state.turnStage!=='roll'||currentPlayer()?.id===undefined)return;
    if(state.online&&!state.host&&currentPlayer().id!==state.myNetId)return;
    if(state.online&&!state.host){PSR_NET.sendHost({type:'roll',pid:state.myNetId});return}
    hostRoll();
  }
  function animateTokenTravel(from,to,pid,onDone){
    const finish=typeof onDone==='function'?onDone:()=>{};
    const board=document.querySelector('.board-40');
    const tokenPlayer=getPlayer(pid);
    if(!board||!tokenPlayer||from===to){
      if(board){const dest=board.querySelector(`[data-pos="${to}"]`);dest?.animate([{transform:'translateY(0)'},{transform:'translateY(-18px) scale(1.06)'},{transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.2,.8,.2,1)'})}
      later(finish,260);return;
    }
    const cells=[...board.querySelectorAll('.cell')];
    const start=cells[from],end=cells[to];
    if(!start||!end){later(finish,100);return;}
    const layer=document.getElementById('moveFxLayer')||(()=>{const l=document.createElement('div');l.id='moveFxLayer';l.className='move-fx-layer';document.body.appendChild(l);return l})();
    const a=start.getBoundingClientRect(),b=end.getBoundingClientRect();
    const ghost=document.createElement('div');ghost.className='floating-token';ghost.style.setProperty('--token-color',tokenPlayer.color);ghost.innerHTML=`<span>${TOKEN[pid]}</span>`;
    layer.appendChild(ghost);
    const points=[];
    const step=from<to?1:-1;
    for(let i=from;i!==to+step;i+=step){
      const r=cells[i].getBoundingClientRect();
      points.push({x:r.left+r.width/2-19,y:r.top+r.height/2-19});
    }
    const keyframes=[];
    const total=Math.max(1,points.length-1);
    points.forEach((pt,i)=>{
      const t=i/total;
      keyframes.push({left:`${pt.x}px`,top:`${pt.y}px`,transform:`translateY(${i===0?0:-22}px) rotate(${i%2?'-5deg':'5deg'}) scale(${i===to-from?1.08:1.06})`,offset:t});
    });
    ghost.style.left=`${a.left+a.width/2-19}px`;ghost.style.top=`${a.top+a.height/2-19}px`;
    const duration=Math.min(1500,Math.max(520,Math.abs(to-from)*150));
    const anim=ghost.animate(keyframes,{duration,easing:'cubic-bezier(.15,.72,.18,1)',fill:'forwards'});
    anim.finished.then(()=>{ghost.animate([{transform:'translateY(-22px) scale(1.08)'},{transform:'translateY(0) scale(1)'}],{duration:180,easing:'ease-out'}).finished.finally(()=>{ghost.remove();finish()});}).catch(()=>{ghost.remove();finish()});
  }

  function hostRoll(){
    if(state.turnStage!=='roll')return;
    const p=currentPlayer();if(!p)return;
    state.turnStage='rolling';render();
    const result=Math.floor(Math.random()*6)+1;
    const from=p.pos;
    const to=Math.min(39,p.pos+result);
    animateRoulette(result,()=>{
      state.roll=result;p.pos=to;state.turnStage='moving';state._moveFx={pid:p.id,hidePos:to};
      render();
      animateTokenTravel(from,to,p.id,()=>{
        state._moveFx=null;
        // Reaching the finish tile is a round event, not another grammar card.
        // Mark it and keep the round alive so other players can also finish in
        // the same round; the outcome is resolved at round end.
        if(p.pos>=39){
          if(!state.finishCandidates.includes(p.id))state.finishCandidates.push(p.id);
          state.turnStage='roll';
          nextTurn();
          broadcastIfHost();
          return;
        }
        state.turnStage='answer';
        const tile=tiles[p.pos];
        state.farm={playerId:p.id,tileType:tile.type,card:randomFarmCard(tile.type),locked:false};
        render();openFarmForCurrent();
        if(state.online&&state.host){broadcastState();sendFarmToCurrent()}
      });
    });
  }
  function randomFarmCard(tileType){const key=tileType==='routine'?'routine':tileType==='question'?'question':'toxic';const a=Q.farm?.[key]||[];return a[Math.floor(Math.random()*a.length)]}

  function normalizeSentence(v){return String(v??'').toLowerCase().trim().replace(/[\u2018\u2019]/g,"'").replace(/\s+([?.!,])/g,'$1').replace(/\s+/g,' ')}

  function openFarmForCurrent(){
    const f=state.farm;if(!f)return;const p=getPlayer(f.playerId);if(!p)return;
    if(state.online&&f.playerId!==state.myNetId)return;
    const card=f.card;let body='';
    if(f.tileType==='question'){
      const words=shuffle(card[0].replace(/\s+([?])/g,' $1').split(' '));
      body=`<div class="challenge-card"><div class="question-text">BUILD THE QUESTION</div><div class="sentence-slots" id="farmSlots"><span class="micro">Tap words in the correct order.</span></div><div class="word-bank" id="farmBank">${words.map(w=>`<button class="word" data-word="${esc(w)}" onclick="PSR_GAME.pickWord(this)">${esc(w)}</button>`).join('')}</div><div class="home-actions"><button class="primary-btn" onclick="PSR_GAME.submitFarm()">CHECK ANSWER ✓</button></div></div>`;
    }else if(f.tileType==='toxic'){
      body=`<div class="challenge-card"><div class="question-text">${esc(card[0])}</div><div class="choice-grid">${shuffle(card[2]).map(o=>`<button class="choice-btn" onclick='PSR_GAME.chooseFarm(${jsArg(o)})'>${esc(o)}</button>`).join('')}</div></div>`;
    }else{
      body=`<div class="challenge-card"><div class="question-text">${esc(card[0])}</div><div class="answer-line"><input id="farmAnswer" class="answer-input" autocomplete="off" placeholder="Type the missing word"><button class="primary-btn" onclick="PSR_GAME.submitFarm()">CHECK ✓</button></div></div>`;
    }
    openOverlay(`<div class="modal"><div class="modal-top"><div><div class="tag">${TOKEN[p.id]} • ${esc(p.name)} • TILE ${p.pos+1}</div><h2>${f.tileType==='routine'?'DAILY ROUTINE':f.tileType==='question'?'QUESTION ORDER':'TOXIC TRUTH'}</h2><div class="modal-sub">Correct = +100 PTS + 1 shield + 2 spaces. Wrong = −3 spaces.</div></div></div>${body}</div>`);
    later(()=>$('farmAnswer')?.focus(),80);
  }
  function pickWord(el){if(!el?.parentElement||el.parentElement.id!=='farmBank')return;const slots=$('farmSlots');slots.querySelector('.micro')?.remove();const w=document.createElement('button');w.className='slotword';w.textContent=el.dataset.word;w.dataset.word=el.dataset.word;w.onclick=()=>{w.remove();$('farmBank').appendChild(el)};slots.appendChild(w);el.remove()}
  function submitFarm(){
    if(state.online&&state.farm?.playerId!==state.myNetId)return;
    const f=state.farm;if(!f||f.locked)return;
    f.locked=true;
let answer='';
    if(f.tileType==='question')answer=[...$('farmSlots').querySelectorAll('.slotword')].map(x=>x.dataset.word).join(' ');
    else answer=$('farmAnswer')?.value.trim()||'';
    const correct=f.tileType==='question'?normalizeSentence(answer)===normalizeSentence(f.card[1]):normalizeSentence(answer)===normalizeSentence(f.card[1]);
    if(state.online&&!state.host){PSR_NET.sendHost({type:'farmAnswer',pid:state.myNetId,answer});closeOverlay();return}
    resolveFarm(correct);
  }
  function chooseFarm(value){
    const f=state.farm;if(!f||f.locked)return;
    if(state.online&&f.playerId!==state.myNetId)return;
    f.locked=true;
    if(state.online&&!state.host){PSR_NET.sendHost({type:'farmAnswer',pid:state.myNetId,answer:String(value)});closeOverlay();return}
    resolveFarm(normalizeSentence(value)===normalizeSentence(f.card[1]));
  }
  function resolveFarm(correct){
    const p=getPlayer(state.farm?.playerId);if(!p)return;
    const from=p.pos;
    const delta=correct?2:-3;
    const to=correct?Math.min(39,p.pos+2):Math.max(0,p.pos-3);
    p.pos=to;
    closeOverlay();state.farm=null;state.turnStage='moving';state._moveFx={pid:p.id,hidePos:to};
    if(correct){p.points+=100;p.shield++;PSR_AUDIO.correct();toast(`CORRECT • +100 PTS • +1 SHIELD • +2 SPACES`,'good');answerBurst('CORRECT!','+100 PTS','good');}
    else{PSR_AUDIO.wrong();toast('WRONG • −3 SPACES','bad');answerBurst('WRONG','−3 SPACES','bad');}
    render();
    animateTokenTravel(from,to,p.id,()=>{
      state._moveFx=null;
      if(p.pos>=39&&!state.finishCandidates.includes(p.id))state.finishCandidates.push(p.id);
      // Never open a second challenge after landing on SKYFALL.
      nextTurn();
      broadcastIfHost();
    });
  }

  function nextTurn(){
    const ids=living().map(p=>p.id);
    if(!ids.length){finishGame(null);return}
    if(ids.length===1){finishGame(getPlayer(ids[0]));return}
    const idx=ids.indexOf(state.current);
    if(idx<ids.length-1){
      state.current=ids[idx+1];
      state.turnStage='roll';
      applyTheme(currentPlayer());
      render();
      return;
    }
    // Resolve finish-tile outcomes at the end of the round before starting
    // the next phase. This preserves the same-round double-finish rule.
    const finishOutcome=checkFinishOutcome();
    if(finishOutcome){finishOutcome();state._miniTransitioning=false;return}
    // Special 1v1 rule: once only two survivors remain, skip the elimination
    // mini-game and ask the Muerte Súbita vote immediately. This also makes
    // a 2-player match fully playable instead of waiting on a fake elimination.
    if(ids.length===2){
      state.current=ids[0];
      state.turnStage='roll';
      startVote();
      return;
    }
    state.phase='mini';
    state.mini=createMini();
    state._miniResult=null;
    applyTheme(null);
    render();
    startMini();
  }

  function createMini(){const types=['bomb','puzzle','dilemma'];return{type:types[Math.floor(Math.random()*types.length)],q:0,total:0,current:null,words:[],scores:Object.fromEntries(living().map(p=>[p.id,0])),answers:{},deadline:0,roundWinners:[],questionId:0}}
  function startMini(){if(!state.mini)return;state.mini.q=0;state.mini.total=state.mini.type==='bomb'?10:state.mini.type==='puzzle'?5:8;nextMiniQuestion()}
  function miniDuration(){return state.mini.type==='bomb'?4200:state.mini.type==='puzzle'?20000:7000}
  function nextMiniQuestion(){
    clearMiniTimer();
    if(!state.mini)return;
    state.mini.q++;
    if(state.mini.q>state.mini.total){finishMini();return}
    state.mini.questionId=(state.mini.questionId||0)+1;
    const questionId=state.mini.questionId;
    state.mini.answers={};
    if(state.mini.type==='bomb')state.mini.current=Q.mini.bomb[(state.mini.q-1)%Q.mini.bomb.length];
    else if(state.mini.type==='puzzle'){const item=Q.mini.puzzle[(state.mini.q-1)%Q.mini.puzzle.length];state.mini.current=item[0];state.mini.words=shuffle(item[1])}
    else state.mini.current=Q.mini.dilemma[(state.mini.q-1)%Q.mini.dilemma.length];
    const duration=miniDuration();
    state.mini.deadline=Date.now()+duration;
    render();
    state._miniTimer=setTimeout(()=>{
      if(!state.mini||state.mini.questionId!==questionId)return;
      finishMiniQuestion();
    },duration+60);
    if(state.online&&state.host)broadcastState();
  }
  function clearMiniTimer(){if(state._miniTimer){clearTimeout(state._miniTimer);state._miniTimer=null}}
  function clearContinueTimer(){if(state._continueTimer){clearTimeout(state._continueTimer);state._continueTimer=null}}

  function renderMini(){
    const onlineSolo=state.online&&!state.host;const me=onlineSolo?getPlayer(state.myNetId):null;const players=onlineSolo?[me].filter(Boolean):state.online?[getPlayer(0)].filter(Boolean):living();
    const title=state.mini.type==='bomb'?'BOMB OF CONJUGATION':state.mini.type==='puzzle'?'TOXIC PUZZLE':'DAILY DILEMMA';
    screen.innerHTML=`<section class="glass" style="padding:22px"><div class="section-head"><div><div class="tag">ROUND ${state.round} • ELIMINATION</div><h2 class="section-title">${title}</h2><p class="section-copy">Correct answers earn points. If the lowest score is tied, it is a DRAW and nobody is eliminated.</p></div><div class="round-chip">${state.mini.q}/${state.mini.total}</div></div><div class="mini-grid" style="margin-top:18px">${players.map(p=>renderMiniCard(p)).join('')}</div><div class="micro" style="margin-top:14px">Host-only result control. Online opponents see only their own answer panel.</div></section>`;
  }
  function renderMiniCard(p){if(!p)return '';const locked=state.mini.answers[p.id]!=null;let content='';
    if(state.mini.type==='bomb'){const item=state.mini.current;content=`<div class="mini-prompt">${esc(item[0])}</div><div class="choice-grid">${shuffle(item[1]).map(o=>`<button class="choice-btn" onclick='PSR_GAME.miniAnswer(${p.id},${jsArg(o)})' ${locked?'disabled':''}>${esc(o)}</button>`).join('')}</div>`}
    else if(state.mini.type==='puzzle'){content=`<div class="mini-prompt">BUILD THE SENTENCE</div><div class="sentence-slots" id="pzSlots-${p.id}"><span class="micro">Tap words in order.</span></div><div class="word-bank" id="pzBank-${p.id}">${state.mini.words.map(w=>`<button class="word" data-word="${esc(w)}" onclick="PSR_GAME.pzWord(${p.id},this)" ${locked?'disabled':''}>${esc(w)}</button>`).join('')}</div><div class="home-actions"><button class="primary-btn" onclick="PSR_GAME.pzSubmit(${p.id})" ${locked?'disabled':''}>LOCK ANSWER</button></div>`}
    else {const item=state.mini.current;content=`<div class="mini-prompt">${esc(item[0])}</div><div class="choice-grid">${item[1].map(o=>`<button class="choice-btn" onclick='PSR_GAME.miniAnswer(${p.id},${jsArg(o)})' ${locked?'disabled':''}>${esc(o)}</button>`).join('')}</div>`}
    return `<div class="mini-card ${locked?'locked':''}" id="miniCard-${p.id}"><b>${TOKEN[p.id]} • ${esc(p.name)}</b><div class="tiny">${state.mini.scores[p.id]||0} MINI PTS</div>${content}<div class="timer-line"><span id="miniTimerBar-${p.id}"></span></div><div class="tiny" id="miniLock-${p.id}">${locked?'ANSWER LOCKED':'NOT ANSWERED'}</div></div>`;
  }
  function miniAnswer(pid,answer){
    const p=getPlayer(pid);if(!p||!state.mini||state.mini.answers[pid]!=null)return;if(state.online&&pid!==state.myNetId)return;
    if(state.online&&!state.host){PSR_NET.sendHost({type:'miniAnswer',pid:state.myNetId,answer,q:state.mini.q,questionId:state.mini.questionId});return}
    state.mini.answers[pid]=answer;const correct=miniCorrect(answer);if(correct){state.mini.scores[pid]=(state.mini.scores[pid]||0)+1; p.points+=25;PSR_AUDIO.correct();}else PSR_AUDIO.wrong();markMiniLock(pid,correct);if(Object.keys(state.mini.answers).length===living().length)later(()=>finishMiniQuestion(),220);
  }
  function pzWord(pid,el){if(state.mini.answers[pid]!=null)return;const slots=$(`pzSlots-${pid}`),bank=$(`pzBank-${pid}`);slots.querySelector('.micro')?.remove();const w=document.createElement('button');w.className='slotword';w.textContent=el.dataset.word;w.dataset.word=el.dataset.word;w.onclick=()=>{w.remove();bank.appendChild(el)};slots.appendChild(w);el.remove()}
  function pzSubmit(pid){if(state.mini.answers[pid]!=null)return;const formed=[...$(`pzSlots-${pid}`).querySelectorAll('.slotword')].map(x=>x.dataset.word).join(' ');miniAnswer(pid,formed)}
  function miniCorrect(answer){if(state.mini.type==='bomb')return normalizeSentence(answer)===normalizeSentence(state.mini.current[2]);if(state.mini.type==='dilemma')return normalizeSentence(answer)===normalizeSentence(state.mini.current[2]);return normalizeSentence(answer)===normalizeSentence(state.mini.current)}
  function markMiniLock(pid,correct){const box=$(`miniCard-${pid}`),lock=$(`miniLock-${pid}`);if(box)box.classList.add('locked');if(lock)lock.textContent=correct?'✓ CORRECT • +25 PTS':'✕ WRONG';if(correct){box?.animate([{transform:'translateY(0) scale(1)'},{transform:'translateY(-16px) scale(1.04)'},{transform:'translateY(0) scale(1)'}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'});answerBurst('PERFECT!','+25 PTS','good');}else{box?.animate([{transform:'translateX(0)'},{transform:'translateX(-9px)'},{transform:'translateX(8px)'},{transform:'translateX(-5px)'},{transform:'translateX(0)'}],{duration:360,easing:'ease-out'});answerBurst('WRONG','','bad')}}
  function finishMiniQuestion(){if(!state.mini)return;clearMiniTimer();for(const p of living())if(state.mini.answers[p.id]==null)state.mini.answers[p.id]='__TIMEOUT__';if(state.online&&state.host)broadcastState();nextMiniQuestion()}
  function finishMini(){
    clearMiniTimer();if(!state.mini)return;
    const results=living().map(p=>({p,s:state.mini.scores[p.id]||0}));const min=Math.min(...results.map(x=>x.s));const lowest=results.filter(x=>x.s===min);const max=Math.max(...results.map(x=>x.s));const winners=results.filter(x=>x.s===max).map(x=>x.p.id);
    state.mini.roundWinners=winners;const tied=lowest.length>1;
    const resultHtml=results.map(x=>`<div class="result-row"><div><b>${TOKEN[x.p.id]} • ${esc(x.p.name)}</b><div class="tiny">MINI SCORE</div></div><div class="pts">${x.s}</div></div>`).join('');
    state.phase='mini';state._miniResult={tied,lowest:lowest.map(x=>x.p.id),winners,resultHtml};
    if(state.online&&state.host)broadcastState();
    renderMiniResult();
  }
  function renderMiniResult(){
    const r=state._miniResult;if(!r)return;
    const loserNames=r.lowest.map(id=>esc(getPlayer(id)?.name||'')).join(', ');
    const hostCanContinue=!(state.online&&!state.host);
    clearContinueTimer();
    openOverlay(`<div class="modal"><div class="tag">ROUND RESULT • ${r.tied?'DRAW':'ELIMINATION CHECK'}</div><div class="result-big">${r.tied?'DRAW':'MINI ROUND CLEAR'}</div><div class="modal-sub">${r.tied?`Lowest score tied: ${loserNames}. Nobody is eliminated.`:`Highest mini score: ${r.winners.map(id=>esc(getPlayer(id)?.name||'')).join(', ')}.`}</div><div style="margin-top:14px">${r.resultHtml}</div><div class="home-actions">${hostCanContinue?`<button class="primary-btn" onclick="PSR_GAME.continueAfterMini()">CONTINUE ROUND</button>`:'<div class="micro">WAITING FOR HOST TO CONTINUE...</div>'}</div><div class="micro" style="margin-top:10px;text-align:center">The next phase starts automatically.</div></div>`);
    if(r.tied)PSR_AUDIO.draw();else{PSR_AUDIO.point();r.winners.forEach((id,i)=>later(()=>getPlayer(id)&&animatePlayerJump(id),i*90));confetti(26)}
    // Avoid the classic “stuck after round” state: the host/local match advances
    // automatically after the result, while still allowing an instant button click.
    if(hostCanContinue)state._continueTimer=later(()=>{if(state._miniResult===r&&!state._miniTransitioning)continueAfterMini()},1800);
  }
  function animatePlayerJump(id){const els=[...document.querySelectorAll('.score-row')].filter((_,i)=>state.players[i]?.id===id);els.forEach(el=>el.animate([{transform:'translateY(0)'},{transform:'translateY(-16px) scale(1.04)'},{transform:'translateY(0)'}],{duration:520,easing:'cubic-bezier(.2,.85,.2,1)'}));PSR_AUDIO.jump()}

  function continueAfterMini(){
    if(!state._miniResult||state._miniTransitioning)return;
    state._miniTransitioning=true;
    clearContinueTimer();
    closeOverlay();
    const r=state._miniResult;
    state._miniResult=null;
    // Eliminate lowest only when there is one unique lowest score.
    if(!r.tied&&r.lowest.length===1){const victim=getPlayer(r.lowest[0]);if(victim){victim.alive=false;PSR_AUDIO.eliminate();}}
    const alive=living();
    // The mini-game belongs to the finished round. Clear it before entering
    // the next phase so stale questions cannot block the next round.
    state.mini=null;
    state._miniTimer=null;
    const finishOutcome=checkFinishOutcome();if(finishOutcome){finishOutcome();return}
    if(alive.length<=1){state._miniTransitioning=false;finishGame(alive[0]||null);return}
    if(alive.length===2){state._miniTransitioning=false;startVote();return}
    state._miniTransitioning=false;startNextRound();
  }

  function startNextRound(){
    clearMiniTimer();clearContinueTimer();
    state.round++;
    state.current=living()[0]?.id??0;
    state.turnStage='roll';
    state.roll=0;
    state.farm=null;
    state.mini=null;
    state._miniResult=null;
    state.vote=null;
    state.finishCandidates=living().filter(p=>p.pos>=39).map(p=>p.id);
    state.phase='board';
    applyTheme(currentPlayer());
    broadcastIfHost();
    render();
    announceTurn();
  }

  function checkFinishOutcome(){
    const candidates=state.finishCandidates.map(id=>getPlayer(id)).filter(p=>p&&p.alive);
    if(candidates.length===0)return null;
    if(candidates.length===1)return()=>finishGame(candidates[0]);
    const max=Math.max(...candidates.map(p=>p.points));const top=candidates.filter(p=>p.points===max);
    if(top.length===1)return()=>finishGame(top[0]);
    return()=>finishDraw(candidates);
  }

  function startVote(){
    const ids=living().map(p=>p.id);
    if(ids.length!==2){
      startNextRound();
      return;
    }
    state.phase='suddenVote';
    state.vote={votes:{}};
    broadcastIfHost();render();PSR_AUDIO.vote();
  }
  function renderVote(){
    const finalists=living().slice(0,2);const localMode=!state.online;const meId=state.online?state.myNetId:null;
    screen.innerHTML=`<section class="glass vote-wrap" style="max-width:1000px;margin:auto;padding:24px"><div class="tag">TWO SURVIVORS REMAIN</div><div class="vote-title">¿MUERTE<br>SÚBITA?</div><div class="vote-sub">Majority vote decides. With a 1–1 split there is no majority, so the board continues.</div><div class="vote-players">${finalists.map(p=>{const v=state.vote?.votes?.[p.id];const canVote=localMode||p.id===meId;return `<div class="vote-player"><b style="color:${p.color}">${TOKEN[p.id]} • ${esc(p.name)}</b><div class="vote-choice"><button class="vote-btn yes" onclick="PSR_GAME.vote(${p.id},'yes')" ${v||(!canVote&&!localMode)?'disabled':''}>YES</button><button class="vote-btn no" onclick="PSR_GAME.vote(${p.id},'no')" ${v||(!canVote&&!localMode)?'disabled':''}>NO</button></div><div class="vote-state">${v?`VOTE: ${v.toUpperCase()}`:canVote?'Choose your vote.':'Waiting for player vote...'}</div></div>`}).join('')}</div><div class="micro" style="margin-top:14px">In TEST MODE, choose once for each finalist. Online, each player votes only from their own device.</div></section>`;
  }
  function vote(pid,choice){if(!state.vote)return;if(state.vote.votes[pid])return;if(state.online&&!state.host&&pid!==state.myNetId)return;if(state.online&&!state.host){PSR_NET.sendHost({type:'vote',pid:state.myNetId,choice});return}state.vote.votes[pid]=choice;PSR_AUDIO.vote();if(Object.keys(state.vote.votes).length===2)setTimeout(resolveVote,260);render()}
  function resolveVote(){const vals=Object.values(state.vote?.votes||{});if(vals.length<2)return;const yes=vals.filter(v=>v==='yes').length;closeOverlay();if(yes===2){startFinalReady()}else{toast('NO MAJORITY FOR MUERTE SÚBITA • CONTINUE','');startNextRound()}}

  function startFinalReady(){
    const finalists=living();
    if(finalists.length!==2){startNextRound();return;}
    state.phase='finalReady';
    state.sudden={finalists:finalists.map(p=>p.id),ready:{},lives:{},level:{},qIndex:{},deadline:{}};
    state.sudden.finalists.forEach(id=>{state.sudden.lives[id]=3;state.sudden.level[id]=1;state.sudden.qIndex[id]=0});
    applyTheme(null);broadcastIfHost();render();PSR_AUDIO.planeEntry();
  }
  function renderFinalReady(){applyTheme(null);const fs=(state.sudden?.finalists||[]).map(id=>getPlayer(id)).filter(Boolean);const localMode=!state.online;const meId=state.myNetId;screen.innerHTML=`<section class="skyfall-shell"><div class="sky-head"><div><div class="tag">FINAL ARENA</div><div class="sky-title">SKYFALL GRAMMAR</div><div class="sky-sub">TWO PLANES • THREE LIVES • TYPE TO SURVIVE</div></div><div class="life-bar">${fs.map((p,i)=>`<span class="life ${i===0?'p1':'p2'}">${TOKEN[p.id]} • ${esc(p.name)} • READY ${state.sudden.ready[p.id]?'✓':'—'}</span>`).join('')}</div></div><div class="sky-arena" style="min-height:360px"><div class="sky-lane"><div class="plane p1 plane-enter-left"><span class="plane-emoji">✈</span><span class="plane-name">${esc(fs[0]?.name||'PLAYER 1')}</span></div></div><div class="sky-vs">VS</div><div class="sky-lane"><div class="plane p2 plane-enter-right"><span class="plane-emoji">✈</span><span class="plane-name">${esc(fs[1]?.name||'PLAYER 2')}</span></div></div></div><div class="vote-players">${fs.map((p,i)=>{const canReady=localMode||p.id===meId;return `<div class="vote-player"><b>${TOKEN[p.id]} • ${esc(p.name)}</b><div class="vote-state">${state.sudden.ready[p.id]?'READY TO DROP':canReady?'PRESS READY ON YOUR DEVICE':'WAITING FOR THAT PLAYER'}</div>${canReady?`<button class="ready-btn" style="margin-top:10px" onclick="PSR_GAME.readyFinal(${p.id})" ${state.sudden.ready[p.id]?'disabled':''}>${state.sudden.ready[p.id]?'READY ✓':'READY TO FLY'}</button>`:''}</div>`}).join('')}</div><div class="micro" style="margin-top:12px;text-align:center">Each finalist controls only their own READY button on their own device.</div></section>`}
  function readyFinal(pid){if(state.sudden?.ready?.[pid])return;if(state.online&&pid!==state.myNetId)return;if(state.online&&!state.host){PSR_NET.sendHost({type:'finalReady',pid:state.myNetId});return}state.sudden.ready[pid]=true;PSR_AUDIO.ready();if(Object.values(state.sudden.ready).length>=2&&Object.values(state.sudden.ready).every(Boolean))startSudden();else{broadcastIfHost();render()}}

  function startSudden(){
    if(state.sudden?.finalists?.length!==2){startNextRound();return;}
    clearSkyTimers();state.phase='sudden';applyTheme(null,'sky');state.skyTimers={};const now=Date.now();state.sudden.finalists.forEach(id=>{state.sudden.qIndex[id]=0;state.sudden.level[id]=1;state.sudden.lives[id]=3;state.sudden.deadline[id]=now+skyDurationForLevel(1)});broadcastIfHost();render();PSR_AUDIO.planeEntry();later(()=>showCountdown(()=>{render();state.sudden.finalists.forEach(id=>scheduleSkyTimeout(id))},'SKYFALL READY'),850)}
  function skyDurationForLevel(l){return [7600,5600,4300,3200][Math.min(3,l-1)]}
  function skyQuestion(id){const level=Math.min(4,state.sudden.level[id]||1);const list=Q.skyfall?.[level]||[];return list[(state.sudden.qIndex[id]||0)%list.length]}
  function clearSkyTimers(){if(!state.skyTimers)return;Object.values(state.skyTimers).forEach(clearTimeout);state.skyTimers={}}
  function scheduleSkyTimeout(id){if(!state.sudden||state.phase!=='sudden'||state.sudden.lives[id]<=0)return;state.skyTimers=state.skyTimers||{};if(state.skyTimers[id])clearTimeout(state.skyTimers[id]);const deadline=state.sudden.deadline[id];const ms=Math.max(30,deadline-Date.now()+30);state.skyTimers[id]=setTimeout(()=>{state.skyTimers[id]=null;handleSkyHit(id,'impact')},ms)}
  function presentSimpleHint(answer){
    const raw=String(answer??'').trim();
    const low=raw.toLowerCase();
    const fixed={has:'have',does:'do',goes:'go',is:'be'};
    if(fixed[low])return fixed[low];
    if(['never','usually','always','often','sometimes','rarely','cannot','can not','do','the'].includes(low))return low;
    if(low.endsWith('ies')&&low.length>3)return low.slice(0,-3)+'y';
    if(/(ches|shes|sses|xes|zes)$/.test(low))return low.slice(0,-2);
    if(low.endsWith('s')&&low.length>3)return low.slice(0,-1);
    return low;
  }

  function renderSkyfall(){applyTheme(null,'sky');const fs=state.sudden.finalists.map(id=>getPlayer(id)).filter(Boolean);const onlineSolo=state.online&&!state.host;screen.innerHTML=`<section class="skyfall-shell skyfall-v9"><div class="sky-head"><div><div class="tag">MUERTE SÚBITA • SKYFALL</div><div class="sky-title">TYPE. HIT. SURVIVE.</div><div class="sky-sub">THE SENTENCE FALLS • WRONG ANSWERS DO NOT COST A LIFE • IMPACT DOES</div></div><div class="life-bar">${fs.map((p,i)=>{const lives=state.sudden.lives[p.id]||0;return `<span class="life ${i===0?'p1':'p2'}">${TOKEN[p.id]} • ${esc(p.name)} • ${'❤'.repeat(lives)}${'♡'.repeat(3-lives)}</span>`}).join('')}</div></div><div class="sky-arena">${fs.map((p,i)=>renderSkyLane(p,i,onlineSolo)).join('<div class="sky-vs">VS</div>')}</div><div class="sky-level">LEVEL ${Math.max(...fs.map(p=>state.sudden.level[p.id]||1))} • ROUTINES → FREQUENCY → DO / DOES → DOUBLE TRAPS</div></section>`;requestAnimationFrame(()=>{fs.forEach(p=>animateFallingCard(p));const me=state.online?state.myNetId:null;if(me!=null)$("skyInput-"+me)?.focus()})}
  function renderSkyLane(p,i,onlineSolo){const isOwn=state.online?p.id===state.myNetId:true;const q=skyQuestion(p.id);const deadline=state.sudden.deadline[p.id]||Date.now()+5000;const remain=Math.max(450,deadline-Date.now());const sentence=esc(q?.[0]||'___').replace('___','<b>_____</b>');const hint=esc(presentSimpleHint(q?.[1]||''));return `<div class="sky-lane v9-lane ${state._skyHit===p.id?'sky-hit':''}" id="skyLane-${p.id}" style="--fall-ms:${remain}ms;--plane-color:${i===0?'#ff465a':'#1b90ff'}"><div class="lane-label">${TOKEN[p.id]} • ${esc(p.name)} • LEVEL ${state.sudden.level[p.id]||1}</div><div class="sky-target-wrap" id="fallWrap-${p.id}"><div class="falling-phrase v9-target" id="fall-${p.id}">${sentence}<span class="sky-hint"> (${hint})</span></div></div><div class="sky-target-caption">TYPE THE MISSING WORD • PRESS ENTER</div><div class="plane v9-plane ${i===0?'p1':'p2'}"><span class="plane-emoji">✈</span><span class="plane-name">${esc(p.name)}</span><span class="plane-life-dot"></span></div>${isOwn?`<div class="sky-input-wrap"><input class="sky-answer v9-input" id="skyInput-${p.id}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="TYPE + ENTER" value="" onkeydown="if(event.key==='Enter'){event.preventDefault();PSR_GAME.skySubmit(${p.id})}"><span class="enter-key">ENTER ↵</span></div>`:''}</div>`}
  function animateFallingCard(p){const el=$(`fall-${p.id}`);if(!el)return;const ms=Math.max(450,state.sudden.deadline[p.id]-Date.now());el.style.animationDuration=ms+'ms';el.classList.remove('falling-live');void el.offsetWidth;el.classList.add('falling-live')}
  function skySubmit(pid){if(state.phase!=='sudden'||state.sudden.lives[pid]<=0)return;if(state.online&&pid!==state.myNetId)return;const input=$(`skyInput-${pid}`);if(!input)return;const val=input.value.trim();if(!val)return;const qi=state.sudden.qIndex[pid]||0;if(state.online&&!state.host){PSR_NET.sendHost({type:'skyAnswer',pid:state.myNetId,answer:val,qIndex:qi});return}resolveSkyAnswer(pid,val,qi)}
  function skyWrongFeedback(pid){const input=$(`skyInput-${pid}`),lane=$(`skyLane-${pid}`);if(input){input.value='';input.focus();input.classList.remove('sky-wrong-flash');void input.offsetWidth;input.classList.add('sky-wrong-flash')}if(lane){lane.classList.remove('sky-wrong');void lane.offsetWidth;lane.classList.add('sky-wrong');later(()=>lane.classList.remove('sky-wrong'),360)}if(pid===state.myNetId||!state.online)toast('INCORRECT • TRY AGAIN • NO LIFE LOST','bad');PSR_AUDIO.wrong()}
  function skyCorrectFeedback(pid){
    const lane=$(`skyLane-${pid}`),target=$(`fall-${pid}`);
    if(lane){lane.classList.add('sky-correct');later(()=>lane.classList.remove('sky-correct'),520)}
    if(target){
      // Stop the falling CSS animation first. Otherwise the CSS animation can
      // regain control of transform after the success effect and make the
      // cleared sentence visually reappear in its old trajectory.
      try{target.getAnimations().forEach(anim=>anim.cancel())}catch(_){}
      target.classList.remove('falling-live');
      target.style.animation='none';
      target.style.opacity='1';
      target.style.transform='translate(-50%,0) scale(1)';
      target.animate(
        [
          {transform:'translate(-50%,0) scale(1)',opacity:1,filter:'brightness(1)'},
          {transform:'translate(-50%,-8px) scale(1.16)',opacity:1,filter:'brightness(1.9)',offset:.35},
          {transform:'translate(-50%,12px) scale(.16)',opacity:0,filter:'brightness(2.6)'}
        ],
        {duration:420,easing:'cubic-bezier(.16,.8,.2,1)',fill:'forwards'}
      ).finished.then(()=>{try{target.remove()}catch(_){} }).catch(()=>{});
    }
    answerBurst('HIT!','SENTENCE CLEARED','good');
  }
  function resolveSkyAnswer(pid,answer,qIndex){if(state.phase!=='sudden'||state.sudden.lives[pid]<=0)return;const currentIndex=state.sudden.qIndex[pid]||0;if(qIndex!==undefined&&qIndex!==currentIndex)return;const q=skyQuestion(pid);if(!q)return;const correct=normalizeSentence(answer)===normalizeSentence(q[1]);if(!correct){skyWrongFeedback(pid);if(state.online&&state.host)PSR_NET.broadcast({type:'skyFeedback',pid,ok:false});return}PSR_AUDIO.correct();skyCorrectFeedback(pid);advanceSky(pid,true)}
  function handleSkyHit(pid,reason){if(!state.sudden||state.phase!=='sudden'||state.sudden.lives[pid]<=0)return;state.sudden.lives[pid]--;PSR_AUDIO.hit();state._skyHit=pid;later(()=>{state._skyHit=null},380);if(state.sudden.lives[pid]<=0){const other=state.sudden.finalists.find(x=>x!==pid&&state.sudden.lives[x]>0);if(other==null){finishDraw(state.sudden.finalists.map(getPlayer).filter(Boolean));return}finishGame(getPlayer(other));return}toast(`${TOKEN[pid]} HIT • -1 LIFE`,'bad');advanceSky(pid,false)}
  function updateSkyLifeHud(){
    const bar=document.querySelector('.skyfall-shell .life-bar');
    if(!bar||!state.sudden)return;
    bar.innerHTML=state.sudden.finalists.map((id,i)=>{const p=getPlayer(id);if(!p)return '';const lives=Math.max(0,state.sudden.lives[id]||0);return `<span class="life ${i===0?'p1':'p2'}">${TOKEN[p.id]} • ${esc(p.name)} • ${'❤'.repeat(lives)}${'♡'.repeat(3-lives)}</span>`}).join('');
  }
  function refreshSkyLane(pid,{animateNew=true}={}){
    if(!state.sudden)return;
    const lane=$(`skyLane-${pid}`);const p=getPlayer(pid);if(!lane||!p)return;
    const onlineSolo=state.online&&!state.host;
    const i=state.sudden.finalists.indexOf(pid);
    const wrap=document.createElement('div');
    wrap.innerHTML=renderSkyLane(p,i,onlineSolo);
    const next=wrap.firstElementChild;
    if(!next)return;
    lane.replaceWith(next);
    const fresh=$(`skyLane-${pid}`);
    if(animateNew){
      requestAnimationFrame(()=>animateFallingCard(p));
    }
    if(onlineSolo&&pid===state.myNetId)$(`skyInput-${pid}`)?.focus();
    else if(!onlineSolo&&pid===state.current)$(`skyInput-${pid}`)?.focus();
  }
  function syncSkyfallFromState(previous,next){
    if(!next)return;
    updateSkyLifeHud();
    next.finalists.forEach(pid=>{
      const prevQ=previous?.qIndex?.[pid]??0;
      const newQ=next.qIndex?.[pid]??0;
      const prevLevel=previous?.level?.[pid]??1;
      const newLevel=next.level?.[pid]??1;
      const prevLives=previous?.lives?.[pid]??3;
      const newLives=next.lives?.[pid]??3;
      const lane=$(`skyLane-${pid}`);
      if(!lane){refreshSkyLane(pid);return}
      if(newQ!==prevQ||newLevel!==prevLevel){refreshSkyLane(pid,{animateNew:true});}
      else if(newLives!==prevLives){
        lane.classList.remove('sky-hit');
        void lane.offsetWidth;
        lane.classList.add('sky-hit');
        later(()=>lane.classList.remove('sky-hit'),420);
      }
    });
    const me=state.online&&!state.host?state.myNetId:null;
    if(me!=null)$(`skyInput-${me}`)?.focus();
  }
  function advanceSky(pid,correct){
    if(!state.sudden)return;
    if(state.skyTimers?.[pid]){clearTimeout(state.skyTimers[pid]);state.skyTimers[pid]=null}
    state.sudden.qIndex[pid]=(state.sudden.qIndex[pid]||0)+1;
    state.sudden.level[pid]=Math.min(4,1+Math.floor(state.sudden.qIndex[pid]/4));
    state.sudden.deadline[pid]=Date.now()+skyDurationForLevel(state.sudden.level[pid]);
    const wait=correct?460:180;
    broadcastIfHost();
    later(()=>{
      if(state.phase!=='sudden'||!state.sudden||state.sudden.lives[pid]<=0)return;
      refreshSkyLane(pid,{animateNew:true});
      updateSkyLifeHud();
      scheduleSkyTimeout(pid);
    },wait);
  }

  function finishGame(winner){clearMiniTimer();clearContinueTimer();clearSkyTimers();state.winner=winner;state.draw=false;state.phase='end';applyTheme(winner,'end');if(state.online&&state.host)broadcastState();render();PSR_AUDIO.victory();confetti(70)}
  function finishDraw(players){clearMiniTimer();clearContinueTimer();clearSkyTimers();state.winner=null;state.draw=true;state.phase='end';applyTheme(null);if(state.online&&state.host)broadcastState();render();PSR_AUDIO.draw();confetti(38)}
  function renderEnd(){
    if(state.draw){screen.innerHTML=`<section class="end-shell"><div><div class="tag">RESULT</div><div class="draw-title">DRAW</div><div class="winner-sub">POINTS WERE TIED / BOTH PLANES FELL</div><div class="home-actions end-actions"><button class="primary-btn" onclick="PSR_GAME.backHome()">RETURN TO ONLINE MENU</button></div></div></section>`;return}
    const w=state.winner;screen.innerHTML=`<section class="end-shell"><div><div class="tag">CHAMPION</div><div class="winner-title" style="color:${w?.color||'#fff'}">${esc(w?.name||'PLAYER')}</div><div class="winner-sub">JUGADOR ${TOKEN[w?.id??0]} GANO =D</div><div class="winner-points">FINAL SCORE • ${w?.points||0} POINTS</div><div class="home-actions end-actions"><button class="primary-btn" onclick="PSR_GAME.rematch()">PLAY AGAIN</button><button class="secondary-btn" onclick="PSR_GAME.backHome()">ONLINE MENU</button></div></div></section>`;
  }

  function confetti(n){const wrap=$('confetti');wrap.innerHTML='';for(let i=0;i<n;i++){const p=document.createElement('span');p.className='piece';p.style.setProperty('--x',Math.random()*100+'vw');p.style.setProperty('--c',C[i%C.length]);p.style.setProperty('--dur',(2+Math.random()*2.5)+'s');p.style.setProperty('--r',(Math.random()*360)+'deg');wrap.appendChild(p)}later(()=>wrap.innerHTML='',5200)}

  function openOverlay(html){overlay.classList.remove('hidden');overlay.innerHTML=html}
  function closeOverlay(){overlay.classList.add('hidden');overlay.innerHTML=''}
  function toast(msg,type=''){toastEl.textContent=msg;toastEl.className='toast '+type;toastEl.classList.remove('hidden');clearTimeout(toast._timer);toast._timer=later(()=>toastEl.classList.add('hidden'),2600)}
  function answerBurst(title,sub='',kind='good'){
    const wrap=document.createElement('div');wrap.className=`answer-burst ${kind}`;wrap.innerHTML=`<div class="answer-burst-title">${esc(title)}</div>${sub?`<div class="answer-burst-sub">${esc(sub)}</div>`:''}`;
    document.body.appendChild(wrap);wrap.animate([{opacity:0,transform:'translate(-50%,-50%) scale(.72)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.06)',offset:.36},{opacity:0,transform:'translate(-50%,-58%) scale(1.02)'}],{duration:950,easing:'cubic-bezier(.18,.82,.18,1)'}).finished.finally(()=>wrap.remove());
  }

  function backHome(){clearTimers();clearContinueTimer();PSR_NET.close();state={phase:'home',online:false,host:false,roomCode:null,myNetId:null,myName:'',players:[],current:0,round:1,turnStage:'roll',roll:0,farm:null,mini:null,finishCandidates:[],vote:null,sudden:null,winner:null,draw:false,lastBannerKey:'',localUnlocked:false,scoreOpen:false,skyTimers:{},_miniTimer:null,_moveFx:null,_miniTransitioning:false};closeOverlay();render()}
  function leaveRoom(){backHome()}
  function rematch(){if(state.online){backHome()}else{const names=state.players.map(p=>p.name);state.players=names.map((name,i)=>({id:i,name,pos:0,points:0,shield:0,alive:true,color:C[i],connected:true}));state.current=0;state.round=1;state.finishCandidates=[];state.phase='board';state.turnStage='roll';state._moveFx=null;showCountdown(()=>{render();announceTurn()})}}

  /* ---------- online authority ---------- */
  function broadcastIfHost(){if(state.online&&state.host)broadcastState()}
  function publicState(){return {
    phase:state.phase,roomCode:state.roomCode,round:state.round,current:state.current,turnStage:state.turnStage,roll:state.roll,
    players:state.players.map(p=>({id:p.id,name:p.name,pos:p.pos,points:p.points,shield:p.shield,alive:p.alive,color:p.color,connected:p.connected!==false})),
    finishCandidates:state.finishCandidates,
    mini:state.mini?{type:state.mini.type,q:state.mini.q,total:state.mini.total,current:state.mini.current,words:state.mini.words,scores:state.mini.scores,answers:state.mini.answers,deadline:state.mini.deadline,questionId:state.mini.questionId}:null,
    miniResult:state._miniResult||null,
    vote:state.vote?{votes:state.vote.votes}:null,
    sudden:state.sudden?{finalists:state.sudden.finalists,ready:state.sudden.ready,lives:state.sudden.lives,level:state.sudden.level,qIndex:state.sudden.qIndex,deadline:state.sudden.deadline}:null,
    winner:state.winner?{id:state.winner.id,name:state.winner.name,points:state.winner.points,color:state.winner.color}:null,draw:state.draw
  }}
  function broadcastState(){if(!state.online||!state.host)return;PSR_NET.broadcast({type:'state',payload:publicState()})}
  function sendFarmToCurrent(){if(!state.host||!state.farm)return;const p=getPlayer(state.farm.playerId);if(p&&p.id!==0&&state.hostConnections?.[p.id]){state.hostConnections[p.id].send({type:'farm',farm:state.farm})}}
  function hostConnectionsInit(){state.hostConnections=state.hostConnections||{}}

  function createRoom(){const name=$('createName')?.value.trim()||'Player 1';PSR_NET.close();PSR_NET.create(name,r=>{if(!r.ok){toast(r.error,'bad');return}state.online=true;state.host=true;state.myNetId=0;state.myName=name;state.roomCode=r.code;state.players=[{id:0,name,pos:0,points:0,shield:0,alive:true,color:C[0],connected:true,netId:'host'}];state.phase='lobby';hostConnectionsInit();closeOverlay();renderLobby()})}
  function joinRoom(){
    const name=$('joinName')?.value.trim()||'Player';
    const code=$('joinCode')?.value.trim().toUpperCase();
    if(code.length!==6){toast('ROOM CODE MUST HAVE 6 CHARACTERS','bad');return}
    PSR_NET.close();
    state.online=true;state.host=false;state.myName=name;state.roomCode=code;
    closeOverlay();
    state.phase='lobby';
    screen.innerHTML=`<section class="room-card glass" style="text-align:center"><div class="tag">CONNECTING</div><div class="section-title">JOINING ${esc(code)}</div><p class="section-copy">Negotiating with the host… please keep this tab open.</p><div class="micro" style="margin-top:14px">ONLINE SERVER CONNECTION • keep this tab open while joining.</div></section>`;
    PSR_NET.join(code,name,r=>{
      if(!r.ok){
        state.online=false;
        toast(r.error,'bad');
        screen.innerHTML=`<section class="room-card glass" style="max-width:720px;margin:auto;text-align:center"><div class="tag">CONNECTION FAILED</div><h2 class="section-title">COULD NOT JOIN ${esc(code)}</h2><p class="section-copy">${esc(r.error||'Unknown network error.')}</p><div class="home-actions" style="justify-content:center;margin-top:18px"><button class="primary-btn" onclick="PSR_GAME.openJoin()">TRY AGAIN</button><button class="secondary-btn" onclick="PSR_GAME.backHome()">BACK</button></div></section>`;
        return;
      }
      screen.innerHTML=`<section class="room-card glass" style="text-align:center"><div class="tag">CONNECTED</div><div class="section-title">WAITING FOR HOST</div><p class="section-copy">You are connected. Waiting for the host to send the lobby state…</p></section>`;
      later(()=>renderLobby(),180);
    });
  }

  function handleNetMessage(data,conn){
    if(state.host){
      if(data.type==='joinReady') return;
      if(data.type==='joinRequest'){
        if(data.roomCode && String(data.roomCode).toUpperCase()!==String(state.roomCode).toUpperCase()){
          conn?.send({type:'badRoom',message:'ROOM CODE MISMATCH'});return;
        }
        // Ignore duplicate join requests from the same browser/connection.
        const existing=state.players.find(x=>x.netId===conn?.peer);
        if(existing){
          try{conn?.send({type:'assigned',id:existing.id});conn?.send({type:'state',payload:publicState(),myId:existing.id})}catch(_){}
          return;
        }
        if(state.players.length>=6){conn?.send({type:'roomFull',message:'ROOM IS FULL (MAX 6 PLAYERS).'});return}
        const id=state.players.length;
        const safeName=String(data.name||`Player ${id+1}`).replace(/[<>]/g,'').slice(0,18)||`Player ${id+1}`;
        state.players.push({id,name:safeName,pos:0,points:0,shield:0,alive:true,color:C[id],connected:true,netId:conn.peer});
        state.hostConnections[id]=conn;
        try{
          conn?.send({type:'assigned',id});
          conn?.send({type:'state',payload:publicState(),myId:id});
        }catch(_){}
        renderLobby();return;
      }
      if(data.type==='requestState'){
        if(conn?.open){
          try{
            const known=state.players.find(x=>x.netId===conn.peer);
            conn.send({type:'state',payload:publicState(),myId:known?.id??0});
          }catch(_){}
        }
        return;
      }
      const sender=state.players.find(p=>String(p.netId)===String(conn?.peer));
      const senderPid=sender?.id;
      if(data.type==='roll'&&senderPid===state.current&&Number(data.pid)===senderPid){hostRoll();return}
      if(data.type==='farmAnswer'&&state.farm?.playerId===senderPid&&Number(data.pid)===senderPid){resolveFarmRemote(data.answer);return}
      if(data.type==='miniAnswer'){miniAnswerRemote(data,conn);return}
      if(data.type==='vote'&&state.phase==='suddenVote'&&senderPid!==undefined&&Number(data.pid)===senderPid){state.vote.votes[senderPid]=data.choice;broadcastState();render();if(Object.keys(state.vote.votes).length===2)later(resolveVote,260);return}
      if(data.type==='finalReady'&&state.phase==='finalReady'&&senderPid!==undefined&&Number(data.pid)===senderPid){readyFinal(senderPid);return}
      if(data.type==='skyAnswer'&&state.phase==='sudden'&&senderPid!==undefined&&Number(data.pid)===senderPid){resolveSkyAnswer(senderPid,data.answer,data.qIndex);return}
      return;
    }
    if(data.type==='assigned'){state.myNetId=data.id;return}
    if(data.type==='roomWelcome'){return}
    if(data.type==='joinReady'){return}
    if(data.type==='badRoom'){toast(data.message||'ROOM CODE MISMATCH','bad');return}
    if(data.type==='countdown'){showCountdown(()=>{render();announceTurn()});return}
    if(data.type==='farm'){state.farm=data.farm;openFarmForCurrent();return}
    if(data.type==='state'){applyPublicState(data.payload,data.myId);return}
    if(data.type==='skyFeedback'&&state.phase==='sudden'){if(data.pid===state.myNetId)skyWrongFeedback(data.pid);return}
    if(data.type==='roomFull')toast('ROOM FULL','bad');
  }
  function resolveFarmRemote(answer){if(!state.farm||state.farm.locked)return;state.farm.locked=true;resolveFarm(normalizeSentence(answer)===normalizeSentence(state.farm.card[1]))}
  function miniAnswerRemote(data,conn){
    if(!state.mini||state.phase!=='mini')return;
    const pid=Number(data.pid);
    const owner=state.players.find(p=>String(p.netId)===String(conn?.peer));
    if(owner && owner.id!==pid)return;
    if(data.q!==undefined&&Number(data.q)!==Number(state.mini.q))return;
    if(data.questionId!==undefined&&Number(data.questionId)!==Number(state.mini.questionId))return;
    if(!getPlayer(pid)||state.mini.answers[pid]!=null)return;
    state.mini.answers[pid]=data.answer;
    const correct=miniCorrect(data.answer);
    if(correct){state.mini.scores[pid]=(state.mini.scores[pid]||0)+1;getPlayer(pid).points+=25}
    markMiniLockRemote(pid,correct);
    if(Object.keys(state.mini.answers).length>=living().length)later(()=>finishMiniQuestion(),220);
    broadcastState();
  }
  function markMiniLockRemote(pid,correct){if(state.online&&state.host&&state.mini.answers){broadcastState()}}
  function applyPublicState(p,myId){
    const previousPhase=state.phase;
    const previousSudden=state.sudden;
    if(myId!==undefined)state.myNetId=myId;state.phase=p.phase;state.roomCode=p.roomCode;state.round=p.round;state.current=p.current;state.turnStage=p.turnStage;state.roll=p.roll;state.finishCandidates=p.finishCandidates||[];state.players=p.players;state.vote=p.vote;state.draw=p.draw;state.winner=p.winner?state.players.find(x=>x.id===p.winner.id)||p.winner:null;
    state.mini=p.mini?{...p.mini,roundWinners:[]}:null;state._miniResult=p.miniResult||null;state.sudden=p.sudden?{...p.sudden}:null;applyTheme(currentPlayer(),state.phase==='sudden'?'sky':null);
    if(state._miniResult){renderMiniResult();}
    else if(previousPhase==='sudden'&&state.phase==='sudden'&&document.querySelector('.skyfall-v9')){
      syncSkyfallFromState(previousSudden,state.sudden);
    }else{
      render();
    }
    if(state.phase==='board'&&state.current===state.myNetId&&state.turnStage==='roll')toast(`YOUR TURN • ${currentPlayer()?.name||''}`)
  }
  function onlinePlayerConnected(conn){if(state.host)renderLobby()}
  function onlinePlayerDisconnected(peer){
    if(!state.host)return;
    const p=state.players.find(x=>x.netId===peer);
    if(!p)return;
    p.connected=false;p.alive=false;
    toast(`${p.name} disconnected`,'bad');
    const alive=living();
    if(state.phase==='sudden'&&alive.length===1){finishGame(alive[0]);return;}
    if(state.phase==='finalReady'&&alive.length<2){finishGame(alive[0]||null);return;}
    if(state.phase==='suddenVote'&&alive.length<2){finishGame(alive[0]||null);return;}
    if(state.phase==='mini'&&state.mini&&Object.keys(state.mini.answers||{}).length>=alive.length){later(finishMiniQuestion,120);}
    if(state.current===p.id){const next=alive[0];if(next)state.current=next.id;}
    broadcastState();render();
  }
  function netToast(message){toast(String(message||'ONLINE CONNECTION ISSUE'),'bad')}
  function netError(e){
    const type=e?.type||'';
    const friendly={
      'peer-unavailable':'ROOM NOT FOUND • CHECK THE CODE AND HOST LOBBY.',
      'network':'NETWORK ERROR • CHECK INTERNET ACCESS.',
      'server-error':'PEER SERVER ERROR • TRY AGAIN.',
      'webrtc':'WEBRTC COULD NOT CONNECT • TRY ANOTHER NETWORK OR BROWSER.',
      'browser-incompatible':'THIS BROWSER DOES NOT SUPPORT WEBSOCKETS.',
      'socket-error':'ONLINE SERVER SOCKET ERROR • CHECK YOUR NETWORK.'
    };
    toast('ONLINE • '+(friendly[type]||e?.message||'Connection error'),'bad');
  }

  function updateMusicButton(){const b=$('musicToggle');if(!b)return;const on=!PSR_AUDIO.musicMuted;b.textContent=on?'♪ MUSIC ON':'♪ MUSIC OFF';b.classList.toggle('off',!on);b.setAttribute('aria-pressed',String(!on));}

  /* ---------- boot ---------- */
  function boot(){
    let progress=0;const bar=$('loaderBar'),txt=$('loaderText'),play=$('bootPlay'),bootLayer=$('bootScreen'),app=$('app');const labels=['LOADING ENGLISH ENGINE...','BUILDING SKYBOARD...','SYNCING ONLINE ARENA...','SYSTEM READY'];
    const timer=setInterval(()=>{progress+=7+Math.random()*14;if(progress>=100){progress=100;clearInterval(timer);bar.style.width='100%';txt.textContent=labels[3];play.classList.remove('hidden')}else{bar.style.width=progress+'%';txt.textContent=labels[Math.min(2,Math.floor(progress/30))]}},150);
    play.addEventListener('click',()=>{PSR_AUDIO.boot();bootLayer.classList.add('hidden');app.classList.remove('hidden');state.phase='home';render();updateMusicButton()});
    $('secretBtn').addEventListener('click',openSecret);
    $('musicToggle')?.addEventListener('click',()=>{PSR_AUDIO.toggleMusic?.();updateMusicButton()});
    updateMusicButton();
  }

  window.PSR_GAME={
    openCreate,openJoin,openHowToPlay,createRoom,joinRoom,startOnline,leaveRoom,backHome,render,closeOverlay,verifyCode,syncLocalInputs,startLocal,toggleScoreboard,
    rollDice,pickWord,submitFarm,chooseFarm,miniAnswer,pzWord,pzSubmit,continueAfterMini,vote,readyFinal,skySubmit,rematch,
    handleNetMessage,onlinePlayerConnected,onlinePlayerDisconnected,netError,netToast
  };
  window.addEventListener('beforeunload',()=>{clearTimers();PSR_NET.close()});
  boot();
})();
