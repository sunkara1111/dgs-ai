#!/usr/bin/env python3
"""
DGS AI — CCXT exchange helper.

Public market data works without API keys (dry-run / paper path).
Mutating calls default to dry_run=True (simulate fills). Pass --live only
when keys are set and the operator explicitly wants a real request.

Educational use. Not financial advice. No guaranteed profit.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import uuid
from typing import Any, Dict, List, Optional

try:
    import ccxt
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "ccxt is not installed. Run: .venv/bin/pip install ccxt"
    ) from exc


# Curated popular spot-capable IDs exposed in the DGS AI UI.
POPULAR_EXCHANGES: List[str] = [
    "binance",
    "kraken",
    "coinbase",
    "kucoin",
    "bybit",
    "okx",
    "gate",
    "bitget",
    "mexc",
    "htx",
    "bitstamp",
    "gemini",
    "cryptocom",
    "bitfinex",
]


class ExchangeConfigError(RuntimeError):
    """Missing / invalid exchange id or credentials."""


class ExchangeAPIError(RuntimeError):
    """CCXT / network failure."""

    def __init__(self, message: str, *, body: Any = None):
        super().__init__(message)
        self.body = body


def list_popular_exchanges() -> List[Dict[str, Any]]:
    """Return popular exchanges that exist in this ccxt build."""
    available = set(ccxt.exchanges)
    out: List[Dict[str, Any]] = []
    for eid in POPULAR_EXCHANGES:
        if eid not in available:
            continue
        try:
            klass = getattr(ccxt, eid)
            name = getattr(klass, "name", eid) or eid
        except Exception:
            name = eid
        out.append({"id": eid, "name": name})
    return out


def list_all_exchange_ids() -> List[str]:
    return list(ccxt.exchanges)


def _resolve_class(exchange_id: str):
    eid = (exchange_id or "").strip().lower()
    if not eid:
        raise ExchangeConfigError("exchange_id is required")
    if not hasattr(ccxt, eid):
        raise ExchangeConfigError(
            f"Unknown exchange_id {exchange_id!r}. "
            f"Popular: {', '.join(e['id'] for e in list_popular_exchanges())}"
        )
    return getattr(ccxt, eid), eid


def build_exchange(
    exchange_id: str,
    apiKey: Optional[str] = None,
    secret: Optional[str] = None,
    password: Optional[str] = None,
    *,
    enable_rate_limit: bool = True,
) -> Any:
    """Instantiate a CCXT exchange. Keys optional for public endpoints."""
    klass, eid = _resolve_class(exchange_id)
    params: Dict[str, Any] = {"enableRateLimit": enable_rate_limit}
    if apiKey:
        params["apiKey"] = apiKey.strip()
    if secret:
        params["secret"] = secret.strip()
    if password:
        params["password"] = password.strip()
    try:
        return klass(params)
    except Exception as exc:
        raise ExchangeAPIError(f"Failed to build {eid}: {exc}") from exc


def test_connection(
    exchange_id: str,
    apiKey: Optional[str] = None,
    secret: Optional[str] = None,
    password: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Dry credential check: fetch_balance when keys provided; otherwise
    public fetch_ticker('BTC/USDT') to prove connectivity without keys.
    Never places orders.
    """
    ex = build_exchange(exchange_id, apiKey, secret, password)
    eid = getattr(ex, "id", exchange_id)
    result: Dict[str, Any] = {
        "ok": False,
        "exchange": eid,
        "mode": "public",
        "ts": time.time(),
    }
    has_keys = bool((apiKey or "").strip() and (secret or "").strip())
    try:
        if has_keys:
            # Balance fetch validates keys without trading.
            bal = ex.fetch_balance()
            totals = bal.get("total") or {}
            non_zero = {
                k: v
                for k, v in totals.items()
                if isinstance(v, (int, float)) and v and abs(v) > 0
            }
            # Cap keys shown for privacy
            sample = dict(list(non_zero.items())[:12])
            result.update(
                {
                    "ok": True,
                    "mode": "authenticated",
                    "balances_nonzero": sample,
                    "currencies_seen": len(totals),
                    "note": "Balance fetch succeeded (dry connection test — no orders).",
                }
            )
        else:
            ticker = ex.fetch_ticker("BTC/USDT")
            result.update(
                {
                    "ok": True,
                    "mode": "public",
                    "ticker": {
                        "symbol": ticker.get("symbol"),
                        "last": ticker.get("last"),
                        "bid": ticker.get("bid"),
                        "ask": ticker.get("ask"),
                    },
                    "note": "Public ticker OK — no API keys required for dry-run market data.",
                }
            )
    except Exception as exc:
        result["ok"] = False
        result["error"] = str(exc)
        raise ExchangeAPIError(f"test_connection failed for {eid}: {exc}", body=result) from exc
    finally:
        try:
            ex.close()
        except Exception:
            pass
    return result


def fetch_ticker(
    exchange_id: str,
    symbol: str,
    apiKey: Optional[str] = None,
    secret: Optional[str] = None,
    password: Optional[str] = None,
) -> Dict[str, Any]:
    """Public (or authenticated) ticker fetch."""
    ex = build_exchange(exchange_id, apiKey, secret, password)
    try:
        t = ex.fetch_ticker(symbol)
        return {
            "exchange": getattr(ex, "id", exchange_id),
            "symbol": t.get("symbol") or symbol,
            "last": t.get("last"),
            "bid": t.get("bid"),
            "ask": t.get("ask"),
            "high": t.get("high"),
            "low": t.get("low"),
            "percentage": t.get("percentage"),
            "quoteVolume": t.get("quoteVolume"),
            "timestamp": t.get("timestamp"),
            "datetime": t.get("datetime"),
            "info_keys": sorted((t.get("info") or {}).keys())[:20],
        }
    except Exception as exc:
        raise ExchangeAPIError(f"fetch_ticker failed: {exc}") from exc
    finally:
        try:
            ex.close()
        except Exception:
            pass


def create_order(
    exchange_id: str,
    symbol: str,
    side: str,
    amount: float,
    price: Optional[float] = None,
    order_type: str = "market",
    apiKey: Optional[str] = None,
    secret: Optional[str] = None,
    password: Optional[str] = None,
    *,
    dry_run: bool = True,
) -> Dict[str, Any]:
    """
    Place (or simulate) an order.
    dry_run=True (default): never hits the network for create_order; returns a
    simulated fill using public ticker last (or given price).
    dry_run=False / CLI --live: real create_order — requires keys.
    """
    side_l = (side or "").strip().lower()
    if side_l not in ("buy", "sell"):
        raise ExchangeConfigError("side must be buy or sell")
    if amount is None or float(amount) <= 0:
        raise ExchangeConfigError("amount must be > 0")

    if dry_run:
        last = price
        ticker_note = None
        try:
            tick = fetch_ticker(exchange_id, symbol)  # public path; keys unused
            last = last if last is not None else tick.get("last")
            ticker_note = tick
        except Exception as exc:
            ticker_note = {"error": str(exc)}
            if last is None:
                last = 0.0
        fill_price = float(last or 0.0)
        notional = fill_price * float(amount)
        return {
            "dry_run": True,
            "status": "simulated",
            "id": f"dry-{uuid.uuid4().hex[:12]}",
            "exchange": exchange_id,
            "symbol": symbol,
            "side": side_l,
            "type": order_type,
            "amount": float(amount),
            "price": fill_price,
            "cost": notional,
            "filled": float(amount),
            "timestamp": int(time.time() * 1000),
            "datetime": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "note": "SIMULATED fill — no order sent. Pass --live to place a real order.",
            "ticker": ticker_note,
        }

    # Live path
    if not ((apiKey or "").strip() and (secret or "").strip()):
        raise ExchangeConfigError("Live create_order requires apiKey and secret")
    ex = build_exchange(exchange_id, apiKey, secret, password)
    try:
        if order_type == "limit":
            if price is None:
                raise ExchangeConfigError("limit orders require --price")
            order = ex.create_order(symbol, "limit", side_l, float(amount), float(price))
        else:
            order = ex.create_order(symbol, "market", side_l, float(amount))
        return {
            "dry_run": False,
            "status": order.get("status") or "submitted",
            "id": order.get("id"),
            "exchange": getattr(ex, "id", exchange_id),
            "symbol": order.get("symbol") or symbol,
            "side": order.get("side") or side_l,
            "type": order.get("type") or order_type,
            "amount": order.get("amount"),
            "price": order.get("price") or order.get("average"),
            "cost": order.get("cost"),
            "filled": order.get("filled"),
            "raw": {k: order.get(k) for k in ("id", "status", "timestamp", "datetime")},
            "note": "LIVE order submitted via CCXT.",
        }
    except Exception as exc:
        raise ExchangeAPIError(f"create_order live failed: {exc}") from exc
    finally:
        try:
            ex.close()
        except Exception:
            pass


def _print(obj: Any) -> None:
    print(json.dumps(obj, indent=2, default=str))


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(
        description="DGS AI CCXT helper — dry-run default. Educational. No guaranteed profit."
    )
    p.add_argument(
        "--live",
        action="store_true",
        help="Allow real create_order (requires keys). Default is dry-run simulation.",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("list", help="List popular exchanges for the UI")

    t = sub.add_parser("test", help="Test connection (balance if keys, else public ticker)")
    t.add_argument("--exchange", required=True)
    t.add_argument("--apiKey", default="")
    t.add_argument("--secret", default="")
    t.add_argument("--password", default="")

    ft = sub.add_parser("ticker", help="Fetch ticker (public)")
    ft.add_argument("--exchange", default="binance")
    ft.add_argument("--symbol", default="BTC/USDT")

    o = sub.add_parser("order", help="Create order (dry-run default)")
    o.add_argument("--exchange", required=True)
    o.add_argument("--symbol", required=True)
    o.add_argument("--side", required=True, choices=["buy", "sell"])
    o.add_argument("--amount", type=float, required=True)
    o.add_argument("--price", type=float, default=None)
    o.add_argument("--type", dest="order_type", default="market", choices=["market", "limit"])
    o.add_argument("--apiKey", default="")
    o.add_argument("--secret", default="")
    o.add_argument("--password", default="")

    args = p.parse_args(argv)

    try:
        if args.cmd == "list":
            _print(
                {
                    "popular": list_popular_exchanges(),
                    "ccxt_version": getattr(ccxt, "__version__", "?"),
                    "note": "Public tickers work without keys. Dry-run is default.",
                }
            )
            return 0
        if args.cmd == "test":
            _print(
                test_connection(
                    args.exchange,
                    args.apiKey or None,
                    args.secret or None,
                    args.password or None,
                )
            )
            return 0
        if args.cmd == "ticker":
            _print(fetch_ticker(args.exchange, args.symbol))
            return 0
        if args.cmd == "order":
            dry = not args.live
            _print(
                create_order(
                    args.exchange,
                    args.symbol,
                    args.side,
                    args.amount,
                    price=args.price,
                    order_type=args.order_type,
                    apiKey=args.apiKey or None,
                    secret=args.secret or None,
                    password=args.password or None,
                    dry_run=dry,
                )
            )
            return 0
    except (ExchangeConfigError, ExchangeAPIError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, indent=2), file=sys.stderr)
        return 1
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
