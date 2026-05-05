<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <title>Running Tracker</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0a0a0f;--panel:#111118;--border:#222230;
      --accent:#00e676;--accent2:#00b0ff;--warn:#ff6d00;
      --danger:#f44336;--text:#e8eaf0;--sub:#7986a0;--r:14px;
    }
    html,body{height:100%;font-family:'Helvetica Neue',system-ui,sans-serif;
      background:var(--bg);color:var(--text);overflow:hidden;
      -webkit-tap-highlight-color:transparent}
    #app{display:grid;grid-template-rows:auto 1fr auto;height:100dvh}
    header{
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 16px env(safe-area-inset-top,0) 16px;
      padding-top:max(12px,env(safe-area-inset-top));
      background:var(--panel);border-bottom:1px solid var(--border);gap:8px;
    }
    header h1{font-size:17px;font-weight:800;letter-spacing:1px;color:var(--accent)}
    #timer{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;
      letter-spacing:2px;color:var(--text)}
    #status-dot{width:10px;height:10px;border-radius:50%;background:var(--sub);
      transition:background .4s;flex-shrink:0}
    #status-dot.active{background:var(--accent);box-shadow:0 0 8px var(--accent);
      animation:pulse 1.4s infinite}
    #status-dot.paused{background:var(--warn);box-shadow:0 0 8px var(--warn)}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    #map-wrap{position:relative}
    #map{width:100%;height:100%;z-index:1}
    #pace-card{
      position:absolute;top:10px;right:10px;
      background:rgba(10,10,15,.82);border:1px solid var(--border);
      border-radius:var(--r);padding:10px 14px;z-index:500;
      backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);min-width:120px;
    }
    .pc-val{font-size:22px;font-weight:800;color:var(--accent2)}
    .pc-label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--sub)}
    #stats{
      display:grid;grid-template-columns:repeat(4,1fr);
      background:var(--panel);border-top:1px solid var(--border);
      padding:10px 4px 12px;gap:2px;
    }
    .stat{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 2px}
    .stat-val{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1}
    .stat-unit{font-size:10px;color:var(--sub);text-transform:uppercase;letter-spacing:.6px}
    .stat-label{font-size:10px;color:var(--sub);letter-spacing:.4px}
    .stat.green .stat-val{color:var(--accent)}
    .stat.blue  .stat-val{color:var(--accent2)}
    .stat.warn  .stat-val{color:var(--warn)}
    .stat.heart .stat-val{color:#ff4d6d}
    #controls{
      display:flex;justify-content:center;gap:12px;
      padding:10px 14px max(12px,env(safe-area-inset-bottom));
      background:var(--panel);border-top:1px solid var(--border);
    }
    .btn{
      flex:1;max-width:160px;padding:13px 8px;border:none;border-radius:50px;
      font-size:15px;font-weight:700;cursor:pointer;letter-spacing:.4px;
      transition:transform .1s,opacity .2s;-webkit-appearance:none;
    }
    .btn:active{transform:scale(.95)}
    #btn-start{background:var(--accent);color:#000}
    #btn-pause{background:var(--warn);color:#000;display:none}
    #btn-stop{background:var(--danger);color:#fff;display:none}
    #btn-hr{background:var(--border);color:#ff4d6d;font-size:22px;
      max-width:54px;display:flex;align-items:center;justify-content:center}
    #voice-badge{
      position:fixed;top:70px;left:50%;
      transform:translateX(-50%) translateY(-16px);
      background:rgba(0,0,0,.88);border:1px solid var(--accent);
      color:var(--accent);padding:8px 18px;border-radius:50px;
      font-size:13px;font-weight:600;opacity:0;
      transition:opacity .3s,transform .3s;pointer-events:none;
      z-index:9999;max-width:90vw;text-align:center;
    }
    #voice-badge.show{opacity:1;transform:translateX(-50%) translateY(0)}
    #hr-modal{
      display:none;position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:9000;
      flex-direction:column;align-items:center;justify-content:center;gap:20px;
    }
    #hr-modal.show{display:flex}
    #hr-canvas-wrap{
      position:relative;width:160px;height:160px;border-radius:50%;
      overflow:hidden;border:4px solid #ff4d6d;flex-shrink:0;
    }
    #hr-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    #hr-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:0}
    #hr-bpm-big{font-size:64px;font-weight:900;color:#ff4d6d;line-height:1;
      font-variant-numeric:tabular-nums}
    #hr-status{color:var(--sub);font-size:14px;text-align:center;max-width:260px}
    #hr-close{padding:14px 40px;border-radius:50px;border:none;
      background:var(--border);color:var(--text);font-size:16px;
      font-weight:700;cursor:pointer;-webkit-appearance:none;}
    #modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.8);
      z-index:9000;align-items:center;justify-content:center;}
    #modal.show{display:flex}
    #modal-card{background:var(--panel);border:1px solid var(--border);border-radius:22px;
      padding:28px 24px;width:90%;max-width:360px;text-align:center;}
    #modal-card h2{font-size:20px;margin-bottom:18px;color:var(--accent)}
    .modal-row{display:flex;justify-content:space-between;padding:10px 0;
      border-bottom:1px solid var(--border);font-size:15px}
    .modal-row span:last-child{font-weight:700}
    .modal-row span:first-child{color:var(--sub)}
    #modal-close{margin-top:20px;width:100%;padding:14px;border-radius:50px;
      border:none;background:var(--accent);color:#000;
      font-size:16px;font-weight:700;cursor:pointer;-webkit-appearance:none;}
  </style>
</head>
<body>
<div id="app">
  <header>
    <div style="display:flex;align-items:center;gap:8px">
      <div id="status-dot"></div>
      <h1>&#x1F3C3; RUNNING</h1>
    </div>
    <div id="timer">00:00:00</div>
    <div style="font-size:11px;color:var(--sub);text-align:right;line-height:1.6">
      <div id="gps-acc">GPS: –</div>
      <div id="voice-state" style="cursor:pointer">&#x1F50A; Voz</div>
    </div>
  </header>
  <div id="map-wrap">
    <div id="map"></div>
    <div id="pace-card">
      <div class="pc-label">Ritmo</div>
      <div class="pc-val" id="pace-val">–'–"</div>
      <div class="pc-label">min / km</div>
    </div>
  </div>
  <div id="stats">
    <div class="stat green"><div class="stat-val" id="s-km">0.00</div><div class="stat-unit">km</div><div class="stat-label">Distancia</div></div>
    <div class="stat blue"><div class="stat-val" id="s-speed">0.0</div><div class="stat-unit">km/h</div><div class="stat-label">Velocidad</div></div>
    <div class="stat warn"><div class="stat-val" id="s-cal">0</div><div class="stat-unit">kcal</div><div class="stat-label">Calorías</div></div>
    <div class="stat heart"><div class="stat-val" id="s-bpm">–</div><div class="stat-unit">bpm</div><div class="stat-label">&#x2665; Pulso</div></div>
  </div>
  <div id="controls">
    <button class="btn" id="btn-start" onclick="startRun()">&#x25B6; Iniciar</button>
    <button class="btn" id="btn-pause" onclick="pauseRun()">&#x23F8; Pausa</button>
    <button class="btn" id="btn-stop"  onclick="stopRun()">&#x23F9; Fin</button>
    <button class="btn" id="btn-hr"    onclick="openHR()">&#x2665;</button>
  </div>
</div>
<div id="voice-badge"></div>
<div id="hr-modal">
  <div id="hr-canvas-wrap">
    <video id="hr-video" autoplay playsinline muted></video>
    <canvas id="hr-canvas" width="160" height="160"></canvas>
  </div>
  <div id="hr-bpm-big">–</div>
  <div id="hr-status">Cubre la cámara trasera con el dedo.<br>Mantén presionado suavemente.</div>
  <button id="hr-close" onclick="closeHR()">Cerrar</button>
</div>
<div id="modal">
  <div id="modal-card">
    <h2>&#x1F3C6; Resumen</h2>
    <div class="modal-row"><span>Distancia</span><span id="m-km">–</span></div>
    <div class="modal-row"><span>Tiempo</span><span id="m-time">–</span></div>
    <div class="modal-row"><span>Ritmo medio</span><span id="m-pace">–</span></div>
    <div class="modal-row"><span>Vel. máxima</span><span id="m-maxspeed">–</span></div>
    <div class="modal-row"><span>Calorías</span><span id="m-cal">–</span></div>
    <div class="modal-row"><span>Pulso medio</span><span id="m-bpm">–</span></div>
    <button id="modal-close" onclick="closeModal()">Cerrar</button>
  </div>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const S={running:false,paused:false,startTime:null,elapsed:0,km:0,speed:0,maxSpeed:0,
  calories:0,bpm:null,bpmSum:0,bpmCount:0,positions:[],watchId:null,timerIv:null,
  lastKmAnn:0,lastPaceAnn:null,lastBpmAnn:null,voiceEnabled:true,voiceReady:false};
const WEIGHT=70;

const map=L.map('map',{zoomControl:false,attributionControl:false,tap:false});
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{
  maxZoom:19,attribution:'&copy; CARTO'
}).addTo(map);
L.control.zoom({position:'bottomright'}).addTo(map);
const route=L.polyline([],{color:'#00e676',weight:5,opacity:.9}).addTo(map);
let marker=null;

function setView(lat,lng){map.setView([lat,lng],map.getZoom()<15?16:map.getZoom());}

function updateMarker(lat,lng,heading){
  const rot=(heading!=null&&!isNaN(heading))?heading:0;
  const html=`<div style="width:36px;height:36px;position:relative;transform:rotate(${rot}deg)">
    <div style="width:0;height:0;border-left:10px solid transparent;border-right:10px solid transparent;
      border-bottom:28px solid #00e5ff;position:absolute;top:0;left:8px;
      filter:drop-shadow(0 0 6px #00e5ff)"></div>
    <div style="width:14px;height:14px;border-radius:50%;background:#fff;border:3px solid #00e5ff;
      position:absolute;bottom:0;left:11px;box-shadow:0 0 8px #00e5ff"></div>
  </div>`;
  if(!marker){
    marker=L.marker([lat,lng],{icon:L.divIcon({html,iconSize:[36,36],iconAnchor:[18,18],className:''}),zIndexOffset:1000}).addTo(map);
  } else {
    marker.setLatLng([lat,lng]);
    marker.setIcon(L.divIcon({html,iconSize:[36,36],iconAnchor:[18,18],className:''}));
  }
}

function haversine(a,b,c,d){
  const R=6371,dl=(c-a)*Math.PI/180,dg=(d-b)*Math.PI/180;
  const x=Math.sin(dl/2)**2+Math.cos(a*Math.PI/180)*Math.cos(c*Math.PI/180)*Math.sin(dg/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}

function elapsedSec(){return((S.elapsed+(S.startTime?Date.now()-S.startTime:0))/1000);}
function fmt(s){
  s=Math.floor(s);
  return[Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(n=>n.toString().padStart(2,'0')).join(':');
}
function pace(kmh){
  if(!kmh||kmh<0.5)return'–\'–"';
  const t=3600/kmh,m=Math.floor(t/60),s=Math.floor(t%60).toString().padStart(2,'0');
  return`${m}'${s}"`;
}
function calcCal(){return Math.round(8*WEIGHT*(elapsedSec()/3600));}

function onPos(p){
  const{latitude:la,longitude:ln,accuracy:ac,speed:gs,heading:hd}=p.coords;
  document.getElementById('gps-acc').textContent=`GPS: ±${Math.round(ac)}m`;
  if(ac>80&&S.positions.length>0)return;
  let kmh=0;
  if(gs!=null&&gs>=0)kmh=gs*3.6;
  if(S.positions.length){
    const pv=S.positions[S.positions.length-1];
    const d=haversine(pv.lat,pv.lng,la,ln);
    if(d>0.003)S.km+=d;
    if(gs==null){const dt=(Date.now()-pv.ts)/1000;kmh=dt>0?(d/dt)*3600:0;}
  }
  S.speed=kmh<60?kmh:S.speed;
  if(S.speed>S.maxSpeed)S.maxSpeed=S.speed;
  document.getElementById('s-km').textContent=S.km.toFixed(2);
  document.getElementById('s-speed').textContent=S.speed.toFixed(1);
  document.getElementById('pace-val').textContent=pace(S.speed);
  S.positions.push({lat:la,lng:ln,ts:Date.now()});
  route.addLatLng([la,ln]);
  updateMarker(la,ln,hd);
  setView(la,ln);
  if(S.running)voiceCheck();
}
function onGpsErr(e){
  const msgs={1:'Permiso GPS denegado',2:'GPS no disponible',3:'GPS: tiempo agotado'};
  document.getElementById('gps-acc').textContent=msgs[e.code]||'GPS: error';
}
function startGPS(){
  S.watchId=navigator.geolocation.watchPosition(onPos,onGpsErr,
    {enableHighAccuracy:true,maximumAge:0,timeout:15000});
}
function stopGPS(){if(S.watchId!=null){navigator.geolocation.clearWatch(S.watchId);S.watchId=null;}}

function primeVoice(){
  if(S.voiceReady)return;
  const u=new SpeechSynthesisUtterance('');u.volume=0;u.lang='es-ES';
  window.speechSynthesis.speak(u);S.voiceReady=true;
}
function speak(text){
  if(!S.voiceEnabled)return;
  window.speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang='es-ES';u.rate=1.05;u.pitch=1;
  window.speechSynthesis.speak(u);badge(text);
}
function badge(text){
  const b=document.getElementById('voice-badge');
  b.textContent=text;b.classList.add('show');
  clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('show'),4500);
}
function paceZone(kmh){
  if(kmh<4)return'caminando';if(kmh<7)return'trote';
  if(kmh<10)return'ritmo suave';if(kmh<13)return'ritmo medio';
  if(kmh<16)return'ritmo rápido';return'sprint';
}
const ZONE_MSG={
  'caminando':'Estás caminando. ¡Vamos, acelera!',
  'trote':'Buen trote. ¡Mantén el ritmo!',
  'ritmo suave':'Ritmo suave. ¡Muy bien!',
  'ritmo medio':'Buen ritmo medio. ¡Sigue así!',
  'ritmo rápido':'¡Ritmo rápido! ¡Excelente!',
  'sprint':'¡Sprint! ¡Dalo todo!',
};
function voiceCheck(){
  const km=S.km,sp=S.speed,sec=elapsedSec(),mile=Math.floor(km);
  if(mile>0&&mile>S.lastKmAnn){
    S.lastKmAnn=mile;
    speak(`Kilómetro ${mile}. Tiempo: ${Math.floor(sec/60)} minutos. Ritmo: ${pace(sp)} por kilómetro.`);
    return;
  }
  const zone=paceZone(sp);
  if(zone!==S.lastPaceAnn&&sec>12){S.lastPaceAnn=zone;speak(ZONE_MSG[zone]||zone);}
  if(S.bpm){
    if(S.bpm>180&&S.lastBpmAnn!=='hi'){S.lastBpmAnn='hi';speak('Pulso muy alto. Considera bajar el ritmo.');}
    else if(S.bpm<130&&S.lastBpmAnn!=='lo'){S.lastBpmAnn='lo';speak('Pulso bajo. Puedes aumentar la intensidad.');}
    else if(S.bpm>=130&&S.bpm<=180){S.lastBpmAnn=null;}
  }
}

function startRun(){
  primeVoice();
  if(S.paused){
    S.startTime=Date.now();S.paused=false;S.running=true;
    document.getElementById('status-dot').className='active';
    document.getElementById('btn-pause').style.display='';
    document.getElementById('btn-start').style.display='none';
    S.timerIv=setInterval(tick,500);
    speak('Reanudando carrera');startGPS();return;
  }
  Object.assign(S,{running:true,startTime:Date.now(),elapsed:0,km:0,speed:0,
    maxSpeed:0,calories:0,positions:[],lastKmAnn:0,lastPaceAnn:null,
    lastBpmAnn:null,bpmSum:0,bpmCount:0,bpm:null});
  route.setLatLngs([]);
  document.getElementById('btn-start').style.display='none';
  document.getElementById('btn-pause').style.display='';
  document.getElementById('btn-stop').style.display='';
  document.getElementById('status-dot').className='active';
  S.timerIv=setInterval(tick,500);
  navigator.geolocation.getCurrentPosition(p=>{onPos(p);startGPS();speak('Carrera iniciada. ¡Buena suerte!');},
    onGpsErr,{enableHighAccuracy:true,timeout:12000,maximumAge:0});
}
function pauseRun(){
  S.paused=true;S.running=false;
  S.elapsed+=Date.now()-S.startTime;S.startTime=null;
  clearInterval(S.timerIv);stopGPS();
  document.getElementById('status-dot').className='paused';
  document.getElementById('btn-pause').style.display='none';
  document.getElementById('btn-start').textContent='▶ Reanudar';
  document.getElementById('btn-start').style.display='';
  speak('Carrera pausada');
}
function stopRun(){
  S.running=false;S.paused=false;
  if(S.startTime){S.elapsed+=Date.now()-S.startTime;S.startTime=null;}
  clearInterval(S.timerIv);stopGPS();
  document.getElementById('status-dot').className='';
  document.getElementById('btn-start').style.display='';
  document.getElementById('btn-start').textContent='▶ Iniciar';
  document.getElementById('btn-pause').style.display='none';
  document.getElementById('btn-stop').style.display='none';
  const sec=S.elapsed/1000;
  const avgPace=S.km>0?pace(S.km/(sec/3600)):'–';
  const avgBpm=S.bpmCount>0?Math.round(S.bpmSum/S.bpmCount)+' bpm':'–';
  document.getElementById('m-km').textContent=S.km.toFixed(2)+' km';
  document.getElementById('m-time').textContent=fmt(sec);
  document.getElementById('m-pace').textContent=avgPace+' /km';
  document.getElementById('m-maxspeed').textContent=S.maxSpeed.toFixed(1)+' km/h';
  document.getElementById('m-cal').textContent=calcCal()+' kcal';
  document.getElementById('m-bpm').textContent=avgBpm;
  document.getElementById('modal').classList.add('show');
  speak(`Carrera finalizada. ${S.km.toFixed(2)} kilómetros en ${fmt(sec)}. Ritmo: ${avgPace}.`);
}
function closeModal(){document.getElementById('modal').classList.remove('show');}
function tick(){
  document.getElementById('timer').textContent=fmt(elapsedSec());
  document.getElementById('s-cal').textContent=calcCal();
}

document.getElementById('voice-state').addEventListener('click',()=>{
  primeVoice();S.voiceEnabled=!S.voiceEnabled;
  document.getElementById('voice-state').textContent=S.voiceEnabled?'🔊 Voz':'🔇 Silencio';
  if(S.voiceEnabled)speak('Voz activada');
});

const HR={stream:null,animId:null,samples:[],lastBpm:null,WIN:300,MIN_DIST:15};
async function openHR(){
  primeVoice();
  document.getElementById('hr-modal').classList.add('show');
  document.getElementById('hr-bpm-big').textContent='–';
  document.getElementById('hr-status').textContent='Cubre la cámara trasera con el dedo.';
  HR.samples=[];HR.lastBpm=null;
  try{HR.stream=await navigator.mediaDevices.getUserMedia(
    {video:{facingMode:{exact:'environment'},width:{ideal:160},height:{ideal:160}}});}
  catch(e){
    try{HR.stream=await navigator.mediaDevices.getUserMedia({video:true});}
    catch(e2){document.getElementById('hr-status').textContent='No se pudo acceder a la cámara.';return;}
  }
  const video=document.getElementById('hr-video');
  video.srcObject=HR.stream;
  const track=HR.stream.getVideoTracks()[0];
  try{await track.applyConstraints({advanced:[{torch:true}]});}catch(_){}
  const canvas=document.getElementById('hr-canvas'),ctx=canvas.getContext('2d');
  let fc=0;
  function loop(){
    if(!HR.stream)return;
    HR.animId=requestAnimationFrame(loop);
    if(++fc%2!==0)return;
    ctx.drawImage(video,0,0,160,160);
    const px=ctx.getImageData(60,60,40,40).data;
    let r=0;const n=px.length/4;
    for(let i=0;i<px.length;i+=4)r+=px[i];
    HR.samples.push(r/n);
    if(HR.samples.length>HR.WIN)HR.samples.shift();
    if(HR.samples.length>=60)detectBPM();
  }
  loop();
}
function detectBPM(){
  const sig=HR.samples,WS=15;
  const det=sig.map((v,i)=>{
    const lo=Math.max(0,i-WS),hi=Math.min(sig.length-1,i+WS);
    let s=0;for(let j=lo;j<=hi;j++)s+=sig[j];return v-s/(hi-lo+1);
  });
  const peaks=[];
  for(let i=1;i<det.length-1;i++){
    if(det[i]>det[i-1]&&det[i]>det[i+1]){
      if(!peaks.length||i-peaks[peaks.length-1]>=HR.MIN_DIST)peaks.push(i);
    }
  }
  if(peaks.length<2)return;
  const intervals=[];
  for(let i=1;i<peaks.length;i++)intervals.push(peaks[i]-peaks[i-1]);
  const bpm=Math.round(60/(intervals.reduce((a,b)=>a+b,0)/intervals.length/15));
  if(bpm<40||bpm>200)return;
  S.bpm=bpm;S.bpmSum+=bpm;S.bpmCount++;
  document.getElementById('hr-bpm-big').textContent=bpm;
  document.getElementById('s-bpm').textContent=bpm;
  document.getElementById('hr-status').textContent=
    bpm<60?'Pulso bajo':bpm<100?'Pulso normal':bpm<140?'Zona aeróbica':bpm<170?'Alta intensidad':'Pulso muy alto';
}
function closeHR(){
  cancelAnimationFrame(HR.animId);
  if(HR.stream){HR.stream.getTracks().forEach(t=>t.stop());HR.stream=null;}
  document.getElementById('hr-modal').classList.remove('show');
}

navigator.geolocation.getCurrentPosition(
  p=>{map.setView([p.coords.latitude,p.coords.longitude],17);
      updateMarker(p.coords.latitude,p.coords.longitude,p.coords.heading);},
  ()=>map.setView([40.4168,-3.7038],13),
  {enableHighAccuracy:true,timeout:12000,maximumAge:0}
);
</script>
</body>
</html>
