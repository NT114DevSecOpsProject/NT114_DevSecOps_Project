import os, sys, json

# ensure service root is on sys.path so `import app` works
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

import pytest
import requests
from requests.models import Response

@pytest.fixture(autouse=True)
def set_test_env():
    os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
    os.environ.setdefault("TESTING", "1")
    yield

@pytest.fixture(autouse=True)
def _prevent_network_calls(monkeypatch):
    """
    Autouse fixture: stub outbound HTTP calls so tests don't perform
    real network requests to user-management or other services.
    Return a response shape compatible with typical auth endpoints.
    """
    def _make_resp(json_obj=None, status=200):
        r = Response()
        r.status_code = status
        r.headers['Content-Type'] = 'application/json'
        r._content = json.dumps(json_obj or {
            "status": "success",
            "data": {"username": "test_user", "admin": True}
        }).encode()
        return r

    def fake_session_request(self, method, url, *args, **kwargs):
        # Return an auth-success shaped payload for auth-related URLs
        if "/api/auth" in url or "/auth" in url or "host.docker.internal" in url:
            return _make_resp({
                "status": "success",
                "data": {"username": "test_user", "admin": True}
            }, status=200)
        # Default generic OK response with helpful body
        return _make_resp({"status": "success", "data": {"ok": True}}, status=200)

    # Patch Session.request and common helpers
    monkeypatch.setattr(requests.sessions.Session, "request", fake_session_request, raising=False)
    monkeypatch.setattr(requests, "get", lambda *a, **k: _make_resp({
        "status": "success",
        "data": {"username": "test_user", "admin": True}
    }, status=200), raising=False)
    monkeypatch.setattr(requests, "post", lambda *a, **k: _make_resp({
        "status": "success",
        "data": {"username": "test_user", "admin": True}
    }, status=200), raising=False)
    yield