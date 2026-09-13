import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'dgs-ai-v2';
const state = {
  status: 'IDLE',
  agents: ['DGS', 'TRADE', 'SCALP', 'SESSION', 'RISK', 'SOCIAL', 'WORK', 'HALT', 'FLAT'],
  book: [],
  dayPnL: 0,
  peakEquity: 10000,
  lastOpen: false,
  halted: false,
  gestureOn: false,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.book)) state.book = data.book;
    if (typeof data.dayPnL === 'number') state.dayPnL = data.dayPnL;
    if (typeof data.peakEquity === 'number') state.peakEquity = data.peakEquity;
    if (typeof data.equity === 'number') {
      const el = document.getElementById('equity');
      if (el) el.value = data.equity;
    }
    if (typeof data.halted === 'boolean') state.halted = data.halted;
  } catch (_) {}
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    book: state.book,
    dayPnL: state.dayPnL,
    peakEquity: state.peakEquity,
    equity: Number(document.getElementById('equity')?.value || 10000),
    halted: state.halted,
  }));
}

function setStatus(s) {
  state.status = s;
  const pill = $('statusPill');
  pill.textContent = `STATUS : ${s}`;
  pill.dataset.state = s;
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
    setTimeout(() => setStatus('IDLE'), 1400);
  }
}

function renderAgents() {
  $('agentCount').textContent = `${state.agents.length} agents online`;
  $('agentRow').innerHTML = state.agents.map((a) => `<span>${a} · online</span>`).join('');
}

function num(id) { return Number($(id).value); }

function money(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function updateStats(dd, open) {
  $('dayPnl').textContent = money(state.dayPnL);
  $('dayPnl').style.color = state.dayPnL >= 0 ? 'var(--ok)' : 'var(--danger)';
  $('ddNow').textContent = `${dd.toFixed(2)}%`;
  $('gateBadge').textContent = open ? 'OPEN' : 'CLOSED';
  $('gateBadge').style.color = open ? 'var(--ok)' : 'var(--danger)';
}

function analyzeRisk() {
  const equity = num('equity');
  const riskPct = num('riskPct');
  const dailyLoss = num('dailyLoss');
  const maxDd = num('maxDd');
  const minRr = num('minRr');
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

  let score = 15;
  const reasons = [];
  if (stopDist <= 0) { score += 50; reasons.push('Stop required — distance is 0'); }
  if (rr < minRr) { score += 25; reasons.push(`Reward:risk ${rr.toFixed(2)} < min ${minRr}`); }
  else if (rr >= minRr + 0.5) { score -= 8; reasons.push('Reward:risk above minimum cushion'); }
  if (riskPct > 2) { score += 18; reasons.push('Per-trade risk above 2%'); }
  if (Math.abs(Math.min(0, state.dayPnL)) / Math.max(equity, 1) * 100 >= dailyLoss * 0.7) {
    score += 18; reasons.push('Approaching daily loss halt');
  }
  const dd = Math.max(0, (state.peakEquity - equity) / Math.max(state.peakEquity, 1) * 100);
  if (dd >= maxDd * 0.8) { score += 28; reasons.push('Near max drawdown halt'); }
  if (shares <= 0) { score += 30; reasons.push('Size rounds to 0 shares'); }
  if ((side === 'LONG' && stop >= entry) || (side === 'SHORT' && stop <= entry)) {
    score += 45; reasons.push('Stop on wrong side of entry');
  }
  if (notional > equity * 3) { score += 12; reasons.push('Notional > 3x equity'); }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const dailyHalt = Math.abs(Math.min(0, state.dayPnL)) / Math.max(equity, 1) * 100 >= dailyLoss;
  const ddHalt = dd >= maxDd;
  
  const maxTrades = num('maxTrades');
  const maxHold = num('maxHold');
  const mode = $('mode').value;
  const noOvernight = $('noOvernight').checked;
  const tradesToday = state.book.length;
  if (tradesToday >= maxTrades) { score += 35; reasons.push(`Max trades today hit (${maxTrades})`); }
  if (mode === 'SCALP' && maxHold > 30) { score += 8; reasons.push('Scalp mode prefers hold ≤ 30m'); }
  if (mode === 'SCALP' && rr < 1.2) { score += 10; reasons.push('Scalp R:R too thin'); }
  if (mode === 'MOMENTUM' && rr < 1.8) { score += 12; reasons.push('Momentum day trade wants stronger R:R'); }
  if (noOvernight) { reasons.push('Flat-by-close rule ON — no overnight holds'); }
  else { score += 15; reasons.push('Overnight allowed — higher session risk'); }

  const open = !state.halted && score < 50 && shares > 0 && !dailyHalt && !ddHalt && rr >= minRr && stopDist > 0 && tradesToday < maxTrades;

  state.lastOpen = open;

  $('riskScore').textContent = String(score);
  $('riskBar').style.width = `${score}%`;
  $('riskBar').style.background = score < 35 ? 'var(--ok)' : score < 50 ? 'var(--amber)' : 'var(--danger)';
  const gate = $('gateMsg');
  gate.textContent = open
    ? `Gate: OPEN — ${shares} sh ${symbol} ${side} · risk ${money(dollarRisk)} · R:R ${rr.toFixed(2)}`
    : `Gate: CLOSED — score ${score}${state.halted ? ' · FORCE HALT' : ''}${dailyHalt ? ' · daily loss halt' : ''}${ddHalt ? ' · drawdown halt' : ''}`;
  gate.className = `gate ${open ? 'open' : 'closed'}`;
  $('paperBtn').disabled = !open;
  updateStats(dd, open);

  $('analysis').textContent = [
    `Founder guard · DGS AI · DAY TRADING`,
    `Mode: ${mode} · hold≤${maxHold}m · trades ${tradesToday}/${maxTrades}`,
    `Symbol: ${symbol} ${side}`,
    `Entry ${entry} | Stop ${stop} | Target ${target}`,
    `Stop distance: ${stopDist.toFixed(4)}`,
    `Reward:risk: ${rr.toFixed(2)} (min ${minRr})`,
    `Max $ risk @ ${riskPct}%: ${money(riskBudget)}`,
    `Size: ${shares} shares · notional ${money(notional)}`,
    `Day P&L: ${money(state.dayPnL)} · DD ${dd.toFixed(2)}%`,
    `Reasons: ${reasons.join('; ') || 'within policy'}`,
    open ? 'Decision: ALLOW paper entry' : 'Decision: BLOCK — tighten risk or skip',
  ].join('\n');

  return { open, shares, symbol, side, entry, stop, target, dollarRisk, score, rr };
}

function paperEnter() {
  const r = analyzeRisk();
  if (!r.open) {
    speak('Risk gate is closed. I will not enter this trade.');
    return;
  }
  state.book.unshift({ id: Date.now(), ...r, ts: new Date().toISOString() });
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
  speak(`Paper entry allowed. ${r.shares} shares ${r.symbol} ${r.side}. Risk score ${r.score}.`);
  saveState();
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
    speak(`${state.agents.length} agents online for the session. Intraday mode. I prioritize day trades and scalps, flat by close, hard daily loss halt. I only size with a stop and your minimum reward to risk.`);
  }, 280);
}

function openChart() {
  const symbol = $('symbol').value.trim().toUpperCase() || 'NVDA';
  window.open(`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`, '_blank', 'noopener,noreferrer');
  speak(`Opening ${symbol} on TradingView.`);
}

function wake() {
  setStatus('LISTENING');
  setTimeout(() => speak('Go ahead. DGS AI day-trading risk guard is online.'), 200);
}

let talkLoop = null;
let talkActive = false;

function quickAnswer(q) {
  const t = q.toLowerCase();
  // Trading-first fast answers
  if (/(who are you|your name|what are you)/.test(t)) {
    return 'I am DGS AI, built for Dineshgopi Sunkara. Trading first, then social and work.';
  }
  if (/(risk|size|position)/.test(t) && /(how|what|explain)/.test(t)) {
    return 'Size from stop distance. Risk only a fraction of equity per trade. If the gate is closed, do not enter.';
  }
  if (/(day trade|intraday|scalp)/.test(t)) {
    return 'Intraday mode: hard daily loss halt, max trades, max hold, and flat by session end. No overnight when that lock is on.';
  }
  if (/(stop|stop loss)/.test(t)) {
    return 'A stop is required. Wrong-side stops close the gate. Place stop first, then size.';
  }
  if (/(profit|guarantee|guaranteed)/.test(t)) {
    return 'No profit is guaranteed. DGS AI blocks bad size; it does not promise returns.';
  }
  if (/(social|instagram|linkedin|twitter|post)/.test(t)) {
    return 'Open the Social tab for drafts and checklists. I draft fast; you approve before posting.';
  }
  if (/(work|email|sop|priority|priorities)/.test(t)) {
    return 'Open the Work tab for priorities, emails, actions, and SOP checklists.';
  }
  if (/(chart|tradingview|nvidia|nvda)/.test(t)) {
    openChart();
    return null; // openChart already speaks
  }
  if (/(brief|market)/.test(t)) {
    marketBrief();
    return null;
  }
  if (/(analyze|gate)/.test(t)) {
    analyzeRisk();
    return state.lastOpen ? 'Risk gate is open for this setup.' : 'Risk gate is closed for this setup.';
  }
  if (/(halt|stop trading)/.test(t)) {
    forceHalt();
    return null;
  }
  if (/(hello|hi |hey|wake)/.test(t)) {
    return 'Listening. Ask a trading, social, or work question.';
  }
  // Generic fast fallback
  return 'Got it. For trading I can analyze risk, open charts, or brief the session. For social or work, switch tabs or ask specifically.';
}

function handleVoiceCommand(text) {
  const t = text.toLowerCase();
  if (t.includes('brief') || (t.includes('market') && !t.includes('question'))) {
    return marketBrief();
  }
  if (t.includes('open chart') || t.includes('tradingview') || t.includes('trading view')) {
    return openChart();
  }
  if (t.includes('analyze') && t.includes('risk')) {
    analyzeRisk();
    return speak(state.lastOpen ? 'Risk gate is open for this setup.' : 'Risk gate is closed for this setup.');
  }
  if (t.includes('wake') || t === 'hello' || t === 'hi') {
    return wake();
  }
  const ans = quickAnswer(text);
  if (ans) speak(ans);
}

function startVoiceListen() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    speak('Voice recognition is not available in this browser. Use the buttons.');
    return;
  }
  if (talkActive) {
    talkActive = false;
    try { talkLoop && talkLoop.stop(); } catch (_) {}
    $('listenBtn').textContent = 'Start talk mode';
    setStatus('IDLE');
    $('voiceLog').textContent = 'Talk mode off.';
    return;
  }
  talkActive = true;
  $('listenBtn').textContent = 'Stop talk mode';
  const rec = new SR();
  talkLoop = rec;
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.continuous = false;
  const arm = () => {
    if (!talkActive) return;
    setStatus('LISTENING');
    $('voiceLog').textContent = 'Talk to DGS AI…';
    try { rec.start(); } catch (_) {}
  };
  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    $('voiceLog').textContent = `Heard: ${text}`;
    handleVoiceCommand(text);
  };
  rec.onerror = () => {
    if (talkActive) setTimeout(arm, 300);
  };
  rec.onend = () => {
    if (talkActive) setTimeout(arm, 250);
  };
  arm();
  speak('Talk mode on. Ask anything.');
}

function initHumanoid() {
  const canvas = $('humanoid');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.15, 3.6);

  // Soft core glow (inner head)
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.18 })
  );
  core.position.set(0, 0.55, 0);
  scene.add(core);

  const core2 = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.35 })
  );
  core2.position.set(0, 0.58, 0.05);
  scene.add(core2);

  // Clean surface particles on head ellipsoid + shoulders
  const count = 2800;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const bases = new Float32Array(count * 3);
  const cTeal = new THREE.Color('#5eead4');
  const cViolet = new THREE.Color('#a78bfa');
  const cWhite = new THREE.Color('#e2e8f0');

  function sampleHead() {
    // surface of ellipsoid
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(2 * Math.random() - 1);
    const rx = 0.72, ry = 0.88, rz = 0.62;
    let x = rx * Math.sin(v) * Math.cos(u);
    let y = ry * Math.cos(v) + 0.55;
    let z = rz * Math.sin(v) * Math.sin(u);
    // slight jaw taper
    if (y < 0.35) {
      const t = (0.35 - y) / 0.7;
      x *= 1 - t * 0.22;
      z *= 1 - t * 0.18;
    }
    // eye hollows (push inward / dim later)
    const leftEye = Math.hypot(x + 0.22, y - 0.7, z - 0.35);
    const rightEye = Math.hypot(x - 0.22, y - 0.7, z - 0.35);
    const eye = Math.min(leftEye, rightEye) < 0.14;
    return { x, y, z, eye };
  }

  function sampleShoulder() {
    const x = (Math.random() - 0.5) * 1.7;
    const y = -0.35 - Math.random() * 0.85;
    const z = (Math.random() - 0.5) * 0.45 - 0.05;
    // keep under head width curve
    const maxX = 0.55 + (-y) * 0.55;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y, z, eye: false };
  }

  for (let i = 0; i < count; i++) {
    const onHead = i < count * 0.72;
    const s = onHead ? sampleHead() : sampleShoulder();
    positions[i * 3] = s.x;
    positions[i * 3 + 1] = s.y;
    positions[i * 3 + 2] = s.z;
    bases[i * 3] = s.x;
    bases[i * 3 + 1] = s.y;
    bases[i * 3 + 2] = s.z;
    let col = onHead ? cTeal : cViolet;
    if (s.eye) col = cWhite;
    if (onHead && s.y > 0.95) col = cViolet.clone().lerp(cTeal, 0.4);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.022,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
  );
  scene.add(points);

  // Orbit ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.008, 12, 120),
    new THREE.MeshBasicMaterial({ color: 0x5eead4, transparent: true, opacity: 0.35 })
  );
  ring.rotation.x = Math.PI / 2.4;
  ring.position.y = 0.15;
  scene.add(ring);

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.006, 12, 140),
    new THREE.MeshBasicMaterial({ color: 0xa78bfa, transparent: true, opacity: 0.22 })
  );
  ring2.rotation.x = Math.PI / 2.1;
  ring2.rotation.z = 0.4;
  ring2.position.y = 0.05;
  scene.add(ring2);

  // sparse ambient dust
  const dustN = 400;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 6;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 4;
    dustPos[i * 3 + 2] = -1 - Math.random() * 3;
  }
  const dust = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dustPos, 3)),
    new THREE.PointsMaterial({ color: 0x64748b, size: 0.012, transparent: true, opacity: 0.35 })
  );
  scene.add(dust);

  function resize() {
    const parent = canvas.parentElement;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  let t = 0;
  const pos = geo.attributes.position;
  function frame() {
    t += 0.01;
    const listen = state.status === 'LISTENING';
    const speakNow = state.status === 'SPEAKING';
    const amp = speakNow ? 0.028 : listen ? 0.018 : 0.008;
    for (let i = 0; i < count; i++) {
      const bx = bases[i * 3];
      const by = bases[i * 3 + 1];
      const bz = bases[i * 3 + 2];
      // keep motion subtle so silhouette stays readable
      pos.array[i * 3] = bx + Math.sin(t * 1.6 + by * 3) * amp;
      pos.array[i * 3 + 1] = by + Math.cos(t * 1.4 + bx * 2.5) * amp * 0.7;
      pos.array[i * 3 + 2] = bz + Math.sin(t * 1.2 + bx) * amp * 0.5;
    }
    pos.needsUpdate = true;
    points.rotation.y = Math.sin(t * 0.22) * 0.18;
    const pulse = speakNow ? 1.06 + Math.sin(t * 8) * 0.03 : listen ? 1.03 + Math.sin(t * 4) * 0.015 : 1 + Math.sin(t * 1.5) * 0.008;
    core.scale.setScalar(pulse);
    core2.scale.setScalar(pulse * (speakNow ? 1.08 : 1));
    core.material.opacity = speakNow ? 0.28 : listen ? 0.22 : 0.16;
    ring.rotation.z = t * 0.15;
    ring2.rotation.z = -t * 0.1;
    dust.rotation.y = t * 0.03;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}

function bindMicWake() {
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
      if (cool <= 0 && avg > 58 && state.status === 'IDLE') {
        cool = 100;
        wake();
      }
      cool = Math.max(0, cool - 1);
      requestAnimationFrame(loop);
    };
    loop();
  }).catch(() => {});
}

$('analyzeBtn').onclick = () => { analyzeRisk(); speak(state.lastOpen ? 'Risk gate open.' : 'Risk gate closed.'); };
$('paperBtn').onclick = paperEnter;
$('wakeBtn').onclick = wake;
$('briefBtn').onclick = marketBrief;
$('chartBtn').onclick = openChart;
$('listenBtn').onclick = startVoiceListen;
$('gestureBtn').onclick = () => { enablePinchCamera().catch(() => speak('Could not start pinch camera.')); };
$('haltBtn').onclick = forceHalt;
$('resetDayBtn').onclick = resetDay;
$('clearBookBtn').onclick = clearBook;
$('presetScalp').onclick = () => {
  $('mode').value = 'SCALP';
  $('riskPct').value = '0.35';
  $('dailyLoss').value = '1.5';
  $('minRr').value = '1.3';
  $('maxHold').value = '15';
  $('maxTrades').value = '10';
  $('noOvernight').checked = true;
  analyzeRisk();
  speak('Scalp preset loaded.');
};
$('presetDay').onclick = () => {
  $('mode').value = 'INTRADAY';
  $('riskPct').value = '0.5';
  $('dailyLoss').value = '2';
  $('minRr').value = '1.5';
  $('maxHold').value = '90';
  $('maxTrades').value = '6';
  $('noOvernight').checked = true;
  analyzeRisk();
  speak('Intraday day-trade preset loaded.');
};
$('presetMom').onclick = () => {
  $('mode').value = 'MOMENTUM';
  $('riskPct').value = '0.75';
  $('dailyLoss').value = '2.5';
  $('minRr').value = '2';
  $('maxHold').value = '180';
  $('maxTrades').value = '4';
  $('noOvernight').checked = true;
  analyzeRisk();
  speak('Momentum day-trade preset loaded.');
};

['equity','riskPct','dailyLoss','maxDd','minRr','symbol','side','entry','stop','target','mode','maxTrades','maxHold'].forEach((id) => {
  $(id).addEventListener('change', () => { analyzeRisk(); if (id === 'equity') saveState(); });
  $(id).addEventListener('input', analyzeRisk);
});

$('noOvernight').addEventListener('change', analyzeRisk);
loadState();
renderAgents();
renderBook();
analyzeRisk();
initHumanoid();
bindMicWake();
setStatus('IDLE');
if (state.halted) $('voiceLog').textContent = 'Force halt is on. Reset day to re-arm.';


// --- Mode tabs: Trading (primary) / Social / Work ---
function setAppMode(mode) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.mode === mode));
  document.querySelectorAll('.mode-panel').forEach((panel) => panel.classList.add('hidden'));
  const panel = document.getElementById(`panel-${mode}`);
  if (panel) panel.classList.remove('hidden');
  if (mode === 'trading') speak('Trading mode. Intraday priority.');
  if (mode === 'social') speak('Social mode. Drafts only until you approve.');
  if (mode === 'work') speak('Work mode. Plans and drafts ready.');
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => setAppMode(tab.dataset.mode));
});

function draftSocial() {
  const platform = $('socialPlatform').value;
  const topic = $('socialTopic').value.trim() || 'DGS AI intraday discipline';
  const tone = $('socialTone').value;
  const hooks = {
    Professional: 'Most day traders lose from size, not from missing the move.',
    Bold: 'If your risk gate is closed, you do not trade. Period.',
    Educational: 'Intraday checklist: bias, invalidation, size from stop, flat by close.',
    'Founder story': 'I built DGS AI so my day trades answer to risk first, not adrenaline.',
  };
  const hook = hooks[tone] || hooks.Professional;
  const lines = [
    `PLATFORM: ${platform}`,
    `TONE: ${tone}`,
    '',
    hook,
    '',
    `Topic: ${topic}`,
    '',
    'DGS AI runs:',
    '- Hard risk percent per trade',
    '- Daily loss and drawdown halt',
    '- Flat-by-session for intraday',
    '',
    'Built by Dineshgopi Sunkara. Paper first. No guaranteed profit.',
    '',
    platform === 'LinkedIn'
      ? 'CTA: Comment RISK if you want the intraday gate checklist.'
      : 'CTA: Save this for the open.',
    '',
    'HASHTAGS: #DayTrading #RiskManagement #DGSAI #Intraday',
  ];
  $('socialOut').textContent = lines.join('\n');
  speak('Social draft ready. Review before posting.');
}

function socialChecklist() {
  $('socialOut').textContent = [
    'DGS AI — today social checklist',
    '1) One educational intraday risk post',
    '2) One screenshot of risk gate (no fake P&L claims)',
    '3) Reply to 5 comments with useful risk tips',
    '4) Ask DGS AI chat to schedule tomorrow draft',
    '5) Never post broker login screens or account numbers',
  ].join('\n');
  speak('Social checklist loaded.');
}

function runWork() {
  const type = $('workType').value;
  const raw = $('workInput').value.trim() || 'No details provided — using generic template.';
  let out = '';
  if (type === 'Daily priorities') {
    out = [
      'DGS AI — Daily priorities',
      `Context: ${raw}`,
      '',
      'P0 (must finish today):',
      '1) ',
      '2) ',
      '',
      'P1 (if time):',
      '1) ',
      '',
      'Trading block: only while risk gate is healthy; flatten before session end.',
      'Social block: one draft + replies.',
      'Shutdown: review paper book + tomorrow bias.',
    ].join('\n');
  } else if (type === 'Client email') {
    out = [
      'Subject: Quick update',
      '',
      'Hi ,',
      '',
      raw,
      '',
      'Next step:',
      '-',
      '',
      'Thanks,',
      'Dineshgopi Sunkara',
      'DGS AI',
    ].join('\n');
  } else if (type === 'Meeting notes → actions') {
    out = [
      'DGS AI — Actions from notes',
      '',
      'Notes:',
      raw,
      '',
      'Actions:',
      '[ ] Owner — task — due',
      '[ ] Owner — task — due',
      '',
      'Risks / blockers:',
      '-',
    ].join('\n');
  } else {
    out = [
      'DGS AI — SOP checklist',
      '',
      `Process: ${raw}`,
      '',
      '1) Trigger',
      '2) Inputs needed',
      '3) Steps',
      '4) Quality check',
      '5) Handoff / done definition',
    ].join('\n');
  }
  $('workOut').textContent = out;
  speak('Work draft ready.');
}

$('socialDraftBtn').onclick = draftSocial;
$('socialChecklistBtn').onclick = socialChecklist;
$('workRunBtn').onclick = runWork;
