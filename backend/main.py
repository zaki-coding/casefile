"""Casefile AI HTTP API and SQLite persistence."""

import json
import os
import sqlite3
from contextlib import closing, contextmanager
from pathlib import Path
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from .case import CASE, CULPRIT, EXPLANATION, METHOD
from .solution import DECISIVE_EVIDENCE, reveal
from .dialogue import LINES, interview_view

app = FastAPI(title="Casefile AI")
DB_PATH = Path(os.getenv("CASEFILE_DB", Path(__file__).with_name("casefile.sqlite3")))
SUSPECTS = {item["id"]: item for item in CASE["suspects"]}
EVIDENCE = {item["id"]: item for item in CASE["evidence"]}


@contextmanager
def database():
    with closing(sqlite3.connect(DB_PATH, isolation_level="IMMEDIATE")) as connection, connection:
        connection.execute(
            "CREATE TABLE IF NOT EXISTS investigations (id TEXT PRIMARY KEY, state TEXT NOT NULL)"
        )
        yield connection


def read(connection, investigation_id):
    row = connection.execute(
        "SELECT state FROM investigations WHERE id = ?", (str(investigation_id),)
    ).fetchone()
    if row is None:
        raise HTTPException(404, "Investigation not found")
    return json.loads(row[0])


@contextmanager
def edit(investigation_id):
    with database() as connection:
        connection.execute("BEGIN IMMEDIATE")
        state = read(connection, investigation_id)
        if state["result"] is not None:
            raise HTTPException(409, "This investigation is closed")
        yield state
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


@app.get("/api/case")
def case_brief():
    return {
        **CASE,
        "suspects": [{key: person[key] for key in ("id", "name", "role")}
                     for person in CASE["suspects"]],
        "evidence": [{key: clue[key] for key in ("id", "title", "source")}
                     for clue in CASE["evidence"]],
    }


@app.post("/api/investigations", status_code=201)
def start():
    investigation_id = str(uuid4())
    state = {"id": investigation_id, "board": {}, "interviews": [], "result": None}
    with database() as connection:
        connection.execute(
            "INSERT INTO investigations VALUES (?, ?)", (investigation_id, json.dumps(state))
        )
    return state


@app.get("/api/investigations/{investigation_id}")
def progress(investigation_id: UUID):
    with database() as connection:
        return read(connection, investigation_id)


@app.post("/api/investigations/{investigation_id}/evidence/{clue_id}")
def examine(investigation_id: UUID, clue_id: str):
    if clue_id not in EVIDENCE:
        raise HTTPException(404, "Evidence not found")
    with edit(investigation_id) as state:
        state["board"][clue_id] = EVIDENCE[clue_id]["detail"]
    return state


@app.get("/api/investigations/{investigation_id}/interviews/{suspect}")
def interview_scene(investigation_id: UUID, suspect: str):
    if suspect not in LINES:
        raise HTTPException(404, "Suspect not found")
    with database() as connection:
        return interview_view(read(connection, investigation_id), suspect)


@app.post("/api/investigations/{investigation_id}/interviews")
def interview(investigation_id: UUID, question: Question):
    if question.suspect not in LINES or question.topic not in LINES[question.suspect]:
        raise HTTPException(422, "Unknown suspect or interview topic")
    with edit(investigation_id) as state:
        view = interview_view(state, question.suspect)
        option = next(item for item in view["options"] if item["id"] == question.topic)
        if option["status"] == "locked":
            raise HTTPException(409, option["hint"])
        if option["status"] == "available":
            line = LINES[question.suspect][question.topic]
            state["interviews"].append({
                **question.model_dump(), "question": line.question, "answer": line.answer,
            })
    return state


@app.post("/api/investigations/{investigation_id}/accusation")
def accuse(investigation_id: UUID, accusation: Accusation):
    if accusation.suspect not in SUSPECTS or accusation.method not in CASE["methods"]:
        raise HTTPException(422, "Unknown suspect or method")
    with edit(investigation_id) as state:
        selected = set(accusation.evidence)
        if len(accusation.evidence) != 2 or len(selected) != 2 or selected - state["board"].keys():
            raise HTTPException(422, "Select two distinct pieces of examined evidence")
        breakdown = {
            "Suspect": 50 if accusation.suspect == CULPRIT else 0,
            "Method": 30 if accusation.method == METHOD else 0,
            "Evidence": 10 * len(selected & DECISIVE_EVIDENCE),
        }
        state["result"] = {
            "score": sum(breakdown.values()), "breakdown": breakdown,
            "solved": accusation.suspect == CULPRIT and accusation.method == METHOD,
            "explanation": EXPLANATION,
            "details": reveal(accusation.suspect, accusation.method, accusation.evidence),
        }
    return state
