#!/usr/bin/env python3
"""
DGS AI managed bot runner (Freqtrade-inspired — not affiliated with Freqtrade).

Config: stake_amount/budget, stoploss %, timeframe, pair whitelist, dry_run.
Loop: fetch tickers via CCXT public (or Yahoo fallback) → EMA cross / RSI
strategy → open/close paper positions with SL/TP.

Start/stop via CLI. Status written to tools/out/dgs_bot_status.json for polling
(or mirror via browser localStorage on static GitHub Pages).

Educational. Dry-run first. Not financial advice. No guaranteed profit.
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import time
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parents[1]
STATUS_PATH = ROOT / "tools" / "out" / "dgs_bot_status.json"
PID_PATH = ROOT / "tools" / "out" / "dgs_bot.pid"
DEFAULT_CONFIG_PATH = ROOT / "tools" / "out" / "dgs_bot_config.json"

# Ensure sibling import works when run as script
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from tools.exchange_ccxt import build_exchange, fetch_ticker, list_popular_exchanges
except Exception:  # pragma: no cover
    from exchange_ccxt import build_exchange, fetch_ticker, list_popular_exchanges  # type: ignore


DISCLAIMER = (
    "Educational paper/dry-run bot. Not financial advice. "
    "No guaranteed profit. Losses are possible. Dry-run is the default."
)


@dataclass
class BotConfig:
    stake_amount: float = 100.0
    budget: float = 1000.0
    stoploss: float = -0.05  # -5% like freqtrade fraction
    take_profit: float = 0.08  # +8%
    timeframe: str = "5m"
    pair_whitelist: List[str] = field(
        default_factory=lambda: ["BTC/USDT", "ETH/USDT", "SOL/USDT"]
    )
    dry_run: bool = True
    strategy: str = "ema_cross"  # ema_cross | rsi
    exchange_id: str = "binance"
    poll_seconds: float = 30.0
    max_open_trades: int = 3
    ema_fast: int = 9
    ema_slow: int = 21
    rsi_period: int = 14
    rsi_buy: float = 30.0
    rsi_sell: float = 70.0
    yahoo_fallback: bool = True


@dataclass
class Position:
    id: str
    pair: str
    side: str  # long
    amount: float
    entry: float
    stop: float
    take_profit: float
    opened_at: str
    status: str = "OPEN"
    exit_price: Optional[float] = None
    closed_at: Optional[str] = None
    realized_pnl: float = 0.0
    exit_reason: str = ""


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _ema(values: List[float], period: int) -> Optional[float]:
    if len(values) < period or period < 1:
        return None
    k = 2 / (period + 1)
    ema = sum(values[:period]) / period
    for v in values[period:]:
        ema = v * k + ema * (1 - k)
    return ema


def _rsi(values: List[float], period: int = 14) -> Optional[float]:
    if len(values) < period + 1:
        return None
    gains = []
    losses = []
    for i in range(1, len(values)):
        d = values[i] - values[i - 1]
        gains.append(max(d, 0.0))
        losses.append(max(-d, 0.0))
    # Wilder-style last window
    g = sum(gains[-period:]) / period
    l = sum(losses[-period:]) / period
    if l == 0:
        return 100.0
    rs = g / l
    return 100.0 - (100.0 / (1.0 + rs))


def yahoo_last(pair: str) -> Optional[float]:
    """Best-effort Yahoo quote for crypto pairs like BTC/USDT → BTC-USD."""
    try:
        import urllib.request

        base, quote = pair.split("/")
        # Map USDT → USD for Yahoo
        yq = "USD" if quote.upper() in ("USDT", "USD", "USDC") else quote.upper()
        sym = f"{base.upper()}-{yq}"
        url = (
            "https://query1.finance.yahoo.com/v8/finance/chart/"
            f"{sym}?interval=1m&range=1d"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "DGS-AI-Bot/1.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode())
        meta = data["chart"]["result"][0]["meta"]
        price = meta.get("regularMarketPrice") or meta.get("previousClose")
        return float(price) if price is not None else None
    except Exception:
        return None


def fetch_ohlcv_closes(
    exchange_id: str, pair: str, timeframe: str, limit: int = 60
) -> Tuple[List[float], str]:
    """Return closes + source tag. CCXT public first, Yahoo fallback for last only."""
    try:
        ex = build_exchange(exchange_id)
        if ex.has.get("fetchOHLCV"):
            rows = ex.fetch_ohlcv(pair, timeframe=timeframe, limit=limit)
            closes = [float(r[4]) for r in rows if r and r[4] is not None]
            try:
                ex.close()
            except Exception:
                pass
            if closes:
                return closes, f"ccxt:{exchange_id}"
        try:
            ex.close()
        except Exception:
            pass
    except Exception:
        pass
    # Fallback: single Yahoo last expanded as flat series (weak signal but dry-run safe)
    last = yahoo_last(pair)
    if last is not None:
        # fabricate mild series so RSI/EMA don't explode; strategy will mostly hold
        return [last * (1 + 0.0001 * ((i % 7) - 3)) for i in range(limit)], "yahoo"
    raise RuntimeError(f"No market data for {pair} via ccxt or yahoo")


def fetch_last(exchange_id: str, pair: str, yahoo_fallback: bool = True) -> Tuple[float, str]:
    try:
        t = fetch_ticker(exchange_id, pair)
        last = t.get("last")
        if last is not None:
            return float(last), f"ccxt:{exchange_id}"
    except Exception:
        pass
    if yahoo_fallback:
        y = yahoo_last(pair)
        if y is not None:
            return float(y), "yahoo"
    raise RuntimeError(f"Cannot price {pair}")


class DgsBot:
    def __init__(self, config: BotConfig):
        self.config = config
        self.running = False
        self.positions: List[Position] = []
        self.closed: List[Position] = []
        self.actions: List[Dict[str, Any]] = []
        self.wallet = float(config.budget)
        self.realized = 0.0
        self.started_at: Optional[str] = None
        self.last_tick: Optional[str] = None
        self.error: Optional[str] = None

    def _log(self, msg: str, **extra: Any) -> None:
        entry = {"ts": _now_iso(), "msg": msg, **extra}
        self.actions.append(entry)
        self.actions = self.actions[-40:]
        print(f"[{entry['ts']}] {msg}", flush=True)

    def open_positions(self) -> List[Position]:
        return [p for p in self.positions if p.status == "OPEN"]

    def unrealized(self, marks: Dict[str, float]) -> float:
        total = 0.0
        for p in self.open_positions():
            mark = marks.get(p.pair, p.entry)
            total += (mark - p.entry) * p.amount
        return total

    def signal(self, closes: List[float]) -> str:
        """Return buy | sell | hold."""
        cfg = self.config
        if cfg.strategy == "rsi":
            r = _rsi(closes, cfg.rsi_period)
            if r is None:
                return "hold"
            if r <= cfg.rsi_buy:
                return "buy"
            if r >= cfg.rsi_sell:
                return "sell"
            return "hold"
        # default EMA cross
        fast = _ema(closes, cfg.ema_fast)
        slow = _ema(closes, cfg.ema_slow)
        if fast is None or slow is None or len(closes) < cfg.ema_slow + 2:
            return "hold"
        prev_fast = _ema(closes[:-1], cfg.ema_fast)
        prev_slow = _ema(closes[:-1], cfg.ema_slow)
        if prev_fast is None or prev_slow is None:
            return "hold"
        # golden / death cross
        if prev_fast <= prev_slow and fast > slow:
            return "buy"
        if prev_fast >= prev_slow and fast < slow:
            return "sell"
        return "hold"

    def maybe_open(self, pair: str, price: float, source: str) -> None:
        cfg = self.config
        if len(self.open_positions()) >= cfg.max_open_trades:
            return
        if any(p.pair == pair for p in self.open_positions()):
            return
        stake = min(cfg.stake_amount, self.wallet * 0.95)
        if stake <= 0 or price <= 0:
            return
        amount = stake / price
        stop = price * (1.0 + cfg.stoploss)  # stoploss negative
        tp = price * (1.0 + cfg.take_profit)
        pos = Position(
            id=f"p-{uuid.uuid4().hex[:10]}",
            pair=pair,
            side="long",
            amount=amount,
            entry=price,
            stop=stop,
            take_profit=tp,
            opened_at=_now_iso(),
        )
        self.positions.append(pos)
        self.wallet -= stake
        mode = "DRY-RUN" if cfg.dry_run else "LIVE-FLAG"
        self._log(
            f"OPEN {pair} @ {price:.6g} stake={stake:.2f} [{mode}] src={source}",
            pair=pair,
            action="open",
            price=price,
        )

    def maybe_close(self, pos: Position, price: float, reason: str) -> None:
        pnl = (price - pos.entry) * pos.amount
        pos.status = "CLOSED"
        pos.exit_price = price
        pos.closed_at = _now_iso()
        pos.realized_pnl = pnl
        pos.exit_reason = reason
        self.wallet += pos.amount * price
        self.realized += pnl
        self.closed.append(pos)
        self._log(
            f"CLOSE {pos.pair} @ {price:.6g} pnl={pnl:.4f} reason={reason}",
            pair=pos.pair,
            action="close",
            price=price,
            pnl=pnl,
            reason=reason,
        )

    def manage_sl_tp(self, marks: Dict[str, float]) -> None:
        for pos in list(self.open_positions()):
            mark = marks.get(pos.pair)
            if mark is None:
                continue
            if mark <= pos.stop:
                self.maybe_close(pos, mark, "stoploss")
            elif mark >= pos.take_profit:
                self.maybe_close(pos, mark, "take_profit")

    def tick(self) -> None:
        cfg = self.config
        marks: Dict[str, float] = {}
        self.error = None
        for pair in cfg.pair_whitelist:
            try:
                closes, src = fetch_ohlcv_closes(cfg.exchange_id, pair, cfg.timeframe)
                last = closes[-1]
                marks[pair] = last
                sig = self.signal(closes)
                open_here = any(p.pair == pair for p in self.open_positions())
                if sig == "buy" and not open_here:
                    self.maybe_open(pair, last, src)
                elif sig == "sell" and open_here:
                    pos = next(p for p in self.open_positions() if p.pair == pair)
                    self.maybe_close(pos, last, "signal_sell")
            except Exception as exc:
                self.error = str(exc)
                self._log(f"tick error {pair}: {exc}", pair=pair, action="error")
                # still try last price for SL/TP
                try:
                    last, src = fetch_last(cfg.exchange_id, pair, cfg.yahoo_fallback)
                    marks[pair] = last
                except Exception:
                    pass
        self.manage_sl_tp(marks)
        self.last_tick = _now_iso()
        self.write_status(marks)

    def status_dict(self, marks: Optional[Dict[str, float]] = None) -> Dict[str, Any]:
        marks = marks or {}
        # refresh missing marks lightly
        for p in self.open_positions():
            if p.pair not in marks:
                try:
                    marks[p.pair], _ = fetch_last(
                        self.config.exchange_id, p.pair, self.config.yahoo_fallback
                    )
                except Exception:
                    marks[p.pair] = p.entry
        u = self.unrealized(marks)
        return {
            "running": self.running,
            "dry_run": self.config.dry_run,
            "disclaimer": DISCLAIMER,
            "started_at": self.started_at,
            "last_tick": self.last_tick,
            "exchange_id": self.config.exchange_id,
            "strategy": self.config.strategy,
            "timeframe": self.config.timeframe,
            "pair_whitelist": self.config.pair_whitelist,
            "stake_amount": self.config.stake_amount,
            "budget": self.config.budget,
            "stoploss": self.config.stoploss,
            "take_profit": self.config.take_profit,
            "wallet": round(self.wallet, 4),
            "realized_pnl": round(self.realized, 4),
            "unrealized_pnl": round(u, 4),
            "equity": round(self.wallet + sum(
                p.amount * marks.get(p.pair, p.entry) for p in self.open_positions()
            ), 4),
            "open_trades": [
                {
                    **asdict(p),
                    "mark": marks.get(p.pair, p.entry),
                    "unrealized": round(
                        (marks.get(p.pair, p.entry) - p.entry) * p.amount, 4
                    ),
                }
                for p in self.open_positions()
            ],
            "closed_trades": [asdict(p) for p in self.closed[-20:]],
            "last_actions": self.actions[-15:],
            "error": self.error,
            "popular_exchanges": [e["id"] for e in list_popular_exchanges()],
        }

    def write_status(self, marks: Optional[Dict[str, float]] = None) -> None:
        STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)
        STATUS_PATH.write_text(
            json.dumps(self.status_dict(marks), indent=2), encoding="utf-8"
        )

    def run_loop(self) -> None:
        self.running = True
        self.started_at = _now_iso()
        self._log(
            f"Bot start · dry_run={self.config.dry_run} · strategy={self.config.strategy} · "
            f"pairs={','.join(self.config.pair_whitelist)}"
        )
        self.write_status()
        try:
            while self.running:
                self.tick()
                time.sleep(max(5.0, float(self.config.poll_seconds)))
        finally:
            self.running = False
            self._log("Bot stopped")
            self.write_status()
            if PID_PATH.exists():
                try:
                    PID_PATH.unlink()
                except Exception:
                    pass


def load_config(path: Optional[Path], overrides: Dict[str, Any]) -> BotConfig:
    data: Dict[str, Any] = {}
    if path and path.exists():
        data.update(json.loads(path.read_text(encoding="utf-8")))
    data.update({k: v for k, v in overrides.items() if v is not None})
    # normalize pairs
    if isinstance(data.get("pair_whitelist"), str):
        data["pair_whitelist"] = [
            x.strip() for x in data["pair_whitelist"].split(",") if x.strip()
        ]
    cfg = BotConfig()
    for k, v in data.items():
        if hasattr(cfg, k):
            setattr(cfg, k, v)
    # budget alias
    if "budget" in data and "stake_amount" not in overrides:
        pass
    return cfg


def save_config(cfg: BotConfig, path: Path = DEFAULT_CONFIG_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(asdict(cfg), indent=2), encoding="utf-8")


def cmd_status(_: argparse.Namespace) -> int:
    if not STATUS_PATH.exists():
        print(json.dumps({"running": False, "note": "No status file yet", "disclaimer": DISCLAIMER}, indent=2))
        return 0
    print(STATUS_PATH.read_text(encoding="utf-8"))
    return 0


def cmd_stop(_: argparse.Namespace) -> int:
    if not PID_PATH.exists():
        # mark status stopped
        if STATUS_PATH.exists():
            try:
                data = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
                data["running"] = False
                data["last_actions"] = (data.get("last_actions") or []) + [
                    {"ts": _now_iso(), "msg": "Stop requested (no pid)"}
                ]
                STATUS_PATH.write_text(json.dumps(data, indent=2), encoding="utf-8")
            except Exception:
                pass
        print(json.dumps({"ok": True, "stopped": False, "note": "No running pid"}))
        return 0
    try:
        pid = int(PID_PATH.read_text().strip())
        os.kill(pid, signal.SIGTERM)
        print(json.dumps({"ok": True, "stopped": True, "pid": pid}))
    except ProcessLookupError:
        PID_PATH.unlink(missing_ok=True)
        print(json.dumps({"ok": True, "stopped": False, "note": "Stale pid cleared"}))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1
    return 0


def cmd_start(args: argparse.Namespace) -> int:
    overrides = {
        "stake_amount": args.stake_amount,
        "budget": args.budget,
        "stoploss": args.stoploss,
        "take_profit": args.take_profit,
        "timeframe": args.timeframe,
        "pair_whitelist": args.pairs,
        "dry_run": not args.live,
        "strategy": args.strategy,
        "exchange_id": args.exchange,
        "poll_seconds": args.poll,
        "max_open_trades": args.max_open,
    }
    cfg = load_config(Path(args.config) if args.config else DEFAULT_CONFIG_PATH, overrides)
    if args.live and cfg.dry_run is False:
        print(
            "WARNING: --live set. This runner still paper-simulates fills unless "
            "you wire create_order(--live) separately. Status dry_run=false.",
            file=sys.stderr,
        )
    save_config(cfg)
    STATUS_PATH.parent.mkdir(parents=True, exist_ok=True)

    if args.once:
        bot = DgsBot(cfg)
        bot.running = True
        bot.started_at = _now_iso()
        bot.tick()
        bot.running = False
        bot.write_status()
        print(STATUS_PATH.read_text(encoding="utf-8"))
        return 0

    if args.daemon:
        # simple fork-free background: write pid of current after re-exec note
        # User can nohup; here we just run foreground with pid file.
        pass

    bot = DgsBot(cfg)

    def _handle(sig, frame):  # noqa: ARG001
        bot.running = False

    signal.signal(signal.SIGTERM, _handle)
    signal.signal(signal.SIGINT, _handle)
    PID_PATH.write_text(str(os.getpid()), encoding="utf-8")
    bot.run_loop()
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(
        description="DGS AI managed bot (Freqtrade-inspired). Dry-run default. No guaranteed profit."
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    st = sub.add_parser("start", help="Start managed loop (dry-run default)")
    st.add_argument("--config", default=str(DEFAULT_CONFIG_PATH))
    st.add_argument("--exchange", default="binance")
    st.add_argument("--pairs", default="BTC/USDT,ETH/USDT,SOL/USDT")
    st.add_argument("--stake-amount", dest="stake_amount", type=float, default=100.0)
    st.add_argument("--budget", type=float, default=1000.0)
    st.add_argument("--stoploss", type=float, default=-0.05, help="Fraction e.g. -0.05")
    st.add_argument("--take-profit", dest="take_profit", type=float, default=0.08)
    st.add_argument("--timeframe", default="5m")
    st.add_argument("--strategy", choices=["ema_cross", "rsi"], default="ema_cross")
    st.add_argument("--poll", type=float, default=30.0)
    st.add_argument("--max-open", dest="max_open", type=int, default=3)
    st.add_argument("--once", action="store_true", help="Single tick then exit")
    st.add_argument("--daemon", action="store_true", help="Reserved; writes pid and runs")
    st.add_argument(
        "--live",
        action="store_true",
        help="Mark dry_run=false in status (still paper fills in this runner). Explicit opt-in.",
    )

    sub.add_parser("stop", help="Stop running bot via pid file")
    sub.add_parser("status", help="Print JSON status file")

    args = p.parse_args(argv)
    if args.cmd == "status":
        return cmd_status(args)
    if args.cmd == "stop":
        return cmd_stop(args)
    if args.cmd == "start":
        # normalize pairs string → list for load_config
        if isinstance(args.pairs, str):
            args.pairs = [x.strip() for x in args.pairs.split(",") if x.strip()]
        return cmd_start(args)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
