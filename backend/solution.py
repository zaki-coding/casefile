"""Post-submission reveal for The Midnight Proof."""

from .case import CASE, CULPRIT, METHOD

DECISIVE_EVIDENCE = {"badge", "relay"}
TIMELINE = [
    {
        "time": "23:59",
        "title": "Into the service corridor",
        "description": "Mara entered the corridor using her personal badge, contradicting her washroom alibi.",
        "evidence": "Badge access report",
    },
    {
        "time": "00:00",
        "title": "The gallery goes dark",
        "description": "The manual test switch cut gallery power for 43 seconds. External power stayed stable.",
        "evidence": "Relay event log",
    },
    {
        "time": "00:00",
        "title": "The original is replaced",
        "description": "Mara opened the enclosure with her conservation access and swapped in the studio proof without breaking the frame seal.",
        "evidence": "Badge access report and replacement print",
    },
    {
        "time": "00:01",
        "title": "The other accounts hold",
        "description": "The gate recording and livestream place Ellis and June elsewhere throughout the blackout.",
        "evidence": "East gate video and livestream archive",
    },
]


def reveal(suspect, method, evidence):
    names = {person["id"]: person["name"] for person in CASE["suspects"]}
    titles = {clue["id"]: clue["title"] for clue in CASE["evidence"]}
    return {
        "culprit": names[CULPRIT],
        "method": CASE["methods"][METHOD],
        "suspectChoice": names[suspect],
        "methodChoice": CASE["methods"][method],
        "suspectCorrect": suspect == CULPRIT,
        "methodCorrect": method == METHOD,
        "evidence": [
            {"id": clue_id, "title": titles[clue_id], "correct": clue_id in DECISIVE_EVIDENCE}
            for clue_id in evidence
        ],
        "timeline": TIMELINE,
    }
