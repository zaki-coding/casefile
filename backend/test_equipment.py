"""Server authority, progression, save compatibility and playable equipment scenes."""

import json

import pytest
from fastapi.testclient import TestClient

from backend import career, equipment, main


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DB_PATH", tmp_path / "equipment.sqlite3")
    with TestClient(main.app) as instance:
        yield instance


def start(client, case_id="001"):
    response = client.post("/api/investigations", json={"caseId": case_id})
    assert response.status_code == 201
    return "/api/investigations/" + response.json()["id"]


def use(client, path, scene, selection=None):
    return client.post(path + "/equipment", json={
        "toolId": scene["toolId"], "examinationId": scene["id"],
        "selection": selection if selection is not None else scene["answer"],
    })


def unlock_all():
    with main.database() as connection:
        # Real reward ledger; no equipment-only unlock switch or point spending.
        career.award(connection, "001", 100)
        career.award(connection, "002", 100)


@pytest.mark.parametrize("case_id", ["001", "002"])
def test_all_equipment_scenes_require_interaction_and_persist(client, case_id):
    unlock_all()
    path = start(client, case_id)
    for clue in main.CASES[case_id].data["evidence"]:
        assert client.post(path + "/evidence/" + clue["id"]).status_code == 200
    scenes = equipment.EXAMINATIONS[case_id]
    assert {scene["toolId"] for scene in scenes} == set(equipment.TOOLS)
    for scene in scenes:
        if scene["toolId"] == "timeline":
            wrong = list(reversed(scene["answer"]))
        else:
            wrong = [choice["id"] for choice in scene["choices"]
                     if choice["id"] not in scene["answer"]][:len(scene["answer"])]
        assert use(client, path, scene, wrong).status_code == 409
        success = use(client, path, scene)
        assert success.status_code == 200, success.text
        assert success.json()["equipmentFindings"][-1]["message"] == scene["message"]
        assert success.json()["ability"] is None
        # A retry is idempotent and cannot multiply saved findings.
        assert use(client, path, scene).json()["equipmentFindings"] == success.json()["equipmentFindings"]
    saved = client.get(path).json()
    with TestClient(main.app) as reopened:
        assert reopened.get(path).json() == saved
        inventory = reopened.get(path + "/equipment").json()
        assert inventory["points"] == 200
        assert all(scene["completed"] for tool in inventory["tools"] for scene in tool["examinations"])
    assert len(saved["equipmentFindings"]) == len(scenes)
    assert client.get("/api/profile").json()["points"] == 200


def test_backend_rejects_locked_unexamined_foreign_and_forged_requests(client):
    path = start(client)
    lens = equipment.EXAMINATIONS["001"][0]
    forensic = equipment.EXAMINATIONS["001"][2]
    digital = equipment.EXAMINATIONS["001"][3]
    assert use(client, path, forensic).status_code == 409
    assert use(client, path, lens).status_code == 409
    assert client.post(path + "/evidence/proof").status_code == 200
    assert use(client, path, lens, ["forged"]).status_code == 422
    assert use(client, path, lens, ["reverse", "reverse"]).status_code == 422
    foreign = equipment.EXAMINATIONS["002"][0]
    assert use(client, path, foreign).status_code == 422
    assert client.post(path + "/equipment", json={
        "toolId": "invented", "examinationId": lens["id"], "selection": ["reverse"],
    }).status_code == 422
    assert client.get(path).json()["equipmentFindings"] == []
    unlock_all()
    client.post(path + "/evidence/badge")
    assert use(client, path, digital).status_code == 409
    client.post(path + "/evidence/relay")
    assert use(client, path, digital).status_code == 200


@pytest.mark.parametrize("points", [0, 49, 50, 109, 110, 169, 170, 200])
def test_exact_unlock_boundaries_do_not_spend_points(client, points):
    with main.database() as connection:
        # Split totals to respect the 100-point per-case reward constraint.
        if points:
            career.award(connection, "test-a", min(100, points))
        if points > 100:
            career.award(connection, "test-b", points - 100)
    profile = client.get("/api/profile").json()
    assert profile["points"] == points
    assert {tool["id"] for tool in profile["equipment"] if tool["unlocked"]} == {
        key for key, tool in equipment.TOOLS.items() if points >= tool["threshold"]
    }
    path = start(client)
    lens = equipment.EXAMINATIONS["001"][0]
    client.post(path + "/evidence/proof")
    assert use(client, path, lens).status_code == 200
    assert client.get("/api/profile").json()["points"] == points


def test_catalog_does_not_expose_private_results_or_answers(client):
    unlock_all()
    for case_id in ("001", "002"):
        path = start(client, case_id)
        public = client.get(path + "/equipment").json()
        encoded = json.dumps(public)
        for scene in equipment.EXAMINATIONS[case_id]:
            assert scene["message"] not in encoded
            assert scene["retry"] not in encoded
        assert '"answer"' not in encoded
        assert '"culprit"' not in encoded


@pytest.mark.parametrize("case_id,culprit,method,clues", [
    ("001", "mara", "switch", ["badge", "treatment", "relay"]),
    ("002", "sabine", "bypass", ["route", "latch"]),
])
def test_starter_can_solve_without_optional_equipment_and_unlocks_are_once(
        client, case_id, culprit, method, clues):
    expected = 76 if case_id == "001" else 100
    for attempt in range(2):
        path = start(client, case_id)
        for clue in clues:
            client.post(path + "/evidence/" + clue)
        solved = client.post(path + "/accusation", json={
            "suspect": culprit, "method": method, "evidence": clues,
            **({"motive": "protect"} if case_id == "001" else {}),
        }).json()
        assert solved["result"]["solved"]
        assert solved["equipmentFindings"] == []
        reward = solved["result"]["career"]
        assert reward["earned"] == (expected if attempt == 0 else 0)
        assert reward["newEquipmentUnlocks"] == (["forensic"] if attempt == 0 else [])
        assert use(client, path, equipment.EXAMINATIONS[case_id][0]).status_code == 409
    assert client.get("/api/profile").json()["points"] == expected


def test_legacy_state_is_extended_without_losing_existing_progress(client):
    path = start(client)
    original = client.post(path + "/evidence/badge").json()
    original.pop("equipmentFindings")
    original.pop("abilityOptions")
    with main.database() as connection:
        connection.execute("UPDATE investigations SET state = ? WHERE id = ?",
                           (json.dumps(original), original["id"]))
    restored = client.get(path).json()
    assert restored["equipmentFindings"] == []
    assert restored["board"] == original["board"]
    assert restored["interviews"] == original["interviews"]
