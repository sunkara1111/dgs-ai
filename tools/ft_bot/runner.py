"""
Dry-run bot loop inspired by Freqtrade concepts:
  dry-run first, whitelist, stake/budget, stoploss, start/stop, persistence.
Uses CCXT for market data. Live create_order only when enable_live=True.
"""
from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .exchange import make_exchange, test_connection
from .strategy import decide

DEFAULT_STATE = Path(__file__).resolve().parents[1] / "out" / "ft_bot_state.json"


@dataclass
class OpenTrade:
    pair: str
    side: str
    amount: float
    open_rate: float
    stake: float
    stop_rate: float
    opened_at: str
    dry_run: bool = True


@dataclass
class BotState:
    running: bool = False
    dry_run: bool = True
    enable_live: bool = False
    exchange: str = "binance"
    stake_amount: float = 100.0
    stake_currency: str = "USDT"
    stoploss: float = -0.05
    max_open_trades: int = 3
    whitelist: list[str] = field(default_factory=lambda: ["BTC/USDT", "ETH/USDT", "SOL/USDT"])
    open_trades: list[dict[str, Any]] = field(default_factory=list)
    closed: list[dict[str, Any]] = field(default_factory=list)
    day_pnl: float = 0.0
    last_actions: list[str] = field(default_factory=list)
    updated_at: str = ""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_state(path: Path = DEFAULT_STATE) -> BotState:
    if not path.exists():
        return BotState()
    raw = json.loads(path.read_text())
    return BotState(**{k: v for k, v in raw.items() if k in BotState.__dataclass_fields__})


def save_state(state: BotState, path: Path = DEFAULT_STATE) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    state.updated_at = _now()
    path.write_text(json.dumps(asdict(state), indent=2))


def log_action(state: BotState, msg: str) -> None:
    line = f"{_now()} · {msg}"
    state.last_actions = [line, *state.last_actions][:20]
    print(line)


def _amount_for_stake(ex: Any, pair: str, stake: float, price: float) -> float:
    if price <= 0:
        return 0.0
    amt = stake / price
    try:
        return float(ex.amount_to_precision(pair, amt))
    except Exception:
        return round(amt, 6)


def manage_stops(state: BotState, tickers: dict[str, float]) -> None:
    keep: list[dict[str, Any]] = []
    for t in state.open_trades:
        last = tickers.get(t["pair"])
        if last is None:
            keep.append(t)
            continue
        hit = last <= t["stop_rate"] if t.get("side") == "long" else last >= t["stop_rate"]
        if hit:
            pnl = (last - t["open_rate"]) / t["open_rate"] * t["stake"]
            state.day_pnl += pnl
            state.closed.append({**t, "close_rate": last, "pnl": pnl, "reason": "stoploss", "closed_at": _now()})
            log_action(state, f"STOP {t['pair']} @ {last} pnl={pnl:.2f} ({'dry' if t.get('dry_run', True) else 'LIVE'})")
        else:
            keep.append(t)
    state.open_trades = keep


def run_once(
    state: BotState,
    *,
    api_key: str = "",
    secret: str = "",
    password: str = "",
) -> BotState:
    dry = not (state.enable_live and api_key and secret)
    state.dry_run = dry
    ex = make_exchange(state.exchange, api_key, secret, password, sandbox=False)
    ex.load_markets()

    tickers: dict[str, float] = {}
    for pair in state.whitelist:
        if pair not in ex.markets:
            log_action(state, f"skip {pair} — not on {ex.id}")
            continue
        t = ex.fetch_ticker(pair)
        last = float(t.get("last") or 0)
        tickers[pair] = last

    manage_stops(state, tickers)

    open_pairs = {t["pair"] for t in state.open_trades}
    for pair in state.whitelist:
        if pair not in tickers:
            continue
        ohlcv = ex.fetch_ohlcv(pair, timeframe="15m", limit=80)
        decision = decide(ohlcv, stoploss=state.stoploss)
        last = tickers[pair]

        # Exit
        if pair in open_pairs and decision["signal"] == "exit_long":
            trade = next(t for t in state.open_trades if t["pair"] == pair)
            pnl = (last - trade["open_rate"]) / trade["open_rate"] * trade["stake"]
            state.day_pnl += pnl
            state.open_trades = [t for t in state.open_trades if t["pair"] != pair]
            state.closed.append({**trade, "close_rate": last, "pnl": pnl, "reason": decision["reason"], "closed_at": _now()})
            if not dry and state.enable_live:
                amt = trade["amount"]
                try:
                    ex.create_order(pair, "market", "sell", amt)
                    log_action(state, f"LIVE EXIT {pair} @ {last}")
                except Exception as err:
                    log_action(state, f"LIVE EXIT FAILED {pair}: {err}")
            else:
                log_action(state, f"DRY EXIT {pair} @ {last} pnl={pnl:.2f} · {decision['reason']}")
            continue

        # Enter
        if (
            decision["signal"] == "enter_long"
            and pair not in open_pairs
            and len(state.open_trades) < state.max_open_trades
        ):
            stake = float(state.stake_amount)
            amt = _amount_for_stake(ex, pair, stake, last)
            if amt <= 0:
                continue
            stop_rate = last * (1.0 + float(state.stoploss))
            trade = OpenTrade(
                pair=pair,
                side="long",
                amount=amt,
                open_rate=last,
                stake=stake,
                stop_rate=stop_rate,
                opened_at=_now(),
                dry_run=dry,
            )
            if not dry and state.enable_live:
                try:
                    ex.create_order(pair, "market", "buy", amt)
                    trade.dry_run = False
                    log_action(state, f"LIVE ENTER {pair} amt={amt} @ {last}")
                except Exception as err:
                    log_action(state, f"LIVE ENTER FAILED {pair}: {err}")
                    continue
            else:
                log_action(state, f"DRY ENTER {pair} amt={amt} @ {last} stop={stop_rate:.4f} · {decision['reason']}")
            state.open_trades.append(asdict(trade))

    return state


def run_loop(
    state: BotState,
    *,
    api_key: str = "",
    secret: str = "",
    password: str = "",
    interval_sec: int = 60,
    ticks: int = 0,
    state_path: Path = DEFAULT_STATE,
) -> None:
    """ticks=0 means until stopped (Ctrl+C)."""
    state.running = True
    save_state(state, state_path)
    log_action(
        state,
        f"START exchange={state.exchange} dry_run={state.dry_run} enable_live={state.enable_live} "
        f"stake={state.stake_amount} stoploss={state.stoploss} whitelist={state.whitelist}",
    )
    save_state(state, state_path)
    n = 0
    try:
        while state.running:
            state = run_once(state, api_key=api_key, secret=secret, password=password)
            save_state(state, state_path)
            n += 1
            if ticks and n >= ticks:
                break
            time.sleep(max(5, interval_sec))
    except KeyboardInterrupt:
        log_action(state, "STOP (keyboard)")
    finally:
        state.running = False
        save_state(state, state_path)
