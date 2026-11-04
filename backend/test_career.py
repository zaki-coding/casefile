import json
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from threading import Barrier

import pytest
from fastapi import HTTPException

from backend import career


@pytest.fixture
def database_path(tmp_path):
    path = tmp_path / "career.sqlite3"
    with closing(sqlite3.connect(path)) as connection:
        career.initialize(connection)
    return path


def unlocked(connection):
    return {
        detective["id"]
        for detective in career.profile(connection)["detectives"]
        if detective["unlocked"]
    }


def test_thresholds_and_selection_are_enforced(database_path):
    with closing(sqlite3.connect(database_path)) as connection, connection:
        assert career.profile(connection)["selectedDetective"] == "adrian"
        assert unlocked(connection) == {"adrian"}
        with pytest.raises(HTTPException) as locked:
            career.select(connection, "selena")
        assert locked.value.status_code == 409
        with pytest.raises(HTTPException) as unknown:
            career.select(connection, "guest")
        assert unknown.value.status_code == 422

        assert career.award(connection, "001", 59)["newUnlocks"] == []
        assert career.award(connection, "002", 1)["newUnlocks"] == ["selena"]
        career.select(connection, "selena")
        assert career.award(connection, "003", 89)["nextUnlock"]["id"] == "elias"
        assert unlocked(connection) == {"adrian", "selena"}
        reward = career.award(connection, "004", 1)
        assert reward == {"earned": 1, "points": 150, "newUnlocks": ["elias"], "nextUnlock": None}
        career.select(connection, "elias")

    with closing(sqlite3.connect(database_path)) as reopened:
        assert unlocked(reopened) == {"adrian", "selena", "elias"}
        assert career.profile(reopened)["selectedDetective"] == "elias"


def test_losses_and_replays_do_not_award_more_points(database_path):
    with closing(sqlite3.connect(database_path)) as connection, connection:
        assert career.award(connection, "001", None)["earned"] == 0
        assert career.profile(connection)["solvedCases"] == []
        assert career.award(connection, "001", 80)["earned"] == 80
        assert career.award(connection, "001", 100)["earned"] == 0
        assert career.award(connection, "002", 90)["points"] == 170
        assert career.profile(connection)["solvedCases"] == [
            {"caseId": "001", "score": 80},
            {"caseId": "002", "score": 90},
        ]


def test_simultaneous_completions_credit_only_one_reward(database_path):
    ready = Barrier(2)

    def complete(score):
        with closing(sqlite3.connect(database_path)) as connection, connection:
            ready.wait(timeout=5)
            connection.execute("BEGIN IMMEDIATE")
            return career.award(connection, "001", score)["earned"]

    with ThreadPoolExecutor(max_workers=2) as executor:
        earned = sorted(executor.map(complete, [80, 100]))
    assert earned[0] == 0 and earned[1] in (80, 100)

    with closing(sqlite3.connect(database_path)) as connection:
        assert career.profile(connection)["solvedCases"] == [{"caseId": "001", "score": earned[1]}]


def test_legacy_migration_credits_first_created_solved_save_once(database_path):
    with closing(sqlite3.connect(database_path)) as connection, connection:
        connection.execute("CREATE TABLE investigations (id TEXT PRIMARY KEY, state TEXT NOT NULL)")
        saves = [
            {"result": None},
            {"result": {"solved": False, "score": 50}},
            {"result": {"solved": True, "score": 80}},
            {"result": {"solved": True, "score": 100}},
        ]
        connection.executemany(
            "INSERT INTO investigations VALUES (?, ?)",
            [(str(index), json.dumps(save)) for index, save in enumerate(saves)],
        )
        assert career.legacy_migration_pending(connection)
        career.migrate_legacy(connection, "001")
        career.migrate_legacy(connection, "001")
        assert career.profile(connection)["solvedCases"] == [{"caseId": "001", "score": 80}]
        assert connection.execute("SELECT COUNT(*) FROM investigations").fetchone()[0] == len(saves)

    with closing(sqlite3.connect(database_path)) as connection:
        assert not career.legacy_migration_pending(connection)
        assert career.profile(connection)["points"] == 80
