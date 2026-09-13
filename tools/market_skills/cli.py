#!/usr/bin/env python3
"""
DGS AI market skills CLI — quotes, technicals, fundamentals, options/Greeks,
bullish + PMCC scans, correlation/risk compare, markdown/PDF reports,
IBKR paper portfolio read + roll candidates + stop-loss (dry-run default).

Brand: DGS AI only. Yahoo-style data may be delayed ~15 minutes.
Not financial advice. No guaranteed profits.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

# Ensure repo root on path when run as script
_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from tools.market_skills import DISCLAIMER, __version__
from tools.market_skills.pdfutil import md_to_pdf
from tools.market_skills.whales import WhaleKeyMissing, whales_hunter

OUT_DIR = Path(__file__).resolve().parents[1] / "out"
DEFAULT_IB_PORT = 7497  # TWS paper; never default to live 7496


def _j(obj) -> None:
    print(json.dumps(obj, indent=2, default=str))


def _banner() -> str:
    return f"DGS AI market skills v{__version__} · {DISCLAIMER}"


def cmd_quote(args: argparse.Namespace) -> int:
    from trading_skills.quote import get_quote

    sym = args.ticker.upper()
    data = get_quote(sym)
    if "error" in data:
        # Fallback: last close from history when Yahoo crumb/info is rate-limited
        try:
            import yfinance as yf

            hist = yf.Ticker(sym).history(period="5d")
            if not hist.empty:
                last = float(hist["Close"].iloc[-1])
                prev = float(hist["Close"].iloc[-2]) if len(hist) > 1 else last
                chg = last - prev
                data = {
                    "symbol": sym,
                    "name": sym,
                    "price": round(last, 4),
                    "change": round(chg, 4),
                    "change_percent": round((chg / prev) * 100, 4) if prev else None,
                    "volume": int(hist["Volume"].iloc[-1]) if "Volume" in hist else None,
                    "source_fallback": "history_close",
                }
        except Exception as e:  # noqa: BLE001
            data = {"error": data.get("error"), "fallback_error": str(e), "symbol": sym}
    data["_meta"] = {
        "brand": "DGS AI",
        "data_note": "~15m delay possible (Yahoo-style)",
        "disclaimer": DISCLAIMER,
    }
    _j(data)
    return 0 if "error" not in data else 1


def cmd_technicals(args: argparse.Namespace) -> int:
    from trading_skills.technicals import compute_indicators

    data = compute_indicators(
        args.ticker.upper(),
        period=args.period,
        indicators=["rsi", "macd", "bb", "sma", "ema", "atr", "adx"],
    )
    data["_meta"] = {"brand": "DGS AI", "data_note": "~15m delay possible", "disclaimer": DISCLAIMER}
    _j(data)
    return 0 if "error" not in data else 1


def cmd_fundamentals(args: argparse.Namespace) -> int:
    from trading_skills.fundamentals import get_fundamentals

    data = get_fundamentals(args.ticker.upper(), data_type=args.type)
    data["_meta"] = {"brand": "DGS AI", "disclaimer": DISCLAIMER}
    _j(data)
    return 0


def cmd_options(args: argparse.Namespace) -> int:
    from trading_skills.greeks import calculate_greeks
    from trading_skills.options import get_expiries, get_option_chain
    from trading_skills.quote import get_quote

    sym = args.ticker.upper()
    expiries = get_expiries(sym)
    if not expiries:
        _j({"error": f"No option expiries for {sym}", "symbol": sym})
        return 1
    expiry = args.expiry or expiries[0]
    if expiry not in expiries:
        # pick nearest listed
        expiry = expiries[0]
    chain = get_option_chain(sym, expiry)
    if "error" in chain:
        _j(chain)
        return 1

    spot = chain.get("underlying_price") or get_quote(sym).get("price")
    calls = chain.get("calls") or []
    puts = chain.get("puts") or []

    def _atm(rows):
        if not rows or spot is None:
            return None
        return min(rows, key=lambda r: abs((r.get("strike") or 0) - spot))

    atm_call = _atm(calls)
    atm_put = _atm(puts)
    greeks = {}
    for label, row, otype in (("atm_call", atm_call, "call"), ("atm_put", atm_put, "put")):
        if not row or spot is None:
            continue
        mp = row.get("lastPrice") or row.get("ask") or row.get("bid")
        g = calculate_greeks(
            spot=float(spot),
            strike=float(row["strike"]),
            option_type=otype,
            expiry=expiry,
            market_price=float(mp) if mp else None,
            volatility=(float(row["impliedVolatility"]) / 100.0)
            if row.get("impliedVolatility")
            else None,
        )
        greeks[label] = g

    out = {
        "symbol": sym,
        "expiries_sample": expiries[:8],
        "selected_expiry": expiry,
        "underlying_price": spot,
        "chain_summary": {
            "n_calls": len(calls),
            "n_puts": len(puts),
            "atm_call": atm_call,
            "atm_put": atm_put,
        },
        "greeks_black_scholes": greeks,
        "_meta": {
            "brand": "DGS AI",
            "data_note": "Yahoo option chain; ~15m delay possible. Greeks via Black-Scholes.",
            "disclaimer": DISCLAIMER,
        },
    }
    _j(out)
    return 0


def cmd_scan(args: argparse.Namespace) -> int:
    from trading_skills.scanner_bullish import scan_symbols
    from trading_skills.scanner_pmcc import analyze_pmcc, format_scan_results

    tickers = [t.strip().upper() for t in args.tickers.replace(",", " ").split() if t.strip()]
    if not tickers:
        print("Provide tickers, e.g. scan AAPL,MSFT,NVDA", file=sys.stderr)
        return 2
    bullish = scan_symbols(tickers, top_n=args.top, period=args.period, workers=min(8, len(tickers)))
    pmcc_rows = []
    if args.pmcc:
        for row in bullish[: max(3, min(5, len(bullish)))]:
            try:
                pmcc_rows.append(analyze_pmcc(row["symbol"]))
            except Exception as e:  # noqa: BLE001
                pmcc_rows.append({"symbol": row.get("symbol"), "error": str(e)})
    out = {
        "bullish": bullish,
        "pmcc": format_scan_results(pmcc_rows) if pmcc_rows else None,
        "_meta": {"brand": "DGS AI", "disclaimer": DISCLAIMER, "data_note": "~15m delay possible"},
    }
    _j(out)
    return 0


def cmd_risk_compare(args: argparse.Namespace) -> int:
    from trading_skills.correlation import compute_correlation
    from trading_skills.risk import calculate_risk_metrics

    a, b = args.a.upper(), args.b.upper()
    ra = calculate_risk_metrics(a, period=args.period)
    rb = calculate_risk_metrics(b, period=args.period)
    corr = compute_correlation([a, b], period=args.period)
    out = {
        "a": ra,
        "b": rb,
        "correlation": corr,
        "_meta": {"brand": "DGS AI", "disclaimer": DISCLAIMER},
    }
    _j(out)
    return 0


def _report_markdown(data: dict) -> str:
    sym = data.get("symbol", "?")
    rec = data.get("recommendation") or {}
    company = data.get("company") or {}
    trend = data.get("trend_analysis") or {}
    fund = data.get("fundamentals") or {}
    pmcc = data.get("pmcc_analysis") or {}
    lines = [
        f"# DGS AI report — {sym}",
        "",
        f"Generated: {data.get('generated', datetime.now().strftime('%Y-%m-%d %H:%M'))}",
        "",
        f"**{DISCLAIMER}**",
        "",
        "## Company",
        f"- Name: {company.get('name')}",
        f"- Sector: {company.get('sector')} / {company.get('industry')}",
        f"- Market cap: {company.get('market_cap')}",
        f"- Beta: {company.get('beta')}",
        "",
        "## Recommendation (model heuristic — not advice)",
        f"- Action: {rec.get('action')}",
        f"- Score: {rec.get('score')}",
        f"- Summary: {rec.get('summary') or rec.get('rationale') or ''}",
        "",
        "## Trend / technicals",
        f"- Bullish score: {trend.get('bullish_score')}",
        f"- Price: {trend.get('price')}",
        f"- RSI: {trend.get('rsi')}",
        f"- MACD: {trend.get('macd')} / signal {trend.get('macd_signal')}",
        f"- ADX: {trend.get('adx')}",
        f"- Next earnings: {trend.get('next_earnings')}",
        "",
        "## Fundamentals (snapshot)",
        f"- Trailing PE: {(fund.get('valuation') or {}).get('trailing_pe')}",
        f"- Forward PE: {(fund.get('valuation') or {}).get('forward_pe')}",
        f"- Profit margin: {(fund.get('profitability') or {}).get('profit_margin')}",
        f"- ROE: {(fund.get('profitability') or {}).get('roe')}",
        "",
        "## PMCC scan snippet",
        f"- PMCC score: {pmcc.get('pmcc_score')} / {pmcc.get('max_pmcc_score')}",
        f"- IV %: {pmcc.get('iv_pct')}",
        "",
        "---",
        "_DGS AI · Yahoo-style data may be delayed ~15 minutes._",
    ]
    return "\n".join(lines) + "\n"


def cmd_report(args: argparse.Namespace) -> int:
    from trading_skills.report import generate_report_data

    sym = args.ticker.upper()
    data = generate_report_data(sym)
    if "error" in data:
        _j(data)
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M")
    md_path = OUT_DIR / f"DGS_AI_{sym}_report_{stamp}.md"
    pdf_path = OUT_DIR / f"DGS_AI_{sym}_report_{stamp}.pdf"
    md = _report_markdown(data)
    md_path.write_text(md, encoding="utf-8")
    try:
        md_to_pdf(md, pdf_path)
        pdf_ok = str(pdf_path)
    except Exception as e:  # noqa: BLE001
        pdf_ok = None
        print(f"PDF generation skipped: {e}", file=sys.stderr)
    out = {
        "symbol": sym,
        "markdown": str(md_path),
        "pdf": pdf_ok,
        "data": data,
        "_meta": {"brand": "DGS AI", "disclaimer": DISCLAIMER},
    }
    _j(out)
    return 0


def cmd_whales(args: argparse.Namespace) -> int:
    try:
        whales_hunter(args.ticker.upper())
    except WhaleKeyMissing as e:
        _j({"error": str(e), "stub": True, "symbol": args.ticker.upper()})
        return 2
    return 0


def _ib_port(args: argparse.Namespace) -> int:
    return int(getattr(args, "port", None) or DEFAULT_IB_PORT)


def cmd_ib_status(args: argparse.Namespace) -> int:
    port = _ib_port(args)
    try:
        from ib_async import IB

        ib = IB()
        ib.connect("127.0.0.1", port, clientId=90, timeout=4)
        accts = ib.managedAccounts()
        ib.disconnect()
        _j(
            {
                "connected": True,
                "host": "127.0.0.1",
                "port": port,
                "accounts": accts,
                "mode": "paper" if port == 7497 else ("live" if port == 7496 else "custom"),
                "_meta": {"brand": "DGS AI", "disclaimer": DISCLAIMER},
            }
        )
        return 0
    except Exception as e:  # noqa: BLE001
        _j(
            {
                "connected": False,
                "host": "127.0.0.1",
                "port": port,
                "message": (
                    f"TWS / IB Gateway not reachable on 127.0.0.1:{port}. "
                    "Start paper TWS (API enabled) for IBKR portfolio features. "
                    f"Detail: {e}"
                ),
                "_meta": {"brand": "DGS AI"},
            }
        )
        return 1


def cmd_ib_positions(args: argparse.Namespace) -> int:
    from trading_skills.broker.portfolio import get_portfolio
    from trading_skills.broker.roll import find_roll_candidates

    port = _ib_port(args)

    async def _run():
        portfolio = await get_portfolio(port=port, account=args.account, all_accounts=args.all_accounts)
        rolls = []
        if args.rolls and portfolio.get("connected") and not portfolio.get("error"):
            symbols = sorted(
                {
                    p.get("symbol")
                    for p in (portfolio.get("positions") or [])
                    if p.get("symbol") and p.get("sec_type") in ("OPT", "STK", "FOP")
                }
            )[:8]
            for sym in symbols:
                try:
                    rolls.append(await find_roll_candidates(sym, port=port, account=args.account))
                except Exception as e:  # noqa: BLE001
                    rolls.append({"symbol": sym, "error": str(e)})
        return portfolio, rolls

    try:
        portfolio, rolls = asyncio.run(_run())
    except Exception as e:  # noqa: BLE001
        _j(
            {
                "connected": False,
                "port": port,
                "message": (
                    f"Could not read IBKR portfolio on 127.0.0.1:{port}. "
                    f"Is paper TWS running with API enabled? Detail: {e}"
                ),
            }
        )
        return 1

    if isinstance(portfolio, dict) and portfolio.get("error") and not portfolio.get("connected"):
        pass
    out = {
        "portfolio": portfolio,
        "roll_candidates": rolls if args.rolls else None,
        "port": port,
        "_meta": {
            "brand": "DGS AI",
            "note": "Read-only portfolio + optional roll candidates. Paper port 7497 default.",
            "disclaimer": DISCLAIMER,
        },
    }
    _j(out)
    return 0 if not (isinstance(portfolio, dict) and portfolio.get("error") and portfolio.get("connected") is False) else 1


def cmd_ib_stop_loss(args: argparse.Namespace) -> int:
    from trading_skills.broker.stop_loss import get_stop_loss_data

    port = _ib_port(args)
    execute = bool(args.execute)
    dry_run = not execute
    if execute:
        print(
            "WARNING: --execute requested. This can place/cancel IB stop-loss orders. "
            "Proceeding only because flag was explicit.",
            file=sys.stderr,
        )

    async def _run():
        return await get_stop_loss_data(
            port=port,
            account=args.account,
            symbols=[s.strip().upper() for s in (args.symbols or "").split(",") if s.strip()] or None,
            stop_pct=args.stop_pct,
            dry_run=dry_run,
        )

    try:
        data = asyncio.run(_run())
    except Exception as e:  # noqa: BLE001
        _j(
            {
                "connected": False,
                "dry_run": dry_run,
                "port": port,
                "message": (
                    f"IB stop-loss unavailable on 127.0.0.1:{port}. "
                    f"Start paper TWS or omit --execute. Detail: {e}"
                ),
            }
        )
        return 1

    if isinstance(data, dict):
        data.setdefault("dry_run", dry_run)
        data["_meta"] = {
            "brand": "DGS AI",
            "execute": execute,
            "note": "Dry-run is the default. Pass --execute only when you intend live paper/live order changes.",
            "disclaimer": DISCLAIMER,
        }
    _j(data)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="dgs-market",
        description=_banner(),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python -m tools.market_skills quote AAPL\n"
            "  python -m tools.market_skills technicals NVDA\n"
            "  python -m tools.market_skills options SPY\n"
            "  python -m tools.market_skills scan AAPL,MSFT,NVDA --pmcc\n"
            "  python -m tools.market_skills risk-compare AAPL MSFT\n"
            "  python -m tools.market_skills report AAPL\n"
            "  python -m tools.market_skills ib-status\n"
            "  python -m tools.market_skills ib-positions --rolls\n"
            "  python -m tools.market_skills ib-stop-loss          # dry-run\n"
            "  python -m tools.market_skills ib-stop-loss --execute  # explicit only\n"
        ),
    )
    p.add_argument("--version", action="version", version=f"DGS AI market skills {__version__}")
    sub = p.add_subparsers(dest="cmd", required=True)

    q = sub.add_parser("quote", help="Yahoo-style quote (~15m delay possible)")
    q.add_argument("ticker")
    q.set_defaults(func=cmd_quote)

    t = sub.add_parser("technicals", help="RSI/MACD/Bollinger/SMA/EMA/ATR/ADX")
    t.add_argument("ticker")
    t.add_argument("--period", default="3mo")
    t.set_defaults(func=cmd_technicals)

    f = sub.add_parser("fundamentals", help="Company fundamentals snapshot")
    f.add_argument("ticker")
    f.add_argument("--type", default="all", choices=["all", "info", "financials", "earnings"])
    f.set_defaults(func=cmd_fundamentals)

    o = sub.add_parser("options", help="Option chain summary + Black-Scholes Greeks")
    o.add_argument("ticker")
    o.add_argument("--expiry", default=None, help="YYYY-MM-DD (default: nearest listed)")
    o.set_defaults(func=cmd_options)

    s = sub.add_parser("scan", help="Bullish trend scan (+ optional PMCC)")
    s.add_argument("tickers", help="Comma or space separated tickers")
    s.add_argument("--top", type=int, default=10)
    s.add_argument("--period", default="3mo")
    s.add_argument("--pmcc", action="store_true", help="Also run PMCC suitability on top names")
    s.set_defaults(func=cmd_scan)

    r = sub.add_parser("risk-compare", help="Risk metrics + correlation for two symbols")
    r.add_argument("a")
    r.add_argument("b")
    r.add_argument("--period", default="1y")
    r.set_defaults(func=cmd_risk_compare)

    rep = sub.add_parser("report", help="Full markdown+PDF report under tools/out/")
    rep.add_argument("ticker")
    rep.set_defaults(func=cmd_report)

    w = sub.add_parser("whales", help="Massive/Polygon whale stub (needs MASSIVE_API_KEY)")
    w.add_argument("ticker")
    w.set_defaults(func=cmd_whales)

    ibs = sub.add_parser("ib-status", help="Check TWS/IB Gateway on 127.0.0.1:7497 (paper)")
    ibs.add_argument("--port", type=int, default=DEFAULT_IB_PORT)
    ibs.set_defaults(func=cmd_ib_status)

    ibp = sub.add_parser("ib-positions", help="IBKR portfolio read (+ optional roll candidates)")
    ibp.add_argument("--port", type=int, default=DEFAULT_IB_PORT)
    ibp.add_argument("--account", default=None)
    ibp.add_argument("--all-accounts", action="store_true")
    ibp.add_argument("--rolls", action="store_true", help="Include roll candidates for held symbols")
    ibp.set_defaults(func=cmd_ib_positions)

    ibsl = sub.add_parser(
        "ib-stop-loss",
        help="IB stop-loss analysis (DRY-RUN default; pass --execute to place)",
    )
    ibsl.add_argument("--port", type=int, default=DEFAULT_IB_PORT)
    ibsl.add_argument("--account", default=None)
    ibsl.add_argument("--symbols", default="", help="Comma-separated filter")
    ibsl.add_argument("--stop-pct", type=float, default=40.0)
    ibsl.add_argument(
        "--execute",
        action="store_true",
        help="Actually place/cancel SL orders. Default is dry-run (no orders).",
    )
    ibsl.set_defaults(func=cmd_ib_stop_loss)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return int(args.func(args) or 0)
    except KeyboardInterrupt:
        print("Interrupted", file=sys.stderr)
        return 130


if __name__ == "__main__":
    raise SystemExit(main())
