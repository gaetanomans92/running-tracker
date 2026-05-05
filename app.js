
// ─────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────
const GAS_URL = 'https://script.google.com/macros/s/AKfycbymW1gQgRwLMh9UEzWeFxAFdCfDkVRNuDMRN_w4MvzoY1kad43lfAxKEqLqOZpZMEu7/exec';

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
let startTime = null;
let timer = null;
let km = 0;

// ─────────────────────────────────────────
// START / STOP
// ─────────────────────────────────────────
function startRun() {
  startTime = Date.now();
  km = 0;

  timer = setInterval(() => {
    const sec = (Date.now() - startTime) / 1000;

    document.getElementById("time").textContent = formatTime(sec);

    // Simulación distancia
    km += 0.01;
    document.getElementById("km").textContent = km.toFixed(2);

    const pace = calcPace(km, sec);
    document.getElementById("pace").textContent = pace;

  }, 1000);
}

function stopRun() {
  clearInterval(timer);

  const sec = (Date.now() - startTime) / 1000;
  const pace = calcPace(km, sec);

  const data = {
    date: new Date().toLocaleString(),
    km: km.toFixed(2),
    time: formatTime(sec),
    pace: pace,
    maxSpeed: "0",
    cal: Math.round(km * 60),
    bpm: "-"
  };

  saveToSheets(data);
  drawImage(data);
}

// ─────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────
function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function calcPace(km, sec) {
  if (km === 0) return "--";
  const paceSec = sec / km;
  const m = Math.floor(paceSec / 60);
  const s = Math.floor(paceSec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────
// GOOGLE SHEETS
// ─────────────────────────────────────────
async function saveToSheets(data) {
  if (!data.km || data.km === "0.00") return;

  try {
    const params = new URLSearchParams(data);
    await fetch(`${GAS_URL}?${params}`);
    console.log("Saved to Sheets ✔");
  } catch (err) {
    console.error("Error guardando:", err);
  }
}

// ─────────────────────────────────────────
// IMAGE RESULT
// ─────────────────────────────────────────
function drawImage(data) {
  const canvas = document.getElementById("resultCanvas");
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#FC4C02";
  ctx.font = "bold 48px Arial";
  ctx.fillText(`${data.km} km`, 50, 100);

  ctx.fillStyle = "#fff";
  ctx.font = "24px Arial";
  ctx.fillText(`Tiempo: ${data.time}`, 50, 180);
  ctx.fillText(`Ritmo: ${data.pace}`, 50, 220);
}

// ─────────────────────────────────────────
// SHARE
// ─────────────────────────────────────────
function share() {
  const canvas = document.getElementById("resultCanvas");

  canvas.toBlob(async blob => {
    const file = new File([blob], "run.png", { type: "image/png" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "Mi carrera",
        text: "Mira mi resultado 🏃"
      });
    } else {
      // fallback descarga
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "run.png";
      a.click();
    }
  });
}
