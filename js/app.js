import { onUnlocked, signOutUser, getPlan, hasFeature, getProfile, onProfileReady, getCurrentUser } from './gate.js?v=20260914start';

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'dgs-ai-v3';

const DEMO_QUOTES = {
  NVDA: { last: 178.40, chg: 2.15, chgPct: 1.22, high: 180.10, low: 175.20, name: 'NVIDIA' },
  AAPL: { last: 228.10, chg: -0.84, chgPct: -0.37, high: 229.40, low: 226.80, name: 'Apple' },
  MSFT: { last: 432.55, chg: 1.90, chgPct: 0.44, high: 434.20, low: 429.10, name: 'Microsoft' },
  TSLA: { last: 241.20, chg: 4.10, chgPct: 1.73, high: 243.50, low: 236.80, name: 'Tesla' },
  AMZN: { last: 191.75, chg: 0.62, chgPct: 0.32, high: 193.00, low: 190.20, name: 'Amazon' },
  META: { last: 548.30, chg: -3.20, chgPct: -0.58, high: 552.00, low: 545.10, name: 'Meta' },
  GOOGL: { last: 172.88, chg: 0.95, chgPct: 0.55, high: 174.20, low: 171.40, name: 'Alphabet' },
  SPY: { last: 562.40, chg: 1.12, chgPct: 0.20, high: 564.00, low: 560.10, name: 'S&P 500 ETF' },
  QQQ: { last: 491.15, chg: 2.04, chgPct: 0.42, high: 493.20, low: 487.80, name: 'Nasdaq 100 ETF' },
  IWM: { last: 218.60, chg: -0.40, chgPct: -0.18, high: 220.10, low: 217.20, name: 'Russell 2000 ETF' },
  AMD: { last: 156.22, chg: 1.48, chgPct: 0.96, high: 157.80, low: 153.90, name: 'AMD' },
  AVGO: { last: 172.10, chg: 0.88, chgPct: 0.51, high: 173.40, low: 170.20, name: 'Broadcom' },
  SMCI: { last: 46.80, chg: -1.10, chgPct: -2.30, high: 48.20, low: 46.10, name: 'Super Micro' },
  COIN: { last: 212.40, chg: 5.30, chgPct: 2.56, high: 214.80, low: 206.50, name: 'Coinbase' },
  PLTR: { last: 38.95, chg: 0.72, chgPct: 1.88, high: 39.40, low: 37.90, name: 'Palantir' },
  NFLX: { last: 702.40, chg: 4.20, chgPct: 0.60, high: 708.00, low: 695.50, name: 'Netflix' },
  CRM: { last: 298.10, chg: -1.40, chgPct: -0.47, high: 301.20, low: 296.00, name: 'Salesforce' },
  BA: { last: 178.90, chg: 1.10, chgPct: 0.62, high: 180.40, low: 176.80, name: 'Boeing' },
  DIS: { last: 98.40, chg: -0.55, chgPct: -0.56, high: 99.80, low: 97.90, name: 'Disney' },
  JPM: { last: 214.60, chg: 0.85, chgPct: 0.40, high: 216.00, low: 212.80, name: 'JPMorgan' },
  BTC: { last: 64250, chg: 380, chgPct: 0.59, high: 65100, low: 63200, name: 'Bitcoin' },
  ETH: { last: 2680, chg: 22, chgPct: 0.83, high: 2720, low: 2625, name: 'Ethereum' },
  SOL: { last: 148.20, chg: 3.40, chgPct: 2.35, high: 151.00, low: 143.80, name: 'Solana' },
  XRP: { last: 0.62, chg: 0.012, chgPct: 1.97, high: 0.635, low: 0.598, name: 'XRP' },
  DOGE: { last: 0.128, chg: -0.004, chgPct: -3.03, high: 0.135, low: 0.125, name: 'Dogecoin' },
  ADA: { last: 0.41, chg: 0.008, chgPct: 1.99, high: 0.422, low: 0.398, name: 'Cardano' },
  AVAX: { last: 28.40, chg: 0.65, chgPct: 2.34, high: 29.10, low: 27.50, name: 'Avalanche' },
  LINK: { last: 12.85, chg: 0.22, chgPct: 1.74, high: 13.10, low: 12.40, name: 'Chainlink' },
  DOT: { last: 4.85, chg: -0.08, chgPct: -1.62, high: 5.02, low: 4.78, name: 'Polkadot' },
  MATIC: { last: 0.48, chg: 0.01, chgPct: 2.13, high: 0.495, low: 0.462, name: 'Polygon' },
  BNB: { last: 582.00, chg: 6.40, chgPct: 1.11, high: 590.00, low: 568.00, name: 'BNB' },
  LTC: { last: 78.20, chg: -0.90, chgPct: -1.14, high: 80.10, low: 77.40, name: 'Litecoin' },
  UNI: { last: 8.95, chg: 0.18, chgPct: 2.05, high: 9.15, low: 8.70, name: 'Uniswap' },
  ATOM: { last: 5.42, chg: 0.05, chgPct: 0.93, high: 5.55, low: 5.28, name: 'Cosmos' },
  NEAR: { last: 4.18, chg: 0.12, chgPct: 2.96, high: 4.30, low: 4.00, name: 'NEAR' },
  PEPE: { last: 0.0000092, chg: 0.0000003, chgPct: 3.37, high: 0.0000096, low: 0.0000088, name: 'PEPE' },
};

const CRYPTO = new Set(['BTC','ETH','SOL','XRP','DOGE','ADA','AVAX','LINK','DOT','MATIC','BNB','LTC','UNI','ATOM','NEAR','PEPE']);

const NAME_TO_SYM = {
  nvidia: 'NVDA', nvda: 'NVDA',
  apple: 'AAPL', aapl: 'AAPL',
  microsoft: 'MSFT', msft: 'MSFT',
  tesla: 'TSLA', tsla: 'TSLA',
  amazon: 'AMZN', amzn: 'AMZN',
  meta: 'META', facebook: 'META',
  google: 'GOOGL', alphabet: 'GOOGL', googl: 'GOOGL', goog: 'GOOGL',
  spy: 'SPY', 's&p': 'SPY', 's and p': 'SPY',
  qqq: 'QQQ', nasdaq: 'QQQ',
  iwm: 'IWM', russell: 'IWM',
  amd: 'AMD',
  broadcom: 'AVGO', avgo: 'AVGO',
  smci: 'SMCI',
  coin: 'COIN', coinbase: 'COIN',
  palantir: 'PLTR', pltr: 'PLTR',
  netflix: 'NFLX', nflx: 'NFLX',
  salesforce: 'CRM', crm: 'CRM',
  boeing: 'BA',
  disney: 'DIS',
  jpmorgan: 'JPM', 'jp morgan': 'JPM', jpm: 'JPM',
  bitcoin: 'BTC', btc: 'BTC',
  ethereum: 'ETH', eth: 'ETH', ether: 'ETH',
  solana: 'SOL', sol: 'SOL',
  ripple: 'XRP', xrp: 'XRP',
  dogecoin: 'DOGE', doge: 'DOGE',
  cardano: 'ADA', ada: 'ADA',
  avalanche: 'AVAX', avax: 'AVAX',
  chainlink: 'LINK', link: 'LINK',
  polkadot: 'DOT', dot: 'DOT',
  polygon: 'MATIC', matic: 'MATIC',
  binance: 'BNB', bnb: 'BNB',
  litecoin: 'LTC', ltc: 'LTC',
  uniswap: 'UNI', uni: 'UNI',
  cosmos: 'ATOM', atom: 'ATOM',
  near: 'NEAR',
  pepe: 'PEPE',
};

const TV_MAP = {
  NVDA: 'NASDAQ:NVDA', AAPL: 'NASDAQ:AAPL', MSFT: 'NASDAQ:MSFT',
  TSLA: 'NASDAQ:TSLA', AMZN: 'NASDAQ:AMZN', META: 'NASDAQ:META',
  GOOGL: 'NASDAQ:GOOGL', SPY: 'AMEX:SPY', QQQ: 'NASDAQ:QQQ',
  IWM: 'AMEX:IWM', AMD: 'NASDAQ:AMD', AVGO: 'NASDAQ:AVGO',
  SMCI: 'NASDAQ:SMCI', COIN: 'NASDAQ:COIN', PLTR: 'NYSE:PLTR',
  NFLX: 'NASDAQ:NFLX', CRM: 'NYSE:CRM', BA: 'NYSE:BA',
  DIS: 'NYSE:DIS', JPM: 'NYSE:JPM',
  BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT',
  SOL: 'BINANCE:SOLUSDT', XRP: 'BINANCE:XRPUSDT',
  DOGE: 'BINANCE:DOGEUSDT', ADA: 'BINANCE:ADAUSDT',
  AVAX: 'BINANCE:AVAXUSDT', LINK: 'BINANCE:LINKUSDT',
  DOT: 'BINANCE:DOTUSDT', MATIC: 'BINANCE:MATICUSDT',
  BNB: 'BINANCE:BNBUSDT', LTC: 'BINANCE:LTCUSDT',
  UNI: 'BINANCE:UNIUSDT', ATOM: 'BINANCE:ATOMUSDT',
  NEAR: 'BINANCE:NEARUSDT', PEPE: 'BINANCE:PEPEUSDT',
};

const FILLERS = [
  'Pulling the tape…',
  'Working…',
];

const WATCHLIST = [
  'NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMD', 'META', 'AMZN', 'GOOGL',
  'COIN', 'PLTR', 'SPY', 'QQQ',
  'BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'NEAR',
];

const TAPE_SYMS = ['SPY', 'QQQ', 'NVDA', 'AAPL', 'MSFT', 'TSLA', 'BTC', 'ETH'];

const state = {
  status: 'IDLE',
  book: [],
  dayPnL: 0,
  peakEquity: 10000,
  lastOpen: false,
  halted: false,
  lastSymbol: 'NVDA',
  lastQuote: null,
  chartOpen: false,
  activePane: 'paper',
  proposal: null,
  lastScanAt: 0,
  quotesCache: {},
  autopilot: false,
  autopilotLastAction: 'Paper default · idle',
  autopilotBusy: false,
  coinswitchConnected: false,
  coinswitchIntents: [],
  tradingBudget: 1000,
  liveOrdersEnabled: false,
  alpacaConnected: false,
  ibConnected: false,
  profile: null,
};

const CACHE_BUST = '20260914start';
const PAGES_FALLBACK = 'https://sunkara1111.github.io/dgs-ai/';

const CONNECT_APPS_KEY = 'dgs-ai-connect-apps';

const RISK_BY_TOLERANCE = {
  low: { riskPct: 0.35, dailyLoss: 1.5, maxDd: 8, maxTrades: 4, minRr: 1.6, mode: 'INTRADAY', maxHold: 60 },
  med: { riskPct: 0.5, dailyLoss: 2, maxDd: 10, maxTrades: 6, minRr: 1.5, mode: 'INTRADAY', maxHold: 90 },
  high: { riskPct: 0.75, dailyLoss: 2.5, maxDd: 12, maxTrades: 8, minRr: 1.4, mode: 'MOMENTUM', maxHold: 120 },
};

function applyProfileToDesk(profile) {
  if (!profile) return;
  state.profile = profile;
  const tol = RISK_BY_TOLERANCE[profile.riskTolerance] || RISK_BY_TOLERANCE.med;
  const budget = Math.max(100, Number(profile.budget) || 1000);
  state.tradingBudget = budget;
  if ($('tradingBudget')) $('tradingBudget').value = budget;
  if ($('equity')) $('equity').value = budget;
  state.peakEquity = Math.max(state.peakEquity || 0, budget);
  if ($('riskPct')) $('riskPct').value = tol.riskPct;
  if ($('dailyLoss')) $('dailyLoss').value = tol.dailyLoss;
  if ($('maxDd')) $('maxDd').value = tol.maxDd;
  if ($('maxTrades')) $('maxTrades').value = tol.maxTrades;
  if ($('minRr')) $('minRr').value = tol.minRr;
  if ($('mode')) $('mode').value = tol.mode;
  if ($('maxHold')) $('maxHold').value = tol.maxHold;
  if ($('noOvernight')) $('noOvernight').checked = true;
  saveState();
  try { analyzeRisk(); } catch (_) {}
  updateModeBadge();
  updateBotCard();
}

function openRiskDollars() {
  return openTrades().reduce((sum, t) => {
    const stopDist = Math.abs((t.entry || 0) - (t.stop || 0));
    return sum + stopDist * (t.shares || 0);
  }, 0);
}

function brokerKeysPresent() {
  const cs = coinswitchFormatOk($('coinswitchKey')?.value, $('coinswitchSecret')?.value) && state.coinswitchConnected;
  const alp = state.alpacaConnected && alpacaFormatOk($('alpacaKey')?.value, $('alpacaSecret')?.value);
  const ib = state.ibConnected && ibFormatOk($('ibHostPort')?.value);
  return !!(cs || alp || ib);
}

function updateModeBadge() {
  const badge = $('modeBadge');
  const live = !!(state.liveOrdersEnabled && brokerKeysPresent());
  // Force paper if keys missing
  if (!brokerKeysPresent() && state.liveOrdersEnabled) {
    state.liveOrdersEnabled = false;
    if ($('enableLiveOrders')) $('enableLiveOrders').checked = false;
  }
  const mode = (state.liveOrdersEnabled && brokerKeysPresent()) ? 'live' : 'paper';
  if (badge) {
    badge.dataset.mode = mode;
    badge.textContent = mode === 'live' ? 'LIVE (broker)' : 'PAPER';
  }
  const line = $('botLiveLine');
  if (line) {
    const pnl = sessionDayPnL();
    const risk = openRiskDollars();
    const last = state.autopilotLastAction || 'idle';
    line.textContent = `Day P&L ${money(pnl)} · open risk ${money(risk)} · last: ${last}` +
      (mode === 'live'
        ? ' · LIVE badge on — HTTP live orders still require Enable live orders + valid keys (default paper).'
        : ' · paper managed mode');
  }
}

function startManagedBot(opts = {}) {
  const announce = !(opts && opts.quiet);
  if (!hasFeature('autopilot')) {
    if (announce) requireFeature('autopilot', 'Start bot / managed autopilot is a Pro feature. Starter includes manual paper enter.');
    return;
  }
  const profile = getProfile() || state.profile;
  if (profile) applyProfileToDesk(profile);
  updateModeBadge();
  const liveWanted = !!($('enableLiveOrders') && $('enableLiveOrders').checked);
  if (liveWanted && !brokerKeysPresent()) {
    state.liveOrdersEnabled = false;
    if ($('enableLiveOrders')) $('enableLiveOrders').checked = false;
    if (announce) speak('Live orders need a connected broker with valid keys. Forcing paper managed mode.');
  } else {
    state.liveOrdersEnabled = liveWanted && brokerKeysPresent();
  }
  state.halted = false;
  startAutopilot({ quiet: true });
  const mode = state.liveOrdersEnabled ? 'LIVE (broker) badge — orders still gated; paper marks until live HTTP is wired' : 'paper managed';
  setAutopilotAction(`Start bot · ${mode} · risk from profile`);
  updateStartStopUi();
  updateModeBadge();
  if (announce) {
    const p = getProfile() || state.profile;
    const risk = (p && p.riskTolerance) || 'med';
    const budget = state.tradingBudget || 1000;
    speak(`Bot started. Budget ${budget}, risk ${risk}. Scanning, gating, entering and exiting with auto stop-loss and take-profit. ${state.liveOrdersEnabled ? 'Live broker badge on — Enable live orders is checked.' : 'Paper managed mode.'} Not advice. No guaranteed profit.`);
  }
}

function stopManagedBot(opts = {}) {
  const announce = !(opts && opts.quiet);
  stopAutopilot({ quiet: true });
  setAutopilotAction('Stop bot · halted');
  updateStartStopUi();
  updateModeBadge();
  if (announce) speak('Bot stopped. Open paper positions stay as-is. Press Start bot to resume.');
}

function updateStartStopUi() {
  const on = !!state.autopilot;
  const start = $('startBotBtn');
  const stop = $('stopBotBtn');
  const startCmd = $('startBotCmdBtn');
  if (start) {
    start.hidden = on;
    start.dataset.on = on ? '1' : '0';
    start.disabled = !hasFeature('autopilot');
  }
  if (stop) stop.hidden = !on;
  if (startCmd) {
    startCmd.textContent = on ? 'Stop bot' : 'Start bot';
    startCmd.dataset.on = on ? '1' : '0';
  }
  const autoBtn = $('autopilotBtn');
  if (autoBtn) {
    autoBtn.dataset.on = on ? '1' : '0';
    autoBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    autoBtn.textContent = on ? 'Autopilot ON' : 'Autopilot OFF';
  }
}


function requireFeature(name, upgradeMsg) {
  if (hasFeature(name)) return true;
  const msg = upgradeMsg || 'That feature needs DGS AI Pro. Starter covers quote, technicals, chart, send-to-phone, and manual paper trades. No guaranteed profit.';
  speak(msg);
  const hint = $('botUpgradeHint');
  if (hint) {
    hint.hidden = false;
    hint.textContent = msg;
  }
  return false;
}

function applyPlanGates() {
  const plan = getPlan() || '';
  document.body.dataset.plan = plan;
  const pro = hasFeature('autopilot');
  document.querySelectorAll('[data-feature]').forEach((el) => {
    const feat = el.getAttribute('data-feature');
    const ok = hasFeature(feat);
    el.classList.toggle('plan-locked', !ok);
    if (el.matches('button, input, select, textarea')) {
      if (!ok) {
        el.setAttribute('aria-disabled', 'true');
        if (el.tagName === 'BUTTON') el.disabled = true;
      } else {
        el.removeAttribute('aria-disabled');
      }
    }
  });
  const hint = $('botUpgradeHint');
  if (hint) hint.hidden = pro;
  if (pro) {
    ['autopilotBtn', 'scanBtn', 'budgetRunBtn', 'saveConnectAppsBtn', 'clearConnectAppsBtn', 'startBotBtn', 'stopBotBtn', 'startBotCmdBtn'].forEach((id) => {
      const el = $(id);
      if (el && el.tagName === 'BUTTON') el.disabled = false;
    });
    const csConnect = $('coinswitchConnectBtn');
    if (csConnect) csConnect.disabled = false;
    updateStartStopUi();
  }
  updateBotCard();
}

function loadConnectApps() {
  try {
    const raw = localStorage.getItem(CONNECT_APPS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if ($('openaiCompatKey') && typeof data.openaiKey === 'string') {
      $('openaiCompatKey').value = data.openaiKey;
    }
    if ($('coinswitchFlagToggle')) {
      $('coinswitchFlagToggle').checked = !!data.coinswitchFlag;
    }
    const st = $('connectAppsStatus');
    if (st) st.textContent = data.savedAt ? `Saved locally · ${new Date(data.savedAt).toLocaleString()}` : 'Not saved';
  } catch (_) {}
}

function saveConnectApps() {
  if (!requireFeature('connectApps')) return;
  const openaiKey = String(($('openaiCompatKey') && $('openaiCompatKey').value) || '').trim();
  const coinswitchFlag = !!($('coinswitchFlagToggle') && $('coinswitchFlagToggle').checked);
  localStorage.setItem(CONNECT_APPS_KEY, JSON.stringify({
    openaiKey,
    coinswitchFlag,
    savedAt: Date.now(),
  }));
  if (coinswitchFlag !== !!state.coinswitchConnected) {
    setCoinSwitchConnected(coinswitchFlag, false);
  }
  const st = $('connectAppsStatus');
  if (st) st.textContent = `Saved locally · ${new Date().toLocaleString()}`;
  speak('Saved Connect AI preferences on this device only. Live CoinSwitch still needs keys linked in DGS AI assistant chat. No secrets leave this browser from this panel.');
}

function clearConnectApps() {
  if (!requireFeature('connectApps')) return;
  localStorage.removeItem(CONNECT_APPS_KEY);
  if ($('openaiCompatKey')) $('openaiCompatKey').value = '';
  if ($('coinswitchFlagToggle')) $('coinswitchFlagToggle').checked = false;
  const st = $('connectAppsStatus');
  if (st) st.textContent = 'Cleared';
  speak('Cleared local Connect AI preferences.');
}

function runWithinBudget() {
  if (!requireFeature('budget')) return;
  const raw = Number(($('tradingBudget') && $('tradingBudget').value) || state.tradingBudget || 0);
  const budget = Math.max(100, raw || 1000);
  state.tradingBudget = budget;
  saveState();
  setAutopilotAction(`Budget $${budget.toFixed(0)} · arming paper autopilot`);
  speak(`Paper budget set to ${budget} dollars. Starting autopilot within that budget. Auto stop-loss and take-profit manage open marks. Paper only. Not advice. No guaranteed profit.`);
  if (!state.autopilot) startAutopilot({ quiet: true });
  else updateBotCard();
}


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
    if (data.proposal && typeof data.proposal === 'object') state.proposal = data.proposal;
    if (typeof data.autopilot === 'boolean') state.autopilot = data.autopilot;
    if (typeof data.autopilotLastAction === 'string') state.autopilotLastAction = data.autopilotLastAction;
    if (typeof data.tradingBudget === 'number') {
      state.tradingBudget = data.tradingBudget;
      if ($('tradingBudget')) $('tradingBudget').value = data.tradingBudget;
    }
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
    proposal: state.proposal,
    autopilot: !!state.autopilot,
    autopilotLastAction: state.autopilotLastAction || '',
    tradingBudget: Number(state.tradingBudget) || 1000,
  }));
}

function setStatus(s) {
  const map = {
    IDLE: 'READY', LISTENING: 'WORKING', SPEAKING: 'WORKING',
    READY: 'READY', WORKING: 'WORKING',
  };
  const norm = map[s] || String(s || 'READY').toUpperCase();
  state.status = norm;
  const label = norm === 'WORKING' ? 'Working' : 'Ready';
  const pill = $('statusPill');
  if (pill) {
    pill.textContent = label;
    pill.dataset.state = norm;
  }
  const app = $('app');
  if (app) app.dataset.status = norm;
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
  while (box.children.length > 16) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

function hideHint() {}

function markUserSpoke() {}

function isPhoneDevice() {
  try {
    if (window.matchMedia('(pointer: coarse)').matches) return true;
    if (window.matchMedia('(max-width: 820px)').matches) return true;
  } catch (_) {}
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
}

/** Pages base for handoff links (current origin when hosted). */
function pagesBase() {
  try {
    const u = new URL(location.href);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      let path = u.pathname || '/';
      if (path.endsWith('index.html')) path = path.slice(0, -'index.html'.length);
      if (!path.endsWith('/')) path += '/';
      return `${u.origin}${path}`;
    }
  } catch (_) {}
  return PAGES_FALLBACK;
}

/** Handoff URL that auto-opens the chart overlay on the phone. */
function handoffUrl(sym) {
  const s = (sym || state.lastSymbol || 'NVDA').toUpperCase();
  return `${pagesBase()}?v=${CACHE_BUST}&chart=${encodeURIComponent(s)}`;
}

function tvChartUrl(sym) {
  return `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol(sym))}`;
}

/**
 * Text-only announce. No speechSynthesis / SpeechRecognition.
 */
function speak(text, opts = {}) {
  if (!text) return Promise.resolve();
  const quiet = !!(opts && opts.quiet);
  if (!quiet && (!opts || opts.transcript !== false)) addLine('dgs', text);
  const log = $('activityLog');
  if (log) log.textContent = text;
  if (!quiet) setStatus('READY');
  return Promise.resolve();
}

function speakFiller() {
  setStatus('WORKING');
  const log = $('activityLog');
  if (log) log.textContent = FILLERS[Math.floor(Math.random() * FILLERS.length)];
  return Promise.resolve();
}

function num(id) { return Number($(id).value); }

function money(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function assetKind(sym) {
  return CRYPTO.has(sym) ? 'crypto' : 'stock';
}

function parseSymbol(text) {
  const raw = (text || '').toLowerCase().replace(/[$#]/g, ' ');
  // longest name first so "dogecoin" beats "doge" order issues — Object entries already unique
  const names = Object.keys(NAME_TO_SYM).sort((a, b) => b.length - a.length);
  for (const name of names) {
    if (raw.includes(name)) return NAME_TO_SYM[name];
  }
  const upper = (text || '').toUpperCase();
  const m = upper.match(/\b([A-Z]{1,5})\b/g) || [];
  for (const tok of m) {
    if (DEMO_QUOTES[tok] || TV_MAP[tok]) return tok;
  }
  const field = ($('symbol')?.value || state.lastSymbol || 'NVDA').trim().toUpperCase();
  return field || 'NVDA';
}

function hasTradingCue(t) {
  return /\b(quote|price|chart|brief|market|stock|crypto|coin|token|ticker|tape|watch|trading|trade|bitcoin|ethereum|solana|how('?s| is)|what('?s| is)|happening|send to (my )?phone|show on (my )?phone|pull (it )?up on (my )?phone|find a trade|scan|setup|paper|enter|p and l|pnl|close trade|autopilot|coinswitch|coin switch|technicals?|fundamentals?|options?|greeks|risk compare|report|ib portfolio|stop-loss)\b/.test(t)
    || Object.keys(NAME_TO_SYM).some((n) => t.includes(n));
}

function tvSymbol(sym) {
  if (TV_MAP[sym]) return TV_MAP[sym];
  if (CRYPTO.has(sym)) return `BINANCE:${sym}USDT`;
  return `NASDAQ:${sym}`;
}

function yahooSymbol(sym) {
  if (CRYPTO.has(sym)) return `${sym}-USD`;
  return sym;
}

function chartPageUrl(sym) {
  // Prefer in-app handoff so opening/scanning the link shows the chart on device.
  return handoffUrl(sym);
}

function embedUrl(sym) {
  const q = new URLSearchParams({
    symbol: tvSymbol(sym),
    interval: CRYPTO.has(sym) ? '60' : '15',
    hidesidetoolbar: '1',
    hidetoptoolbar: '0',
    symboledit: '1',
    saveimage: '1',
    toolbarbg: '000000',
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
  const ysym = yahooSymbol(symbol);
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
      high: meta.regularMarketDayHigh ?? meta.dayHigh ?? null,
      low: meta.regularMarketDayLow ?? meta.dayLow ?? null,
      name: meta.shortName || meta.symbol || DEMO_QUOTES[symbol]?.name || symbol,
      kind: assetKind(symbol),
      source: 'live',
      spark: closes.length > 2 ? closes : fakeSpark(last, chg),
    };
    state.lastQuote = q;
    state.lastSymbol = symbol;
    state.quotesCache[symbol] = q;
    paintQuoteUi(q);
    return q;
  } catch (_) {
    clearTimeout(timer);
    const d = DEMO_QUOTES[symbol] || { last: 100, chg: 0.35, chgPct: 0.35, name: symbol, high: 101, low: 99 };
    const q = {
      symbol,
      last: d.last, chg: d.chg, chgPct: d.chgPct,
      high: d.high ?? null, low: d.low ?? null,
      name: d.name || symbol,
      kind: assetKind(symbol),
      source: 'demo',
      spark: fakeSpark(d.last, d.chg),
    };
    state.lastQuote = q;
    state.lastSymbol = symbol;
    state.quotesCache[symbol] = q;
    paintQuoteUi(q);
    return q;
  }
}

function paintQuoteUi(q) {
  if (!q || !q.symbol) return;
  const row = document.querySelector(`.watch-row[data-sym="${q.symbol}"]`);
  if (row) {
    const px = row.querySelector('.px');
    const ch = row.querySelector('.chg');
    if (px) px.textContent = fmtPx(q.last);
    if (ch) {
      const sign = q.chgPct >= 0 ? '+' : '';
      ch.textContent = `${sign}${q.chgPct.toFixed(2)}%`;
      ch.className = `chg ${q.chgPct >= 0 ? 'up' : 'dn'}`;
    }
    row.classList.toggle('is-on', q.symbol === state.lastSymbol);
  }
  const tapeItem = document.querySelector(`.tape-item[data-sym="${q.symbol}"]`);
  if (tapeItem) {
    const ch = tapeItem.querySelector('.chg');
    const px = tapeItem.querySelector('.px');
    if (px) px.textContent = fmtPx(q.last);
    if (ch) {
      const sign = q.chgPct >= 0 ? '+' : '';
      ch.textContent = `${sign}${q.chgPct.toFixed(2)}%`;
      ch.className = `chg ${q.chgPct >= 0 ? 'up' : 'dn'}`;
    }
  }
}

function renderWatchlist() {
  const box = $('watchlist');
  if (!box) return;
  const syms = ['NVDA','AAPL','MSFT','TSLA','AMD','META','SPY','QQQ','BTC','ETH','SOL','COIN'];
  box.innerHTML = syms.map((sym) => {
    const d = state.quotesCache[sym] || DEMO_QUOTES[sym] || { last: 0, chgPct: 0, name: sym };
    const cls = (d.chgPct || 0) >= 0 ? 'up' : 'dn';
    const sign = (d.chgPct || 0) >= 0 ? '+' : '';
    const on = state.lastSymbol === sym ? ' is-on' : '';
    return `<button type="button" class="watch-row${on}" data-sym="${sym}"><span class="sym">${sym}</span><span class="name">${escapeHtml(d.name || sym)}</span><span class="px">${fmtPx(d.last)}</span><span class="chg ${cls}">${sign}${Number(d.chgPct || 0).toFixed(2)}%</span></button>`;
  }).join('');
  box.querySelectorAll('.watch-row').forEach((btn) => {
    btn.onclick = () => {
      const sym = btn.getAttribute('data-sym');
      if ($('commandInput')) $('commandInput').value = `quote ${sym}`;
      handleCommand(`quote ${sym}`);
      openChart(sym, { silent: true });
    };
  });
}

function renderTape() {
  const box = $('tape');
  if (!box) return;
  box.innerHTML = TAPE_SYMS.map((sym) => {
    const d = state.quotesCache[sym] || DEMO_QUOTES[sym] || { last: 0, chgPct: 0 };
    const cls = (d.chgPct || 0) >= 0 ? 'up' : 'dn';
    const sign = (d.chgPct || 0) >= 0 ? '+' : '';
    return `<span class="tape-item" data-sym="${sym}"><b>${sym}</b><span class="px">${fmtPx(d.last)}</span><span class="chg ${cls}">${sign}${Number(d.chgPct || 0).toFixed(2)}%</span></span>`;
  }).join('');
}

async function refreshDeskQuotes() {
  const syms = [...new Set([...TAPE_SYMS, 'NVDA','AAPL','MSFT','TSLA','AMD','META','SOL','COIN'])];
  await Promise.all(syms.map(async (sym) => {
    try {
      const q = await fetchQuote(sym);
      state.quotesCache[sym] = q;
    } catch (_) {}
  }));
  renderWatchlist();
  renderTape();
}

function fmtPx(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1000) return n.toFixed(0);
  if (a >= 1) return n.toFixed(2);
  if (a >= 0.01) return n.toFixed(4);
  return n.toPrecision(3);
}

function spokenQuote(q) {
  const dir = q.chg >= 0 ? 'up' : 'down';
  const kind = q.kind === 'crypto' ? 'Crypto' : 'Stock';
  const src = q.source === 'live' ? 'Live quote.' : 'Delayed demo quote. Live tape was blocked.';
  let range = '';
  if (q.high != null && q.low != null) {
    range = ` Day range ${fmtPx(q.low)} to ${fmtPx(q.high)}.`;
  }
  return `${kind}. ${q.name}, ${q.symbol}, last ${fmtPx(q.last)}, ${dir} ${fmtPx(Math.abs(q.chg))} or ${Math.abs(q.chgPct).toFixed(2)} percent.${range} ${src}`;
}

function appendBriefCard(q, nextHint) {
  const box = $('transcript');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'bubble dgs brief-card';
  const dirCls = q.chg >= 0 ? 'up' : 'dn';
  const sign = q.chg >= 0 ? '+' : '';
  const src = q.source === 'live' ? 'Live' : 'DELAYED DEMO';
  const range = (q.high != null && q.low != null)
    ? `${fmtPx(q.low)} – ${fmtPx(q.high)}`
    : '—';
  el.innerHTML = `
    <span class="who">DGS AI · ${escapeHtml(q.kind)} · ${escapeHtml(src)}</span>
    <p><strong>${escapeHtml(q.symbol)}</strong> · ${escapeHtml(q.name)}</p>
    <div class="brief-grid">
      <span class="k">Last</span><span class="v">${escapeHtml(fmtPx(q.last))}</span>
      <span class="k">Change</span><span class="v ${dirCls}">${sign}${escapeHtml(fmtPx(Math.abs(q.chg)))} (${sign}${Math.abs(q.chgPct).toFixed(2)}%)</span>
      <span class="k">Day range</span><span class="v">${escapeHtml(range)}</span>
    </div>
    <div class="brief-next">${escapeHtml(nextHint || 'Want the chart? Or send to phone?')}</div>`;
  box.appendChild(el);
  while (box.children.length > 16) box.removeChild(box.firstChild);
  box.scrollTop = box.scrollHeight;
}

async function marketBrief(kind) {
  setStatus('LISTENING');
  const filler = speakFiller();
  const wantCrypto = kind === 'crypto' || kind === 'both';
  const wantStocks = kind !== 'crypto';
  const jobs = [];
  if (wantStocks) jobs.push(fetchQuote('SPY'), fetchQuote('QQQ'), fetchQuote('NVDA'));
  if (wantCrypto) jobs.push(fetchQuote('BTC'), fetchQuote('ETH'), fetchQuote('SOL'));
  const quotes = await Promise.all(jobs);
  await filler;
  const anyDemo = quotes.some((q) => q.source !== 'live');
  const src = anyDemo ? 'Delayed demo tape if live feed is blocked.' : 'Live tape.';
  const bits = quotes.map((q) => {
    const d = q.chg >= 0 ? 'up' : 'down';
    return `${q.symbol} ${fmtPx(q.last)}, ${d} ${Math.abs(q.chgPct).toFixed(2)} percent`;
  });
  const label = kind === 'crypto' ? 'Crypto brief.' : kind === 'stocks' ? 'Equity brief.' : 'Market brief — stocks and crypto.';
  const line = `${src} ${label} ${bits.join('. ')}. Paper only — not advice. Want a chart on any of these?`;
  await speak(line);
  quotes.slice(0, 3).forEach((q) => appendBriefCard(q, 'Open chart, or send to phone.'));
}

async function assetPipeline(symbol) {
  const filler = speakFiller();
  const q = await fetchQuote(symbol);
  await filler;
  const kind = q.kind === 'crypto' ? 'crypto asset' : 'stock';
  const dir = q.chg >= 0 ? 'up' : 'down';
  const src = q.source === 'live' ? 'Live session quote.' : 'Delayed demo — live tape blocked on this host.';
  let range = '';
  if (q.high != null && q.low != null) range = ` Session range ${fmtPx(q.low)} to ${fmtPx(q.high)}.`;
  const line = `${q.name} is a ${kind}. Last ${fmtPx(q.last)}, ${dir} ${Math.abs(q.chgPct).toFixed(2)} percent.${range} ${src} Paper risk only — DGS AI is not a broker and this is not financial advice. Want the chart, send to phone, or analyze a paper setup?`;
  await speak(line);
  appendBriefCard(q, 'Next: Chart tab · send to phone · analyze paper setup');
}

function openChart(symbol, opts = {}) {
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
  showPane('chart');
  if (!(opts && opts.silent)) {
    speak(`Opening ${sym} chart. Paper only. Use Send to phone for the handoff.`);
  }
}

function closeChart() {
  const frame = $('tvFrame');
  if (frame) frame.src = embedUrl(state.lastSymbol || 'NVDA');
  state.chartOpen = true;
}

function paintShareCard(q) {
  const c = $('shareCanvas');
  const ctx = c.getContext('2d');
  const w = c.width;
  const h = c.height;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * 0.5, h * 0.32, 20, w * 0.5, h * 0.32, 420);
  g.addColorStop(0, 'rgba(126,224,200,0.22)');
  g.addColorStop(0.55, 'rgba(232,213,163,0.10)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#7ee0c8';
  ctx.font = '500 34px Inter, sans-serif';
  ctx.fillText('DGS AI', 72, 110);
  ctx.fillStyle = 'rgba(244,241,234,0.45)';
  ctx.font = '300 24px Inter, sans-serif';
  ctx.fillText('Trading dashboard · stocks & crypto · paper only', 72, 150);

  ctx.fillStyle = '#eef3f8';
  ctx.font = '500 86px Inter, sans-serif';
  ctx.fillText(q.symbol, 72, 320);
  ctx.fillStyle = '#e8d5a3';
  ctx.font = '300 30px Inter, sans-serif';
  ctx.fillText(q.name || q.symbol, 72, 370);

  ctx.fillStyle = '#ffffff';
  ctx.font = '500 92px JetBrains Mono, monospace';
  ctx.fillText(fmtPx(q.last), 72, 500);
  ctx.fillStyle = q.chg >= 0 ? '#7ee0c8' : '#e08a8a';
  ctx.font = '400 38px JetBrains Mono, monospace';
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
  ctx.strokeStyle = q.chg >= 0 ? '#7ee0c8' : '#e08a8a';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.fillStyle = 'rgba(244,241,234,0.4)';
  ctx.font = '300 24px Inter, sans-serif';
  const src = q.source === 'live' ? 'Quote path: live feed' : 'Quote path: DELAYED DEMO (live tape blocked)';
  ctx.fillText(src, 72, 920);
  ctx.fillText(chartPageUrl(q.symbol), 72, 970);
  ctx.fillText('Dineshgopi Sunkara · No broker · No guaranteed profit', 72, 1040);
  ctx.fillStyle = '#7ee0c8';
  ctx.font = '400 22px JetBrains Mono, monospace';
  ctx.fillText('dgs-ai · send to phone', 72, 1220);
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

function showShareSheet(sym, q, statusText) {
  openDrawer('share');
  const prev = $('sharePreview');
  if (prev && shareBlob) {
    prev.src = URL.createObjectURL(shareBlob);
    prev.style.display = 'block';
  }
  const qr = $('shareQr');
  if (qr) {
    qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&bgcolor=050508&color=5eead4&data=${encodeURIComponent(shareUrl)}`;
    qr.style.display = 'block';
  }
  const link = $('shareLink');
  if (link) {
    link.href = shareUrl;
    link.textContent = shareUrl;
  }
  if ($('shareStatus')) {
    $('shareStatus').textContent = statusText
      || `Open on this phone, scan the QR, or copy the link for ${sym}.`;
  }
}

async function copyHandoffLink() {
  if (!shareUrl) shareUrl = handoffUrl(state.lastSymbol);
  try {
    await navigator.clipboard.writeText(shareUrl);
    if ($('shareStatus')) $('shareStatus').textContent = 'Link copied. Open it on your phone to show the chart.';
  } catch (_) {
    if ($('shareStatus')) $('shareStatus').textContent = 'Copy failed — long-press the link instead.';
  }
}

function openOnThisPhone() {
  const sym = (state.lastSymbol || 'NVDA').toUpperCase();
  if (isPhoneDevice()) {
    openChart(sym, { silent: true });
    closeDrawers();
    return;
  }
  location.assign(handoffUrl(sym));
}

async function sendChartToPhone(symbol) {
  markUserSpoke();
  const sym = (symbol || state.lastSymbol || 'NVDA').toUpperCase();
  state.lastSymbol = sym;

  // Already on a phone: show the chart fullscreen on THIS device.
  if (isPhoneDevice()) {
    openChart(sym, { silent: true });
    await speak(`Showing ${sym} on this phone.`);
    return;
  }

  const q = state.lastQuote?.symbol === sym ? state.lastQuote : await fetchQuote(sym);
  paintShareCard(q);
  const canvas = $('shareCanvas');
  shareBlob = await canvasToBlob(canvas);
  shareUrl = handoffUrl(sym);

  const file = shareBlob ? new File([shareBlob], `dgs-ai-${sym}.png`, { type: 'image/png' }) : null;
  const payload = {
    title: `DGS AI · ${sym}`,
    text: `${q.name} ${fmtPx(q.last)} · open on your phone · ${shareUrl}`,
    url: shareUrl,
  };

  // Always show the mobile-friendly handoff sheet (QR / open / copy / PNG).
  showShareSheet(sym, q, `Send ${sym} to your phone — share, scan the QR, or open the link.`);

  let shared = false;
  try {
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ ...payload, files: [file] });
      shared = true;
    } else if (navigator.share) {
      await navigator.share(payload);
      shared = true;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') {
      await speak('Share canceled. QR and link are still here.');
      return;
    }
  }

  if (shared) {
    await speak(`Handoff ready for ${sym}. Open the link on your phone to show the chart.`);
  } else {
    await speak(`Handoff ready for ${sym}. Scan the QR or copy the link on your phone.`);
  }
}

function downloadShareCard() {
  if (!shareBlob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(shareBlob);
  a.download = `dgs-ai-${state.lastSymbol || 'chart'}.png`;
  a.click();
}

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function tradesTodayCount() {
  const key = todayKey();
  return state.book.filter((t) => (t.ts || '').slice(0, 10) === key).length;
}

function openTrades() {
  return state.book.filter((t) => t.status !== 'CLOSED');
}

function atrish(q) {
  if (q.high != null && q.low != null && q.high > q.low) return q.high - q.low;
  const fallback = Math.max(Math.abs(q.chg || 0) * 2.5, Math.abs(q.last) * 0.008);
  return fallback || Math.abs(q.last) * 0.01;
}

function modeStopMult(mode) {
  if (mode === 'SCALP') return 0.35;
  if (mode === 'MOMENTUM') return 0.7;
  return 0.5;
}

function modeMinMove(mode) {
  if (mode === 'SCALP') return 0.25;
  if (mode === 'MOMENTUM') return 0.55;
  return 0.35;
}

/** Build a proposed setup from a quote using momentum + ATR-ish stops/targets. */
function buildProposal(q, opts = {}) {
  const mode = opts.mode || ($('mode')?.value || 'INTRADAY');
  const minRr = opts.minRr != null ? opts.minRr : (Number($('minRr')?.value) || 1.5);
  const last = Number(q.last);
  if (!last || Number.isNaN(last)) return null;
  const atr = atrish(q);
  const move = Number(q.chgPct) || 0;
  const absMove = Math.abs(move);
  // Need some momentum signal
  if (absMove < modeMinMove(mode) * 0.5) return null;

  let side = move >= 0 ? 'LONG' : 'SHORT';
  // Strong fade candidates only when clearly extended down and mode is momentum-long biased — keep simple directional
  const stopW = Math.max(atr * modeStopMult(mode), Math.abs(last) * (mode === 'SCALP' ? 0.003 : mode === 'MOMENTUM' ? 0.01 : 0.006));
  let entry = last;
  let stop, target;
  if (side === 'LONG') {
    stop = entry - stopW;
    target = entry + stopW * Math.max(minRr, mode === 'MOMENTUM' ? 2 : 1.5);
  } else {
    stop = entry + stopW;
    target = entry - stopW * Math.max(minRr, mode === 'MOMENTUM' ? 2 : 1.5);
  }
  const stopDist = Math.abs(entry - stop);
  const rewardDist = Math.abs(target - entry);
  const rr = stopDist > 0 ? rewardDist / stopDist : 0;
  // Setup score: higher = better candidate (distinct from risk score)
  let setupScore = 40 + Math.min(35, absMove * 8) + Math.min(15, (rr - minRr) * 10);
  if (q.source === 'live') setupScore += 5;
  if (CRYPTO.has(q.symbol) && absMove > 1.5) setupScore += 4;
  setupScore = Math.round(Math.max(0, Math.min(100, setupScore)));

  return {
    symbol: q.symbol,
    name: q.name || q.symbol,
    side,
    entry: Number(entry.toPrecision(8)),
    stop: Number(stop.toPrecision(8)),
    target: Number(target.toPrecision(8)),
    rr: Number(rr.toFixed(2)),
    setupScore,
    chgPct: move,
    atr: Number(atr.toPrecision(6)),
    kind: q.kind || assetKind(q.symbol),
    source: q.source || 'demo',
    mode,
    ts: new Date().toISOString(),
  };
}

function applyProposal(p) {
  if (!p) return;
  state.proposal = p;
  state.lastSymbol = p.symbol;
  if ($('symbol')) $('symbol').value = p.symbol;
  if ($('side')) $('side').value = p.side;
  if ($('entry')) $('entry').value = p.entry;
  if ($('stop')) $('stop').value = p.stop;
  if ($('target')) $('target').value = p.target;
}

function unrealizedFor(t, mark) {
  if (mark == null || Number.isNaN(mark)) return 0;
  if (t.side === 'LONG') return t.shares * (mark - t.entry);
  return t.shares * (t.entry - mark);
}

function totalUnrealized() {
  return openTrades().reduce((sum, t) => {
    const q = state.quotesCache[t.symbol] || (state.lastQuote?.symbol === t.symbol ? state.lastQuote : null);
    const mark = q?.last ?? t.mark ?? t.entry;
    return sum + unrealizedFor(t, mark);
  }, 0);
}

function sessionDayPnL() {
  return state.dayPnL + totalUnrealized();
}

function updateBotCard() {
  const propEl = $('botProposal');
  const gateEl = $('botGate');
  const pnlEl = $('botDayPnl');
  const enterBtn = $('botEnterBtn');
  const autoBtn = $('autopilotBtn');
  const autoLine = $('botAutoLine');
  const p = state.proposal;
  if (propEl) {
    if (!p) {
      propEl.innerHTML = '<p class="bot-empty">No setup yet — tap <em>Scan</em> or run <em>find a trade</em></p>';
    } else {
      const dir = p.side === 'LONG' ? 'long' : 'short';
      propEl.innerHTML = `
        <p class="bot-line"><strong>${escapeHtml(p.symbol)}</strong> ${escapeHtml(dir)} · R:R ${p.rr.toFixed(2)} · score ${p.setupScore}</p>
        <p class="bot-sub">Entry ${escapeHtml(fmtPx(p.entry))} · stop ${escapeHtml(fmtPx(p.stop))} · tgt ${escapeHtml(fmtPx(p.target))} · ${escapeHtml(p.source)}</p>`;
    }
  }
  if (gateEl) {
    gateEl.textContent = state.lastOpen ? 'Gate OPEN' : 'Gate CLOSED';
    gateEl.dataset.open = state.lastOpen ? '1' : '0';
  }
  if (pnlEl) {
    const pnl = sessionDayPnL();
    pnlEl.textContent = `Day ${money(pnl)}`;
    pnlEl.className = pnl >= 0 ? 'up' : 'dn';
  }
  if (enterBtn) enterBtn.disabled = !state.lastOpen;
  if (autoBtn) {
    autoBtn.dataset.on = state.autopilot ? '1' : '0';
    autoBtn.setAttribute('aria-pressed', state.autopilot ? 'true' : 'false');
    autoBtn.textContent = state.autopilot ? 'Autopilot ON' : 'Autopilot OFF';
  }
  if (autoLine) {
    autoLine.dataset.on = state.autopilot ? '1' : '0';
    const flag = state.autopilot ? 'Bot ON' : 'Bot OFF';
    autoLine.textContent = `${flag} · ${state.autopilotLastAction || 'paper default'}`;
  }
  const openRiskEl = $('openRisk');
  if (openRiskEl) {
    const r = openRiskDollars();
    openRiskEl.textContent = money(r);
    openRiskEl.style.color = r > 0 ? 'var(--amber)' : 'var(--muted)';
  }
  updateStartStopUi();
  updateModeBadge();
}

function updateStats(dd, open) {
  const pnl = $('dayPnl');
  const shown = sessionDayPnL();
  if (pnl) {
    pnl.textContent = money(shown);
    pnl.style.color = shown >= 0 ? 'var(--ok)' : 'var(--danger)';
  }
  if ($('ddNow')) $('ddNow').textContent = `DD ${dd.toFixed(2)}%`;
  if ($('gateBadge')) {
    $('gateBadge').textContent = open ? 'OPEN' : 'CLOSED';
    $('gateBadge').style.color = open ? 'var(--ok)' : 'var(--danger)';
  }
  updateBotCard();
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
  const sessionPnl = sessionDayPnL();
  if (Math.abs(Math.min(0, sessionPnl)) / Math.max(equity, 1) * 100 >= dailyLoss * 0.7) {
    score += 18; reasons.push('Approaching daily loss halt');
  }
  const dd = Math.max(0, (state.peakEquity - equity) / Math.max(state.peakEquity, 1) * 100);
  if (dd >= maxDd * 0.8) { score += 28; reasons.push('Near max drawdown halt'); }
  if (shares <= 0) { score += 30; reasons.push('Size rounds to 0 shares'); }
  if ((side === 'LONG' && stop >= entry) || (side === 'SHORT' && stop <= entry)) {
    score += 45; reasons.push('Stop on wrong side of entry');
  }
  if (notional > equity * 3) { score += 12; reasons.push('Notional > 3x equity'); }

  const dailyHalt = Math.abs(Math.min(0, sessionPnl)) / Math.max(equity, 1) * 100 >= dailyLoss;
  const ddHalt = dd >= maxDd;
  const maxTrades = num('maxTrades');
  const maxHold = num('maxHold');
  const mode = $('mode').value;
  const noOvernight = $('noOvernight').checked;
  const tradesToday = tradesTodayCount();
  if (tradesToday >= maxTrades) { score += 35; reasons.push(`Max trades today hit (${maxTrades})`); }
  if (mode === 'SCALP' && maxHold > 30) { score += 8; reasons.push('Scalp mode prefers hold ≤ 30m'); }
  if (mode === 'SCALP' && rr < 1.2) { score += 10; reasons.push('Scalp R:R too thin'); }
  if (mode === 'MOMENTUM' && rr < 1.8) { score += 12; reasons.push('Momentum day trade wants stronger R:R'); }
  if (noOvernight) reasons.push('Flat-by-close rule ON — no overnight holds');
  else { score += 15; reasons.push('Overnight allowed — higher session risk'); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const open = !state.halted && score < 50 && shares > 0 && !dailyHalt && !ddHalt && rr >= minRr && stopDist > 0 && tradesToday < maxTrades;
  state.lastOpen = open;

  if ($('riskScore')) $('riskScore').textContent = String(score);
  if ($('riskBar')) {
    $('riskBar').style.width = `${score}%`;
    $('riskBar').style.background = score < 35 ? 'var(--ok)' : score < 50 ? 'var(--warn)' : 'var(--danger)';
  }
  const gate = $('gateMsg');
  if (gate) {
    gate.textContent = open
      ? `Gate: OPEN — ${shares} sh ${symbol} ${side} · risk ${money(dollarRisk)} · R:R ${rr.toFixed(2)}`
      : `Gate: CLOSED — score ${score}${state.halted ? ' · FORCE HALT' : ''}${dailyHalt ? ' · daily loss halt' : ''}${ddHalt ? ' · drawdown halt' : ''}`;
    gate.className = `gate ${open ? 'open' : 'closed'}`;
  }
  if ($('paperBtn')) $('paperBtn').disabled = !open;
  updateStats(dd, open);

  if ($('analysis')) {
    $('analysis').textContent = [
      'Founder guard · DGS AI · PAPER ONLY · no guaranteed profit',
      `Mode: ${mode} · hold≤${maxHold}m · trades ${tradesToday}/${maxTrades}`,
      `Symbol: ${symbol} ${side}`,
      `Entry ${entry} | Stop ${stop} | Target ${target}`,
      `Stop distance: ${stopDist.toFixed(4)}`,
      `Reward:risk: ${rr.toFixed(2)} (min ${minRr})`,
      `Max $ risk @ ${riskPct}%: ${money(riskBudget)}`,
      `Size: ${shares} shares · notional ${money(notional)}`,
      `Day P&L (incl. open marks): ${money(sessionPnl)} · realized ${money(state.dayPnL)} · DD ${dd.toFixed(2)}%`,
      `Reasons: ${reasons.join('; ') || 'within policy'}`,
      open ? 'Decision: ALLOW paper entry' : 'Decision: BLOCK — tighten risk or skip',
      noOvernight && openTrades().length ? 'Reminder: flatten paper book by session close.' : '',
    ].filter(Boolean).join('\n');
  }

  return { open, shares, symbol, side, entry, stop, target, dollarRisk, score, rr, riskScore: score };
}

async function scanMarket(opts = {}) {
  const quiet = !!(opts && opts.quiet);
  if (!hasFeature('scan')) {
    if (!quiet) requireFeature('scan', 'Market scan and find-a-trade are Pro features. On Starter, use the risk drawer to analyze and paper-enter manually.');
    return;
  }
  if (!quiet) markUserSpoke();
  if (!quiet) setStatus('LISTENING');
  const filler = (opts.silent || quiet) ? Promise.resolve() : speakFiller();
  const mode = $('mode')?.value || 'INTRADAY';
  const minRr = Number($('minRr')?.value) || 1.5;
  const extra = Array.isArray(opts.symbols) ? opts.symbols.map((s) => String(s).toUpperCase()).filter(Boolean) : [];
  const list = extra.length ? extra : WATCHLIST.slice();
  const quotes = await Promise.all(list.map(async (sym) => {
    try {
      const q = await fetchQuote(sym);
      state.quotesCache[sym] = q;
      return q;
    } catch (_) {
      return null;
    }
  }));
  await filler;

  const proposals = quotes
    .filter(Boolean)
    .map((q) => buildProposal(q, { mode, minRr }))
    .filter(Boolean)
    .sort((a, b) => b.setupScore - a.setupScore || b.rr - a.rr);

  if (!proposals.length) {
    state.proposal = null;
    updateBotCard();
    saveState();
    const noneMsg = 'No clean momentum setup on the paper watchlist right now. Try again later. Paper only — not advice, no guaranteed profit.';
    if (quiet) {
      setAutopilotAction('Scan: no setup');
      await speak(noneMsg, { quiet: true, transcript: false });
    } else {
      await speak(noneMsg);
    }
    return null;
  }

  // Prefer a proposal that can open the gate; else take best and show closed gate
  let chosen = null;
  for (const p of proposals.slice(0, 8)) {
    applyProposal(p);
    const r = analyzeRisk();
    if (r.open) { chosen = { ...p, gateOpen: true, riskScore: r.score, shares: r.shares }; break; }
  }
  if (!chosen) {
    chosen = { ...proposals[0], gateOpen: false };
    applyProposal(chosen);
    analyzeRisk();
  } else {
    applyProposal(chosen);
    analyzeRisk();
  }
  state.proposal = { ...chosen };
  state.lastScanAt = Date.now();
  saveState();
  updateBotCard();

  const gateLine = state.lastOpen
    ? `Risk gate is OPEN for about ${chosen.shares || '?'} shares.`
    : 'Risk gate is CLOSED on this setup — I will not paper-enter until rules pass.';
  const flat = $('noOvernight')?.checked ? ' Flat-by-close is on.' : '';
  const msg = `Best paper setup: ${chosen.side} ${chosen.symbol}. Entry ${fmtPx(chosen.entry)}, stop ${fmtPx(chosen.stop)}, target ${fmtPx(chosen.target)}, reward to risk ${chosen.rr.toFixed(2)}, setup score ${chosen.setupScore}. ${gateLine}${flat} Tap Paper enter to book it, or scan again. Not financial advice. No guaranteed profit.`;
  if (quiet) {
    setAutopilotAction(`Scan: ${chosen.side} ${chosen.symbol} · gate ${state.lastOpen ? 'OPEN' : 'CLOSED'}`);
    await speak(msg, { quiet: true, transcript: false });
  } else {
    await speak(msg);
  }
  return chosen;
}

function paperEnter(opts = {}) {
  const quiet = !!(opts && opts.quiet);
  if (!quiet) markUserSpoke();
  const r = analyzeRisk();
  if (!r.open) {
    const blocked = 'Risk gate is closed. I will not paper-enter this setup. I do not place live orders. No guaranteed profit.';
    if (quiet) {
      setAutopilotAction('Enter blocked · gate CLOSED');
      speak(blocked, { quiet: true, transcript: false });
    } else {
      speak(blocked);
    }
    return null;
  }
  // Avoid stacking same symbol while open
  if (openTrades().some((t) => t.symbol === r.symbol)) {
    const dup = `Already have an open paper ${r.symbol} — skip duplicate enter.`;
    if (quiet) {
      setAutopilotAction(`Skip duplicate ${r.symbol}`);
      speak(dup, { quiet: true, transcript: false });
    } else {
      speak(dup);
    }
    return null;
  }
  const trade = {
    id: Date.now(),
    symbol: r.symbol,
    side: r.side,
    entry: r.entry,
    stop: r.stop,
    target: r.target,
    shares: r.shares,
    dollarRisk: r.dollarRisk,
    score: r.score,
    rr: r.rr,
    status: 'OPEN',
    mark: r.entry,
    unrealized: 0,
    ts: new Date().toISOString(),
    mode: $('mode')?.value || 'INTRADAY',
    viaAutopilot: !!(opts && opts.fromAutopilot),
  };
  state.book.unshift(trade);
  renderBook();
  saveState();
  analyzeRisk();
  const flat = $('noOvernight')?.checked ? ' Remember to flatten by session close.' : '';
  const msg = `Paper entry booked. ${r.shares} shares ${r.symbol} ${r.side} at ${fmtPx(r.entry)}. Risk score ${r.score}. This is not a live broker order.${flat}`;
  if (quiet) {
    setAutopilotAction(`Paper enter ${r.side} ${r.symbol} @ ${fmtPx(r.entry)}`);
    speak(msg, { quiet: true });
  } else {
    speak(msg);
  }
  refreshOpenMarks().catch(() => {});
  return trade;
}

async function refreshOpenMarks() {
  const opens = openTrades();
  if (!opens.length) {
    renderBook();
    updateBotCard();
    return;
  }
  await Promise.all(opens.map(async (t) => {
    const q = await fetchQuote(t.symbol);
    state.quotesCache[t.symbol] = q;
    t.mark = q.last;
    t.unrealized = unrealizedFor(t, q.last);
  }));
  saveState();
  renderBook();
  analyzeRisk();
}

async function closeTrade(symbol, opts = {}) {
  const quiet = !!(opts && opts.quiet);
  if (!quiet) markUserSpoke();
  const sym = (symbol || '').toUpperCase();
  const t = openTrades().find((x) => x.symbol === sym) || (!sym ? openTrades()[0] : null);
  if (!t) {
    const none = sym ? `No open paper trade for ${sym}.` : 'No open paper trades to close.';
    await speak(none, quiet ? { quiet: true, transcript: false } : {});
    return null;
  }
  let mark = opts.mark;
  if (mark == null || Number.isNaN(Number(mark))) {
    const q = await fetchQuote(t.symbol);
    state.quotesCache[t.symbol] = q;
    mark = q.last;
  } else {
    mark = Number(mark);
  }
  const pnl = unrealizedFor(t, mark);
  const reason = opts.reason || 'manual';
  t.status = 'CLOSED';
  t.mark = mark;
  t.exit = mark;
  t.realized = pnl;
  t.closeReason = reason;
  t.closedAt = new Date().toISOString();
  state.dayPnL += pnl;
  const eq = num('equity') + pnl;
  if ($('equity')) $('equity').value = eq.toFixed(2);
  state.peakEquity = Math.max(state.peakEquity, eq);
  saveState();
  renderBook();
  analyzeRisk();
  const dir = pnl >= 0 ? 'profit' : 'loss';
  const msg = `Closed paper ${t.symbol} ${t.side} at ${fmtPx(mark)} (${reason}). Realized ${dir} ${money(pnl)}. Day P and L ${money(sessionDayPnL())}. Paper only — not advice.`;
  if (quiet) {
    setAutopilotAction(`Close ${t.symbol} · ${reason} · ${money(pnl)}`);
    await speak(msg, { quiet: true });
  } else {
    await speak(msg);
  }
  return t;
}

function renderBook() {
  const box = $('book');
  if (!box) return;
  const rows = state.book.slice(0, 12).map((t) => {
    if (t.status === 'CLOSED') {
      const pnl = t.realized ?? 0;
      const cls = pnl >= 0 ? 'up' : 'dn';
      return `<li>${escapeHtml(t.symbol)} ${escapeHtml(t.side)} · CLOSED · ${t.shares} sh · <span class="${cls}">${money(pnl)}</span></li>`;
    }
    const u = t.unrealized ?? 0;
    const cls = u >= 0 ? 'up' : 'dn';
    return `<li>${escapeHtml(t.symbol)} ${escapeHtml(t.side)} · OPEN · ${t.shares} sh @ ${escapeHtml(fmtPx(t.entry))} · mark ${escapeHtml(fmtPx(t.mark ?? t.entry))} · <span class="${cls}">${money(u)}</span> <button type="button" class="close-trade" data-close-sym="${escapeHtml(t.symbol)}">Close</button></li>`;
  });
  box.innerHTML = rows.join('') || '<li>No paper trades yet.</li>';
  box.querySelectorAll('[data-close-sym]').forEach((btn) => {
    btn.onclick = () => closeTrade(btn.getAttribute('data-close-sym'));
  });
}

const AUTOPILOT_MS = 75000;
const BROKER_LS_KEY = 'dgs-ai-broker-stubs';
let autopilotTimer = null;

function setAutopilotAction(msg) {
  state.autopilotLastAction = msg || '';
  updateBotCard();
  updateModeBadge();
  saveState();
}

function riskHaltReasons() {
  const equity = num('equity');
  const dailyLoss = num('dailyLoss');
  const maxDd = num('maxDd');
  const sessionPnl = sessionDayPnL();
  const dd = Math.max(0, (state.peakEquity - equity) / Math.max(state.peakEquity, 1) * 100);
  const dailyHalt = Math.abs(Math.min(0, sessionPnl)) / Math.max(equity, 1) * 100 >= dailyLoss;
  const ddHalt = dd >= maxDd;
  return { equity, sessionPnl, dd, dailyHalt, ddHalt, halted: !!state.halted };
}

function hitTargetOrStop(t, mark) {
  if (mark == null || Number.isNaN(mark)) return null;
  if (t.side === 'LONG') {
    if (mark >= t.target) return 'take-profit';
    if (mark <= t.stop) return 'stop';
  } else {
    if (mark <= t.target) return 'take-profit';
    if (mark >= t.stop) return 'stop';
  }
  return null;
}

function holdExceeded(t) {
  const maxHold = num('maxHold') || 90;
  const start = Date.parse(t.ts || '') || 0;
  if (!start) return false;
  return (Date.now() - start) >= maxHold * 60 * 1000;
}

async function manageOpenPositionsQuiet() {
  const opens = openTrades();
  if (!opens.length) return 0;
  let closed = 0;
  for (const t of opens.slice()) {
    const q = await fetchQuote(t.symbol);
    state.quotesCache[t.symbol] = q;
    t.mark = q.last;
    t.unrealized = unrealizedFor(t, q.last);
    let reason = hitTargetOrStop(t, q.last);
    if (!reason && holdExceeded(t)) reason = 'max-hold';
    if (reason) {
      await closeTrade(t.symbol, { quiet: true, mark: q.last, reason });
      closed += 1;
    }
  }
  saveState();
  renderBook();
  analyzeRisk();
  return closed;
}

async function autopilotTick() {
  if (!state.autopilot || state.autopilotBusy) return;
  state.autopilotBusy = true;
  try {
    const rh = riskHaltReasons();
    if (rh.halted) {
      setAutopilotAction('Paused · force halt');
      return;
    }
    if (rh.dailyHalt) {
      setAutopilotAction('Paused · daily loss limit');
      return;
    }
    if (rh.ddHalt) {
      setAutopilotAction('Paused · max drawdown');
      return;
    }

    const closed = await manageOpenPositionsQuiet();
    if (closed) {
      setAutopilotAction(`Managed · closed ${closed} paper position(s)`);
    }

    const maxTrades = num('maxTrades');
    if (tradesTodayCount() >= maxTrades) {
      setAutopilotAction(`Idle · max trades today (${maxTrades})`);
      return;
    }

    const chosen = await scanMarket({ quiet: true, silent: true });
    if (!chosen) return;
    if (!state.lastOpen) {
      setAutopilotAction(`Watch · ${chosen.side} ${chosen.symbol} gate CLOSED`);
      return;
    }
    const trade = paperEnter({ quiet: true, fromAutopilot: true });
    if (trade) {
      setAutopilotAction(`Entered ${trade.side} ${trade.symbol} @ ${fmtPx(trade.entry)}`);
    }
  } catch (err) {
    setAutopilotAction(`Tick error · ${(err && err.message) || 'unknown'}`);
  } finally {
    state.autopilotBusy = false;
    updateBotCard();
  }
}

function startAutopilot(opts = {}) {
  const announce = !(opts && opts.quiet);
  if (!hasFeature('autopilot')) {
    if (announce) requireFeature('autopilot', 'Paper autopilot is a Pro feature. Starter includes manual paper enter. Upgrade to Pro for the quiet scan loop with auto stop-loss and take-profit.');
    return;
  }
  if (state.autopilot) {
    if (announce) speak('Autopilot is already on. Paper only — scanning quietly. No guaranteed profit.');
    updateBotCard();
    return;
  }
  state.autopilot = true;
  setAutopilotAction('Started · paper loop armed');
  saveState();
  updateBotCard();
  if (autopilotTimer) clearInterval(autopilotTimer);
  autopilotTimer = setInterval(() => { autopilotTick().catch(() => {}); }, AUTOPILOT_MS);
  // Kick once soon (not immediate heavy) — ~2s after start
  setTimeout(() => { if (state.autopilot) autopilotTick().catch(() => {}); }, 2000);
  if (announce) {
    speak('Autopilot on. Paper default. I will scan the watchlist about every seventy-five seconds, enter only when the risk gate is open, and manage stops and targets on marks. Quiet updates unless you ask for status. Not advice. No guaranteed profit. Not a live broker.');
  }
}

function stopAutopilot(opts = {}) {
  const announce = !(opts && opts.quiet);
  state.autopilot = false;
  if (autopilotTimer) {
    clearInterval(autopilotTimer);
    autopilotTimer = null;
  }
  setAutopilotAction('Stopped');
  saveState();
  updateBotCard();
  if (announce) speak('Autopilot off. Paper book stays as-is. Tap Autopilot to resume.');
}

const CS_LS_KEY = 'dgs-ai-coinswitch';

function loadCoinSwitchPref() {
  try {
    const raw = localStorage.getItem(CS_LS_KEY);
    if (!raw) {
      // migrate legacy broker stub flag if present
      try {
        const leg = JSON.parse(localStorage.getItem(BROKER_LS_KEY) || '{}');
        if (leg.coinswitchOk) {
          state.coinswitchConnected = true;
          saveCoinSwitchPref();
        }
      } catch (_) {}
      updateCoinSwitchUi();
      return;
    }
    const data = JSON.parse(raw);
    state.coinswitchConnected = !!data.connected;
    state.coinswitchIntents = Array.isArray(data.intents) ? data.intents.slice(0, 12) : [];
  } catch (_) {
    state.coinswitchConnected = false;
    state.coinswitchIntents = [];
  }
  updateCoinSwitchUi();
}

function saveCoinSwitchPref() {
  localStorage.setItem(CS_LS_KEY, JSON.stringify({
    connected: !!state.coinswitchConnected,
    connectedAt: state.coinswitchConnected ? (new Date().toISOString()) : null,
    intents: (state.coinswitchIntents || []).slice(0, 12),
  }));
}

function updateCoinSwitchUi() {
  const on = !!state.coinswitchConnected;
  const label = on ? 'Connected' : 'Not connected';
  const st = $('coinswitchStatus');
  if (st) {
    const hasKeys = coinswitchFormatOk($('coinswitchKey')?.value, $('coinswitchSecret')?.value);
    st.textContent = on
      ? (hasKeys
        ? 'Connected · format OK · local only · live HTTP behind Enable live orders'
        : 'Connected · preference only · add API key/secret for format check')
      : 'Not connected';
    st.dataset.on = on ? '1' : '0';
  }
  const botSt = $('botCsStatus');
  if (botSt) {
    botSt.textContent = label;
    botSt.dataset.on = on ? '1' : '0';
  }
  const intentEl = $('botCsIntent');
  const intents = state.coinswitchIntents || [];
  if (intentEl) {
    if (!intents.length) {
      intentEl.innerHTML = 'No live intents yet — type <em>coinswitch status</em> or log an intent in Settings';
    } else {
      const last = intents[0];
      intentEl.textContent = `Last intent: ${last.summary || last.text || '—'}`;
    }
  }
  const list = $('coinswitchIntents');
  if (list) {
    if (!intents.length) {
      list.innerHTML = '<li class="empty">None yet — log an intent or type <em>buy BTC on coinswitch</em></li>';
    } else {
      list.innerHTML = intents.slice(0, 8).map((it) => {
        const when = it.at ? new Date(it.at).toLocaleString() : '';
        return `<li>${escapeHtml(it.summary || it.text || '')}${when ? ` · ${escapeHtml(when)}` : ''}</li>`;
      }).join('');
    }
  }
  updateBotCard();
}

function setCoinSwitchConnected(on, announce = true) {
  if (on && !hasFeature('coinswitch')) {
    if (announce) requireFeature('coinswitch', 'CoinSwitch connect and live intents are Pro features. Starter stays paper-manual. Live brokers need official APIs via DGS AI assistant.');
    return;
  }
  state.coinswitchConnected = !!on;
  saveCoinSwitchPref();
  updateCoinSwitchUi();
  if (!announce) return;
  markUserSpoke();
  if (on) {
    speak('CoinSwitch marked connected on this device. That is a preference flag only. Live orders are executed by DGS AI assistant with your API keys server-side — never from this static page. Link keys in chat when you are ready.');
  } else {
    speak('CoinSwitch marked not connected. Preference cleared on this device. Paper autopilot remains default.');
  }
}

function appendCoinSwitchIntent(rawText, extras = {}) {
  if (!hasFeature('coinswitch')) {
    requireFeature('coinswitch', 'CoinSwitch trade intents are a Pro feature. Upgrade to log live intents; execution still happens via DGS AI assistant keys, not this page.');
    return null;
  }
  const text = String(rawText || '').trim();
  const side = extras.side || '';
  const symbol = (extras.symbol || '').toUpperCase();
  const summary = extras.summary || (
    side && symbol ? `${side} ${symbol} on CoinSwitch`
      : side ? `${side} on CoinSwitch`
      : text || 'CoinSwitch intent'
  );
  const intent = {
    at: new Date().toISOString(),
    text,
    side,
    symbol,
    summary,
  };
  state.coinswitchIntents = [intent, ...(state.coinswitchIntents || [])].slice(0, 12);
  saveCoinSwitchPref();
  updateCoinSwitchUi();
  return intent;
}

function coinswitchStatusSpeech() {
  const on = state.coinswitchConnected ? 'connected' : 'not connected';
  const intents = state.coinswitchIntents || [];
  const last = intents[0];
  const lastLine = last
    ? ` Last intent: ${last.summary || last.text}.`
    : ' No live intents yet.';
  return `CoinSwitch India is primary live broker path. Status: ${on} — local preference only. Live orders are executed by DGS AI assistant with your API keys server-side, not from this page.${lastLine} Type buy or sell a coin on coinswitch, or use the Settings form, to log an intent. Link keys in DGS AI chat to execute.`;
}

function parseCoinSwitchTrade(t) {
  const buy = /\b(buy|long)\b/.test(t);
  const sell = /\b(sell|short)\b/.test(t);
  let side = buy ? 'BUY' : (sell ? 'SELL' : 'TRADE');
  let symbol = '';
  const m = t.match(/\b(buy|sell|long|short)\s+([a-z0-9]{2,10})\b/i);
  if (m) symbol = m[2].toUpperCase().replace(/USDT$|USD$|INR$/, '');
  if (!symbol) {
    const named = Object.keys(NAME_TO_SYM).find((n) => t.includes(n));
    if (named) symbol = NAME_TO_SYM[named];
    else {
      const tick = t.toUpperCase().match(/\b([A-Z]{2,5})\b/);
      if (tick && (CRYPTO.has(tick[1]) || DEMO_QUOTES[tick[1]])) symbol = tick[1];
    }
  }
  return { side, symbol };
}

function loadBrokerStubs() {
  try {
    const raw = localStorage.getItem(BROKER_LS_KEY);
    if (!raw) {
      refreshBrokerConnectButtons();
      return;
    }
    const data = JSON.parse(raw);
    if (data.alpacaKey && $('alpacaKey')) $('alpacaKey').value = data.alpacaKey;
    if (data.alpacaSecret && $('alpacaSecret')) $('alpacaSecret').value = data.alpacaSecret;
    if (typeof data.alpacaPaper === 'boolean' && $('alpacaPaper')) $('alpacaPaper').checked = data.alpacaPaper;
    if (data.coinswitchKey && $('coinswitchKey')) $('coinswitchKey').value = data.coinswitchKey;
    if (data.coinswitchSecret && $('coinswitchSecret')) $('coinswitchSecret').value = data.coinswitchSecret;
    if (data.ibHostPort && $('ibHostPort')) $('ibHostPort').value = data.ibHostPort;
    state.alpacaConnected = !!data.alpacaOk;
    state.ibConnected = !!data.ibOk;
    state.liveOrdersEnabled = !!data.liveOrdersEnabled && (data.alpacaOk || data.coinswitchOk || data.ibOk);
    if ($('enableLiveOrders')) $('enableLiveOrders').checked = !!state.liveOrdersEnabled;
    if (data.alpacaOk) setBrokerStatus('alpacaStatus', true, 'Connected · format OK · local only · orders need Enable live orders');
    else setBrokerStatus('alpacaStatus', false, 'Not connected');
    if (data.coinswitchOk) {
      state.coinswitchConnected = true;
      setBrokerStatus('coinswitchStatus', true, 'Connected · format OK · local only · live HTTP behind Enable live orders');
    }
    if (data.ibOk) setBrokerStatus('ibStatus', true, `Connected · ${data.ibHostPort || '127.0.0.1:7497'} · paper 7497 format OK · local only`);
    else setBrokerStatus('ibStatus', false, 'Not connected');
    refreshBrokerConnectButtons();
    updateModeBadge();
  } catch (_) {}
}

function saveBrokerStubs(extra = {}) {
  const prev = (() => {
    try { return JSON.parse(localStorage.getItem(BROKER_LS_KEY) || '{}'); } catch (_) { return {}; }
  })();
  const data = {
    ...prev,
    alpacaKey: $('alpacaKey')?.value || '',
    alpacaSecret: $('alpacaSecret')?.value || '',
    alpacaPaper: !!($('alpacaPaper')?.checked),
    coinswitchKey: $('coinswitchKey')?.value || '',
    coinswitchSecret: $('coinswitchSecret')?.value || '',
    ibHostPort: $('ibHostPort')?.value || '127.0.0.1:7497',
    liveOrdersEnabled: !!state.liveOrdersEnabled,
    alpacaOk: !!state.alpacaConnected,
    ibOk: !!state.ibConnected,
    coinswitchOk: !!state.coinswitchConnected,
    ...extra,
  };
  localStorage.setItem(BROKER_LS_KEY, JSON.stringify(data));
}

function alpacaFormatOk(key, secret) {
  const k = (key || '').trim();
  const s = (secret || '').trim();
  return k.length >= 8 && s.length >= 8 && /^[A-Za-z0-9_-]+$/.test(k) && /^[A-Za-z0-9_-]+$/.test(s);
}

function coinswitchFormatOk(key, secret) {
  const k = (key || '').trim();
  const s = (secret || '').trim();
  return k.length >= 8 && s.length >= 8;
}

function ibFormatOk(hostPort) {
  const raw = String(hostPort || '').trim();
  // host:port e.g. 127.0.0.1:7497
  return /^(localhost|127\.0\.0\.1|[\w.-]+):(\d{2,5})$/i.test(raw);
}

function refreshBrokerConnectButtons() {
  const aOk = alpacaFormatOk($('alpacaKey')?.value, $('alpacaSecret')?.value);
  if ($('alpacaConnectBtn')) $('alpacaConnectBtn').disabled = !aOk;
  const cOk = coinswitchFormatOk($('coinswitchKey')?.value, $('coinswitchSecret')?.value);
  if ($('coinswitchConnectBtn')) $('coinswitchConnectBtn').disabled = !cOk || !hasFeature('coinswitch');
  const iOk = ibFormatOk($('ibHostPort')?.value || '127.0.0.1:7497');
  if ($('ibConnectBtn')) $('ibConnectBtn').disabled = !iOk;
  updateModeBadge();
}

function setBrokerStatus(id, on, text) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.dataset.on = on ? '1' : '0';
}

function bindBrokerStubs() {
  ['alpacaKey', 'alpacaSecret', 'alpacaPaper', 'coinswitchKey', 'coinswitchSecret', 'ibHostPort'].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener('input', () => { saveBrokerStubs(); refreshBrokerConnectButtons(); });
    el.addEventListener('change', () => { saveBrokerStubs(); refreshBrokerConnectButtons(); });
  });

  const aBtn = $('alpacaConnectBtn');
  if (aBtn) {
    aBtn.onclick = () => {
      const key = $('alpacaKey')?.value || '';
      const secret = $('alpacaSecret')?.value || '';
      if (!alpacaFormatOk(key, secret)) {
        setBrokerStatus('alpacaStatus', false, 'Not connected · invalid format');
        state.alpacaConnected = false;
        saveBrokerStubs({ alpacaOk: false });
        updateModeBadge();
        return;
      }
      state.alpacaConnected = true;
      saveBrokerStubs({ alpacaOk: true, alpacaCheckedAt: new Date().toISOString() });
      setBrokerStatus('alpacaStatus', true, 'Connected · format OK · local only · orders need Enable live orders');
      updateModeBadge();
      speak('Alpaca connected on format check. Keys stored only in this browser. Start bot stays paper until Enable live orders is checked. No guaranteed profit.');
    };
  }
  const aDisc = $('alpacaDisconnectBtn');
  if (aDisc) {
    aDisc.onclick = () => {
      state.alpacaConnected = false;
      saveBrokerStubs({ alpacaOk: false });
      setBrokerStatus('alpacaStatus', false, 'Not connected');
      updateModeBadge();
      speak('Alpaca disconnected on this device.');
    };
  }

  const cBtn = $('coinswitchConnectBtn');
  if (cBtn) {
    cBtn.onclick = () => {
      if (!hasFeature('coinswitch')) {
        requireFeature('coinswitch', 'CoinSwitch connect is a Pro feature.');
        return;
      }
      const key = $('coinswitchKey')?.value || '';
      const secret = $('coinswitchSecret')?.value || '';
      if (!coinswitchFormatOk(key, secret)) {
        setCoinSwitchConnected(false, false);
        setBrokerStatus('coinswitchStatus', false, 'Not connected · enter API key and secret');
        speak('CoinSwitch needs API key and secret on this device for a format check. Keys never leave this browser from this panel.');
        return;
      }
      saveBrokerStubs({ coinswitchOk: true, coinswitchCheckedAt: new Date().toISOString() });
      setCoinSwitchConnected(true, false);
      setBrokerStatus('coinswitchStatus', true, 'Connected · format OK · local only · live HTTP behind Enable live orders');
      if ($('coinswitchFlagToggle')) $('coinswitchFlagToggle').checked = true;
      updateModeBadge();
      speak('CoinSwitch connected on format check. Keys stay in localStorage on this device only — never shipped to GitHub. Start bot runs paper until Enable live orders is checked.');
    };
  }
  const dBtn = $('coinswitchDisconnectBtn');
  if (dBtn) {
    dBtn.onclick = () => {
      saveBrokerStubs({ coinswitchOk: false, coinswitchKey: '', coinswitchSecret: '' });
      if ($('coinswitchKey')) $('coinswitchKey').value = '';
      if ($('coinswitchSecret')) $('coinswitchSecret').value = '';
      setCoinSwitchConnected(false);
      setBrokerStatus('coinswitchStatus', false, 'Not connected');
      updateModeBadge();
    };
  }

  const iBtn = $('ibConnectBtn');
  if (iBtn) {
    iBtn.onclick = () => {
      const hp = $('ibHostPort')?.value || '127.0.0.1:7497';
      if (!ibFormatOk(hp)) {
        state.ibConnected = false;
        saveBrokerStubs({ ibOk: false });
        setBrokerStatus('ibStatus', false, 'Not connected · use host:port like 127.0.0.1:7497');
        updateModeBadge();
        return;
      }
      state.ibConnected = true;
      saveBrokerStubs({ ibOk: true, ibHostPort: hp, ibCheckedAt: new Date().toISOString() });
      setBrokerStatus('ibStatus', true, `Connected · ${hp} · paper 7497 format OK · local only`);
      updateModeBadge();
      speak('Interactive Brokers host and port saved locally. Paper default port 7497. Portfolio tools still run via the box CLI. Not advice.');
    };
  }
  const iDisc = $('ibDisconnectBtn');
  if (iDisc) {
    iDisc.onclick = () => {
      state.ibConnected = false;
      saveBrokerStubs({ ibOk: false });
      setBrokerStatus('ibStatus', false, 'Not connected');
      updateModeBadge();
    };
  }

  const live = $('enableLiveOrders');
  if (live) {
    live.onchange = () => {
      if (live.checked && !brokerKeysPresent()) {
        live.checked = false;
        state.liveOrdersEnabled = false;
        speak('Connect a broker with valid keys before enabling live orders. Paper remains default.');
        updateModeBadge();
        return;
      }
      state.liveOrdersEnabled = !!live.checked && brokerKeysPresent();
      saveBrokerStubs({ liveOrdersEnabled: state.liveOrdersEnabled });
      updateModeBadge();
      speak(state.liveOrdersEnabled
        ? 'Live orders preference ON. UI shows LIVE broker badge. Actual HTTP live order routing stays gated — paper marks remain the default path until server-side execution is linked.'
        : 'Live orders OFF. Start bot uses paper managed mode.');
    };
  }

  loadBrokerStubs();
  loadCoinSwitchPref();
  refreshBrokerConnectButtons();
}

function forceHalt() {
  markUserSpoke();
  state.halted = true;
  if (state.autopilot) {
    stopManagedBot({ quiet: true });
    setAutopilotAction('Force halt · bot stopped');
  }
  saveState();
  analyzeRisk();
  updateStartStopUi();
  speak('Force halt engaged. Bot stopped. All paper entries blocked until you reset the day.');
}

function resetDay() {
  markUserSpoke();
  state.dayPnL = 0;
  state.halted = false;
  state.peakEquity = Math.max(state.peakEquity, num('equity'));
  saveState();
  analyzeRisk();
  speak('Day P and L reset. Risk gate re-armed.');
}

function clearBook() {
  markUserSpoke();
  state.book = [];
  saveState();
  renderBook();
  updateBotCard();
  speak('Paper book cleared.');
}

function statusSpeech() {
  const eq = num('equity');
  const dd = Math.max(0, (state.peakEquity - eq) / Math.max(state.peakEquity, 1) * 100);
  const gate = state.lastOpen ? 'open' : 'closed';
  const opens = openTrades();
  const u = totalUnrealized();
  const flat = $('noOvernight')?.checked && opens.length ? ' Flat-by-close reminder: flatten open paper trades before session end.' : '';
  const auto = state.autopilot ? 'on' : 'off';
  return `Status. Paper equity ${money(eq)}. Day P and L ${money(sessionDayPnL())} including unrealized ${money(u)}. Open trades ${opens.length}. Drawdown ${dd.toFixed(2)} percent. Gate ${gate}. Autopilot ${auto}. Halt ${state.halted ? 'on' : 'off'}. Last autopilot action: ${state.autopilotLastAction || 'none'}. Paper only. No guaranteed profit.${flat}`;
}


/** Yahoo history for technicals (~15m delay). Starter+ */
async function fetchHistoryCloses(symbol, range = '3mo') {
  const ysym = yahooSymbol(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ysym)}?interval=1d&range=${encodeURIComponent(range)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    const res = await fetch(url, { signal: ctrl.signal, mode: 'cors' });
    clearTimeout(timer);
    if (!res.ok) throw new Error('http');
    const data = await res.json();
    const r = data.chart?.result?.[0];
    const closes = (r?.indicators?.quote?.[0]?.close || []).filter((x) => x != null);
    return closes;
  } catch (_) {
    clearTimeout(timer);
    return null;
  }
}

function rsiFromCloses(closes, period = 14) {
  if (!closes || closes.length < period + 2) return null;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function sma(closes, n) {
  if (!closes || closes.length < n) return null;
  const slice = closes.slice(-n);
  return slice.reduce((a, b) => a + b, 0) / n;
}

function ema(closes, n) {
  if (!closes || closes.length < n) return null;
  const k = 2 / (n + 1);
  let e = closes[0];
  for (let i = 1; i < closes.length; i++) e = closes[i] * k + e * (1 - k);
  return e;
}

function atrApprox(closes, n = 14) {
  if (!closes || closes.length < n + 1) return null;
  let sum = 0;
  for (let i = closes.length - n; i < closes.length; i++) {
    sum += Math.abs(closes[i] - closes[i - 1]);
  }
  return sum / n;
}

async function technicalsSpeech(symbol) {
  if (!requireFeature('technicals', 'Technicals are included on Starter and Pro. Sign in to continue.')) return;
  const filler = speakFiller();
  const closes = await fetchHistoryCloses(symbol, '3mo');
  await filler;
  if (!closes || closes.length < 30) {
    const q = await fetchQuote(symbol);
    await speak(`${spokenQuote(q)} Full RSI MACD Bollinger ATR ADX run on the DGS AI box CLI: python -m tools.market_skills technicals ${symbol}. Delayed Yahoo-style data. Not advice.`);
    return;
  }
  const last = closes[closes.length - 1];
  const rsi = rsiFromCloses(closes);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const atr = atrApprox(closes, 14);
  const macd = ema12 != null && ema26 != null ? ema12 - ema26 : null;
  const bits = [
    `${symbol} technicals (delayed Yahoo-style, about fifteen minutes).`,
    `Last ${fmtPx(last)}.`,
    rsi != null ? `RSI fourteen ${rsi.toFixed(1)}.` : '',
    macd != null ? `MACD approx ${macd.toFixed(2)}.` : '',
    sma20 != null ? `SMA twenty ${fmtPx(sma20)}.` : '',
    sma50 != null ? `SMA fifty ${fmtPx(sma50)}.` : '',
    atr != null ? `ATR fourteen about ${fmtPx(atr)}.` : '',
    'Not financial advice. No guaranteed profit.',
  ].filter(Boolean);
  await speak(bits.join(' '));
  addLine('dgs', bits.join(' '));
}

async function fundamentalsSpeech(symbol) {
  if (!requireFeature('fundamentals', 'Fundamentals are a Pro feature. Starter includes quote, technicals, and chart.')) return;
  await speak(`${symbol} fundamentals: full PE, margins, growth, and balance-sheet snapshot run on the DGS AI assistant box via python -m tools.market_skills fundamentals ${symbol}. Delayed data. Not financial advice. No guaranteed profit.`);
}

async function optionsSpeech(symbol) {
  if (!requireFeature('options', 'Option chains and Greeks are Pro. Starter covers quote, technicals, and chart.')) return;
  await speak(`${symbol} options: chain summary and Black-Scholes Greeks for ATM strikes run via DGS AI market skills CLI — python -m tools.market_skills options ${symbol}. Yahoo chain may be delayed about fifteen minutes. Not advice.`);
}

async function riskCompareSpeech(a, b) {
  if (!requireFeature('riskCompare', 'Risk compare is Pro. Upgrade for volatility, beta, VaR, and correlation.')) return;
  await speak(`Risk compare ${a} versus ${b}: volatility, beta, drawdown, Sharpe, and correlation run on the box — python -m tools.market_skills risk-compare ${a} ${b}. Not financial advice. Delayed data. No guaranteed profit.`);
}

async function fullReportSpeech(symbol) {
  if (!requireFeature('marketReport', 'Full markdown and PDF reports are Pro. Starter keeps quote, technicals, and chart.')) return;
  await speak(`Full ${symbol} report: technicals, fundamentals, bullish score, and PMCC snippet write to tools/out as markdown and PDF — python -m tools.market_skills report ${symbol}. Not financial advice. Delayed Yahoo-style data. No guaranteed profit.`);
}

async function ibPortfolioSpeech() {
  if (!requireFeature('ibPortfolio', 'IBKR portfolio read is Pro. Needs TWS paper on port 7497.')) return;
  await speak('My IB portfolio: DGS AI reads Interactive Brokers paper via TWS or IB Gateway on one two seven dot zero dot zero dot one port seven four nine seven. Say ib status or run python -m tools.market_skills ib-positions --rolls on the box. If TWS is not running you get a graceful offline message. Stop-loss is dry-run by default — pass --execute only when you mean it. Not advice.');
}

async function ibStopLossSpeech() {
  if (!requireFeature('ibPortfolio', 'IB stop-loss tools are Pro and dry-run by default.')) return;
  await speak('IB stop-loss defaults to dry-run. It analyzes paper positions and proposed stops without placing orders. To place, the operator must pass --execute on the CLI. Live port seven four nine six is not the default. Not financial advice.');
}

function parseTwoSymbols(text) {
  const up = text.toUpperCase();
  const tickers = [...up.matchAll(/\b([A-Z]{1,5})\b/g)].map((m) => m[1]).filter((s) => !['VERSUS', 'VS', 'AND', 'THE', 'FOR', 'RISK', 'COMPARE', 'WITH'].includes(s));
  const a = tickers[0] || parseSymbol(text);
  const b = tickers[1] || 'SPY';
  return [a, b];
}


function helpSpeech() {
  return 'I am DGS AI. Type commands in the bar or tap a skill. Starter: quote, technicals, chart, send to phone, manual paper. Pro: fundamentals, options Greeks, bullish scan, risk compare, full report, IB portfolio, stop-loss dry-run, autopilot, CoinSwitch intents. Also: find a trade, take the trade, how is my book, close trade, brief. Paper default. Delayed data possible. Not advice. No guaranteed profit.';
}

function showPane(name) {
  const pane = name || 'paper';
  state.activePane = pane;
  if (pane === 'settings') openDrawer('settings');
  if (pane === 'risk') openDrawer('risk');
  if (pane === 'paper') closeDrawers();
}

async function quoteSpeech(symbol) {
  const filler = speakFiller();
  const q = await fetchQuote(symbol);
  await filler;
  await speak(`${spokenQuote(q)} Want the ${q.symbol} chart, or send it to your phone?`);
  appendBriefCard(q, 'Want the chart? Or send to phone?');
}

function quickAnswer(q) {
  const t = q.toLowerCase();
  if (/(who are you|your name|what are you)/.test(t)) {
    return 'I am DGS AI, built for Dineshgopi Sunkara. Text-first dashboard. Stocks and crypto brief, charts, and paper risk. I do not place live orders.';
  }
  if (/(help|what can you|commands)/.test(t)) return helpSpeech();
  if (/(profit|guarantee|guaranteed)/.test(t)) {
    return 'No profit is guaranteed. DGS AI blocks bad paper size. It does not promise returns.';
  }
  if (/(broker|live order|real money|place a trade)/.test(t)) {
    return 'Paper autopilot is the default. CoinSwitch India is the primary live path — orders are executed by DGS AI assistant with your keys server-side, not from this page. Type coinswitch status or buy BTC on coinswitch to log an intent. Alpaca is an optional stub. Robinhood has no official bot API; we will not ask for your password.';
  }
  if (/(social|instagram|linkedin|twitter|post)/.test(t)) {
    showPane('settings');
    return 'Settings is open on Social drafts. I draft. You approve before posting.';
  }
  if (/(work|email|sop|priority|priorities)/.test(t)) {
    showPane('settings');
    return 'Settings is open on Work drafts. Plans and drafts only.';
  }
  if (/(hello|hi |hey )/.test(t) || t === 'hi' || t === 'hey') {
    return 'Ready. Type quote, technicals, chart, find a trade, or any stock or crypto.';
  }
  if (/(not financial advice|disclaimer|delayed data|fifteen minute|15 ?m)/.test(t)) {
    return 'Disclaimer: DGS AI is not financial advice. Yahoo-style quotes may be delayed about fifteen minutes. No profits are guaranteed. IB stop-loss is dry-run by default.';
  }
  if (/(what (is|are) (market )?skills|market skills|trading skills)/.test(t)) {
    return 'DGS AI market skills cover quote, technicals, fundamentals, options Greeks, bullish and PMCC scans, risk compare, PDF reports, and IBKR paper portfolio with stop-loss dry-run. Starter gets quote, technicals, and chart. Pro unlocks the rest on the assistant box CLI.';
  }
  return null;
}

async function handleCommand(text) {
  const t = text.toLowerCase().trim();
  addLine('user', text);
  setStatus('WORKING');

  // scan AAPL,MSFT — optional ticker list
  if (/^scan\b/.test(t) && /[a-z]{1,5}\s*,/.test(t)) {
    const tickers = [...text.toUpperCase().matchAll(/\b([A-Z]{1,5})\b/g)]
      .map((m) => m[1])
      .filter((s) => !['SCAN', 'FOR', 'AND', 'THE'].includes(s));
    if (tickers.length) {
      await scanMarket({ symbols: tickers });
      return;
    }
  }

  // --- DGS AI market skills (text) ---
  if (/(ib (stop|stop-loss|stoploss)|stop-loss dry|dry-?run stop)/.test(t)) {
    await ibStopLossSpeech();
    return;
  }
  if (/(my ib (portfolio|positions|account)|ib (portfolio|positions|status)|interactive brokers|tws paper)/.test(t)) {
    await ibPortfolioSpeech();
    return;
  }
  if (/(full report|analysis report|pdf report|markdown report|generate report)/.test(t)) {
    await fullReportSpeech(parseSymbol(text));
    return;
  }
  if (/(risk compare|compare risk|correlation (of|between|for)|correlate )/.test(t)) {
    const [a, b] = parseTwoSymbols(text);
    await riskCompareSpeech(a, b);
    return;
  }
  if (/(option(s)?( chain)?|greeks|black.?scholes|implied vol)/.test(t)) {
    await optionsSpeech(parseSymbol(text));
    return;
  }
  if (/(fundamentals?|pe ratio|earnings|balance sheet|valuation)/.test(t) && !/(paper|autopilot)/.test(t)) {
    await fundamentalsSpeech(parseSymbol(text));
    return;
  }
  if (/(technicals?|rsi|macd|bollinger|moving average|atr\b|adx\b)/.test(t)) {
    await technicalsSpeech(parseSymbol(text));
    return;
  }
  if (/(bullish scan|scan tickers|pmcc scan|scan for bullish)/.test(t)) {
    if (!requireFeature('scan', 'Bullish / PMCC scanners are Pro. Starter: quote, technicals, chart.')) return;
    await scanMarket();
    return;
  }

  // CoinSwitch primary live intents (no secrets / no signed orders from Pages)
  if (/(coin\s*switch status|coinswitch status)/.test(t)) {
    await speak(coinswitchStatusSpeech());
    return;
  }
  if (/(trade on coin\s*switch|trade on coinswitch|buy .+ on coin\s*switch|buy .+ on coinswitch|sell .+ on coin\s*switch|sell .+ on coinswitch|coin\s*switch|coinswitch)/.test(t)) {
    const { side, symbol } = parseCoinSwitchTrade(t);
    const summary = symbol
      ? `${side} ${symbol} on CoinSwitch`
      : (side === 'TRADE' ? 'Trade on CoinSwitch' : `${side} on CoinSwitch`);
    appendCoinSwitchIntent(text, { side, symbol, summary });
    const linked = state.coinswitchConnected
      ? 'This device shows Connected as a preference flag.'
      : 'This device shows Not connected — mark connected in Risk, or link keys in chat.';
    await speak(`${summary} intent logged. ${linked} Live CoinSwitch orders are executed by DGS AI assistant with your API keys server-side when linked in chat — not from this static page. Never paste signing secrets here.`);
    return;
  }

  if (/(start autopilot|enable autopilot|autopilot on|begin autopilot|turn on autopilot)/.test(t)) {
    startAutopilot();
    return;
  }
  if (/(stop autopilot|disable autopilot|autopilot off|end autopilot|turn off autopilot)/.test(t)) {
    stopAutopilot();
    return;
  }
  if (/(autopilot status|is autopilot|autopilot (running|state))/.test(t)) {
    await speak(state.autopilot
      ? `Autopilot is on. Last action: ${state.autopilotLastAction || 'none'}. Paper only. No guaranteed profit.`
      : 'Autopilot is off. Paper default. Say start autopilot to begin the quiet paper loop.');
    return;
  }

  if (/(find (a |me )?trade|scan (the )?market|best setup( today)?|propose (a )?trade|scan for (a )?setup)/.test(t)) {
    await scanMarket();
    return;
  }
  if (/\b(enter( the)?( paper)?( trade)?|take the trade|paper (buy|sell|enter|trade)|book (the )?trade)\b/.test(t)) {
    paperEnter();
    return;
  }
  if (/(close (the )?trade|flatten|close position)/.test(t)) {
    const sym = parseSymbol(text);
    // If utterance is just "close trade" without a clear symbol cue, close first open
    const named = Object.keys(NAME_TO_SYM).some((n) => t.includes(n)) || /\b[A-Z]{2,5}\b/.test(text.toUpperCase());
    await closeTrade(named ? sym : '');
    return;
  }
  if (/(how('?s| is) (my )?book|paper book|open (trades|positions)|unrealized)/.test(t)) {
    await refreshOpenMarks();
    const opens = openTrades();
    if (!opens.length) {
      await speak(`Paper book is flat. Realized day P and L ${money(state.dayPnL)}. Paper only.`);
    } else {
      const bits = opens.map((x) => `${x.symbol} ${x.side} ${money(x.unrealized || 0)}`);
      await speak(`Open paper book: ${bits.join('; ')}. Total unrealized ${money(totalUnrealized())}. Day including marks ${money(sessionDayPnL())}. Say close trade and a symbol to flatten. Not advice.`);
    }
    return;
  }

  if (/(send (it |the chart )?to (my )?phone|show (it |that |the chart )?on (my )?phone|pull (it |that )?up on (my )?phone|handoff|share (the )?chart|airdrop)/.test(t)) {
    await sendChartToPhone(parseSymbol(text));
    return;
  }
  if (/(open chart|show (the )?chart|chart for|tradingview|trading view|show .+ chart|chart )\b/.test(t)
      || (/\bchart\b/.test(t) && hasTradingCue(t))) {
    openChart(parseSymbol(text));
    return;
  }
  if (/(crypto brief|how('?s| is) crypto|crypto (tape|market|today)|crypto overview)/.test(t)) {
    await marketBrief('crypto');
    return;
  }
  if (/(equity brief|stock brief|stocks brief|how('?s| is) (the )?(stock|equity) market)/.test(t)) {
    await marketBrief('stocks');
    return;
  }
  if (/(market brief|brief(ing)?|sentiment|how('?s| is) the market|market today|tape)/.test(t)) {
    await marketBrief('both');
    return;
  }
  // Full scrap→end pipeline for asset questions
  if (/(what('?s| is) happening (with |to )?|should i watch|tell me about|how('?s| is)|what about|price of|quote|last (price|print)|check )\b/.test(t)
      || NAME_TO_SYM[t.trim()]
      || (hasTradingCue(t) && parseSymbol(text) && (Object.keys(NAME_TO_SYM).some((n) => t.includes(n)) || /\b[A-Z]{1,5}\b/.test(text.toUpperCase())))) {
    // Prefer pipeline when asking about a specific asset; plain quote for short "quote X"
    const sym = parseSymbol(text);
    if (/\b(quote|price of|last (price|print))\b/.test(t) && !/(happening|watch|tell me|about|should)\b/.test(t)) {
      await quoteSpeech(sym);
    } else if (Object.keys(NAME_TO_SYM).some((n) => t.includes(n)) || DEMO_QUOTES[sym] || CRYPTO.has(sym)) {
      await assetPipeline(sym);
    } else {
      await quoteSpeech(sym);
    }
    return;
  }
  if (/\b(bitcoin|ethereum|solana|dogecoin|crypto|btc|eth|sol)\b/.test(t) && !/\bchart\b/.test(t)) {
    await assetPipeline(parseSymbol(text));
    return;
  }
  if (/(analyze|risk gate|check risk|paper setup)/.test(t)) {
    openDrawer('risk');
    analyzeRisk();
    await speak(state.lastOpen ? 'Risk gate is open for this paper setup.' : 'Risk gate is closed for this paper setup.');
    return;
  }
  if (/(enter paper|paper enter|take the trade|paper trade)/.test(t)) {
    paperEnter();
    return;
  }
  if (/(force halt|\bhalt\b|stop (all )?trading|kill switch)/.test(t) && !/autopilot/.test(t)) {
    forceHalt();
    return;
  }
  if (/(day p|p and l|pnl|status|drawdown)/.test(t)) {
    analyzeRisk();
    await speak(statusSpeech());
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
  // Soft trading fallback: if any symbol-ish word, still try pipeline
  if (hasTradingCue(t)) {
    await assetPipeline(parseSymbol(text));
    return;
  }
  await speak('Got it. Try quote, technicals, fundamentals, options, risk compare, full report, my IB portfolio, find a trade, take the trade, autopilot, brief, chart, send to phone, or coinswitch status. Paper default. Delayed data possible. Not advice. No guaranteed profit.');
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

function analysisSymbol() {
  const raw = ($('analysisSymbol') && $('analysisSymbol').value) || $('symbol')?.value || state.lastSymbol || 'NVDA';
  return parseSymbol(raw);
}

function bindUi() {
  const signOutBtn = $('signOutBtn');
  if (signOutBtn) signOutBtn.onclick = () => { signOutUser(); };

  const form = $('commandForm');
  if (form) {
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const input = $('commandInput');
      const text = String((input && input.value) || '').trim();
      if (!text) return;
      handleCommand(text);
    });
  }
  document.querySelectorAll('.chip[data-cmd]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const raw = btn.getAttribute('data-cmd') || '';
      const cmd = raw.replace(/\{SYM\}/g, state.lastSymbol || 'NVDA');
      const input = $('commandInput');
      if (input) input.value = cmd;
      handleCommand(cmd);
    });
  });
  const riskOpen = () => openDrawer('risk');
  if ($('openRiskBtn')) $('openRiskBtn').onclick = riskOpen;
  if ($('openRiskBtn2')) $('openRiskBtn2').onclick = riskOpen;
  if ($('openSettingsBtn')) $('openSettingsBtn').onclick = () => openDrawer('settings');

  if ($('closeChartBtn')) $('closeChartBtn').onclick = closeChart;
  if ($('sendPhoneBtn')) $('sendPhoneBtn').onclick = () => { sendChartToPhone(state.lastSymbol); };
  if ($('openTvTabBtn')) $('openTvTabBtn').onclick = () => window.open(tvChartUrl(state.lastSymbol), '_blank', 'noopener,noreferrer');
  const scanBtn = $('scanBtn');
  if (scanBtn) scanBtn.onclick = () => { scanMarket(); };
  const autoBtn = $('autopilotBtn');
  if (autoBtn) {
    autoBtn.onclick = () => {
      if (state.autopilot) stopManagedBot();
      else startManagedBot();
    };
  }
  const startBot = $('startBotBtn');
  if (startBot) startBot.onclick = () => { startManagedBot(); };
  const stopBot = $('stopBotBtn');
  if (stopBot) stopBot.onclick = () => { stopManagedBot(); };
  const startCmd = $('startBotCmdBtn');
  if (startCmd) {
    startCmd.onclick = () => {
      if (state.autopilot) stopManagedBot();
      else startManagedBot();
    };
  }
  const botEnter = $('botEnterBtn');
  if (botEnter) botEnter.onclick = () => { paperEnter(); };
  bindBrokerStubs();
  if ($('backdrop')) $('backdrop').onclick = closeDrawers;
  document.querySelectorAll('.drawer-close').forEach((btn) => {
    btn.onclick = closeDrawers;
  });

  if ($('analyzeBtn')) $('analyzeBtn').onclick = () => { analyzeRisk(); speak(state.lastOpen ? 'Risk gate open.' : 'Risk gate closed.'); };
  if ($('paperBtn')) $('paperBtn').onclick = paperEnter;
  if ($('haltBtn')) $('haltBtn').onclick = forceHalt;
  if ($('resetDayBtn')) $('resetDayBtn').onclick = resetDay;
  if ($('clearBookBtn')) $('clearBookBtn').onclick = clearBook;
  if ($('downloadCardBtn')) $('downloadCardBtn').onclick = downloadShareCard;
  const openPhoneBtn = $('openOnPhoneBtn');
  if (openPhoneBtn) openPhoneBtn.onclick = openOnThisPhone;
  const copyBtn = $('copyLinkBtn');
  if (copyBtn) copyBtn.onclick = () => { copyHandoffLink(); };
  if ($('socialDraftBtn')) $('socialDraftBtn').onclick = draftSocial;
  if ($('socialChecklistBtn')) $('socialChecklistBtn').onclick = socialChecklist;
  if ($('workRunBtn')) $('workRunBtn').onclick = runWork;
  if ($('budgetRunBtn')) $('budgetRunBtn').onclick = runWithinBudget;
  if ($('saveConnectAppsBtn')) $('saveConnectAppsBtn').onclick = saveConnectApps;
  if ($('clearConnectAppsBtn')) $('clearConnectAppsBtn').onclick = clearConnectApps;

  const skill = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  skill('skillQuoteBtn', () => { quoteSpeech(analysisSymbol()); });
  skill('skillTechBtn', () => { technicalsSpeech(analysisSymbol()); });
  skill('skillFundBtn', () => { fundamentalsSpeech(analysisSymbol()); });
  skill('skillOptBtn', () => { optionsSpeech(analysisSymbol()); });
  skill('skillReportBtn', () => { fullReportSpeech(analysisSymbol()); });
  skill('skillIbBtn', () => { ibPortfolioSpeech(); });
  skill('skillIbSlBtn', () => { ibStopLossSpeech(); });
  skill('skillScanBtn', () => { scanMarket(); });
  skill('skillCompareBtn', () => {
    const a = parseSymbol(($('compareA') && $('compareA').value) || 'NVDA');
    const b = parseSymbol(($('compareB') && $('compareB').value) || 'SPY');
    riskCompareSpeech(a, b);
  });
  skill('csIntentBtn', () => {
    const side = ($('csIntentSide') && $('csIntentSide').value) || 'BUY';
    const symbol = String(($('csIntentSymbol') && $('csIntentSymbol').value) || 'BTC').toUpperCase();
    const summary = `${side} ${symbol} on CoinSwitch`;
    appendCoinSwitchIntent(summary, { side, symbol, summary });
    speak(`${summary} intent logged. Live CoinSwitch orders are executed by DGS AI assistant with your API keys server-side when linked in chat — not from this static page.`);
  });

  if ($('presetScalp')) $('presetScalp').onclick = () => {
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
  if ($('presetDay')) $('presetDay').onclick = () => {
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
  if ($('presetMom')) $('presetMom').onclick = () => {
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
    const el = $(id);
    if (!el) return;
    el.addEventListener('change', () => { analyzeRisk(); if (id === 'equity') saveState(); });
    el.addEventListener('input', analyzeRisk);
  });
  if ($('noOvernight')) $('noOvernight').addEventListener('change', analyzeRisk);
}

function bootFromQuery() {
  try {
    const params = new URLSearchParams(location.search);
    const chart = (params.get('chart') || '').trim().toUpperCase();
    if (!chart) return;
    const sym = chart.replace(/[^A-Z0-9]/g, '') || 'NVDA';
    openChart(sym, { silent: true });
  } catch (_) {}
}

let booted = false;
function bootApp() {
  if (booted) return;
  booted = true;
  loadState();
  loadConnectApps();
  state.book = (state.book || []).map((t) => {
    if (!t || typeof t !== 'object') return t;
    if (!t.status) return { ...t, status: 'OPEN', mark: t.entry, unrealized: 0 };
    return t;
  });
  bindUi();
  applyPlanGates();
  const hadProfileAtBoot = !!getProfile();
  if (hadProfileAtBoot) applyProfileToDesk(getProfile());
  onProfileReady((p) => {
    applyProfileToDesk(p);
    if (!hadProfileAtBoot) {
      if ($('activityLog')) $('activityLog').textContent = 'Profile saved · desk unlocked · paper risk armed';
      speak('Profile saved. Connect a broker in Settings when ready, then press Start bot. Paper first. No guaranteed profit.');
    }
  });
  if (state.proposal) applyProposal(state.proposal);
  renderBook();
  analyzeRisk();
  updateBotCard();
  updateStartStopUi();
  updateModeBadge();
  renderWatchlist();
  renderTape();
  setStatus('READY');
  if (!new URLSearchParams(location.search).get('chart')) {
    openChart(state.lastSymbol || 'NVDA', { silent: true });
  }
  bootFromQuery();
  refreshDeskQuotes().catch(() => {});
  if (state.halted && $('activityLog')) $('activityLog').textContent = 'Force halt is on. Reset day to re-arm.';
  // Only resume bot if desk is open (profile complete) and autopilot was on
  const deskOpen = document.body.dataset.gate === 'open';
  if (deskOpen && state.autopilot) {
    state.autopilot = false;
    startManagedBot({ quiet: true });
    setAutopilotAction(state.autopilotLastAction || 'Resumed · managed bot');
  } else if (!deskOpen) {
    state.autopilot = false;
  }
  setInterval(() => {
    if (openTrades().length) refreshOpenMarks().catch(() => {});
    updateModeBadge();
  }, 45000);
}

onUnlocked(bootApp);
