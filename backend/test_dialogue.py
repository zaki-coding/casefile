import json

import pytest
from fastapi.testclient import TestClient

from backend import main


@pytest.fixture
def interview_session(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "interviews.sqlite3")
    with TestClient(main.app) as client:
        response = client.post("/api/investigations")
        assert response.status_code == 201
        yield client, "/api/investigations/" + response.json()["id"]


def options(scene):
    return {item["id"]: item for item in scene["options"]}


def test_confrontation_requires_alibi_and_examined_evidence(interview_session):
    client, path = interview_session
    interviews = path + "/interviews"
    initial = client.get(interviews + "/mara").json()
    assert initial["transcript"] == []
    assert options(initial)["alibi"]["status"] == "available"
    locked = options(initial)["badge_conflict"]
    assert locked["status"] == "locked"
    assert "Badge access report" in locked["hint"]
    assert "open both doors" not in locked["label"]

    accusation = {"suspect": "mara", "topic": "badge_conflict"}
    assert client.post(interviews, json=accusation).status_code == 409
    assert client.post(path + "/evidence/badge").status_code == 200
    assert client.post(interviews, json=accusation).status_code == 409
    assert client.post(interviews, json={"suspect": "mara", "topic": "alibi"}).status_code == 200
    unlocked = client.get(interviews + "/mara").json()
    assert options(unlocked)["badge_conflict"]["status"] == "available"
    assert options(unlocked)["alibi_witness"]["status"] == "available"
    assert options(unlocked)["alibi"]["status"] == "asked"

    for _ in range(2):
        assert client.post(interviews, json=accusation).status_code == 200
    reopened = TestClient(main.app)
    scene = reopened.get(interviews + "/mara").json()
    assert [entry["topic"] for entry in scene["transcript"]] == ["alibi", "badge_conflict"]
    assert scene["transcript"][1]["question"] == options(unlocked)["badge_conflict"]["label"]
    assert scene["transcript"][0]["answer"] != scene["transcript"][1]["answer"]
    assert reopened.get(interviews + "/ellis").json()["transcript"] == []
    assert reopened.post(interviews, json={"suspect": "ellis", "topic": "badge_conflict"}).status_code == 422


def test_legacy_answers_reappear_in_transcript_without_duplication(interview_session):
    client, path = interview_session
    state = client.get(path).json()
    state["interviews"] = [{"suspect": "june", "topic": "print", "answer": "Original saved reply."}]
    with main.database() as connection:
        connection.execute(
            "UPDATE investigations SET state = ? WHERE id = ?",
            (json.dumps(state), state["id"]),
        )

    scene = client.get(path + "/interviews/june").json()
    assert scene["transcript"] == [{
        "suspect": "june",
        "topic": "print",
        "question": "What do you know about the print?",
        "answer": "Original saved reply.",
    }]
    assert options(scene)["print"]["status"] == "asked"
    assert options(scene)["treatment_request"]["status"] == "available"
    result = client.post(path + "/interviews", json={"suspect": "june", "topic": "print"})
    assert result.status_code == 200
    assert len(result.json()["interviews"]) == 1


def test_closed_investigation_preserves_read_only_interview(interview_session):
    client, path = interview_session
    interviews = path + "/interviews"
    question = {"suspect": "ellis", "topic": "lights"}
    assert client.post(interviews, json=question).status_code == 200
    for clue in ("badge", "relay", "treatment"):
        assert client.post(path + "/evidence/" + clue).status_code == 200
    assert client.post(path + "/accusation", json={
        "suspect": "mara", "method": "switch", "motive": "protect", "evidence": ["badge", "treatment", "relay"],
    }).status_code == 200
    scene = client.get(interviews + "/ellis").json()
    assert len(scene["transcript"]) == 1
    assert options(scene)["lights"]["status"] == "asked"
    assert options(scene)["relay_log"]["status"] == "locked"
    assert client.post(interviews, json={"suspect": "ellis", "topic": "relay_log"}).status_code == 409
