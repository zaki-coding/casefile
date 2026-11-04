"""Persistent progression for the local player's career.

The case reward ledger is append-only. Its primary key makes the first
successful completion of a case the only one that can grant career points.
Call mutations in the same transaction as the investigation they affect.
"""

import json
import sqlite3

from fastapi import HTTPException


DETECTIVES = {
    "adrian": {
        "id": "adrian",
        "name": "Adrian Cross",
        "role": "The Investigator",
        "bio": "A former missing-persons investigator who pins facts by the minute and trusts the gaps in a story.",
        "ability": "Insight",
        "description": "Connect two examined evidence files to uncover one optional investigative lead.",
        "threshold": 0,
    },
    "selena": {
        "id": "selena",
        "name": "Selena Voss",
        "role": "The Interrogator",
        "bio": "A former crisis negotiator who can wait out an evasive answer and knows when to press for details.",
        "ability": "Pressure",
        "description": "Open one exclusive follow-up when a witness and the evidence give you leverage.",
        "threshold": 60,
    },
    "elias": {
        "id": "elias",
        "name": "Elias Mercer",
        "role": "The Forensic Expert",
        "bio": "A meticulous trace analyst who sees the sequence of events in marks others pass over.",
        "ability": "Deep Analysis",
        "description": "Re-examine one eligible evidence file to recover an additional forensic observation.",
        "threshold": 150,
    },
}

DEFAULT_DETECTIVE = "adrian"


def initialize(connection: sqlite3.Connection) -> None:
    connection.execute("""
        CREATE TABLE IF NOT EXISTS career_rewards (
            case_id TEXT PRIMARY KEY,
            score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100)
        )
    """)
    connection.execute("""
        CREATE TABLE IF NOT EXISTS career_profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            selected_detective TEXT NOT NULL
        )
    """)
    connection.execute("""
        CREATE TABLE IF NOT EXISTS career_migrations (name TEXT PRIMARY KEY)
    """)


def points(connection: sqlite3.Connection) -> int:
    return connection.execute(
        "SELECT COALESCE(SUM(score), 0) FROM career_rewards"
    ).fetchone()[0]


def profile(connection: sqlite3.Connection) -> dict:
    solved_cases = [
        {"caseId": case_id, "score": score}
        for case_id, score in connection.execute(
            "SELECT case_id, score FROM career_rewards ORDER BY rowid"
        )
    ]
    total = sum(case["score"] for case in solved_cases)
    row = connection.execute(
        "SELECT selected_detective FROM career_profile WHERE id = 1"
    ).fetchone()
    return {
        "points": total,
        "solvedCases": solved_cases,
        "selectedDetective": row[0] if row else DEFAULT_DETECTIVE,
        "detectives": [
            {**detective, "unlocked": total >= detective["threshold"]}
            for detective in DETECTIVES.values()
        ],
    }


def select(connection: sqlite3.Connection, detective: str) -> None:
    if detective not in DETECTIVES:
        raise HTTPException(422, "Unknown detective")
    if points(connection) < DETECTIVES[detective]["threshold"]:
        raise HTTPException(409, "This detective is locked")
    connection.execute(
        """
        INSERT INTO career_profile (id, selected_detective) VALUES (1, ?)
        ON CONFLICT(id) DO UPDATE SET selected_detective = excluded.selected_detective
        """,
        (detective,),
    )


def award(connection: sqlite3.Connection, case_id: str, score: int | None) -> dict:
    """Record the successful solve, or report progression without crediting a loss."""
    before = points(connection)
    earned = 0
    if score is not None:
        inserted = connection.execute(
            "INSERT INTO career_rewards (case_id, score) VALUES (?, ?) ON CONFLICT(case_id) DO NOTHING",
            (case_id, score),
        )
        if inserted.rowcount == 1:
            earned = score
    total = before + earned
    new_unlocks = [
        detective["id"] for detective in DETECTIVES.values()
        if before < detective["threshold"] <= total
    ]
    next_detective = next(
        (detective for detective in DETECTIVES.values() if detective["threshold"] > total), None
    )
    return {
        "earned": earned,
        "points": total,
        "newUnlocks": new_unlocks,
        "nextUnlock": (
            {key: next_detective[key] for key in ("id", "name", "threshold")}
            if next_detective else None
        ),
    }


def legacy_migration_pending(connection: sqlite3.Connection) -> bool:
    return connection.execute(
        "SELECT 1 FROM career_migrations WHERE name = 'legacy-investigations'"
    ).fetchone() is None


def migrate_legacy(connection: sqlite3.Connection, case_id: str) -> None:
    """Credit the earliest saved solved legacy attempt once.

    Legacy records have no completion timestamp, so the order in which
    investigations were created is the available ordering.
    """
    marked = connection.execute(
        "INSERT INTO career_migrations (name) VALUES ('legacy-investigations') ON CONFLICT DO NOTHING"
    )
    if marked.rowcount == 0 or connection.execute(
        "SELECT 1 FROM career_rewards WHERE case_id = ?", (case_id,)
    ).fetchone():
        return
    for (encoded,) in connection.execute("SELECT state FROM investigations ORDER BY rowid"):
        state = json.loads(encoded)
        result = state.get("result") or {}
        if "caseId" not in state and result.get("solved"):
            award(connection, case_id, result["score"])
            return
