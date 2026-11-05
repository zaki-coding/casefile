# ◈ Casefile AI

**A local detective bureau with two playable mysteries**

- **001 · The Midnight Proof.** A blackout at Bellweather Printworks conceals a lithograph swap.
- **002 · The Ninth Sounding.** A recorder vanishes during lockdown at Kestrel Tide Observatory. Four suspects and ten evidence files offer competing explanations.

## Play the case

1. Choose a detective and case at the bureau, then confirm your assignment.
2. Examine files and pin them to the evidence board.
3. Enter the interview room, choose a suspect, and build a transcript. Follow-up questions unlock after earlier exchanges or after you examine the relevant evidence.
4. Accuse a suspect, choose the method, and cite two examined files.

The suspect is worth 50 points, the method 30, and the two decisive files 10 each. The closing report reveals the culprit, reconstructs the theft, and compares your choices with the evidence. Reloading the same browser restores your progress and transcripts. Completed saves from the first version still show their original score and explanation.

## Detective career

- **Adrian Cross · Insight.** Available from the start. Examine two files, then reveal a hint about how to connect the evidence.
- **Selena Voss · Pressure.** Unlocks at 60 career points. Interview the indicated suspect and examine the linked evidence to open an exclusive follow-up.
- **Elias Mercer · Deep Analysis.** Unlocks at 150 career points. Pick one examined file for an additional forensic observation.

Each ability is optional and available once per investigation. The first successful solution of each case adds its score to your career total. Failed attempts and later replays add zero points. Two cases offer up to 200 points. Additional unique cases can extend the career without changing the reward rules.

The local profile and saved investigations share the SQLite database. The bureau archive can reopen earlier investigations. Existing saves are treated as Case 001 with Adrian, and the earliest saved solved Case 001 attempt receives one-time career credit. Legacy records store creation order but have no completion timestamp.

## Investigation equipment

The bureau's equipment locker previews every tool and its permanent career unlock.
During a case, open **Equipment**, choose a tool, and select a compatible examination.
Examine its source files on the evidence board first.

| Equipment | Career points | Interaction |
| --- | ---: | --- |
| Investigation Lens | 0 | Select a region of a document or object to inspect |
| Forensic Kit | 50 | Choose a suitable preservation or trace-comparison method |
| Digital Evidence Analyzer | 110 | Select two examined records to correlate |
| Timeline Reconstruction Board | 170 | Move sourced event cards into chronological order |

Both cases contain tailored examinations for all four tools. Results go into the
case's persistent field notes. They establish constraints and handling context;
the player still chooses whom to accuse. Equipment and detective abilities are
independent, and both cases can still be solved with Adrian at zero career points.

Points are never spent. A first 100-point solution unlocks the Forensic Kit; a
second unique 100-point solution unlocks the Analyzer and Timeline Board. A replay
grants zero additional points. Lower-scoring solutions can cross fewer milestones;
with only two cases, a career ending below 170 cannot currently reach every tool.
Future unique cases can extend progression using the existing reward ledger.

`backend/equipment.py` holds the shared catalog and private case challenges.
The equipment API validates career access, examined sources, case compatibility,
selection shape and reconstruction order inside the existing save transaction.
Only public prompts and choices are returned before success. Findings extend the
investigation JSON without replacing the SQLite schema or older save data.

## Run locally on Windows

For a single local server after installing the dependencies below, build the
interface with `npm.cmd run build` inside `frontend`, then run
`.\.venv\Scripts\python.exe run_game.py` from the project directory. Open
[Casefile AI](http://127.0.0.1:8765). This serves the production interface and API
together; stop it with Ctrl+C. Pass `--port 8766` to choose another local port.
Your SQLite saves stay in `backend/casefile.sqlite3`.

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
- **backend/cases.py** registers each case with its dialogue, solution and detective abilities. Public briefs omit private evidence details, dialogue answers and solutions.
- **backend/main.py** owns progress, validation, and scoring. Each game has a UUID and a SQLite record.
- **backend/career.py** keeps one reward per case in SQLite. Closing a case and crediting the career share one transaction, so duplicate requests or simultaneous solves cannot double-award points.
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
