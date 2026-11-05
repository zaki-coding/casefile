"""API coverage across cases, detectives and persisted progression."""

import json

import pytest
from fastapi.testclient import TestClient

from backend import main

CASES = {
    "001": ("mara", "switch", ("badge", "relay"), "ellis", "pressure_override", "relay"),
    "002": ("sabine", "bypass", ("route", "latch"), "ivo", "pressure_detent", "route"),
}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "career.sqlite3")
    with TestClient(main.app) as test_client:
        yield test_client


def start(client, case_id, detective="adrian"):
    result = client.post("/api/investigations", json={"caseId": case_id, "detectiveId": detective})
    assert result.status_code == 201, result.text
    return "/api/investigations/" + result.json()["id"]


def post(client, path, data=None, status=200):
    result = client.post(path, json=data)
    assert result.status_code == status, result.text
    return result.json()


def solve(client, case_id, detective="adrian"):
    culprit, method, evidence, *_ = CASES[case_id]
    path = start(client, case_id, detective)
    for clue in evidence:
        post(client, path + "/evidence/" + clue)
    return post(client, path + "/accusation", {
        "suspect": culprit, "method": method, "evidence": evidence,
    })["result"]


def test_new_cases_hide_solutions_and_route_evidence(client):
    summaries = client.get("/api/cases").json()
    assert [(case["id"], case["suspectCount"], case["evidenceCount"]) for case in summaries] == [
        ("001", 3, 5), ("002", 4, 10),
    ]
    second = client.get("/api/case/002").json()
    assert "culprit" not in second and "timeline" not in second
    assert all("detail" not in clue for clue in second["evidence"])
    assert all("answers" not in suspect for suspect in second["suspects"])
    path = start(client, "002")
    post(client, path + "/evidence/badge", status=404)
    assert client.get(path + "/interviews/mara").status_code == 404
    scene = client.get(path + "/interviews/sabine").json()
    assert scene["options"] and scene["transcript"] == []
    assert any(item["status"] == "locked" for item in scene["options"])


def test_first_success_per_case_unlocks_detectives_and_replay_pays_zero(client):
    assert client.get("/api/profile").json()["points"] == 0
    assert client.put("/api/profile/detective", json={"detectiveId": "selena"}).status_code == 409
    post(client, "/api/investigations", {"caseId": "001", "detectiveId": "elias"}, status=409)

    wrong = start(client, "002")
    for clue in CASES["002"][2]:
        post(client, wrong + "/evidence/" + clue)
    assert post(client, wrong + "/accusation", {
        "suspect": "ivo", "method": "bypass", "evidence": CASES["002"][2],
    })["result"]["career"]["earned"] == 0

    first = solve(client, "001")
    assert first["career"]["earned"] == first["score"] == 100
    assert first["career"]["newUnlocks"] == ["selena"]
    assert first["career"]["nextUnlock"]["threshold"] == 150
    assert solve(client, "001", "selena")["career"]["earned"] == 0
    assert client.put("/api/profile/detective", json={"detectiveId": "elias"}).status_code == 409

    second = solve(client, "002", "selena")
    assert second["career"] == {"earned": 100, "points": 200, "newUnlocks": ["elias"],
                                "newEquipmentUnlocks": ["digital", "timeline"], "nextUnlock": None}
    assert second["details"]["culprit"] == "Sabine Vey"
    assert len(second["details"]["timeline"]) == 5
    assert solve(client, "002", "elias")["career"]["earned"] == 0
    with TestClient(main.app) as reopened:
        profile = reopened.get("/api/profile").json()
        assert profile["selectedDetective"] == "elias"
        assert profile["solvedCases"] == [{"caseId": "001", "score": 100}, {"caseId": "002", "score": 100}]


@pytest.mark.parametrize("case_id", CASES)
def test_each_ability_is_case_specific_and_single_use(client, case_id):
    _, _, clues, target, pressure_topic, leverage = CASES[case_id]
    adrian = start(client, case_id)
    post(client, adrian + "/ability", {"type": "analysis", "target": clues[0]}, status=403)
    post(client, adrian + "/ability", {"type": "insight"}, status=409)
    for clue in clues:
        post(client, adrian + "/evidence/" + clue)
    insight = post(client, adrian + "/ability", {"type": "insight"})["ability"]
    assert insight["message"] and insight["type"] == "insight"
    assert client.get(adrian).json()["ability"] == insight
    post(client, adrian + "/ability", {"type": "insight"}, status=409)

    solve(client, "001")
    selena = start(client, case_id, "selena")
    interview = selena + "/interviews"
    question = {"suspect": target, "topic": pressure_topic}
    post(client, interview, question, status=422)
    post(client, selena + "/ability", {"type": "pressure", "target": target}, status=409)
    first_topic = next(option["id"] for option in client.get(interview + "/" + target).json()["options"]
                       if option["status"] == "available")
    post(client, interview, {"suspect": target, "topic": first_topic})
    post(client, selena + "/ability", {"type": "pressure", "target": target}, status=409)
    post(client, selena + "/evidence/" + leverage)
    post(client, selena + "/ability", {"type": "pressure", "target": target})
    assert any(option["id"] == pressure_topic and option["status"] == "available"
               for option in client.get(interview + "/" + target).json()["options"])
    assert post(client, interview, question)["interviews"][-1]["topic"] == pressure_topic
    post(client, selena + "/ability", {"type": "pressure", "target": target}, status=409)

    solve(client, "002")
    elias = start(client, case_id, "elias")
    analysis = {"type": "analysis", "target": clues[0]}
    post(client, elias + "/ability", analysis, status=409)
    examined = post(client, elias + "/evidence/" + clues[0])
    analyzed = post(client, elias + "/ability", analysis)
    assert analyzed["ability"]["message"] != examined["board"][clues[0]]
    assert analyzed["ability"]["target"] == clues[0]
    assert client.get(elias).json()["ability"] == analyzed["ability"]
    post(client, elias + "/ability", analysis, status=409)


def test_existing_case_is_restored_and_legacy_solve_credits_once(tmp_path, monkeypatch):
    import sqlite3

    path = tmp_path / "legacy.sqlite3"
    monkeypatch.setattr(main, "DB_PATH", path)
    legacy_id = "ee205c3c-5134-4bd7-8ec3-1bf54e6528cf"
    legacy = {"id": legacy_id, "board": {"badge": "Saved evidence"}, "interviews": [],
              "result": {"solved": True, "score": 90, "explanation": "Saved verdict"}}
    with sqlite3.connect(path) as connection:
        connection.execute("CREATE TABLE investigations (id TEXT PRIMARY KEY, state TEXT NOT NULL)")
        connection.execute("INSERT INTO investigations VALUES (?, ?)", (legacy_id, json.dumps(legacy)))
    with TestClient(main.app) as client:
        restored = client.get("/api/investigations/" + legacy_id).json()
        assert restored["caseId"] == "001" and restored["detectiveId"] == "adrian"
        assert restored["result"] == legacy["result"]
        assert restored["board"] == legacy["board"]
        assert client.get("/api/investigations").json()[0]["closed"]
        assert client.get("/api/profile").json()["points"] == 90
        assert solve(client, "001")["career"]["earned"] == 0
