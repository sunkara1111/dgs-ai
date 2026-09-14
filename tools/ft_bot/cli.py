"""CLI: test-connection | run | status | exchanges — dry-run default."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from .exchange import list_exchanges, make_exchange, test_connection
from .runner import DEFAULT_STATE, BotState, load_state, run_loop, save_state


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default) or default


def cmd_exchanges(_: argparse.Namespace) -> int:
    print("CCXT exchanges supported in DGS AI Connect:")
    for e in list_exchanges():
        print(f"  - {e}")
    print("CoinSwitch: not in CCXT — use tools/coinswitch_client.py")
    return 0


def cmd_test(args: argparse.Namespace) -> int:
    key = args.key or _env("CCXT_API_KEY") or _env("DGS_CCXT_KEY")
    secret = args.secret or _env("CCXT_SECRET") or _env("DGS_CCXT_SECRET")
    password = args.password or _env("CCXT_PASSWORD") or _env("DGS_CCXT_PASSWORD")
    try:
        ex = make_exchange(args.exchange, key, secret, password, sandbox=args.sandbox)
        result = test_connection(ex, with_private=bool(args.private and key and secret))
    except Exception as err:
        print(json.dumps({
            "ok": False,
            "exchange": args.exchange,
            "error": str(err),
            "hint": "Some exchanges geo-block this host (e.g. Binance 451). Try kraken, okx, gate, or kucoin.",
        }, indent=2))
        return 1
    print(json.dumps(result, indent=2, default=str))
    print("OK · no orders placed · dry connection test")
    return 0


def cmd_status(_: argparse.Namespace) -> int:
    st = load_state()
    print(json.dumps({
        "running": st.running,
        "dry_run": st.dry_run,
        "enable_live": st.enable_live,
        "exchange": st.exchange,
        "stake_amount": st.stake_amount,
        "stoploss": st.stoploss,
        "whitelist": st.whitelist,
        "open_trades": st.open_trades,
        "day_pnl": st.day_pnl,
        "last_actions": st.last_actions[:5],
        "updated_at": st.updated_at,
        "state_file": str(DEFAULT_STATE),
    }, indent=2))
    return 0


def cmd_run(args: argparse.Namespace) -> int:
    st = load_state()
    st.exchange = args.exchange or st.exchange
    st.stake_amount = float(args.stake if args.stake is not None else st.stake_amount)
    st.stoploss = float(args.stoploss if args.stoploss is not None else st.stoploss)
    st.max_open_trades = int(args.max_open_trades if args.max_open_trades is not None else st.max_open_trades)
    if args.whitelist:
        st.whitelist = [p.strip().upper().replace("-", "/") for p in args.whitelist.split(",") if p.strip()]
    # Live only with explicit flag — Freqtrade dry-run first pattern
    st.enable_live = bool(args.enable_live)
    st.dry_run = not st.enable_live
    if st.enable_live and not args.i_understand_live:
        print("Refusing live: pass --enable-live AND --i-understand-live. Default is dry-run.", file=sys.stderr)
        return 2
    key = args.key or _env("CCXT_API_KEY") or _env("DGS_CCXT_KEY")
    secret = args.secret or _env("CCXT_SECRET") or _env("DGS_CCXT_SECRET")
    password = args.password or _env("CCXT_PASSWORD") or _env("DGS_CCXT_PASSWORD")
    if st.enable_live and (not key or not secret):
        print("Live mode needs API key/secret via flags or CCXT_API_KEY / CCXT_SECRET env.", file=sys.stderr)
        return 2
    save_state(st)
    run_loop(
        st,
        api_key=key,
        secret=secret,
        password=password,
        interval_sec=int(args.interval),
        ticks=int(args.ticks),
        state_path=DEFAULT_STATE,
    )
    return 0


def cmd_stop(_: argparse.Namespace) -> int:
    st = load_state()
    st.running = False
    save_state(st)
    print("Marked running=false in", DEFAULT_STATE)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m tools.ft_bot",
        description="DGS AI CCXT bot (Freqtrade concepts, dry-run default). Not a Freqtrade fork.",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    pe = sub.add_parser("exchanges", help="List supported CCXT exchange ids")
    pe.set_defaults(func=cmd_exchanges)

    pt = sub.add_parser("test-connection", help="Public (and optional private) CCXT connectivity test")
    pt.add_argument("--exchange", "-e", default="binance")
    pt.add_argument("--key", default="")
    pt.add_argument("--secret", default="")
    pt.add_argument("--password", default="", help="Passphrase for OKX / KuCoin if required")
    pt.add_argument("--private", action="store_true", help="Also fetch_balance (needs keys)")
    pt.add_argument("--sandbox", action="store_true")
    pt.set_defaults(func=cmd_test)

    ps = sub.add_parser("status", help="Show persisted bot state")
    ps.set_defaults(func=cmd_status)

    pr = sub.add_parser("run", help="Start bot loop (dry-run unless --enable-live)")
    pr.add_argument("--exchange", "-e", default="binance")
    pr.add_argument("--key", default="")
    pr.add_argument("--secret", default="")
    pr.add_argument("--password", default="")
    pr.add_argument("--stake", type=float, default=None, help="Stake amount per trade (budget slice)")
    pr.add_argument("--stoploss", type=float, default=None, help="Negative fraction, e.g. -0.05")
    pr.add_argument("--whitelist", default="", help="Comma pairs BTC/USDT,ETH/USDT")
    pr.add_argument("--max-open-trades", type=int, default=None)
    pr.add_argument("--interval", type=int, default=60)
    pr.add_argument("--ticks", type=int, default=1, help="Loop iterations (0=forever). Default 1 for safe demo.")
    pr.add_argument("--enable-live", action="store_true", help="Allow real create_order (dangerous)")
    pr.add_argument("--i-understand-live", action="store_true")
    pr.set_defaults(func=cmd_run)

    px = sub.add_parser("stop", help="Mark persisted state as not running")
    px.set_defaults(func=cmd_stop)
    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return int(args.func(args) or 0)


if __name__ == "__main__":
    raise SystemExit(main())
