"""Apply one detective action to an open investigation."""

from fastapi import HTTPException

ABILITIES = {"adrian": "insight", "selena": "pressure", "elias": "analysis"}


def use_ability(state, case, action, target):
    if ABILITIES.get(state["detectiveId"]) != action:
        raise HTTPException(403, "This detective cannot use that ability.")
    if state["ability"] is not None:
        raise HTTPException(409, "Your ability has already been used in this investigation.")

    if action == "insight":
        if target is not None:
            raise HTTPException(422, "Insight does not take a target.")
        if len(state["board"]) < 2:
            raise HTTPException(409, "Examine at least two evidence files before using Insight.")
        message = case.insight
    elif action == "pressure":
        if target != case.pressure["suspect"]:
            raise HTTPException(422, "This suspect has no Pressure opportunity.")
        if not any(entry["suspect"] == target for entry in state["interviews"]):
            raise HTTPException(409, "Ask this suspect a question before applying Pressure.")
        if case.pressure["evidence"] not in state["board"]:
            raise HTTPException(409, "Examine the evidence linked to this suspect before applying Pressure.")
        message = "A new question is available in this interview."
    else:
        if target not in case.forensics:
            raise HTTPException(422, "This evidence cannot be analyzed.")
        if target not in state["board"]:
            raise HTTPException(409, "Examine the evidence before running Deep Analysis.")
        message = case.forensics[target]

    state["ability"] = {"type": action, "target": target, "message": message}


def ability_options(state, case):
    action = ABILITIES[state["detectiveId"]]
    if action == "pressure":
        return {"type": action, "targets": [case.pressure["suspect"]],
                "requiredEvidence": case.pressure["evidence"]}
    if action == "analysis":
        return {"type": action, "targets": list(case.forensics)}
    return {"type": action, "targets": []}
