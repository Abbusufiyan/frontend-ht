import json
import threading
import unittest
import urllib.error
import urllib.request

from clarix.config import Settings
from clarix.web.routes import ROUTES
from clarix.web.stdlib_server import make_server
from tests.helpers import Env


class Sec04CorsTests(Env):
    def setUp(self):
        super().setUp()
        self.srv = make_server(self.ctx, "127.0.0.1", 0)
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.srv.server_address[1]}"
        self.addCleanup(lambda: (self.srv.shutdown(), self.srv.server_close()))

    def call(self, method, path, body=None, headers=None):
        data = json.dumps(body).encode() if body is not None else None
        h = dict(headers or {})
        if data is not None:
            h["Content-Type"] = "application/json"
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=h)
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status, json.loads(r.read() or b"{}"), dict(r.headers)
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read() or b"{}"), dict(e.headers)

    def test_default_origins_are_restricted(self):
        # Default should only be 127.0.0.1:5173 and localhost:5173
        s = Settings()
        self.assertEqual(set(s.cors_origins), {"http://127.0.0.1:5173", "http://localhost:5173"})

    def test_state_changing_request_with_allowed_origin_succeeds(self):
        s, b, h = self.call(
            "POST",
            "/api/security/analyze",
            {"input": "safe input"},
            headers={"Origin": "http://127.0.0.1:5173"}
        )
        self.assertEqual(s, 200)
        self.assertEqual(h.get("Access-Control-Allow-Origin"), "http://127.0.0.1:5173")

    def test_state_changing_request_with_forbidden_origin_rejected_403(self):
        forbidden_origins = ["http://evil.com", "http://attacker.example.org", "https://malicious.io"]
        for origin in forbidden_origins:
            # POST
            s, b, _ = self.call(
                "POST",
                "/api/security/analyze",
                {"input": "test input"},
                headers={"Origin": origin}
            )
            self.assertEqual(s, 403, f"POST with Origin {origin} should be 403")
            self.assertEqual(b["error"]["code"], "cors_forbidden")

            # PUT
            s, b, _ = self.call(
                "PUT",
                "/api/tools/calc/permission",
                {"level": "READ"},
                headers={"Origin": origin}
            )
            self.assertEqual(s, 403, f"PUT with Origin {origin} should be 403")

            # PATCH
            s, b, _ = self.call(
                "PATCH",
                "/api/policies/POL-001",
                {"enabled": True},
                headers={"Origin": origin}
            )
            self.assertEqual(s, 403, f"PATCH with Origin {origin} should be 403")

            # DELETE
            s, b, _ = self.call(
                "DELETE",
                "/api/policies/POL-001",
                headers={"Origin": origin}
            )
            self.assertEqual(s, 403, f"DELETE with Origin {origin} should be 403")

    def test_get_request_with_unallowed_origin_allowed_without_cors_header(self):
        # GET is safe/read-only; allowed but does not return Access-Control-Allow-Origin header
        s, b, h = self.call("GET", "/health", headers={"Origin": "http://evil.com"})
        self.assertEqual(s, 200)
        self.assertNotIn("Access-Control-Allow-Origin", h)

    def test_state_changing_request_without_origin_header_allowed(self):
        # Non-browser requests (e.g. backend curl or internal calls) have no Origin header
        s, b, _ = self.call("POST", "/api/security/analyze", {"input": "benign input"})
        self.assertEqual(s, 200)


if __name__ == "__main__":
    unittest.main()
