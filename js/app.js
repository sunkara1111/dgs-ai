import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const state = {
  status: 'IDLE',
  agents: ['NIMBUS', 'AURELIA', 'OZAEN', 'RISK', 'SIZE', 'HALT', 'CHART', 'BRIEF', 'GUARD'],
  book: [],
  dayPnL: 0,
  peakEquity: 10000,
  speaking: false,
};

function setStatus(s) {
  state.status = s;
  $('statusPill').textContent = `STATUS : ${s}`;
}

function speak(text) {
  $('voiceLog').textContent = text;
  setStatus('SPEAKING');
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.onend = () => setStatus('IDLE');
    window.speechSynthesis.speak(u);
  } else {
    setTimeout(() => setStatus('IDLE'), 1200);
  }
}

function renderAgents() {
  $('agentRow').innerHTML = state.agents.map((a) => `<span>${a} · online</span>`).join('');
}

function num(id) { return Number($(id).value); }

function analyzeRisk() {
  const equity = num('equity');
  const riskPct = num('riskPct');
  const dailyLoss = num('dailyLoss');
  const maxDd = num('maxDd');
  const entry = num('entry');
  const stop = num('stop');
  const target = num('target');
  const side = $('side').value;
  const symbol = $('symbol').value.trim().toUpperCase();

  const stopDist = Math.abs(entry - stop);
  const rewardDist = Math.abs(target - entry);
  const rr = stopDist > 0 ? rewardDist / stopDist : 0;
  const riskBudget = equity * (riskPct / 100);
  const shares = stopDist > 0 ? Math.floor(riskBudget / stopDist) : 0;
  const dollarRisk = shares * stopDist;
  const notional = shares * entry;

  let score = 20;
  const reasons = [];
  if (stopDist <= 0) { score += 50; reasons.push('Invalid stop'); }
  if (rr < 1.5) { score += 20; reasons.push('Reward:risk below 1.5'); }
  else if (rr >= 2) { score -= 10; reasons.push('Reward:risk healthy (≥2)'); }
  if (riskPct > 2) { score += 15; reasons.push('Per-trade risk > 2%'); }
  if (Math.abs(state.dayPnL) / equity * 100 >= dailyLoss * 0.7) {
    score += 15; reasons.push('Approaching daily loss limit');
  }
  const dd = Math.max(0, (state.peakEquity - equity) / state.peakEquity * 100);
  if (dd >= maxDd * 0.8) { score += 25; reasons.push('Near max drawdown halt'); }
  if (shares <= 0) { score += 30; reasons.push('Position size rounds to 0'); }
  if ((side === 'LONG' && stop >= entry) || (side === 'SHORT' && stop <= entry)) {
    score += 40; reasons.push('Stop on wrong side of entry');
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const dailyHalt = Math.abs(Math.min(0, state.dayPnL)) / equity * 100 >= dailyLoss;
  const ddHalt = dd >= maxDd;
  const open = score < 55 && shares > 0 && !dailyHalt && !ddHalt && rr >= 1.5;

  $('riskScore').textContent = String(score);
  $('riskBar').style.width = `${score}%`;
  $('riskBar').style.background = score < 40 ? 'var(--ok)' : score < 55 ? 'var(--amber)' : 'var(--danger)';
  const gate = $('gateMsg');
  gate.textContent = open
    ? `Gate: OPEN — ${shares} sh ${symbol} ${side} · risk $${dollarRisk.toFixed(2)} · R:R ${rr.toFixed(2)}`
    : `Gate: CLOSED — score ${score}${dailyHalt ? ' · daily loss halt' : ''}${ddHalt ? ' · drawdown halt' : ''}`;
  gate.className = `gate ${open ? 'open' : 'closed'}`;
  $('paperBtn').disabled = !open;

  const report = [
    `Symbol: ${symbol} ${side}`,
    `Entry ${entry} | Stop ${stop} | Target ${target}`,
    `Stop distance: ${stopDist.toFixed(4)}`,
    `Reward:risk: ${rr.toFixed(2)}`,
    `Max $ risk @ ${riskPct}%: ${riskBudget.toFixed(2)}`,
    `Size: ${shares} shares · notional $${notional.toFixed(2)}`,
    `Day P&L: $${state.dayPnL.toFixed(2)} · DD ${dd.toFixed(2)}%`,
    `Reasons: ${reasons.join('; ') || 'within policy'}`,
    open ? 'Decision: ALLOW paper entry' : 'Decision: BLOCK — tighten risk or skip',
  ].join('\n');
  $('analysis').textContent = report;

  return { open, shares, symbol, side, entry, stop, target, dollarRisk, score, rr };
}

function paperEnter() {
  const r = analyzeRisk();
  if (!r.open) {
    speak('Risk gate is closed. I will not enter this trade.');
    return;
  }
  const trade = {
    id: Date.now(),
    ...r,
    ts: new Date().toISOString(),
  };
  state.book.unshift(trade);
  // Demo mark: 35% of the way to target (paper only, not a prediction)
  const progress = 0.35;
  const simPrice = r.side === 'LONG'
    ? r.entry + (r.target - r.entry) * progress
    : r.entry - (r.entry - r.target) * progress;
  const applied = r.side === 'LONG'
    ? r.shares * (simPrice - r.entry)
    : r.shares * (r.entry - simPrice);
  state.dayPnL += applied;
  const eq = num('equity') + applied;
  $('equity').value = eq.toFixed(2);
  state.peakEquity = Math.max(state.peakEquity, eq);
  renderBook();
  speak(`Paper entry allowed. ${r.shares} shares ${r.symbol} ${r.side}. Risk gate score ${r.score}.`);
  analyzeRisk();
}

function renderBook() {
  $('book').innerHTML = state.book.slice(0, 8).map((t) =>
    `<li>${t.symbol} ${t.side} · ${t.shares} sh · R:R ${t.rr.toFixed(2)} · score ${t.score}</li>`
  ).join('') || '<li>No paper trades yet.</li>';
}

function marketBrief() {
  setStatus('LISTENING');
  setTimeout(() => {
    speak('Nine agents online. Tech is mixed. Treat every long as risk-budget first. Nvidia and semis are active — I will not size without a stop and a two-to-one reward path.');
  }, 350);
}

function openChart() {
  const symbol = $('symbol').value.trim().toUpperCase() || 'NVDA';
  const url = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  speak(`Opening ${symbol} chart on TradingView.`);
}

function wake() {
  setStatus('LISTENING');
  speak('Go ahead. Risk guard is online.');
}

// --- Humanoid particle field (Apex-inspired) ---
function initHumanoid() {
  const canvas = $('humanoid');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4.2;

  const count = 4200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const cCyan = new THREE.Color('#3de7ff');
  const cAmber = new THREE.Color('#ff9a3c');
  for (let i = 0; i < count; i++) {
    // Head ellipsoid + torso cloud
    const inHead = i < count * 0.62;
    let x, y, z;
    if (inHead) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 0.85 * Math.cbrt(Math.random());
      x = r * Math.sin(phi) * Math.cos(theta) * 0.85;
      y = r * Math.cos(phi) * 1.05 + 0.55;
      z = r * Math.sin(phi) * Math.sin(theta) * 0.7;
    } else {
      x = (Math.random() - 0.5) * 1.4;
      y = -0.2 - Math.random() * 1.4;
      z = (Math.random() - 0.5) * 0.7;
    }
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;
    const mix = inHead && Math.hypot(x, y - 0.55, z) < 0.35 ? 1 : Math.random() > 0.82 ? 1 : 0;
    const col = mix ? cAmber : cCyan;
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: 0.018, vertexColors: true, transparent: true, opacity: 0.95 });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // background waves
  const waveCount = 1800;
  const wp = new Float32Array(waveCount * 3);
  for (let i = 0; i < waveCount; i++) {
    wp[i * 3] = (Math.random() - 0.5) * 8;
    wp[i * 3 + 1] = (Math.random() - 0.5) * 5;
    wp[i * 3 + 2] = -2 - Math.random() * 2;
  }
  const wgeo = new THREE.BufferGeometry();
  wgeo.setAttribute('position', new THREE.BufferAttribute(wp, 3));
  const waves = new THREE.Points(wgeo, new THREE.PointsMaterial({ color: '#1ec8ff', size: 0.012, opacity: 0.35, transparent: true }));
  scene.add(waves);

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  function frame() {
    t += 0.01;
    points.rotation.y = Math.sin(t * 0.3) * 0.25;
    const pulse = state.status === 'SPEAKING' ? 1.08 + Math.sin(t * 8) * 0.04 : 1 + Math.sin(t * 2) * 0.015;
    points.scale.setScalar(pulse);
    waves.rotation.z = t * 0.05;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}

function bindMicWake() {
  // Optional clap/snap-ish energy detection
  if (!navigator.mediaDevices?.getUserMedia) return;
  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    const ctx = new AudioContext();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let cool = 0;
    const loop = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      if (cool <= 0 && avg > 55 && state.status === 'IDLE') {
        cool = 90;
        wake();
      }
      cool = Math.max(0, cool - 1);
      requestAnimationFrame(loop);
    };
    loop();
  }).catch(() => {});
}

$('analyzeBtn').onclick = () => { analyzeRisk(); speak('Risk analysis complete.'); };
$('paperBtn').onclick = paperEnter;
$('wakeBtn').onclick = wake;
$('briefBtn').onclick = marketBrief;
$('chartBtn').onclick = openChart;
['equity','riskPct','dailyLoss','maxDd','symbol','side','entry','stop','target'].forEach((id) => {
  $(id).addEventListener('change', analyzeRisk);
});

renderAgents();
renderBook();
analyzeRisk();
initHumanoid();
bindMicWake();
setStatus('IDLE');
