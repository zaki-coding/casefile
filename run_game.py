"""Serve the built game and its API together on localhost."""

import argparse
from pathlib import Path

import uvicorn
from fastapi.staticfiles import StaticFiles

from backend.main import app


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    build = Path(__file__).parent / "frontend" / "dist"
    if not (build / "index.html").is_file():
        raise SystemExit("Build the interface first: cd frontend; npm.cmd run build")
    app.mount("/", StaticFiles(directory=build, html=True), name="game")
    uvicorn.run(app, host="127.0.0.1", port=args.port)
