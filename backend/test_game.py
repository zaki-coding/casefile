import pytest
from fastapi.testclient import TestClient

from backend import main


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "test.sqlite3")
    return TestClient(main.app)


def test_case_brief_keeps_details_private(client):
    brief = client.get("/api/case").json()
    assert all("answers" not in suspect for suspect in brief["suspects"])
    assert all("detail" not in clue for clue in brief["evidence"])


def test_investigation_survives_new_client_and_scores_solution(client):
    response = client.post("/api/investigations")
    assert response.status_code == 201
    path = "/api/investigations/" + response.json()["id"]
    question = {"suspect": "mara", "topic": "alibi"}
    for _ in range(2):
        assert client.post(path + "/interviews", json=question).status_code == 200
        assert client.post(path + "/evidence/badge").status_code == 200
    assert client.post(path + "/evidence/relay").status_code == 200
    reopened = TestClient(main.app)
    saved = reopened.get(path).json()
    assert set(saved["board"]) == {"badge", "relay"}
    assert len(saved["interviews"]) == 1
    assert saved["result"] is None
    accusation = {"suspect": "mara", "method": "switch", "evidence": ["badge", "relay"]}
    result = reopened.post(path + "/accusation", json=accusation).json()["result"]
    assert result["solved"] and result["score"] == 100
    details = result["details"]
    assert details["culprit"] == details["suspectChoice"] == "Mara Vale"
    assert details["suspectCorrect"] and details["methodCorrect"]
    assert [item["id"] for item in details["evidence"]] == ["badge", "relay"]
    assert all(item["correct"] for item in details["evidence"])
    assert len(details["timeline"]) == 4
    assert reopened.get(path).json()["result"] == result
    assert reopened.post(path + "/evidence/proof").status_code == 409
    assert reopened.post(path + "/accusation", json=accusation).status_code == 409


def test_invalid_evidence_leaves_case_open_and_wrong_verdict_scores(client):
    path = "/api/investigations/" + client.post("/api/investigations").json()["id"]
    assert client.post(path + "/evidence/badge").status_code == 200
    accusation = {"suspect": "ellis", "method": "switch", "evidence": ["badge", "relay"]}
    assert client.post(path + "/accusation", json=accusation).status_code == 422
    assert client.get(path).json()["result"] is None
    assert client.post(path + "/evidence/relay").status_code == 200
    result = client.post(path + "/accusation", json=accusation).json()["result"]
    assert result["solved"] is False
    assert result["score"] == 50
    assert result["details"]["suspectChoice"] == "Ellis Ward"
    assert result["details"]["suspectCorrect"] is False
    assert result["details"]["methodCorrect"] is True
