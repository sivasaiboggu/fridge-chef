#!/usr/bin/env python3
"""Screenshot a local file:// page via Chrome DevTools Protocol.

Usage: cdp-shot.py <url> <out.png> <width> <height> [--light] [--full]
"""
import base64
import hashlib
import json
import os
import random
import socket
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

import websocket

CHROME = "/opt/meta-chromium/chrome"
POLICY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "webgl-policy.txt")


def sha256(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def main():
    url, out, width, height = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    light = "--light" in sys.argv
    dark = "--dark" in sys.argv
    full = "--full" in sys.argv
    # Optional JS to run after load, before the shot:
    #   --eval "SSN_DEMO.playTake('take-1')"
    eval_expr = None
    if "--eval" in sys.argv:
        eval_expr = sys.argv[sys.argv.index("--eval") + 1]
    # Unique port per run: sibling agents share this VM and also use 9333.
    def free_port():
        for _ in range(50):
            p = random.randint(9400, 9999)
            s = socket.socket()
            try:
                s.bind(("127.0.0.1", p))
                s.close()
                return p
            except OSError:
                continue
        raise SystemExit("no free debug port")
    port = free_port()
    # Fresh profile per run: a reused profile can resurrect another project's tab.
    profile = tempfile.mkdtemp(prefix="fc-cdp-profile-")
    cmd = [
        CHROME, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--disable-dev-shm-usage", "--disable-extensions",
        "--user-data-dir=" + profile,
        "--remote-debugging-port=%d" % port,
        "--window-size=%d,%d" % (width, height),
        "--hatch-webgl-allowed-domains-file=" + POLICY,
        "--hatch-webgl-allowed-domains-sha256=" + sha256(POLICY),
        "--hide-scrollbars",
        "about:blank",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        # Wait for OUR DevTools endpoint, then open a fresh tab for our URL
        # (never reuse an existing tab: another agent's chrome may share a port).
        ws_url = None
        for _ in range(60):
            try:
                req = urllib.request.Request(
                    "http://127.0.0.1:%d/json/new?%s" % (port, urllib.parse.urlencode({"url": "about:blank"})),
                    method="PUT")
                with urllib.request.urlopen(req, timeout=2) as r:
                    page = json.load(r)
                ws_url = page["webSocketDebuggerUrl"]
                break
            except Exception:
                time.sleep(0.5)
        if not ws_url:
            raise SystemExit("DevTools endpoint never came up")
        ws = websocket.create_connection(ws_url, timeout=30)
        mid = [0]

        def send(method, params=None):
            mid[0] += 1
            ws.send(json.dumps({"id": mid[0], "method": method, "params": params or {}}))
            while True:
                msg = json.loads(ws.recv())
                if msg.get("id") == mid[0]:
                    if "error" in msg:
                        raise SystemExit("CDP error %s: %s" % (method, msg["error"]))
                    return msg.get("result", {})

        def drain_until(event_name, timeout_s=30):
            ws.settimeout(timeout_s)
            end = time.time() + timeout_s
            while time.time() < end:
                try:
                    msg = json.loads(ws.recv())
                except Exception:
                    break
                if msg.get("method") == event_name:
                    return True
            return False

        send("Page.enable")
        send("Runtime.enable")
        if dark:
            # Headless Chrome defaults to a light OS preference; emulate dark
            # so the <head> theme script picks the dark theme.
            send("Emulation.setEmulatedMedia", {"features": [{"name": "prefers-color-scheme", "value": "dark"}]})
        send("Emulation.setDeviceMetricsOverride", {
            "width": width, "height": height, "deviceScaleFactor": 1, "mobile": width < 500,
        })
        send("Page.navigate", {"url": url})
        drain_until("Page.loadEventFired", 30)
        time.sleep(3)  # let fonts/CDN attempts settle; page is offline-safe
        if light:
            send("Runtime.evaluate", {"expression": "document.documentElement.setAttribute('data-theme','light')"})
            time.sleep(0.5)
        if eval_expr:
            send("Runtime.evaluate", {"expression": eval_expr})
            time.sleep(0.5)
        # Overflow probe: horizontal overflow is the failure we care about.
        metrics = send("Runtime.evaluate", {
            "expression": "JSON.stringify({sw: document.documentElement.scrollWidth, iw: window.innerWidth, sh: document.documentElement.scrollHeight, ih: window.innerHeight})",
            "returnByValue": True,
        })
        print("metrics:", metrics["result"]["value"])
        params = {"format": "png"}
        if full:
            params["captureBeyondViewport"] = True
        shot = send("Page.captureScreenshot", params)
        data = base64.b64decode(shot["data"])
        open(out, "wb").write(data)
        print("wrote", out, len(data), "bytes")
        ws.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()


if __name__ == "__main__":
    main()
