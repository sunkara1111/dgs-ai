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
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.z = 4.05;

  const count = 6200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const bases = new Float32Array(count * 3);
  const cCyan = new THREE.Color('#3de7ff');
  const cAmber = new THREE.Color('#ff9a3c');
  for (let i = 0; i < count; i++) {
    const inHead = i < count * 0.64;
    let x, y, z;
    if (inHead) {
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = 0.9 * Math.cbrt(Math.random());
      x = r * Math.sin(phi) * Math.cos(theta) * 0.82;
      y = r * Math.cos(phi) * 1.08 + 0.58;
      z = r * Math.sin(phi) * Math.sin(theta) * 0.68;
    } else {
      x = (Math.random() - 0.5) * 1.35;
      y = -0.15 - Math.random() * 1.45;
      z = (Math.random() - 0.5) * 0.65;
    }
    positions[i * 3] = x; positions[i * 3 + 1] = y; positions[i * 3 + 2] = z;
    bases[i * 3] = x; bases[i * 3 + 1] = y; bases[i * 3 + 2] = z;
    const core = inHead && Math.hypot(x, y - 0.55, z) < 0.38;
    const col = core || Math.random() > 0.88 ? cAmber : cCyan;
    colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.016, vertexColors: true, transparent: true, opacity: 0.96, depthBlending: THREE.AdditiveBlending,
  }));
  scene.add(points);

  const waveCount = 2400;
  const wp = new Float32Array(waveCount * 3);
  for (let i = 0; i < waveCount; i++) {
    wp[i * 3] = (Math.random() - 0.5) * 9;
    wp[i * 3 + 1] = (Math.random() - 0.5) * 5.5;
    wp[i * 3 + 2] = -1.8 - Math.random() * 2.4;
  }
  const waves = new THREE.Points(
    new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(wp, 3)),
    new THREE.PointsMaterial({ color: '#1ec8ff', size: 0.011, opacity: 0.32, transparent: true })
  );
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
  const pos = geo.attributes.position;
  function frame() {
    t += 0.012;
    const listen = state.status === 'LISTENING';
    const speakNow = state.status === 'SPEAKING';
    const amp = speakNow ? 0.055 : listen ? 0.03 : 0.012;
    for (let i = 0; i < count; i++) {
      const bx = bases[i * 3], by = bases[i * 3 + 1], bz = bases[i * 3 + 2];
      pos.array[i * 3] = bx + Math.sin(t * 2 + by * 4) * amp;
      pos.array[i * 3 + 1] = by + Math.cos(t * 2.2 + bx * 3) * amp * 0.8;
      pos.array[i * 3 + 2] = bz + Math.sin(t * 1.7 + bx) * amp * 0.6;
    }
    pos.needsUpdate = true;
    points.rotation.y = Math.sin(t * 0.28) * 0.22;
    const pulse = speakNow ? 1.1 + Math.sin(t * 9) * 0.05 : listen ? 1.05 + Math.sin(t * 5) * 0.02 : 1 + Math.sin(t * 2) * 0.012;
    points.scale.setScalar(pulse);
    waves.rotation.z = t * 0.04;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();
}


function forceHalt() {
  state.halted = true;
  saveState();
  analyzeRisk();
  speak('Force halt engaged. All paper entries blocked until you reset the day.');
}

function resetDay() {
  state.dayPnL = 0;
  state.halted = false;
  state.peakEquity = Math.max(state.peakEquity, num('equity'));
  saveState();
  analyzeRisk();
  speak('Day P and L reset. Risk gate re-armed.');
}

function clearBook() {
  state.book = [];
  saveState();
  renderBook();
  speak('Paper book cleared.');
}

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z || 0) - (b.z || 0);
  return Math.hypot(dx, dy, dz);
}

async function enablePinchCamera() {
  if (state.gestureOn) {
    speak('Pinch camera already on.');
    return;
  }
  if (!window.Hands || !window.Camera) {
    speak('Pinch camera library failed to load. Use Wake or voice instead.');
    return;
  }
  const video = $('gestureCam');
  video.style.display = 'block';
  const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 0,
    minDetectionConfidence: 0.6,
    minTrackingConfidence: 0.5,
  });
  let cool = 0;
  hands.onResults((results) => {
    if (cool > 0) { cool -= 1; return; }
    const hand = results.multiHandLandmarks?.[0];
    if (!hand) return;
    const pinch = dist(hand[4], hand[8]);
    if (pinch < 0.05) {
      cool = 45;
      setStatus('LISTENING');
      speak('Pinch recognized. Risk guard listening.');
    }
  });
  const camera = new Camera(video, {
    onFrame: async () => { await hands.send({ image: video }); },
    width: 320,
    height: 240,
  });
  await camera.start();
  state.gestureOn = true;
  speak('Pinch camera enabled. Pinch thumb and index to wake.');
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
