"""CCXT exchange factory — https://github.com/ccxt/ccxt"""
from __future__ import annotations

import sys
from typing import Any

# Prefer installed ccxt over a bare /workspace/ccxt namespace folder if present.
sys.path = [p for p in sys.path if p.rstrip("/") != "/workspace/ccxt"]

import ccxt  # noqa: E402


# Primary picks for DGS AI Connect UI. CoinSwitch is NOT in CCXT — use tools/coinswitch_client.py.
SUPPORTED = [
    "binance",
    "okx",
    "bybit",
    "gate",
    "kraken",
    "kucoin",
    "bitget",
    "mexc",
    "coinbase",
    "alpaca",
]


def list_exchanges() -> list[str]:
    return [e for e in SUPPORTED if e in ccxt.exchanges]


def make_exchange(
    exchange_id: str,
    api_key: str = "",
    secret: str = "",
    password: str = "",
    *,
    sandbox: bool = False,
) -> Any:
    eid = (exchange_id or "").strip().lower()
    if eid == "coinswitch":
        raise ValueError(
            "CoinSwitch is not in CCXT. Use tools/coinswitch_client.py or the India CoinSwitch panel."
        )
    if eid not in ccxt.exchanges:
        raise ValueError(f"Unknown exchange '{eid}'. Known picks: {', '.join(list_exchanges())}")
    klass = getattr(ccxt, eid)
    params: dict[str, Any] = {
        "apiKey": api_key or "",
        "secret": secret or "",
        "enableRateLimit": True,
        "options": {"defaultType": "spot"},
    }
    if password:
        params["password"] = password
    ex = klass(params)
    if sandbox and hasattr(ex, "set_sandbox_mode"):
        try:
            ex.set_sandbox_mode(True)
        except Exception:
            pass
    return ex


def test_connection(ex: Any, with_private: bool = False) -> dict[str, Any]:
    """Public load_markets + optional fetch_balance. Never places orders."""
    markets = ex.load_markets()
    out: dict[str, Any] = {
        "exchange": ex.id,
        "markets": len(markets),
        "has": {
            "fetchTicker": bool(ex.has.get("fetchTicker")),
            "createOrder": bool(ex.has.get("createOrder")),
            "fetchBalance": bool(ex.has.get("fetchBalance")),
        },
    }
    symbol = "BTC/USDT" if "BTC/USDT" in markets else (next(iter(markets)) if markets else None)
    if symbol and ex.has.get("fetchTicker"):
        t = ex.fetch_ticker(symbol)
        out["sample_ticker"] = {
            "symbol": symbol,
            "last": t.get("last"),
            "bid": t.get("bid"),
            "ask": t.get("ask"),
        }
    if with_private and (ex.apiKey or ex.secret):
        if not ex.has.get("fetchBalance"):
            out["balance"] = "fetchBalance not supported"
        else:
            bal = ex.fetch_balance()
            total = {k: v for k, v in (bal.get("total") or {}).items() if v}
            out["balance_nonzero"] = dict(list(total.items())[:12])
    else:
        out["balance"] = "skipped (public test) — pass --private to check keys"
    return out
