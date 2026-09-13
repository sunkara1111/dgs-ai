import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'dgs-ai-v3';

const DEMO_QUOTES = {
  NVDA: { last: 178.40, chg: 2.15, chgPct: 1.22, name: 'NVIDIA' },
  AAPL: { last: 228.10, chg: -0.84, chgPct: -0.37, name: 'Apple' },
  MSFT: { last: 432.55, chg: 1.90, chgPct: 0.44, name: 'Microsoft' },
  TSLA: { last: 241.20, chg: 4.10, chgPct: 1.73, name: 'Tesla' },
  AMZN: { last: 191.75, chg: 0.62, chgPct: 0.32, name: 'Amazon' },
  META: { last: 548.30, chg: -3.20, chgPct: -0.58, name: 'Meta' },
  GOOGL: { last: 172.88, chg: 0.95, chgPct: 0.55, name: 'Alphabet' },
  SPY: { last: 562.40, chg: 1.12, chgPct: 0.20, name: 'S&P 500 ETF' },
  QQQ: { last: 491.15, chg: 2.04, chgPct: 0.42, name: 'Nasdaq 100 ETF' },
  IWM: { last: 218.60, chg: -0.40, chgPct: -0.18, name: 'Russell 2000 ETF' },
  AMD: { last: 156.22, chg: 1.48, chgPct: 0.96, name: 'AMD' },
  AVGO: { last: 172.10, chg: 0.88, chgPct: 0.51, name: 'Broadcom' },
  SMCI: { last: 46.80, chg: -1.10, chgPct: -2.30, name: 'Super Micro' },
  COIN: { last: 212.40, chg: 5.30, chgPct: 2.56, name: 'Coinbase' },
  PLTR: { last: 38.95, chg: 0.72, chgPct: 1.88, name: 'Palantir' },
  BTC: { last: 64250, chg: 380, chgPct: 0.59, name: 'Bitcoin' },
  ETH: { last: 2680, chg: 22, chgPct: 0.83, name: 'Ethereum' },
};

const NAME_TO_SYM = {
  nvidia: 'NVDA', nvda: 'NVDA',
  apple: 'AAPL', aapl: 'AAPL',
  microsoft: 'MSFT', msft: 'MSFT',
  tesla: 'TSLA', tsla: 'TSLA',
  amazon: 'AMZN', amzn: 'AMZN',
  meta: 'META', facebook: 'META',
  google: 'GOOGL', alphabet: 'GOOGL', googl: 'GOOGL', goog: 'GOOGL',
  spy: 'SPY', 's&p': 'SPY',
  qqq: 'QQQ', nasdaq: 'QQQ',
  iwm: 'IWM', russell: 'IWM',
  amd: 'AMD',
  broadcom: 'AVGO', avgo: 'AVGO',
  smci: 'SMCI',
  coin: 'COIN', coinbase: 'COIN',
  palantir: 'PLTR', pltr: 'PLTR',
  bitcoin: 'BTC', btc: 'BTC',
  ethereum: 'ETH', eth: 'ETH',
};

const TV_MAP = {
  NVDA: 'NASDAQ:NVDA', AAPL: 'NASDAQ:AAPL', MSFT: 'NASDAQ:MSFT',
  TSLA: 'NASDAQ:TSLA', AMZN: 'NASDAQ:AMZN', META: 'NASDAQ:META',
  GOOGL: 'NASDAQ:GOOGL', SPY: 'AMEX:SPY', QQQ: 'NASDAQ:QQQ',
  IWM: 'AMEX:IWM', AMD: 'NASDAQ:AMD', AVGO: 'NASDAQ:AVGO',
  SMCI: 'NASDAQ:SMCI', COIN: 'NASDAQ:COIN', PLTR: 'NYSE:PLTR',
  BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT',
};

const FILLERS = [
  'Give the cloud a breath…',
  'One moment while I pull the tape…',
  'Packaging that now…',
];

const state = {
  status: 'IDLE',
  book: [],
  dayPnL: 0,
  peakEquity: 10000,
  lastOpen: false,
  halted: false,
  gestureOn: false,
  lastSymbol: 'NVDA',
  lastQuote: null,
  chartOpen: false,
  talkActive: false,
  speaking: false,
};

let talkLoop = null;
let shareBlob = null;
let shareUrl = '';

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (Array.isArray(data.book)) state.book = data.book;
    if (typeof data.dayPnL === 'number') state.dayPnL = data.dayPnL;
    if (typeof data.peakEquity === 'number') state.peakEquity = data.peakEquity;
    if (typeof data.equity === 'number' && $('equity')) $('equity').value = data.equity;
    if (typeof data.halted === 'boolean') state.halted = data.halted;
    if (typeof data.lastSymbol === 'string') state.lastSymbol = data.lastSymbol;
  } catch (_) {}
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    book: state.book,
    dayPnL: state.dayPnL,
    peakEquity: state.peakEquity,
    equity: Number($('equity')?.value || 10000),
    halted: state.halted,
    lastSymbol: state.lastSymbol,
  }));
}

function setStatus(s) {
  state.status = s;
  const pill = $('statusPill');
  if (!pill) return;
  pill.textContent = `STATUS : ${s}`;
  pill.dataset.state = s;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function addLine(who, text) {
  const box = $('transcript');
  if (!box || !text) return;
  const el = document.createElement('div');
  el.className = `bubble ${who}`;
  el.innerHTML = `<span class="who">${who === 'user' ? 'You' : 'DGS AI'}</span><p>${escapeHtml(text)}</p>`;
  box.appendChild(el);
  while (box.children.length > 8) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

function hideHint() {
  const h = $('hint');
  if (h) h.style.opacity = '0.25';
}

function speak(text) {
  if (!text) return Promise.resolve();
  addLine('dgs', text);
  if ($('voiceLog')) $('voiceLog').textContent = text;
  hideHint();
  setStatus('SPEAKING');
  state.speaking = true;
  return new Promise((resolve) => {
    const done = () => {
      state.speaking = false;
      if (!state.talkActive) setStatus('IDLE');
      else setStatus('LISTENING');
      resolve();
    };
    if (!('speechSynthesis' in window)) {
      setTimeout(done, 900);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.onend = done;
    u.onerror = done;
    window.speechSynthesis.speak(u);
  });
}

function speakFiller() {
  return speak(FILLERS[Math.floor(Math.random() * FILLERS.length)]);
}

function num(id) { return Number($(id).value); }

function money(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function parseSymbol(text) {
  const t = (text || '').toLowerCase();
  for (const [name, sym] of Object.entries(NAME_TO_SYM)) {
    if (t.includes(name)) return sym;
  }
  const m = t.toUpperCase().match(/\b([A-Z]{1,5})\b/);
  if (m && DEMO_QUOTES[m[1]]) return m[1];
  const raw = ($('symbol')?.value || state.lastSymbol || 'NVDA').trim().toUpperCase();
  return raw || 'NVDA';
}

function tvSymbol(sym) {
  return TV_MAP[sym] || `NASDAQ:${sym}`;
}

function chartPageUrl(sym) {
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol(sym))}`;
}

function embedUrl(sym) {
  const q = new URLSearchParams({
    symbol: tvSymbol(sym),
    interval: '15',
    hidesidetoolbar: '1',
    hidetoptoolbar: '0',
    symboledit: '1',
    saveimage: '1',
    toolbarbg: '050508',
    theme: 'dark',
    style: '1',
    timezone: 'Etc/UTC',
    withdateranges: '1',
    hideideas: '1',
    locale: 'en',
  });
  return `https://s.tradingview.com/widgetembed/?${q.toString()}`;
}

function fakeSpark(last, chg) {
  const n = 24;
  const out = [];
  let v = last - chg * 3;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.45) * Math.max(0.4, Math.abs(chg) * 0.6);
    out.push(v);
  }
  out[out.length - 1] = last;
  return out;
}

async function fetchQuote(symbol) {
  const ysym = symbol === 'BTC' ? 'BTC-USD' : symbol === 'ETH' ? 'ETH-USD' : symbol;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ysym)}?interval=1d&range=5d`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3200);
  try {
    const res = await fetch(url, { signal: ctrl.signal, mode: 'cors' });
    clearTimeout(timer);
    if (!res.ok) throw new Error('http');
    const data = await res.json();
    const r = data.chart.result[0];
    const meta = r.meta;
    const closes = (r.indicators?.quote?.[0]?.close || []).filter((x) => x != null);
    const last = meta.regularMarketPrice ?? closes.at(-1);
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? closes.at(-2) ?? last;
    const chg = last - prev;
    const chgPct = prev ? (chg / prev) * 100 : 0;
    const q = {
      symbol, last, chg, chgPct,
      name: meta.shortName || symbol,
      source: 'live',
      spark: closes.length > 2 ? closes : fakeSpark(last, chg),
    };
    state.lastQuote = q;
    state.lastSymbol = symbol;
    return q;
  } catch (_) {
    clearTimeout(timer);
    const d = DEMO_QUOTES[symbol] || { last: 100, chg: 0.35, chgPct: 0.35, name: symbol };
    const q = { symbol, ...d, source: 'demo', spark: fakeSpark(d.last, d.chg) };
    state.lastQuote = q;
    state.lastSymbol = symbol;
    return q;
  }
}

function fmtPx(n) {
  if (n >= 1000) return n.toFixed(0);
  if (n >= 100) return n.toFixed(2);
  return n.toFixed(2);
}

function spokenQuote(q) {
  const dir = q.chg >= 0 ? 'up' : 'down';
  const src = q.source === 'live' ? 'Live quote.' : 'Delayed demo quote. Live tape was blocked.';
  return `${q.name}, ${q.symbol}, last ${fmtPx(q.last)}, ${dir} ${fmtPx(Math.abs(q.chg))} or ${Math.abs(q.chgPct).toFixed(2)} percent. ${src}`;
}

async function marketBrief() {
  setStatus('LISTENING');
  const filler = speakFiller();
  const [spy, qqq, nvda] = await Promise.all([
    fetchQuote('SPY'), fetchQuote('QQQ'), fetchQuote(state.lastSymbol || 'NVDA'),
  ]);
  await filler;
  const src = [spy, qqq, nvda].every((q) => q.source === 'live')
    ? 'Live tape.'
    : 'Delayed demo tape if the live feed is blocked.';
  const line = `${src} SPY ${fmtPx(spy.last)}, ${spy.chg >= 0 ? 'up' : 'down'} ${Math.abs(spy.chgPct).toFixed(2)} percent. QQQ ${fmtPx(qqq.last)}, ${qqq.chg >= 0 ? 'up' : 'down'} ${Math.abs(qqq.chgPct).toFixed(2)} percent. ${nvda.symbol} ${fmtPx(nvda.last)}. Paper only. Want me to open a chart?`;
  await speak(line);
}

function openChart(symbol) {
  const sym = (symbol || state.lastSymbol || $('symbol')?.value || 'NVDA').toUpperCase();
  state.lastSymbol = sym;
  if ($('symbol')) $('symbol').value = sym;
  const title = $('chartTitle');
  if (title) title.textContent = `${sym} · ${tvSymbol(sym)}`;
  const frame = $('tvFrame');
  if (frame) frame.src = embedUrl(sym);
  const overlay = $('chartOverlay');
  if (overlay) overlay.classList.remove('hidden');
  state.chartOpen = true;
  speak(`Opening ${sym} on the main screen. Paper only. Say send to my phone when you want the handoff.`);
}

function closeChart() {
  const overlay = $('chartOverlay');
  if (overlay) overlay.classList.add('hidden');
  state.chartOpen = false;
}

function paintShareCard(q) {
  const c = $('shareCanvas');
  const ctx = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  ctx.fillStyle = '#050508';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * 0.5, h * 0.32, 20, w * 0.5, h * 0.32, 420);
  g.addColorStop(0, 'rgba(94,234,212,0.28)');
  g.addColorStop(0.55, 'rgba(167,139,250,0.10)');
  g.addColorStop(1, 'rgba(5,5,8,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#5eead4';
  ctx.font = '700 36px IBM Plex Sans, sans-serif';
  ctx.fillText('DGS AI', 72, 110);
  ctx.fillStyle = '#8b9bb0';
  ctx.font = '400 26px IBM Plex Sans, sans-serif';
  ctx.fillText('Voice trading assistant · paper only', 72, 150);

  ctx.fillStyle = '#eef3f8';
  ctx.font = '700 86px IBM Plex Sans, sans-serif';
  ctx.fillText(q.symbol, 72, 320);
  ctx.fillStyle = '#a5b4fc';
  ctx.font = '400 32px IBM Plex Sans, sans-serif';
  ctx.fillText(q.name || q.symbol, 72, 370);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 92px IBM Plex Mono, monospace';
  ctx.fillText(fmtPx(q.last), 72, 500);
  ctx.fillStyle = q.chg >= 0 ? '#34d399' : '#fb7185';
  ctx.font = '500 40px IBM Plex Mono, monospace';
  const sign = q.chg >= 0 ? '+' : '';
  ctx.fillText(`${sign}${fmtPx(q.chg)}   ${sign}${q.chgPct.toFixed(2)}%`, 72, 560);

  const spark = q.spark || fakeSpark(q.last, q.chg);
  const sx = 72;
  const sy = 640;
  const sw = w - 144;
  const sh = 220;
  const min = Math.min(...spark);
  const max = Math.max(...spark);
  const span = Math.max(0.0001, max - min);
  ctx.beginPath();
  spark.forEach((v, i) => {
    const x = sx + (i / Math.max(1, spark.length - 1)) * sw;
    const y = sy + sh - ((v - min) / span) * sh;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = q.chg >= 0 ? '#2dd4bf' : '#fb7185';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = '#8b9bb0';
  ctx.font = '400 26px IBM Plex Sans, sans-serif';
  const src = q.source === 'live' ? 'Quote path: live feed' : 'Quote path: DELAYED DEMO (live tape blocked)';
  ctx.fillText(src, 72, 920);
  ctx.fillText(chartPageUrl(q.symbol), 72, 970);
  ctx.fillText('Dineshgopi Sunkara · No broker · No guaranteed profit', 72, 1040);
  ctx.fillStyle = '#5eead4';
  ctx.font = '500 24px IBM Plex Mono, monospace';
  ctx.fillText('dgs-ai · send to phone', 72, 1220);
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function sendChartToPhone(symbol) {
  const sym = (symbol || state.lastSymbol || 'NVDA').toUpperCase();
  state.lastSymbol = sym;
  const fillerP = speak('Give the cloud a breath while I package the chart…');
  const q = state.lastQuote?.symbol === sym ? state.lastQuote : await fetchQuote(sym);
  paintShareCard(q);
  const canvas = $('shareCanvas');
  shareBlob = await canvasToBlob(canvas);
  shareUrl = chartPageUrl(sym);
  await fillerP;

  const file = shareBlob ? new File([shareBlob], `dgs-ai-${sym}.png`, { type: 'image/png' }) : null;
  const payload = {
    title: `DGS AI · ${sym}`,
    text: `${q.name} ${fmtPx(q.last)} · paper only · ${shareUrl}`,
    url: shareUrl,
  };

  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ ...payload, files: [file] });
      await speak(`Chart card for ${sym} is on its way to your share sheet.`);
      return;
    }
    if (navigator.share) {
      await navigator.share(payload);
      await speak(`I sent the ${sym} chart link to your share sheet.`);
      return;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') {
      await speak('Share canceled.');
      return;
    }
  }

  openDrawer('share');
  const prev = $('sharePreview');
  if (prev && shareBlob) {
    prev.src = URL.createObjectURL(shareBlob);
    prev.style.display = 'block';
  }
  const qr = $('shareQr');
  if (qr) {
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=050508&color=5eead4&data=${encodeURIComponent(shareUrl)}`;
    qr.style.display = 'block';
  }
  const link = $('shareLink');
  if (link) {
    link.href = shareUrl;
    link.textContent = shareUrl;
  }
  if ($('shareStatus')) {
    $('shareStatus').textContent = `Web Share is not available here. Save the PNG or scan the QR for ${sym}.`;
  }
  await speak(`Share sheet is not available on this browser. I left a PNG and a QR for ${sym}.`);
}

function downloadShareCard() {
  if (!shareBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(shareBlob);
  a.download = `dgs-ai-${state.lastSymbol || 'chart'}.png`;
  a.click();
}

function updateStats(dd, open) {
  const pnl = $('dayPnl');
  if (pnl) {
    pnl.textContent = money(state.dayPnL);
    pnl.style.color = state.dayPnL >= 0 ? 'var(--ok)' : 'var(--danger)';
  }
  if ($('ddNow')) $('ddNow').textContent = `${dd.toFixed(2)}%`;
  if ($('gateBadge')) {
    $('gateBadge').textContent = open ? 'OPEN' : 'CLOSED';
    $('gateBadge').style.color = open ? 'var(--ok)' : 'var(--danger)';
  }
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
  if (noOvernight) reasons.push('Flat-by-close rule ON — no overnight holds');
  else { score += 15; reasons.push('Overnight allowed — higher session risk'); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const open = !state.halted && score < 50 && shares > 0 && !dailyHalt && !ddHalt && rr >= minRr && stopDist > 0 && tradesToday < maxTrades;
  state.lastOpen = open;

  $('riskScore').textContent = String(score);
  $('riskBar').style.width = `${score}%`;
  $('riskBar').style.background = score < 35 ? 'var(--ok)' : score < 50 ? 'var(--warn)' : 'var(--danger)';
  const gate = $('gateMsg');
  gate.textContent = open
    ? `Gate: OPEN — ${shares} sh ${symbol} ${side} · risk ${money(dollarRisk)} · R:R ${rr.toFixed(2)}`
    : `Gate: CLOSED — score ${score}${state.halted ? ' · FORCE HALT' : ''}${dailyHalt ? ' · daily loss halt' : ''}${ddHalt ? ' · drawdown halt' : ''}`;
  gate.className = `gate ${open ? 'open' : 'closed'}`;
  $('paperBtn').disabled = !open;
  updateStats(dd, open);

  $('analysis').textContent = [
    'Founder guard · DGS AI · PAPER ONLY',
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
    speak('Risk gate is closed. I will not paper-enter this setup. I do not place live orders.');
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
  saveState();
  analyzeRisk();
  speak(`Paper entry allowed. ${r.shares} shares ${r.symbol} ${r.side}. Risk score ${r.score}. This is not a live broker order.`);
}

function renderBook() {
  $('book').innerHTML = state.book.slice(0, 8).map((t) =>
    `<li>${t.symbol} ${t.side} · ${t.shares} sh · R:R ${t.rr.toFixed(2)} · score ${t.score}</li>`
  ).join('') || '<li>No paper trades yet.</li>';
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

function statusSpeech() {
  const eq = num('equity');
  const dd = Math.max(0, (state.peakEquity - eq) / Math.max(state.peakEquity, 1) * 100);
  const gate = state.lastOpen ? 'open' : 'closed';
  return `Status. Paper equity ${money(eq)}. Day P and L ${money(state.dayPnL)}. Drawdown ${dd.toFixed(2)} percent. Gate ${gate}. Halt ${state.halted ? 'on' : 'off'}. Paper only.`;
}

function helpSpeech() {
  return 'I am DGS AI. Ask for a market brief, a quote, open a chart, or send the chart to your phone. I can analyze risk and paper-enter only if the gate is open. I do not place live trades or control your phone natively.';
}

function wake() {
  setStatus('LISTENING');
  speak('Go ahead. DGS AI is online. Ask for a market brief, a quote, or a chart.');
}

async function quoteSpeech(symbol) {
  const filler = speakFiller();
  const q = await fetchQuote(symbol);
  await filler;
  await speak(`${spokenQuote(q)} Want the ${q.symbol} chart?`);
}

function quickAnswer(q) {
  const t = q.toLowerCase();
  if (/(who are you|your name|what are you)/.test(t)) {
    return 'I am DGS AI, built for Dineshgopi Sunkara. Voice first. Trading brief, charts, and paper risk. I do not place live orders.';
  }
  if (/(help|what can you|commands)/.test(t)) return helpSpeech();
  if (/(profit|guarantee|guaranteed)/.test(t)) {
    return 'No profit is guaranteed. DGS AI blocks bad paper size. It does not promise returns.';
  }
  if (/(broker|live order|real money|place a trade)/.test(t)) {
    return 'Paper only. I will not connect a broker or place a live order.';
  }
  if (/(social|instagram|linkedin|twitter|post)/.test(t)) {
    openDrawer('social');
    return 'Social drawer is open. I draft. You approve before posting.';
  }
  if (/(work|email|sop|priority|priorities)/.test(t)) {
    openDrawer('work');
    return 'Work drawer is open. Plans and drafts only.';
  }
  if (/(hello|hi |hey )/.test(t) || t === 'hi' || t === 'hey') {
    return 'Listening. Ask for a market brief, a quote, or show a chart.';
  }
  return null;
}

async function handleVoiceCommand(text) {
  const t = text.toLowerCase();
  addLine('user', text);

  if (/(send (it |the chart )?to (my )?phone|handoff|share (the )?chart|airdrop)/.test(t)) {
    await sendChartToPhone(parseSymbol(text));
    return;
  }
  if (/(open chart|show (the )?chart|chart for|tradingview|trading view|show )\b/.test(t) || /\bchart\b/.test(t)) {
    openChart(parseSymbol(text));
    return;
  }
  if (/(market brief|brief(ing)?|sentiment|how('?s| is) the market|market today)/.test(t)) {
    await marketBrief();
    return;
  }
  if (/\b(quote|price|how('?s| is)|what is)\b/.test(t) || NAME_TO_SYM[t.trim()]) {
    await quoteSpeech(parseSymbol(text));
    return;
  }
  if (/(analyze|risk gate|check risk)/.test(t)) {
    openDrawer('risk');
    analyzeRisk();
    await speak(state.lastOpen ? 'Risk gate is open for this paper setup.' : 'Risk gate is closed for this paper setup.');
    return;
  }
  if (/(enter paper|paper enter|take the trade|paper trade)/.test(t)) {
    paperEnter();
    return;
  }
  if (/(force halt|halt|stop trading)/.test(t)) {
    forceHalt();
    return;
  }
  if (/(day p|p and l|pnl|status|drawdown)/.test(t)) {
    analyzeRisk();
    await speak(statusSpeech());
    return;
  }
  if (/(wake|hey dgs)/.test(t)) {
    wake();
    return;
  }
  if (/(close chart|hide chart)/.test(t)) {
    closeChart();
    await speak('Chart closed.');
    return;
  }
  const ans = quickAnswer(text);
  if (ans) {
    await speak(ans);
    return;
  }
  await speak('Got it. I can brief the market, quote a symbol, open a chart, or send that chart to your phone. Paper only.');
}

function startVoiceListen() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    speak('Voice recognition is not available in this browser. Use the buttons.');
    return;
  }
  if (state.talkActive) {
    state.talkActive = false;
    try { talkLoop && talkLoop.stop(); } catch (_) {}
    $('listenBtn').textContent = 'Talk';
    $('listenBtn').dataset.on = '0';
    setStatus('IDLE');
    speak('Talk mode off.');
    return;
  }
  state.talkActive = true;
  $('listenBtn').textContent = 'Stop';
  $('listenBtn').dataset.on = '1';
  const rec = new SR();
  talkLoop = rec;
  rec.lang = 'en-US';
  rec.interimResults = false;
  rec.continuous = false;
  const arm = () => {
    if (!state.talkActive) return;
    if (state.speaking) {
      setTimeout(arm, 280);
      return;
    }
    setStatus('LISTENING');
    try { rec.start(); } catch (_) {}
  };
  rec.onresult = (e) => {
    const text = e.results[0][0].transcript;
    handleVoiceCommand(text);
  };
  rec.onerror = () => { if (state.talkActive) setTimeout(arm, 350); };
  rec.onend = () => { if (state.talkActive) setTimeout(arm, 260); };
  arm();
  speak('Talk mode on. Ask anything.');
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
    if (dist(hand[4], hand[8]) < 0.05) {
      cool = 45;
      setStatus('LISTENING');
      speak('Pinch recognized. DGS AI listening.');
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

function openDrawer(name) {
  closeDrawers();
  const el = $(`drawer-${name}`);
  if (!el) return;
  el.classList.add('open');
  $('backdrop').classList.remove('hidden');
}

function closeDrawers() {
  document.querySelectorAll('.drawer').forEach((d) => d.classList.remove('open'));
  $('backdrop').classList.add('hidden');
}

function setAppMode(mode) {
  if (mode === 'trading') openDrawer('risk');
  if (mode === 'social') openDrawer('social');
  if (mode === 'work') openDrawer('work');
}

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
  $('socialOut').textContent = [
    `PLATFORM: ${platform}`,
    `TONE: ${tone}`,
    '',
    hook,
    '',
    `Topic: ${topic}`,
    '',
    'DGS AI runs hard risk percent, daily loss halt, and flat-by-session for intraday.',
    'Built by Dineshgopi Sunkara. Paper first. No guaranteed profit.',
    '',
    platform === 'LinkedIn'
      ? 'CTA: Comment RISK if you want the intraday gate checklist.'
      : 'CTA: Save this for the open.',
    '',
    'HASHTAGS: #DayTrading #RiskManagement #DGSAI #Intraday',
  ].join('\n');
  speak('Social draft ready. Review before posting.');
}

function socialChecklist() {
  $('socialOut').textContent = [
    'DGS AI — today social checklist',
    '1) One educational intraday risk post',
    '2) One screenshot of risk gate (no fake P&L claims)',
    '3) Reply to 5 comments with useful risk tips',
    '4) Never post broker login screens or account numbers',
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

function seedCssNodes() {
  const box = $('cssNodes');
  if (!box) return;
  const spots = [
    [18, 22], [78, 18], [88, 48], [12, 58], [70, 78], [30, 82],
    [50, 12], [8, 36], [92, 70], [42, 90], [60, 28], [24, 44],
  ];
  box.innerHTML = spots.map(([x, y], i) =>
    `<span class="node" style="left:${x}%;top:${y}%;animation-delay:${i * 0.18}s"></span>`
  ).join('');
}

function initHumanoid() {
  const canvas = $('humanoid');
  if (!canvas) return;
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.05, 3.15);

    const teal = 0x5eead4;
    const violet = 0xa78bfa;

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 48, 48),
      new THREE.MeshBasicMaterial({ color: teal, transparent: true, opacity: 0.22 })
    );
    scene.add(core);
    const core2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
    );
    scene.add(core2);

    const ico = new THREE.IcosahedronGeometry(1.05, 1);
    const pos = ico.attributes.position;
    const n = pos.count;
    const colors = new Float32Array(n * 3);
    const cTeal = new THREE.Color(teal);
    const cViolet = new THREE.Color(violet);
    for (let i = 0; i < n; i++) {
      const col = i % 2 ? cTeal : cViolet;
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    ico.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const nodes = new THREE.Points(ico, new THREE.PointsMaterial({
      size: 0.045, vertexColors: true, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    scene.add(nodes);

    const lineGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.05, 1));
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
      color: teal, transparent: true, opacity: 0.16,
    }));
    scene.add(lines);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.28, 0.008, 12, 120),
      new THREE.MeshBasicMaterial({ color: teal, transparent: true, opacity: 0.42 })
    );
    ring.rotation.x = Math.PI / 2.25;
    scene.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.TorusGeometry(1.55, 0.006, 12, 140),
      new THREE.MeshBasicMaterial({ color: violet, transparent: true, opacity: 0.26 })
    );
    ring2.rotation.x = Math.PI / 2.05;
    ring2.rotation.z = 0.4;
    scene.add(ring2);

    function resize() {
      const parent = canvas.parentElement;
      const w = Math.max(parent.clientWidth || 0, 280);
      const h = Math.max(parent.clientHeight || 0, 360);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    let t = 0;
    function frame() {
      t += 0.012;
      const speakNow = state.status === 'SPEAKING';
      const listen = state.status === 'LISTENING';
      const pulse = speakNow ? 1.07 + Math.sin(t * 7) * 0.03 : listen ? 1.03 + Math.sin(t * 4) * 0.015 : 1 + Math.sin(t) * 0.01;
      core.scale.setScalar(pulse);
      core2.scale.setScalar(pulse);
      const yaw = t * 0.12;
      nodes.rotation.y = yaw;
      lines.rotation.y = yaw;
      ring.rotation.z = t * 0.14;
      ring2.rotation.z = -t * 0.09;
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    frame();
  } catch (err) {
    console.error('Humanoid WebGL failed', err);
  }
}

function bindUi() {
  $('wakeBtn').onclick = wake;
  $('listenBtn').onclick = startVoiceListen;
  $('briefBtn').onclick = () => { marketBrief(); };
  $('chartBtn').onclick = () => openChart(parseSymbol($('symbol')?.value || state.lastSymbol));
  $('closeChartBtn').onclick = closeChart;
  $('sendPhoneBtn').onclick = () => { sendChartToPhone(state.lastSymbol); };
  $('openTvTabBtn').onclick = () => window.open(chartPageUrl(state.lastSymbol), '_blank', 'noopener,noreferrer');
  $('openRiskBtn').onclick = () => openDrawer('risk');
  $('backdrop').onclick = closeDrawers;
  document.querySelectorAll('.drawer-close').forEach((btn) => {
    btn.onclick = closeDrawers;
  });
  document.querySelectorAll('.quiet-tabs .tab').forEach((tab) => {
    tab.addEventListener('click', () => setAppMode(tab.dataset.mode));
  });

  $('analyzeBtn').onclick = () => { analyzeRisk(); speak(state.lastOpen ? 'Risk gate open.' : 'Risk gate closed.'); };
  $('paperBtn').onclick = paperEnter;
  $('haltBtn').onclick = forceHalt;
  $('resetDayBtn').onclick = resetDay;
  $('clearBookBtn').onclick = clearBook;
  $('gestureBtn').onclick = () => { enablePinchCamera().catch(() => speak('Could not start pinch camera.')); };
  $('downloadCardBtn').onclick = downloadShareCard;
  $('socialDraftBtn').onclick = draftSocial;
  $('socialChecklistBtn').onclick = socialChecklist;
  $('workRunBtn').onclick = runWork;

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
}

seedCssNodes();
loadState();
bindUi();
renderBook();
analyzeRisk();
initHumanoid();
setStatus('IDLE');
if (state.halted && $('voiceLog')) $('voiceLog').textContent = 'Force halt is on. Reset day to re-arm.';
