# ◈ Casefile AI

**Investigation 001 · The Midnight Proof**

At midnight, the lights cut out at Bellweather Printworks. When they returned, the original lithograph had been replaced. Examine the scene, compare three suspects' statements, and file a verdict before closing the case.

## Play the case

1. Examine files and pin them to the evidence board.
2. Interview suspects about their alibis, the print, and the blackout.
3. Find the statement that conflicts with the evidence.
4. Accuse a suspect, choose the method, and cite two examined files.

The suspect is worth 50 points, the method 30, and the two decisive files 10 each. The verdict reveals the full explanation. Reloading the same browser restores your progress.

## Run locally on Windows

Install Python 3.13 and Node.js 22.12 or newer. From the project directory, use two PowerShell terminals.

**Terminal 1 · API**

~~~powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements-dev.txt
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload
~~~

**Terminal 2 · Interface**

~~~powershell
cd frontend
npm.cmd ci
npm.cmd run dev
~~~

Open [the game](http://localhost:5173) or [the API docs](http://127.0.0.1:8000/docs). Vite forwards requests under /api to FastAPI. The first investigation creates backend/casefile.sqlite3. Set CASEFILE_DB before starting FastAPI to use a different database file.

## Architecture

~~~text
React + TypeScript  →  Vite /api proxy  →  FastAPI  →  SQLite
 browser save ID                            │
                                      case and dialogue
~~~

- **frontend/src** contains the investigation interface, typed API client, and save recovery.
- **backend/case.py** contains the fictional case and dialogue. The public brief omits evidence details and suspect answers until requested.
- **backend/main.py** owns progress, validation, and scoring. Each game has a UUID and a SQLite record. Mutations use an immediate transaction so simultaneous requests cannot overwrite each other's updates.
- **.github/workflows/test.yml** runs backend tests, frontend tests, and a production frontend build.

This is a local single-player application. The browser stores the investigation ID and the server stores progress. Keep the API on localhost for personal play.

## Verify changes

~~~powershell
.\.venv\Scripts\python.exe -m pytest -q
cd frontend
npm.cmd test
npm.cmd run build
~~~

## Roadmap

- [x] Case brief, evidence board, and scripted interviews
- [x] Persistent saves, accusation validation, and score breakdown
- [x] Automated tests and CI configuration
- [ ] Optional Ollama dialogue grounded in each character's knowledge and case facts
- [ ] Dialogue consistency tests and a deterministic fallback for local inference failures

The game requires no model, API key, or external service at runtime.
