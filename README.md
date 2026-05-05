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
      --bg:#0a0a0f;--panel:#111118;--border:#1e1e2a;
      --accent:#00e676;--accent2:#00b0ff;--warn:#ff6d00;
      --danger:#f44336;--text:#e8eaf0;--sub:#6b7a99;--r:12px;
    }

    /* BUG-FIX #2: body position:fixed + height:100% fills full screen.
       #app uses height:100% — no double-counting of safe-area-insets. */
    html{height:100%}
    body{
      height:100%;width:100%;
      font-family:-apple-system,'Helvetica Neue',sans-serif;
      background:var(--bg);color:var(--text);
      overflow:hidden;position:fixed;
      -webkit-tap-highlight-color:transparent;
    }

    #app{
      display:grid;
      grid-template-rows:auto 1fr auto auto;
      height:100%;
    }

    /* ── Header ── */
    header{
      display:flex;align-items:center;justify-content:space-between;
      padding:8px 14px;
      padding-top:max(8px,env(safe-area-inset-top));
      background:var(--panel);border-bottom:1px solid var(--border);
      gap:8px;
    }
    .hd-left{display:flex;align-items:center;gap:7px;flex-shrink:0}
    header h1{font-size:14px;font-weight:800;letter-spacing:1px;color:var(--accent)}
    #status-dot{width:8px;height:8px;border-radius:50%;
      background:var(--sub);transition:background .4s;flex-shrink:0}
    #status-dot.active{background:var(--accent);
      box-shadow:0 0 6px var(--accent);animation:blink 1.4s infinite}
    #status-dot.paused{background:var(--warn);box-shadow:0 0 6px var(--warn)}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}

    #timer{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;
      letter-spacing:1px;color:var(--text);flex-shrink:0}

    .hd-right{font-size:10px;color:var(--sub);text-align:right;line-height:1.8;min-width:56px}
    #voice-state{cursor:pointer;-webkit-user-select:none;user-select:none}

    /* ── Map ── */
    #map-wrap{position:relative;min-height:0}
    #map{width:100%;height:100%}

    /* GPS spinner overlay — BUG-FIX #1: hidden via JS on EVERY position, not just first */
    #gps-overlay{
      display:none;position:absolute;inset:0;z-index:800;
      background:rgba(10,10,15,.72);
      backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);
      flex-direction:column;align-items:center;justify-content:center;gap:10px;
    }
    #gps-overlay.show{display:flex}
    .spinner{width:42px;height:42px;border-radius:50%;
      border:3px solid var(--border);border-top-color:var(--accent);
      animation:spin 1s linear infinite}
    @keyframes spin{to{transform:rotate(360deg)}}
    #gps-overlay p{color:var(--accent);font-size:13px;font-weight:600}

    /* Pace overlay */
    #pace-card{
      position:absolute;top:10px;right:10px;
      background:rgba(10,10,15,.86);border:1px solid var(--border);
      border-radius:var(--r);padding:7px 11px;z-index:500;
      backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);min-width:100px;
    }
    .pc-val{font-size:19px;font-weight:800;color:var(--accent2);
      font-variant-numeric:tabular-nums}
    .pc-label{font-size:9px;text-transform:uppercase;letter-spacing:.7px;color:var(--sub)}

    /* ── Stats ── */
    #stats{
      display:grid;grid-template-columns:repeat(4,1fr);
      background:var(--panel);border-top:1px solid var(--border);
      padding:6px 2px 8px;
    }
    .stat{display:flex;flex-direction:column;align-items:center;
      gap:1px;padding:3px 2px}
    .stat-val{font-size:19px;font-weight:800;
      font-variant-numeric:tabular-nums;line-height:1.1}
    .stat-unit{font-size:9px;color:var(--sub);text-transform:uppercase;letter-spacing:.4px}
    .stat-label{font-size:9px;color:var(--sub)}
    .stat.green .stat-val{color:var(--accent)}
    .stat.blue  .stat-val{color:var(--accent2)}
    .stat.warn  .stat-val{color:var(--warn)}
    .stat.heart .stat-val{color:#ff4d6d}

    /* ── Controls ── */
    #controls{
      display:flex;align-items:center;justify-content:center;gap:9px;
      padding:7px 12px;
      padding-bottom:max(12px,env(safe-area-inset-bottom));
      background:var(--panel);border-top:1px solid var(--border);
    }
    .btn{
      flex:1;max-width:148px;padding:11px 6px;border:none;border-radius:50px;
      font-size:14px;font-weight:700;cursor:pointer;
      -webkit-appearance:none;transition:transform .1s;letter-spacing:.2px;
    }
    .btn:active{transform:scale(.93)}
    #btn-start{background:var(--accent);color:#000}
    #btn-pause{background:var(--warn);color:#000;display:none}
    #btn-stop {background:var(--danger);color:#fff;display:none}
    #btn-hr{
      flex:none;width:46px;height:46px;border-radius:50%;
      background:rgba(255,77,109,.12);color:#ff4d6d;
      font-size:20px;border:1px solid rgba(255,77,109,.35);
      display:flex;align-items:center;justify-content:center;
    }

    /* ── Voice badge ── */
    #voice-badge{
      position:fixed;top:64px;left:50%;
      transform:translateX(-50%) translateY(-10px);
      background:rgba(0,0,0,.92);border:1px solid var(--accent);
      color:var(--accent);padding:6px 15px;border-radius:50px;
      font-size:12px;font-weight:600;opacity:0;
      transition:opacity .28s,transform .28s;pointer-events:none;
      z-index:9999;max-width:86vw;text-align:center;
    }
    #voice-badge.show{opacity:1;transform:translateX(-50%) translateY(0)}

    /* ── HR modal ── */
    #hr-modal{
      display:none;position:fixed;inset:0;background:rgba(0,0,0,.94);
      z-index:9000;flex-direction:column;align-items:center;
      justify-content:center;gap:16px;
    }
    #hr-modal.show{display:flex}
    #hr-wrap{position:relative;width:144px;height:144px;border-radius:50%;
      overflow:hidden;border:4px solid #ff4d6d;flex-shrink:0}
    #hr-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
    #hr-canvas{position:absolute;inset:0;width:100%;height:100%;opacity:0}
    #hr-bpm{font-size:56px;font-weight:900;color:#ff4d6d;line-height:1;
      font-variant-numeric:tabular-nums}
    #hr-msg{color:var(--sub);font-size:13px;text-align:center;
      max-width:230px;line-height:1.5}
    #hr-close{padding:12px 34px;border-radius:50px;border:none;
      background:var(--border);color:var(--text);font-size:14px;
      font-weight:700;cursor:pointer;-webkit-appearance:none}

    /* ── Summary modal ── */
    #modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,.84);
      z-index:9000;align-items:center;justify-content:center}
    #modal.show{display:flex}
    #modal-card{background:var(--panel);border:1px solid var(--border);
      border-radius:18px;padding:22px 18px;width:86%;max-width:330px;text-align:center}
    #modal-card h2{font-size:17px;margin-bottom:14px;color:var(--accent)}
    .mrow{display:flex;justify-content:space-between;padding:8px 0;
      border-bottom:1px solid var(--border);font-size:13px}
    .mrow span:first-child{color:var(--sub)}
    .mrow span:last-child{font-weight:700}
    #modal-close{margin-top:16px;width:100%;padding:12px;border-radius:50px;
      border:none;background:var(--accent);color:#000;font-size:14px;
      font-weight:700;cursor:pointer;-webkit-appearance:none}

    .leaflet-container{font:inherit}
    .leaflet-control-zoom a{
      width:32px!important;height:32px!important;line-height:32px!important;font-size:17px!important}
  </style>
</head>
<body>
<div id="app">

  <header>
    <div class="hd-left">
      <div id="status-dot"></div>
      <h1>&#x1F3C3; RUNNING</h1>
    </div>
    <div id="timer">00:00:00</div>
    <div class="hd-right">
      <div id="gps-acc">GPS –</div>
      <div style="display:flex;align-items:center;justify-content:flex-end;gap:5px">
        <span id="lock-icon" style="font-size:11px" title="Pantalla encendida">🔓</span>
        <div id="voice-state">&#x1F50A; Voz</div>
      </div>
    </div>
  </header>

  <div id="map-wrap">
    <div id="map"></div>
    <div id="gps-overlay">
      <div class="spinner"></div>
      <p>Buscando GPS…</p>
    </div>
    <div id="pace-card">
      <div class="pc-label">Ritmo</div>
      <div class="pc-val" id="pace-val">–'–"</div>
      <div class="pc-label">min / km</div>
    </div>
  </div>

  <div id="stats">
    <div class="stat green">
      <div class="stat-val" id="s-km">0.00</div>
      <div class="stat-unit">km</div>
      <div class="stat-label">Distancia</div>
    </div>
    <div class="stat blue">
      <div class="stat-val" id="s-speed">0.0</div>
      <div class="stat-unit">km/h</div>
      <div class="stat-label">Velocidad</div>
    </div>
    <div class="stat warn">
      <div class="stat-val" id="s-cal">0</div>
      <div class="stat-unit">kcal</div>
      <div class="stat-label">Calorías</div>
    </div>
    <div class="stat heart">
      <div class="stat-val" id="s-bpm">–</div>
      <div class="stat-unit">bpm</div>
      <div class="stat-label">&#x2665; Pulso</div>
    </div>
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
  <div id="hr-wrap">
    <video id="hr-video" autoplay playsinline muted></video>
    <canvas id="hr-canvas" width="144" height="144"></canvas>
  </div>
  <div id="hr-bpm">–</div>
  <div id="hr-msg">Cubre la cámara trasera con el dedo.<br>Mantén presionado suavemente.</div>
  <button id="hr-close" onclick="closeHR()">Cerrar</button>
</div>

<div id="modal">
  <div id="modal-card">
    <h2>&#x1F3C6; Resumen</h2>
    <div class="mrow"><span>Distancia</span>  <span id="m-km">–</span></div>
    <div class="mrow"><span>Tiempo</span>      <span id="m-time">–</span></div>
    <div class="mrow"><span>Ritmo medio</span> <span id="m-pace">–</span></div>
    <div class="mrow"><span>Vel. máxima</span> <span id="m-maxspeed">–</span></div>
    <div class="mrow"><span>Calorías</span>    <span id="m-cal">–</span></div>
    <div class="mrow"><span>Pulso medio</span> <span id="m-bpm">–</span></div>
    <button id="modal-close" onclick="closeModal()">Cerrar</button>
  </div>
</div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
// ─────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────
const S = {
  running:   false,
  paused:    false,
  startTime: null,
  elapsed:   0,          // ms acumulados (excluye pausa actual)
  km:        0,
  speed:     0,          // km/h suavizado
  maxSpeed:  0,
  bpm:       null,
  bpmSum:    0,
  bpmCount:  0,
  positions: [],
  watchId:   null,
  timerIv:   null,
  lastKmAnn: 0,
  lastPaceAnn: null,
  lastBpmAnn:  null,
  voiceEnabled: true,
  voiceReady:   false,
};
const WEIGHT = 70; // kg — estimación calorías

// ─────────────────────────────────────────────────────────
// Mapa — CartoDB Voyager (estilo tipo Waze, sin API key)
// ─────────────────────────────────────────────────────────
const map = L.map('map', { zoomControl:false, attributionControl:false, tap:false });
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  { maxZoom:19 }).addTo(map);
L.control.zoom({ position:'bottomright' }).addTo(map);
const routeLine = L.polyline([], { color:'#00e676', weight:5, opacity:.9 }).addTo(map);
let mkr = null;

function setView(la, ln) {
  map.setView([la, ln], map.getZoom() < 15 ? 17 : map.getZoom());
}

function mkrIcon(rot) {
  return L.divIcon({
    className: '',
    iconSize:  [36, 36],
    iconAnchor:[18, 20],
    html: `<div style="width:36px;height:36px;transform:rotate(${rot||0}deg)">
      <div style="width:0;height:0;border-left:9px solid transparent;
        border-right:9px solid transparent;border-bottom:26px solid #00e5ff;
        margin:0 auto;filter:drop-shadow(0 0 5px #00e5ff)"></div>
      <div style="width:12px;height:12px;border-radius:50%;background:#fff;
        border:2.5px solid #00e5ff;margin:0 auto;box-shadow:0 0 6px #00e5ff"></div>
    </div>`
  });
}
function moveMkr(la, ln, hd) {
  const rot = (hd != null && !isNaN(hd) && hd >= 0) ? hd : 0;
  if (!mkr) mkr = L.marker([la, ln], { icon:mkrIcon(rot), zIndexOffset:1000 }).addTo(map);
  else      { mkr.setLatLng([la, ln]); mkr.setIcon(mkrIcon(rot)); }
}

// ─────────────────────────────────────────────────────────
// Haversine (km)
// ─────────────────────────────────────────────────────────
function hav(a, b, c, d) {
  const R = 6371, p = Math.PI / 180;
  const x = Math.sin((c-a)*p/2)**2
          + Math.cos(a*p) * Math.cos(c*p) * Math.sin((d-b)*p/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1-x));
}

// ─────────────────────────────────────────────────────────
// Tiempo / formato
// ─────────────────────────────────────────────────────────
function eSec() {
  return (S.elapsed + (S.startTime ? Date.now() - S.startTime : 0)) / 1000;
}
function fmt(s) {
  s = Math.floor(s);
  return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60]
    .map(n => String(n).padStart(2,'0')).join(':');
}
function paceStr(kmh) {
  if (!kmh || kmh < 0.5) return "–'–\"";
  const t = 3600/kmh, m = Math.floor(t/60), s = String(Math.floor(t%60)).padStart(2,'0');
  return `${m}'${s}"`;
}
function calcCal() { return Math.round(8 * WEIGHT * (eSec() / 3600)); }

// ─────────────────────────────────────────────────────────
// GPS
// BUG-FIX #1: overlay se oculta en CADA posición recibida
// (no sólo en la primera), para que funcione en 2ª+ carrera.
// BUG-FIX #8: primer punto registrado sin cálculo de distancia.
// BUG-FIX #7: speed cap sólo a valores imposibles (>80 km/h).
// ─────────────────────────────────────────────────────────
function startGPS() {
  if (S.watchId != null) return;
  document.getElementById('gps-overlay').classList.add('show');
  S.watchId = navigator.geolocation.watchPosition(onPos, onGpsErr, {
    enableHighAccuracy: true,
    maximumAge: 3000,
    timeout:    20000,
  });
}
function stopGPS() {
  if (S.watchId != null) { navigator.geolocation.clearWatch(S.watchId); S.watchId = null; }
  document.getElementById('gps-overlay').classList.remove('show');
}

function onPos(p) {
  const { latitude:la, longitude:ln, accuracy:ac, speed:gs, heading:hd } = p.coords;

  // BUG-FIX #1: siempre ocultar overlay en cuanto llega un fix
  document.getElementById('gps-overlay').classList.remove('show');
  document.getElementById('gps-acc').textContent = `±${Math.round(ac)}m`;

  // Ignorar puntos con precisión muy mala (>250m) salvo arranque
  if (ac > 250 && S.positions.length > 2) return;

  // Velocidad: usar GPS nativo si existe; si no, calcular desde distancia
  let kmh = 0;
  if (gs != null && gs >= 0) kmh = gs * 3.6;

  // Distancia — sólo si hay posición anterior Y carrera activa
  if (S.running && S.positions.length > 0) {
    const pv = S.positions[S.positions.length - 1];
    const d  = hav(pv.la, pv.ln, la, ln);
    if (d > 0.004) S.km += d;                    // >4 m
    if (gs == null) {
      const dt = (Date.now() - pv.ts) / 1000;
      kmh = dt > 0 ? (d / dt) * 3600 : 0;
    }
  }

  // BUG-FIX #7: cap sólo a valores físicamente imposibles (>80 km/h corriendo)
  if (kmh >= 0 && kmh < 80) S.speed = kmh;
  if (S.speed > S.maxSpeed) S.maxSpeed = S.speed;

  // Mover marcador y centrar mapa siempre (antes y durante la carrera)
  moveMkr(la, ln, hd);
  setView(la, ln);

  // Lo siguiente sólo cuando la carrera está activa
  if (!S.running) return;

  // BUG-FIX #8: añadir posición DESPUÉS de haber calculado la distancia
  S.positions.push({ la, ln, ts: Date.now() });
  routeLine.addLatLng([la, ln]);

  document.getElementById('s-km').textContent    = S.km.toFixed(2);
  document.getElementById('s-speed').textContent = S.speed.toFixed(1);
  document.getElementById('pace-val').textContent = paceStr(S.speed);

  voiceCheck();
}

function onGpsErr(e) {
  const msg = { 1:'Sin permiso GPS', 2:'GPS no disponible', 3:'GPS tardó mucho' };
  document.getElementById('gps-acc').textContent = msg[e.code] || 'GPS error';
  document.getElementById('gps-overlay').classList.remove('show');
}

// ─────────────────────────────────────────────────────────
// Voz
// BUG-FIX #3: iOS speechSynthesis se congela ~30 s.
//   Solución: llamar resume() periódicamente mientras hay carrera.
// ─────────────────────────────────────────────────────────
function primeVoice() {
  if (S.voiceReady) return;
  const u = new SpeechSynthesisUtterance('');
  u.volume = 0; u.lang = 'es-ES';
  window.speechSynthesis.speak(u);
  S.voiceReady = true;
}

// Mantener iOS speechSynthesis activo cada 10 s
setInterval(() => {
  if (S.voiceEnabled && window.speechSynthesis.paused)
    window.speechSynthesis.resume();
}, 10000);

function speak(txt) {
  if (!S.voiceEnabled) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(txt);
  u.lang = 'es-ES'; u.rate = 1.05;
  window.speechSynthesis.speak(u);
  showBadge(txt);
}
function showBadge(txt) {
  const b = document.getElementById('voice-badge');
  b.textContent = txt; b.classList.add('show');
  clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('show'), 4500);
}

const ZONES = {
  caminando: 'Estás caminando. ¡Vamos, acelera!',
  trote:     'Buen trote. ¡Mantén el ritmo!',
  suave:     'Ritmo suave. ¡Muy bien!',
  medio:     'Buen ritmo medio. ¡Sigue así!',
  rapido:    '¡Ritmo rápido! ¡Excelente!',
  sprint:    '¡Sprint! ¡Dalo todo!',
};
function zoneOf(kmh) {
  if (kmh < 4)  return 'caminando';
  if (kmh < 7)  return 'trote';
  if (kmh < 10) return 'suave';
  if (kmh < 13) return 'medio';
  if (kmh < 16) return 'rapido';
  return 'sprint';
}

function voiceCheck() {
  const sec = eSec();
  const km  = S.km;
  const sp  = S.speed;

  // km milestone
  const mi = Math.floor(km);
  if (mi > 0 && mi > S.lastKmAnn) {
    S.lastKmAnn = mi;
    speak(`Kilómetro ${mi}. ${Math.floor(sec/60)} minutos. Ritmo ${paceStr(sp)} por kilómetro.`);
    return;
  }

  // BUG-FIX #4: no anunciar zona si velocidad < 0.5 km/h (GPS ruido)
  if (sp >= 0.5 && sec > 15) {
    const z = zoneOf(sp);
    if (z !== S.lastPaceAnn) { S.lastPaceAnn = z; speak(ZONES[z]); }
  }

  // BPM alerts
  if (S.bpm) {
    if (S.bpm > 180 && S.lastBpmAnn !== 'hi') {
      S.lastBpmAnn = 'hi'; speak('Pulso muy alto. Baja el ritmo.');
    } else if (S.bpm < 130 && S.lastBpmAnn !== 'lo') {
      S.lastBpmAnn = 'lo'; speak('Pulso bajo. Puedes acelerar.');
    } else if (S.bpm >= 130 && S.bpm <= 180) {
      S.lastBpmAnn = null;
    }
  }
}

// ─────────────────────────────────────────────────────────
// PANTALLA SIEMPRE ENCENDIDA — doble mecanismo:
//   1) Wake Lock API  (iOS 16.4+ / Safari 16.4+)
//   2) AudioContext silencioso — fallback que funciona en
//      todas las versiones de iOS Safari (necesita gesto).
//      Es el mismo truco que usa NoSleep.js.
// ─────────────────────────────────────────────────────────
let wakeLock   = null;
let audioCtx   = null;
let gainNode   = null;

async function enableScreenOn() {
  // ── 1) Wake Lock API ──────────────────────────────────
  if ('wakeLock' in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => {
        // iOS puede liberarlo al cambiar de app; re-adquirimos al volver
        wakeLock = null;
      });
    } catch(_) {}
  }

  // ── 2) AudioContext silencioso (fallback / refuerzo) ──
  // Crea un oscilador a volumen 0 — iOS no duerme la pantalla
  // mientras hay audio activo, aunque sea inaudible.
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.gain.value = 0.001; // inaudible pero "activo"
      gainNode.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    // Nodo vacío que mantiene el contexto vivo
    const buf = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
    const src = audioCtx.createBufferSource();
    src.buffer = buf; src.loop = true;
    src.connect(gainNode);
    src.start();
    // Guardamos referencia para detenerlo al parar
    enableScreenOn._src = src;
  } catch(_) {}

  updateLockIcon(true);
}

function disableScreenOn() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
  try {
    if (enableScreenOn._src) { enableScreenOn._src.stop(); enableScreenOn._src = null; }
    if (audioCtx)            { audioCtx.suspend(); }
  } catch(_) {}
  updateLockIcon(false);
}

function updateLockIcon(on) {
  const el = document.getElementById('lock-icon');
  if (el) el.textContent = on ? '🔒' : '🔓';
}

// Re-adquirir Wake Lock al volver al primer plano
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.running) enableScreenOn();
});

// ─────────────────────────────────────────────────────────
// Controles
// BUG-FIX #6: estado reseteado completamente en cada carrera nueva,
//   incluyendo lastPaceAnn, lastBpmAnn, etc.
// BUG-FIX #10: elapsed calculado correctamente en pauseRun/stopRun.
// ─────────────────────────────────────────────────────────
function startRun() {
  primeVoice();

  if (S.paused) {
    // Reanudar
    S.startTime = Date.now();
    S.paused    = false;
    S.running   = true;
    document.getElementById('status-dot').className = 'active';
    document.getElementById('btn-pause').style.display = '';
    document.getElementById('btn-start').style.display = 'none';
    S.timerIv = setInterval(tick, 500);
    startGPS();
    enableScreenOn();
    speak('Reanudando carrera');
    return;
  }

  // Carrera nueva — reset completo de estado
  Object.assign(S, {
    running:true, paused:false,
    startTime:Date.now(), elapsed:0,
    km:0, speed:0, maxSpeed:0,
    positions:[],
    lastKmAnn:0, lastPaceAnn:null, lastBpmAnn:null,
    bpmSum:0, bpmCount:0, bpm:null,
  });
  routeLine.setLatLngs([]);

  document.getElementById('s-km').textContent    = '0.00';
  document.getElementById('s-speed').textContent = '0.0';
  document.getElementById('s-bpm').textContent   = '–';
  document.getElementById('pace-val').textContent = "–'–\"";

  document.getElementById('btn-start').style.display = 'none';
  document.getElementById('btn-pause').style.display = '';
  document.getElementById('btn-stop').style.display  = '';
  document.getElementById('status-dot').className = 'active';

  S.timerIv = setInterval(tick, 500);
  startGPS();
  enableScreenOn();
  speak('Carrera iniciada. ¡Buena suerte!');
}

function pauseRun() {
  S.elapsed += Date.now() - S.startTime;   // BUG-FIX #10: acumular elapsed
  S.startTime = null;
  S.paused  = true;
  S.running = false;
  clearInterval(S.timerIv);
  stopGPS();
  disableScreenOn();
  document.getElementById('status-dot').className = 'paused';
  document.getElementById('btn-pause').style.display = 'none';
  document.getElementById('btn-start').textContent = '▶ Reanudar';
  document.getElementById('btn-start').style.display = '';
  speak('Carrera pausada');
}

function stopRun() {
  if (S.startTime) S.elapsed += Date.now() - S.startTime;  // BUG-FIX #10
  S.startTime = null;
  S.running = false;
  S.paused  = false;
  clearInterval(S.timerIv);
  stopGPS();
  disableScreenOn();

  document.getElementById('status-dot').className = '';
  document.getElementById('btn-start').textContent = '▶ Iniciar';
  document.getElementById('btn-start').style.display = '';
  document.getElementById('btn-pause').style.display = 'none';
  document.getElementById('btn-stop').style.display  = 'none';

  const sec  = S.elapsed / 1000;
  const avgPace = S.km > 0 ? paceStr(S.km / (sec / 3600)) : '–';
  const avgBpm  = S.bpmCount > 0 ? Math.round(S.bpmSum / S.bpmCount) + ' bpm' : '–';

  document.getElementById('m-km').textContent       = S.km.toFixed(2) + ' km';
  document.getElementById('m-time').textContent     = fmt(sec);
  document.getElementById('m-pace').textContent     = avgPace + ' /km';
  document.getElementById('m-maxspeed').textContent = S.maxSpeed.toFixed(1) + ' km/h';
  document.getElementById('m-cal').textContent      = calcCal() + ' kcal';
  document.getElementById('m-bpm').textContent      = avgBpm;
  document.getElementById('modal').classList.add('show');

  speak(`Carrera finalizada. ${S.km.toFixed(2)} kilómetros en ${fmt(sec)}. Ritmo ${avgPace}.`);
}

function closeModal() { document.getElementById('modal').classList.remove('show'); }

function tick() {
  document.getElementById('timer').textContent = fmt(eSec());
  document.getElementById('s-cal').textContent = calcCal();
}

// Voz toggle
document.getElementById('voice-state').addEventListener('click', () => {
  primeVoice();
  S.voiceEnabled = !S.voiceEnabled;
  document.getElementById('voice-state').textContent = S.voiceEnabled ? '🔊 Voz' : '🔇 Silencio';
  if (S.voiceEnabled) speak('Voz activada');
});

// ─────────────────────────────────────────────────────────
// Pulso por cámara (PPG)
// ─────────────────────────────────────────────────────────
const HR = { stream:null, animId:null, samples:[], WIN:270, MIN_DIST:12 };

async function openHR() {
  primeVoice();
  document.getElementById('hr-modal').classList.add('show');
  document.getElementById('hr-bpm').textContent = '–';
  document.getElementById('hr-msg').textContent = 'Cubre la cámara trasera con el dedo.';
  HR.samples = [];

  try {
    HR.stream = await navigator.mediaDevices.getUserMedia(
      { video:{ facingMode:{ exact:'environment' }, width:{ideal:160}, height:{ideal:160} } });
  } catch(_) {
    try { HR.stream = await navigator.mediaDevices.getUserMedia({ video:true }); }
    catch(e2) {
      document.getElementById('hr-msg').textContent = 'No se pudo acceder a la cámara.';
      return;
    }
  }

  const vid = document.getElementById('hr-video');
  vid.srcObject = HR.stream;
  try { await HR.stream.getVideoTracks()[0].applyConstraints({ advanced:[{ torch:true }] }); }
  catch(_) {}

  const cvs = document.getElementById('hr-canvas');
  const ctx = cvs.getContext('2d');
  let fc = 0;

  (function loop() {
    if (!HR.stream) return;
    HR.animId = requestAnimationFrame(loop);
    if (++fc % 2 !== 0) return;
    ctx.drawImage(vid, 0, 0, 144, 144);
    const d = ctx.getImageData(52, 52, 40, 40).data;
    let r = 0;
    for (let i = 0; i < d.length; i += 4) r += d[i];
    HR.samples.push(r / (d.length / 4));
    if (HR.samples.length > HR.WIN) HR.samples.shift();
    if (HR.samples.length >= 45) detectBPM();
  })();
}

function detectBPM() {
  const sig = HR.samples, WS = 12;
  const det = sig.map((v, i) => {
    const lo = Math.max(0, i-WS), hi = Math.min(sig.length-1, i+WS);
    let s = 0; for (let j = lo; j <= hi; j++) s += sig[j];
    return v - s / (hi - lo + 1);
  });
  const pk = [];
  for (let i = 1; i < det.length-1; i++)
    if (det[i] > det[i-1] && det[i] > det[i+1] &&
        (!pk.length || i - pk[pk.length-1] >= HR.MIN_DIST)) pk.push(i);
  if (pk.length < 2) return;
  const iv = [];
  for (let i = 1; i < pk.length; i++) iv.push(pk[i] - pk[i-1]);
  const bpm = Math.round(60 / (iv.reduce((a,b) => a+b, 0) / iv.length / 15));
  if (bpm < 40 || bpm > 200) return;
  S.bpm = bpm; S.bpmSum += bpm; S.bpmCount++;
  document.getElementById('hr-bpm').textContent = bpm;
  document.getElementById('s-bpm').textContent  = bpm;
  document.getElementById('hr-msg').textContent =
    bpm < 60  ? 'Pulso bajo' :
    bpm < 100 ? 'Normal' :
    bpm < 140 ? 'Zona aeróbica' :
    bpm < 170 ? 'Alta intensidad' : 'Muy alto';
}

function closeHR() {
  cancelAnimationFrame(HR.animId);
  if (HR.stream) { HR.stream.getTracks().forEach(t => t.stop()); HR.stream = null; }
  document.getElementById('hr-modal').classList.remove('show');
}

// ─────────────────────────────────────────────────────────
// Arrancar GPS nada más cargar la página
// Así iOS ya tiene permiso y posición cuando el usuario
// pulsa "Iniciar", sin esperas ni timeouts.
// ─────────────────────────────────────────────────────────
map.setView([40.4168, -3.7038], 13); // fallback mientras llega GPS
startGPS();
</script>
</body>
</html>
