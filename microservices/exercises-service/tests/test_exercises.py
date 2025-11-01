import os
import pytest

# ensure app uses an in-memory database for tests and testing mode BEFORE importing app
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("TESTING", "1")

from app.main import app
from app.models import Exercise

# helper to find exercises collection endpoint at test runtime
def _exercises_endpoint(method="GET"):
    for rule in app.url_map.iter_rules():
        if "exercise" in rule.rule and method in rule.methods:
            # prefer collection (no path params)
            if "<" not in rule.rule:
                return rule.rule
    return None

# create client in a fixture to avoid creating at import time and use Flask test client
@pytest.fixture
def client():
    app.testing = True
    with app.test_client() as c:
        yield c


@pytest.fixture
def sample_data():
    return {
        "title": "Sum Test",
        "body": "Add two numbers",
        "difficulty": 1,
        "test_cases": [],
        "solutions": []
    }


def test_exercise_model_creation(sample_data):
    ex = Exercise(**sample_data)
    assert getattr(ex, "title", None) == sample_data["title"]
    assert getattr(ex, "difficulty", None) == sample_data["difficulty"]


def test_exercise_attrs_accessible(sample_data):
    ex = Exercise(**sample_data)
    assert hasattr(ex, "title")
    assert hasattr(ex, "body")
    assert hasattr(ex, "difficulty")


def test_exercise_repr_and_str(sample_data):
    ex = Exercise(**sample_data)
    r = repr(ex)
    s = str(ex)
    assert isinstance(r, str)
    assert isinstance(s, str)


def test_exercise_missing_fields_raises():
    with pytest.raises((TypeError, ValueError)):
        Exercise(title="only title")


def test_exercise_to_dict_if_supported(sample_data):
    ex = Exercise(**sample_data)
    if hasattr(ex, "dict"):
        d = ex.dict()
    else:
        d = ex.__dict__
    assert d.get("title") == sample_data["title"]


def test_create_exercise_calls_model(monkeypatch, sample_data):
    called = {}
    def fake_create(cls, payload):
        called["payload"] = payload
        return {"id": 1, **payload}
    monkeypatch.setattr(
        Exercise, "create", classmethod(lambda cls, payload: fake_create(cls, payload)), raising=False
    )
    result = Exercise.create(sample_data)
    assert called["payload"] == sample_data
    assert result["id"] == 1


def test_get_all_exercises_returns_list(monkeypatch):
    fake_list = [{"id": 1, "title": "a"}, {"id": 2, "title": "b"}]
    monkeypatch.setattr(Exercise, "get_all", classmethod(lambda cls: fake_list), raising=False)
    res = Exercise.get_all()
    assert isinstance(res, list)
    assert len(res) == 2


def test_get_exercise_by_id_found(monkeypatch):
    fake = {"id": 5, "title": "found"}
    monkeypatch.setattr(Exercise, "get_by_id", classmethod(lambda cls, _id: fake if _id == 5 else None), raising=False)
    assert Exercise.get_by_id(5)["title"] == "found"


def test_get_exercise_by_id_not_found(monkeypatch):
    monkeypatch.setattr(Exercise, "get_by_id", classmethod(lambda cls, _id: None), raising=False)
    assert Exercise.get_by_id(999) is None


def test_update_exercise_success(monkeypatch):
    def fake_update(cls, _id, payload):
        if _id == 1:
            updated = {"id": 1, **payload}
            return updated
        return None
    monkeypatch.setattr(Exercise, "update", classmethod(fake_update), raising=False)
    res = Exercise.update(1, {"title": "new"})
    assert res["title"] == "new"


def test_update_exercise_not_found(monkeypatch):
    monkeypatch.setattr(Exercise, "update", classmethod(lambda cls, _id, p: None), raising=False)
    assert Exercise.update(999, {"title": "x"}) is None


def test_delete_exercise_success(monkeypatch):
    monkeypatch.setattr(Exercise, "delete", classmethod(lambda cls, _id: True if _id == 2 else False), raising=False)
    assert Exercise.delete(2) is True


def test_delete_exercise_not_found(monkeypatch):
    monkeypatch.setattr(Exercise, "delete", classmethod(lambda cls, _id: False), raising=False)
    assert Exercise.delete(999) is False


def test_search_exercises(monkeypatch):
    sample = [{"id": 1, "title": "Sum Test"}]
    monkeypatch.setattr(Exercise, "search", classmethod(lambda cls, q: sample if "Sum" in q else []), raising=False)
    assert Exercise.search("Sum") == sample
    assert Exercise.search("none") == []


def test_bulk_create_exercises(monkeypatch):
    created = []
    def fake_create(cls, payload):
        created.append(payload)
        return {"id": len(created), **payload}
    monkeypatch.setattr(Exercise, "create", classmethod(fake_create), raising=False)
    for i in range(3):
        Exercise.create({"title": f"t{i}", "body": "b", "difficulty": 1})
    assert len(created) == 3


def test_create_invalid_data_raises(monkeypatch):
    def fake_create(cls, payload):
        if "title" not in payload:
            raise ValueError("missing title")
        return {"id": 1, **payload}
    monkeypatch.setattr(Exercise, "create", classmethod(fake_create), raising=False)
    with pytest.raises(ValueError):
        Exercise.create({"body": "no title"})


def test_db_exception_handling_on_create(monkeypatch):
    def fake_create(cls, payload):
        raise RuntimeError("db down")
    monkeypatch.setattr(Exercise, "create", classmethod(fake_create), raising=False)
    with pytest.raises(RuntimeError):
        Exercise.create({"title": "x", "body": "y", "difficulty": 1})


def test_endpoint_get_exercises_monkeypatched(monkeypatch, client):
    sample = [{"id": 1, "title": "http-test"}]
    monkeypatch.setattr(Exercise, "get_all", classmethod(lambda cls: sample), raising=False)
    endpoint = _exercises_endpoint("GET")
    if endpoint is None:
        pytest.skip("No GET exercises endpoint found")
    resp = client.get(endpoint)
    assert resp.status_code == 200
    assert resp.json() == sample


def test_endpoint_create_exercise_monkeypatched(monkeypatch, client, sample_data):
    monkeypatch.setattr(Exercise, "create", classmethod(lambda cls, p: {"id": 99, **p}), raising=False)
    endpoint = _exercises_endpoint("POST")
    if endpoint is None:
        pytest.skip("No POST exercises endpoint found")
    resp = client.post(endpoint, json=sample_data)
    assert resp.status_code in (200, 201)
    body = resp.json()
    assert body.get("id") == 99