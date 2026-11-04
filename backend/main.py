"""Casefile AI HTTP API and SQLite persistence."""

import json
import os
import sqlite3
from contextlib import closing, contextmanager
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from . import career
from .abilities import ability_options, use_ability
from .cases import CASES
from .solution import reveal

app = FastAPI(title="Casefile AI")
DB_PATH = Path(os.getenv("CASEFILE_DB", Path(__file__).with_name("casefile.sqlite3")))
DEFAULT_CASE = "001"


@contextmanager
def database():
    with closing(sqlite3.connect(DB_PATH, isolation_level="IMMEDIATE")) as connection, connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS investigations (id TEXT PRIMARY KEY, state TEXT NOT NULL)"
        )
        career.initialize(connection)
        if career.legacy_migration_pending(connection):
            with connection:
                connection.execute("BEGIN IMMEDIATE")
                career.migrate_legacy(connection, DEFAULT_CASE)
        yield connection


def get_case(case_id):
    if case_id not in CASES:
        raise HTTPException(404, "Case not found")
    return CASES[case_id]


def restore(raw_state):
    state = json.loads(raw_state)
    state.setdefault("caseId", DEFAULT_CASE)
    state.setdefault("detectiveId", career.DEFAULT_DETECTIVE)
    state.setdefault("ability", None)
    return state


def response(state):
    return {**state, "abilityOptions": ability_options(state, get_case(state["caseId"]))}


def read(connection, investigation_id):
    row = connection.execute(
        "SELECT state FROM investigations WHERE id = ?", (str(investigation_id),)
    ).fetchone()
    if row is None:
        raise HTTPException(404, "Investigation not found")
    return restore(row[0])


@contextmanager
def edit(investigation_id):
    with database() as connection:
        connection.execute("BEGIN IMMEDIATE")
        state = read(connection, investigation_id)
        if state["result"] is not None:
            raise HTTPException(409, "This investigation is closed")
        yield state, get_case(state["caseId"]), connection
        connection.execute(
            "UPDATE investigations SET state = ? WHERE id = ?",
            (json.dumps(state), str(investigation_id)),
        )


class Question(BaseModel):
    suspect: str
    topic: str


class Accusation(BaseModel):
    suspect: str
    method: str
    evidence: list[str]


class NewInvestigation(BaseModel):
    caseId: str = DEFAULT_CASE
    detectiveId: str | None = None


class Selection(BaseModel):
    detectiveId: str


class Ability(BaseModel):
    type: str
    target: str | None = None


@app.get("/api/cases")
def case_catalog():
    return [case.summary() for case in CASES.values()]


@app.get("/api/case")
def default_brief():
    return get_case(DEFAULT_CASE).brief()


@app.get("/api/case/{case_id}")
def case_brief(case_id: str):
    return get_case(case_id).brief()


@app.get("/api/profile")
def profile():
    with database() as connection:
        connection.execute("BEGIN")
        return career.profile(connection)


@app.put("/api/profile/detective")
def select_detective(selection: Selection):
    with database() as connection:
        connection.execute("BEGIN IMMEDIATE")
        career.select(connection, selection.detectiveId)
        return career.profile(connection)


@app.get("/api/investigations")
def investigation_archive():
    with database() as connection:
        states = (restore(raw) for (raw,) in
                  connection.execute("SELECT state FROM investigations ORDER BY rowid DESC"))
        return [
            {"id": state["id"], "caseId": state["caseId"], "detectiveId": state["detectiveId"],
             "closed": state["result"] is not None}
            for state in states
        ]


@app.post("/api/investigations", status_code=201)
def start(request: NewInvestigation | None = None):
    request = request or NewInvestigation()
    get_case(request.caseId)
    with database() as connection:
        connection.execute("BEGIN IMMEDIATE")
        detective = request.detectiveId
        if detective is None:
            detective = career.profile(connection)["selectedDetective"]
        career.select(connection, detective)
        state = {"id": str(uuid4()), "caseId": request.caseId, "detectiveId": detective,
                 "board": {}, "interviews": [], "ability": None, "result": None}
        connection.execute("INSERT INTO investigations VALUES (?, ?)", (state["id"], json.dumps(state)))
    return response(state)


@app.get("/api/investigations/{investigation_id}")
def progress(investigation_id: UUID):
    with database() as connection:
        return response(read(connection, investigation_id))


@app.post("/api/investigations/{investigation_id}/evidence/{clue_id}")
def examine(investigation_id: UUID, clue_id: str):
    with edit(investigation_id) as (state, case, _):
        clue = next((clue for clue in case.data["evidence"] if clue["id"] == clue_id), None)
        if clue is None:
            raise HTTPException(404, "Evidence not found")
        state["board"][clue_id] = clue["detail"]
    return response(state)


@app.get("/api/investigations/{investigation_id}/interviews/{suspect}")
def interview_scene(investigation_id: UUID, suspect: str):
    with database() as connection:
        state = read(connection, investigation_id)
        case = get_case(state["caseId"])
        if suspect not in case.lines:
            raise HTTPException(404, "Suspect not found")
        return case.scene(state, suspect)[0]


@app.post("/api/investigations/{investigation_id}/interviews")
def interview(investigation_id: UUID, question: Question):
    with edit(investigation_id) as (state, case, _):
        if question.suspect not in case.lines:
            raise HTTPException(422, "Unknown suspect or interview topic")
        view, lines = case.scene(state, question.suspect)
        if question.topic not in lines:
            raise HTTPException(422, "Unknown suspect or interview topic")
        option = next(item for item in view["options"] if item["id"] == question.topic)
        if option["status"] == "locked":
            raise HTTPException(409, option["hint"])
        if option["status"] == "available":
            line = lines[question.topic]
            state["interviews"].append({
                **question.model_dump(), "question": line.question, "answer": line.answer,
            })
    return response(state)


@app.post("/api/investigations/{investigation_id}/ability")
def activate_ability(investigation_id: UUID, ability: Ability):
    with edit(investigation_id) as (state, case, _):
        use_ability(state, case, ability.type, ability.target)
    return response(state)


@app.post("/api/investigations/{investigation_id}/accusation")
def accuse(investigation_id: UUID, accusation: Accusation):
    with edit(investigation_id) as (state, case, connection):
        if accusation.suspect not in case.lines or accusation.method not in case.data["methods"]:
            raise HTTPException(422, "Unknown suspect or method")
        selected = set(accusation.evidence)
        if len(accusation.evidence) != 2 or len(selected) != 2 or selected - state["board"].keys():
            raise HTTPException(422, "Select two distinct pieces of examined evidence")
        breakdown = {
            "Suspect": 50 if accusation.suspect == case.culprit else 0,
            "Method": 30 if accusation.method == case.method else 0,
            "Evidence": 10 * len(selected & case.decisive),
        }
        score = sum(breakdown.values())
        solved = accusation.suspect == case.culprit and accusation.method == case.method
        state["result"] = {
            "score": score, "breakdown": breakdown, "solved": solved,
            "explanation": case.explanation,
            "details": reveal(accusation.suspect, accusation.method, accusation.evidence,
                              case=case.data, culprit=case.culprit, correct_method=case.method,
                              decisive=case.decisive, timeline=case.timeline),
            "career": career.award(connection, case.id, score if solved else None),
        }
    return response(state)
