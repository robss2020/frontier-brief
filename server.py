#!/usr/bin/env python3
"""Local-only server for the Frontier Brief. Does not bind publicly or post anywhere."""

from __future__ import annotations

import json
import re
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
DATA = ROOT / "data"
SUBSCRIBERS = DATA / "subscribers.json"
HOST = "127.0.0.1"
PORT = 8765
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
LOCK = threading.Lock()


def load_subscribers() -> list[dict]:
    if not SUBSCRIBERS.exists():
        return []
    try:
        return json.loads(SUBSCRIBERS.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []


def save_subscribers(rows: list[dict]) -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    SUBSCRIBERS.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC), **kwargs)

    def log_message(self, format: str, *args) -> None:
        print(f"[local] {self.address_string()} {format % args}")

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path in ("/", ""):
            self.path = "/index.html"
        if path == "/api/health":
            return self._json(200, {"ok": True, "host": f"http://{HOST}:{PORT}"})
        if path == "/api/stats":
            with LOCK:
                count = len(load_subscribers())
            return self._json(200, {"subscribers": count})
        return super().do_GET()

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path != "/api/subscribe":
            self.send_error(404, "Not found")
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return self._json(400, {"ok": False, "error": "Invalid JSON."})

        email = str(payload.get("email", "")).strip().lower()
        name = str(payload.get("name", "")).strip()[:80]
        if not EMAIL_RE.match(email) or len(email) > 254:
            return self._json(400, {"ok": False, "error": "Enter a valid email address."})

        with LOCK:
            rows = load_subscribers()
            if any(row.get("email") == email for row in rows):
                return self._json(200, {"ok": True, "duplicate": True, "message": "You are already on the list."})
            rows.append(
                {
                    "email": email,
                    "name": name,
                    "subscribed_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            save_subscribers(rows)

        return self._json(200, {"ok": True, "duplicate": False, "message": "You are on the list."})

    def _json(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main() -> None:
    DATA.mkdir(parents=True, exist_ok=True)
    if not SUBSCRIBERS.exists():
        save_subscribers([])
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Frontier Brief is local-only at http://{HOST}:{PORT}")
    print("Not bound to the public internet. Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
        server.server_close()


if __name__ == "__main__":
    main()
