import json

import pytest
from fastapi.testclient import TestClient

from backend import main


ACCUSATION = {"suspect": "mara", "motive": "protect", "method": "switch",
              "evidence": ["badge", "treatment", "relay"]}


@pytest.fixture
def dossier(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "reasoning.sqlite3")
    with TestClient(main.app) as client:
        state = client.post("/api/investigations", json={"caseId": "001", "detectiveId": "adrian"}).json()
        yield client, f"/api/investigations/{state['id']}"


def examine(client, path, *files):
    for file in files:
        assert client.post(f"{path}/evidence/{file}").status_code == 200


def test_full_case_uses_only_publicly_accessible_files_and_interviews(dossier):
    client, path = dossier
    brief = client.get("/api/case/001").json()
    assert set(ACCUSATION["evidence"]) <= {file["id"] for file in brief["evidence"]}
    assert client.post(path + "/accusation", json=ACCUSATION).status_code == 422
    opportunity = {"evidence": ["badge", "relay"], "relationship": "opportunity"}
    assert client.post(path + "/connections", json=opportunity).status_code == 422
    examine(client, path, "badge", "relay", "condition", "treatment", "gate")

    questions = (("mara", "alibi", "badge_confrontation", "badge"),
                 ("june", "print", "treatment_conflict", "treatment"))
    for suspect, topic, challenge, clue in questions:
        assert client.post(path + "/interviews", json={"suspect": suspect, "topic": topic}).status_code == 200
        request = {"suspect": suspect, "topic": challenge, "evidence": clue}
        assert client.post(path + "/interviews", json=request).status_code == 409

    wrong_link = {"evidence": ["badge", "gate"], "relationship": "opportunity"}
    assert client.post(path + "/connections", json=wrong_link).status_code == 409
    assert client.post(path + "/connections", json={**opportunity, "relationship": "forced"}).status_code == 409
    assert client.get(path).json()["deductions"] == []
    for link in (opportunity, {"evidence": ["condition", "treatment"], "relationship": "urgency"}):
        for pair in (link["evidence"], list(reversed(link["evidence"]))):
            assert client.post(path + "/connections", json={**link, "evidence": pair}).status_code == 200

    with TestClient(main.app) as reopened:
        assert len(reopened.get(path).json()["deductions"]) == 2
        for suspect, _, challenge, clue in questions:
            scene = reopened.get(f"{path}/interviews/{suspect}").json()
            option = next(item for item in scene["options"] if item["id"] == challenge)
            assert option["status"] == "available" and option["presentation"]
            request = {"suspect": suspect, "topic": challenge}
            assert reopened.post(path + "/interviews", json=request).status_code == 422
            assert reopened.post(path + "/interviews", json={**request, "evidence": "gate"}).status_code == 409
            for _ in range(2):
                assert reopened.post(path + "/interviews", json={**request, "evidence": clue}).status_code == 200
            scene = reopened.get(f"{path}/interviews/{suspect}").json()
            assert len(scene["transcript"]) == 2
            assert scene["transcript"][-1]["contradiction"]
            assert scene["transcript"][-1]["evidence"] == clue

        assert reopened.post(path + "/accusation", json={**ACCUSATION, "motive": None}).status_code == 422
        assert reopened.post(path + "/accusation", json={**ACCUSATION, "evidence": ["badge"] * 3}).status_code == 422
        response = reopened.post(path + "/accusation", json=ACCUSATION)
        assert response.status_code == 200, response.text
        result = response.json()["result"]
        assert result["solved"] and result["score"] == result["career"]["earned"] == 100
        assert result["breakdown"]["Contradictions"] == 12
        assert len(result["details"]["keyClues"]) == 4
        assert reopened.get(path).json()["result"] == result
        assert reopened.post(path + "/accusation", json=ACCUSATION).status_code == 409
        assert reopened.post(path + "/connections", json=opportunity).status_code == 409


def test_correct_culprit_does_not_rescue_wrong_motive_or_citations(dossier):
    client, path = dossier
    examine(client, path, "badge", "treatment", "relay", "gate")
    response = client.post(path + "/accusation", json={
        **ACCUSATION, "motive": "sell", "evidence": ["badge", "treatment", "gate"],
    })
    assert response.status_code == 200
    result = response.json()["result"]
    assert not result["solved"]
    assert result["breakdown"] == {"Suspect": 15, "Motive": 0, "Method": 10,
                                   "Evidence": 12, "Deductions": 0, "Contradictions": 0}
    assert result["details"]["motiveCorrect"] is False
    assert result["career"]["earned"] == 0


def test_existing_open_case_can_finish_under_original_rules(dossier):
    client, path = dossier
    examine(client, path, "badge", "relay")
    saved = client.get(path).json()
    for field in ("reasoningVersion", "deductions", "abilityOptions"):
        saved.pop(field)
    with main.database() as connection:
        connection.execute("UPDATE investigations SET state = ? WHERE id = ?",
                           (json.dumps(saved), saved["id"]))
    assert client.get(path).json()["board"] == saved["board"]
    response = client.post(path + "/accusation", json={
        "suspect": "mara", "method": "switch", "evidence": ["badge", "relay"],
    })
    assert response.status_code == 200
    assert response.json()["result"]["score"] == 100
