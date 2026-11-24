"""Private deduction rules and scoring for The Midnight Proof."""

from fastapi import HTTPException

from .solution import reveal

MOTIVES = {
    "protect": "Protect the original from further light damage",
    "sell": "Sell the original for personal profit",
    "sabotage": "Embarrass the exhibition producer",
}

RELATIONSHIPS = {
    "opportunity": "Access overlaps a deliberate blackout",
    "urgency": "A documented risk explains the rejected removal request",
    "forced": "The frame was forced during an external power failure",
}

# A relationship must be supported by both files. Order has no meaning.
DEDUCTIONS = {
    "opportunity": ({"badge", "relay"}, "The same credential reached both sites in the manual blackout window. Find out who held the card."),
    "urgency": ({"condition", "treatment"}, "Fresh fading made removal urgent. The signed request and its rejection establish why the display was still lit."),
}

CONTRADICTIONS = {"badge_confrontation", "treatment_conflict"}
SUPPORT = {
    "Identity": {"badge": "The access report traces Mara's credential to both locations. Her account is needed to establish who carried it."},
    "Motive": {"treatment": "Mara's signed request shows she wanted the original removed to prevent further fading."},
    "Method": {
        "relay": "The relay log identifies a deliberate, local test and rules out a supply failure.",
        "proof": "The studio proof and intact seal support substitution through the conservation release.",
    },
}
MAXIMUMS = {"Suspect": 15, "Motive": 15, "Method": 10, "Evidence": 36,
            "Deductions": 12, "Contradictions": 12}


def connect(state, evidence, relationship):
    pair = set(evidence)
    if len(evidence) != 2 or len(pair) != 2 or pair - state["board"].keys():
        raise HTTPException(422, "Select two distinct examined files.")
    if relationship not in RELATIONSHIPS:
        raise HTTPException(422, "Choose a listed relationship.")
    deduction = DEDUCTIONS.get(relationship)
    if deduction is None or pair != deduction[0]:
        raise HTTPException(409, "These files do not establish that relationship. Compare what each record actually documents.")
    if any(item["id"] == relationship for item in state["deductions"]):
        return
    state["deductions"].append({
        "id": relationship, "title": RELATIONSHIPS[relationship],
        "explanation": deduction[1], "evidence": sorted(pair),
    })


def verdict(state, case, accusation):
    if accusation.motive not in MOTIVES:
        raise HTTPException(422, "Choose a listed motive.")
    files = accusation.evidence
    if len(files) != len(SUPPORT) or len(set(files)) != len(SUPPORT) or set(files) - state["board"].keys():
        raise HTTPException(422, "Cite three distinct examined files for identity, motive and method.")

    details = reveal(accusation.suspect, accusation.method, files, case=case.data,
                     culprit=case.culprit, correct_method=case.method,
                     decisive=case.decisive, timeline=case.timeline)
    motive_correct = accusation.motive == "protect"
    details.update(motive=MOTIVES["protect"], motiveChoice=MOTIVES[accusation.motive],
                   motiveCorrect=motive_correct)
    titles = {clue["id"]: clue["title"] for clue in case.data["evidence"]}
    claim_matches = (details["suspectCorrect"], motive_correct, details["methodCorrect"])
    for file, (claim, accepted), claim_matches_record in zip(
            details["evidence"], SUPPORT.items(), claim_matches, strict=True):
        relevant = file["id"] in accepted
        alternatives = " or ".join(titles[clue_id] for clue_id in accepted)
        explanation = accepted.get(file["id"], f"This file does not establish {claim.lower()}. Compare {alternatives}.")
        if relevant and not claim_matches_record:
            explanation += " This supports the reconstructed case rather than the claim you chose."
        file.update(claim=claim, correct=relevant and claim_matches_record, explanation=explanation)

    deductions = {item["id"] for item in state["deductions"]} & DEDUCTIONS.keys()
    contradictions = {entry["topic"] for entry in state["interviews"]} & CONTRADICTIONS
    breakdown = {
        "Suspect": MAXIMUMS["Suspect"] * details["suspectCorrect"],
        "Motive": MAXIMUMS["Motive"] * motive_correct,
        "Method": MAXIMUMS["Method"] * details["methodCorrect"],
        "Evidence": 12 * sum(file["correct"] for file in details["evidence"]),
        "Deductions": 6 * len(deductions),
        "Contradictions": 6 * len(contradictions),
    }
    details["keyClues"] = [
        {"title": "Badge report and Mara's account", "explanation": "The credential alone could have been borrowed. Confronting Mara with the access report after establishing the blackout window gets her to admit she carried it into the corridor."},
        {"title": "Condition survey and treatment request", "explanation": "The conservator documented fresh fading and asked for immediate removal. June's refusal left the original exposed and explains the timing of the swap."},
        {"title": "Relay log and replacement print", "explanation": "The local test gave Mara 43 seconds. The intact seal and marked proof explain how the original was substituted through the conservation release."},
        {"title": "Gate video and livestream", "explanation": "Both recordings cover the blackout, placing Ellis at the east gate and June at the booth."},
    ]
    solved = (details["suspectCorrect"] and motive_correct and details["methodCorrect"]
              and all(file["correct"] for file in details["evidence"]))
    return {"score": sum(breakdown.values()), "breakdown": breakdown,
            "maximums": MAXIMUMS, "solved": solved, "details": details,
            "explanation": case.explanation}
