(function(){
  'use strict';

  let ctx=null;
  const STORAGE_KEY='gs_music_enabled_v1';
  const music={
    menu:{src:'assets/music/menu.mp3',volume:.34,loop:true},
    gameplay:{src:'assets/music/gameplay.mp3',volume:.30,loop:true},
    skyfall:{src:'assets/music/skyfall.mp3',volume:.32,loop:true},
    victory:{src:'assets/music/victory.mp3',volume:.38,loop:true},
    solo:{src:'assets/music/solo.mp3',volume:.28,loop:true},
    delpino:{src:'assets/music/delpino.mp3',volume:.31,loop:true}
  };

  let musicEnabled=true;
  let musicKey='';
  let currentMusic=null;
  let currentPhase='menu';

  try{
    const saved=localStorage.getItem(STORAGE_KEY);
    if(saved==='0')musicEnabled=false;
    if(saved==='1')musicEnabled=true;
  }catch(_){ }

  function phaseToMusic(phase){
    if(phase==='board'||phase==='mini'||phase==='suddenVote'||phase==='finalReady')return 'gameplay';
    if(phase==='sudden')return 'skyfall';
    if(phase==='end')return 'victory';
    return 'menu';
  }

  function persist(){
    try{localStorage.setItem(STORAGE_KEY,musicEnabled?'1':'0')}catch(_){ }
  }

  function updateMusicButton(){
    const btn=document.getElementById('musicToggle');
    if(!btn)return;
    const icon=btn.querySelector('.music-toggle-icon');
    const label=btn.querySelector('.music-toggle-label');
    btn.classList.toggle('is-off',!musicEnabled);
    btn.setAttribute('aria-pressed',musicEnabled?'true':'false');
    btn.setAttribute('title',musicEnabled?'Turn music off':'Turn music on');
    btn.setAttribute('aria-label',musicEnabled?'Music is on. Click to turn it off.':'Music is off. Click to turn it on.');
    if(icon)icon.textContent=musicEnabled?'♪':'♪̸';
    if(label)label.textContent=musicEnabled?'MUSIC ON':'MUSIC OFF';
  }

  function stopMusic(){
    if(!currentMusic){musicKey='';return;}
    try{
      currentMusic.pause();
      currentMusic.currentTime=0;
      currentMusic.removeAttribute('src');
      currentMusic.load();
    }catch(_){ }
    currentMusic=null;
    musicKey='';
  }

  function playMusic(key){
    currentPhase=key||currentPhase;
    if(!musicEnabled||!music[key]){
      if(!musicEnabled)stopMusic();
      return false;
    }
    if(musicKey===key&&currentMusic){
      if(currentMusic.paused){
        const p=currentMusic.play();
        if(p?.catch)p.catch(()=>{});
      }
      return true;
    }

    stopMusic();
    const cfg=music[key];
    const a=new Audio(cfg.src);
    a.loop=cfg.loop!==false;
    a.preload='auto';
    a.volume=cfg.volume;
    a.setAttribute('aria-hidden','true');
    a.addEventListener('error',()=>{
      if(currentMusic===a){currentMusic=null;musicKey='';}
    },{once:true});
    currentMusic=a;
    musicKey=key;
    const promise=a.play();
    if(promise?.catch)promise.catch(()=>{
      // The next user gesture (for example the music button) retries playback.
    });
    return true;
  }

  function syncMusicForPhase(phase){
    currentPhase=phaseToMusic(phase);
    updateMusicButton();
    playMusic(currentPhase);
  }

  function setMusicEnabled(enabled){
    musicEnabled=!!enabled;
    persist();
    updateMusicButton();
    if(musicEnabled){
      playMusic(currentPhase||'menu');
    }else{
      stopMusic();
    }
    return musicEnabled;
  }

  function toggleMusic(){return setMusicEnabled(!musicEnabled)}

  function ensure(){
    if(ctx)return ctx;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    ctx=new AC();
    return ctx;
  }
  function resume(){
    const c=ensure();
    if(c&&c.state==='suspended')c.resume();
    return c;
  }
  // SFX has its own mute state. Turning music off must NOT silence game effects.
  let sfxEnabled=true;
  function tone(freq,d=.10,type='triangle',gain=.04,when=0,slide=0){
    if(!sfxEnabled)return;
    const c=resume();if(!c)return;
    const o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,c.currentTime+when);
    if(slide)o.frequency.linearRampToValueAtTime(Math.max(20,freq+slide),c.currentTime+when+d);
    g.gain.setValueAtTime(.0001,c.currentTime+when);
    g.gain.exponentialRampToValueAtTime(gain,c.currentTime+when+.01);
    g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+when+d);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime+when);o.stop(c.currentTime+when+d+.03);
  }
  function noise(d=.08,gain=.025){
    if(!sfxEnabled)return;
    const c=resume();if(!c)return;
    const b=c.createBuffer(1,Math.max(1,c.sampleRate*d),c.sampleRate),a=b.getChannelData(0);
    for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*(1-i/a.length);
    const s=c.createBufferSource(),g=c.createGain();s.buffer=b;g.gain.value=gain;s.connect(g).connect(c.destination);s.start();
  }

  const api={
    muted:false,
    get musicEnabled(){return musicEnabled},
    get currentMusicKey(){return musicKey},
    get sfxEnabled(){return sfxEnabled},
    playMusic,stopMusic,syncMusicForPhase,setMusicEnabled,toggleMusic,
    playModeMusic(key){currentPhase=key;playMusic(key);updateMusicButton();},
    setSfxEnabled(enabled){sfxEnabled=!!enabled},
    boot(){tone(260,.08,'triangle',.03);tone(390,.12,'triangle',.04,.09,50)},
    click(){tone(220,.035,'square',.014)},
    roll(){noise(.05,.02);tone(180,.05,'square',.024);tone(280,.07,'square',.022,.07,50)},
    roulette(){tone(420,.04,'square',.02);tone(560,.04,'square',.018,.07)},
    correct(){tone(540,.07,'sine',.04);tone(720,.11,'sine',.038,.07,80)},
    wrong(){tone(150,.15,'sawtooth',.04,0,-60);noise(.06,.02)},
    point(){tone(460,.05,'triangle',.03);tone(610,.08,'triangle',.03,.05)},
    jump(){tone(620,.07,'triangle',.035);tone(780,.09,'triangle',.032,.06,100)},
    eliminate(){tone(170,.13,'square',.04,0,-70);tone(90,.24,'sawtooth',.035,.1,-40)},
    vote(){tone(400,.06,'square',.025);tone(520,.08,'square',.03,.06)},
    planeEntry(){tone(170,.16,'sawtooth',.03,0,220);tone(250,.22,'triangle',.035,.09,320)},
    ready(){tone(480,.07,'square',.03);tone(690,.11,'square',.035,.06)},
    hit(){noise(.11,.04);tone(100,.15,'sawtooth',.045,0,-50)},
    victory(){tone(523,.12,'triangle',.04);tone(659,.12,'triangle',.04,.10);tone(784,.18,'triangle',.05,.20);tone(1047,.28,'triangle',.05,.34)},
    draw(){tone(300,.16,'triangle',.03);tone(260,.18,'triangle',.03,.16,-30)},
    countdown(n){tone(n===1?880:n===2?660:520,.18,'triangle',.05)}
  };

  function bindMusicButton(){
    updateMusicButton();
    const btn=document.getElementById('musicToggle');
    if(btn&&!btn.dataset.bound){
      btn.dataset.bound='1';
      btn.addEventListener('click',ev=>{
        ev.preventDefault();
        ev.stopPropagation();
        resume();
        toggleMusic();
        tone(musicEnabled?520:240,.07,'triangle',.03);
      });
    }
  }

  window.GS_MUSIC_TOGGLE=()=>{resume();return toggleMusic()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindMusicButton,{once:true});
  else bindMusicButton();

  document.addEventListener('click',e=>{
    if(e.target.closest('button')&&!e.target.closest('#musicToggle'))api.click();
  },{passive:true});
  window.PSR_AUDIO=api;
})();
