#!/usr/bin/env python3
"""
CoinSwitch PRO Spot trading helper (Ed25519).

Reads COINSWITCH_API_KEY + COINSWITCH_SECRET_KEY from the environment.
Signs requests per https://api-trading.coinswitch.co (X-AUTH-* headers, epoch ms).
Dry-run is the default for mutating CLI commands; pass --live only when keys are set
and the operator explicitly wants a real request.

No secrets are logged or committed. Do not place live orders unless --live is set.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.parse
import uuid
from typing import Any, Dict, Optional

import requests
from cryptography.hazmat.primitives.asymmetric import ed25519

BASE_URL = "https://coinswitch.co"

# Spot v2 paths
PATH_PING = "/trade/api/v2/ping"
PATH_VALIDATE = "/trade/api/v2/validate/keys"
PATH_TIME = "/trade/api/v2/time"
PATH_ORDER = "/trade/api/v2/order"
PATH_ORDERS = "/trade/api/v2/orders"


class CoinSwitchConfigError(RuntimeError):
    """Missing or invalid API credentials."""


class CoinSwitchAPIError(RuntimeError):
    """Non-success HTTP / API response."""

    def __init__(self, message: str, status_code: Optional[int] = None, body: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


def _require_keys() -> tuple[str, str]:
    api_key = (os.environ.get("COINSWITCH_API_KEY") or "").strip()
    secret_key = (os.environ.get("COINSWITCH_SECRET_KEY") or "").strip()
    missing = []
    if not api_key:
        missing.append("COINSWITCH_API_KEY")
    if not secret_key:
        missing.append("COINSWITCH_SECRET_KEY")
    if missing:
        raise CoinSwitchConfigError(
            "Missing required env secret(s): "
            + ", ".join(missing)
            + ". Set them in the environment before calling this tool."
        )
    try:
        bytes.fromhex(secret_key)
    except ValueError as exc:
        raise CoinSwitchConfigError(
            "COINSWITCH_SECRET_KEY must be a hex-encoded Ed25519 seed."
        ) from exc
    return api_key, secret_key


def sign_request(
    method: str,
    path: str,
    params: Optional[Dict[str, Any]] = None,
    *,
    api_key: Optional[str] = None,
    secret_key: Optional[str] = None,
) -> tuple[Dict[str, str], str]:
    """
    Build X-AUTH headers and URL-decoded path for an authenticated request.

    signed_message = METHOD + url_decoded(path_with_query) + epoch_ms
    """
    if api_key is None or secret_key is None:
        api_key, secret_key = _require_keys()

    method = method.upper()
    if params:
        # stringify values for urlencode
        str_params = {k: str(v) for k, v in params.items() if v is not None}
        sep = "&" if "?" in path else "?"
        path = path + sep + urllib.parse.urlencode(str_params)

    decoded_path = urllib.parse.unquote_plus(path)
    epoch = str(int(time.time() * 1000))
    message = method + decoded_path + epoch

    secret = ed25519.Ed25519PrivateKey.from_private_bytes(bytes.fromhex(secret_key))
    signature = secret.sign(message.encode("utf-8")).hex()

    headers = {
        "Content-Type": "application/json",
        "X-AUTH-APIKEY": api_key,
        "X-AUTH-SIGNATURE": signature,
        "X-AUTH-EPOCH": epoch,
    }
    return headers, decoded_path


class CoinSwitchClient:
    """Thin Spot REST client. Mutating methods respect dry_run."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        *,
        base_url: str = BASE_URL,
        dry_run: bool = True,
        timeout: float = 30.0,
        require_keys: bool = True,
    ):
        if api_key is None and secret_key is None and not require_keys:
            api_key, secret_key = "", ""
        elif api_key is None or secret_key is None:
            api_key, secret_key = _require_keys()
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url.rstrip("/")
        self.dry_run = dry_run
        self.timeout = timeout
        self.session = requests.Session()

    def _sign(self, method: str, path: str, params: Optional[Dict[str, Any]] = None):
        return sign_request(
            method, path, params, api_key=self.api_key, secret_key=self.secret_key
        )

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: Optional[Dict[str, Any]] = None,
        body: Optional[Dict[str, Any]] = None,
        auth: bool = True,
        allow_dry_run_skip: bool = False,
    ) -> Dict[str, Any]:
        method = method.upper()
        if allow_dry_run_skip and self.dry_run:
            return {
                "dry_run": True,
                "would_request": {
                    "method": method,
                    "url": self.base_url + path,
                    "params": params,
                    "body": body,
                },
            }

        headers: Dict[str, str] = {"Content-Type": "application/json"}
        final_path = path
        if auth:
            headers, final_path = self._sign(method, path, params)
            params = None  # already baked into final_path
        elif params:
            # unauthenticated with query string
            sep = "&" if "?" in path else "?"
            final_path = path + sep + urllib.parse.urlencode(
                {k: str(v) for k, v in params.items() if v is not None}
            )
            params = None

        url = self.base_url + final_path
        resp = self.session.request(
            method,
            url,
            headers=headers,
            json=body if body is not None else None,
            timeout=self.timeout,
        )
        try:
            data = resp.json()
        except ValueError:
            data = {"raw": resp.text}

        if not resp.ok:
            raise CoinSwitchAPIError(
                f"CoinSwitch API {method} {final_path} failed: HTTP {resp.status_code}",
                status_code=resp.status_code,
                body=data,
            )
        return data if isinstance(data, dict) else {"data": data}

    # --- Safe / read helpers ---

    def server_time(self) -> Dict[str, Any]:
        """Unauthenticated GET /trade/api/v2/time."""
        return self._request("GET", PATH_TIME, auth=False)

    def ping(self) -> Dict[str, Any]:
        """Authenticated GET /trade/api/v2/ping (falls back to validate_keys)."""
        try:
            return self._request("GET", PATH_PING, auth=True)
        except CoinSwitchAPIError as exc:
            if exc.status_code in (404, 405):
                return self.validate_keys()
            raise

    def validate_keys(self) -> Dict[str, Any]:
        """Authenticated GET /trade/api/v2/validate/keys."""
        return self._request("GET", PATH_VALIDATE, auth=True)

    def status(self) -> Dict[str, Any]:
        """
        Health check: require keys, then validate (and best-effort ping/time).
        """
        out: Dict[str, Any] = {"keys_present": True, "base_url": self.base_url}
        try:
            out["server_time"] = self.server_time()
        except Exception as exc:  # noqa: BLE001 — report, don't hide
            out["server_time_error"] = str(exc)
        out["validate_keys"] = self.validate_keys()
        try:
            out["ping"] = self._request("GET", PATH_PING, auth=True)
        except CoinSwitchAPIError as exc:
            out["ping"] = {"skipped_or_error": str(exc), "status_code": exc.status_code}
        return out

    # --- Orders ---

    def create_limit_order(
        self,
        side: str,
        symbol: str,
        price: float,
        quantity: float,
        exchange: str,
        *,
        client_order_id: Optional[str] = None,
        expiry_period: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        POST /trade/api/v2/order — limit only.
        Dry-run returns the payload that would be sent (no network).
        """
        side_l = side.strip().lower()
        if side_l not in ("buy", "sell"):
            raise ValueError("side must be 'buy' or 'sell'")
        body: Dict[str, Any] = {
            "side": side_l,
            "symbol": symbol,
            "type": "limit",
            "price": float(price),
            "quantity": float(quantity),
            "exchange": exchange,
            "client_order_id": client_order_id or str(uuid.uuid4()),
        }
        if expiry_period is not None:
            body["expiry_period"] = int(expiry_period)

        if self.dry_run:
            return {
                "dry_run": True,
                "would_request": {
                    "method": "POST",
                    "path": PATH_ORDER,
                    "url": self.base_url + PATH_ORDER,
                    "body": body,
                },
            }
        return self._request("POST", PATH_ORDER, body=body, auth=True)

    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """DELETE /trade/api/v2/order with {"order_id": ...}."""
        body = {"order_id": order_id}
        if self.dry_run:
            return {
                "dry_run": True,
                "would_request": {
                    "method": "DELETE",
                    "path": PATH_ORDER,
                    "url": self.base_url + PATH_ORDER,
                    "body": body,
                },
            }
        return self._request("DELETE", PATH_ORDER, body=body, auth=True)

    def list_orders(
        self,
        *,
        open: Optional[bool] = None,
        exchanges: Optional[str] = None,
        **extra: Any,
    ) -> Dict[str, Any]:
        """GET /trade/api/v2/orders — always live (read-only)."""
        params: Dict[str, Any] = dict(extra)
        if open is not None:
            params["open"] = "true" if open else "false"
        if exchanges is not None:
            params["exchanges"] = exchanges
        return self._request("GET", PATH_ORDERS, params=params or None, auth=True)


def _print_json(obj: Any) -> None:
    print(json.dumps(obj, indent=2, default=str))


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="coinswitch_client.py",
        description="CoinSwitch Spot Ed25519 helper (dry-run by default).",
    )
    p.add_argument(
        "--live",
        action="store_true",
        help="Allow real mutating API calls (create/cancel). Default is dry-run.",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("status", help="Validate keys + ping/time (fails if keys missing).")

    op = sub.add_parser("order", help="Create a limit order (dry-run unless --live).")
    op.add_argument("--side", required=True, choices=("buy", "sell"))
    op.add_argument("--symbol", required=True, help="e.g. BTC/USDT")
    op.add_argument("--price", required=True, type=float)
    op.add_argument("--quantity", required=True, type=float)
    op.add_argument("--exchange", required=True, help="e.g. c2c1, coinswitchx")
    op.add_argument("--client-order-id", default=None)
    op.add_argument("--expiry-period", type=int, default=None)
    op.add_argument(
        "--dry-run",
        action="store_true",
        help="Explicit dry-run (default). Mutually redundant with omitting --live.",
    )

    cp = sub.add_parser("cancel", help="Cancel an order (dry-run unless --live).")
    cp.add_argument("--order-id", required=True)
    cp.add_argument("--dry-run", action="store_true")

    lp = sub.add_parser("list", help="List orders (read-only; always live).")
    lp.add_argument("--open", action="store_true", help="Only open orders")
    lp.add_argument("--exchanges", default=None, help="Comma-separated exchange ids")

    return p


def main(argv: Optional[list[str]] = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    # Mutating commands default to dry-run unless --live.
    mutating = args.cmd in ("order", "cancel")
    dry_run = True
    if mutating:
        if getattr(args, "dry_run", False):
            dry_run = True
        elif args.live:
            dry_run = False
        else:
            dry_run = True

    try:
        if args.cmd == "status":
            # Always need keys; fail clearly
            client = CoinSwitchClient(dry_run=True)
            _print_json(client.status())
            return 0

        # Dry-run mutate may preview without keys; live always needs them.
        need_keys = (not dry_run) or args.cmd in ("list",)
        client = CoinSwitchClient(dry_run=dry_run, require_keys=need_keys)

        if args.cmd == "order":
            result = client.create_limit_order(
                side=args.side,
                symbol=args.symbol,
                price=args.price,
                quantity=args.quantity,
                exchange=args.exchange,
                client_order_id=args.client_order_id,
                expiry_period=args.expiry_period,
            )
            _print_json(result)
            return 0

        if args.cmd == "cancel":
            result = client.cancel_order(args.order_id)
            _print_json(result)
            return 0

        if args.cmd == "list":
            result = client.list_orders(
                open=True if args.open else None,
                exchanges=args.exchanges,
            )
            _print_json(result)
            return 0

        parser.error(f"unknown command: {args.cmd}")
        return 2

    except CoinSwitchConfigError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2
    except CoinSwitchAPIError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        if exc.body is not None:
            _print_json(exc.body)
        return 1
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
