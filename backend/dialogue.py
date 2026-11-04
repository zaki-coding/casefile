"""Deterministic suspect dialogue and unlock rules for The Midnight Proof."""

from dataclasses import dataclass

from .case import CASE


@dataclass(frozen=True)
class Line:
    question: str
    answer: str
    after: tuple[str, ...] = ()
    evidence: tuple[str, ...] = ()


OPENINGS = {
    "mara": "May I move this lamp? Thank you. Strong light is useful for examining paper. People tend to fare worse.",
    "ellis": "I wrote the shift report myself. If you want a time, ask for a time.",
    "june": "I have a room full of donors asking why the lights went out. I take it you're here about what happened while they were out.",
}

FOLLOW_UPS = {
    "mara": {
        "alibi_witness": Line(
            "Who could confirm you were in the washroom?",
            "No one. I stepped away to rinse ink from my fingers. I wasn't expecting to need a witness.",
            after=("alibi",),
        ),
        "print_mark": Line(
            "Your proof mark is on the back. Why would that be?",
            "I marked the studio proofs so they couldn't be confused with the original. Apparently I underestimated someone's willingness to turn one over.",
            after=("print",),
            evidence=("proof",),
        ),
        "relay_sound": Line(
            "What made you recognize the relay?",
            "It makes two dry clicks, one for each position. I've worked through enough maintenance tests to recognize it.",
            after=("lights",),
        ),
        "badge_conflict": Line(
            "You said the card stayed in your pocket. Why did it open both doors?",
            "Both doors? Let me see those times. … I remember stepping away from the preview. I can't give you a better account of those seconds just because you have them printed out.",
            after=("alibi",),
            evidence=("badge",),
        ),
    },
    "ellis": {
        "gate_witness": Line(
            "Can anyone back up your account of the east gate?",
            "The caterer was loading trays. Ask them, or pull the gate footage. That camera doesn't miss much.",
            after=("alibi",),
        ),
        "gate_footage": Line(
            "The camera places you at the gate. What did you notice there?",
            "I could still see the gate lights. It was the gallery that dropped out, not the whole building. At the time I thought somebody had scheduled a test.",
            after=("alibi",),
            evidence=("gate",),
        ),
        "frame_access": Line(
            "What would a forced frame look like?",
            "A torn seal, at minimum. The conservation release lets you open the enclosure without touching the seal. It logs the card that opens it.",
            after=("print",),
        ),
        "relay_log": Line(
            "The log shows a manual test at midnight. Could that have been automatic?",
            "No. That entry means somebody used the corridor switch. A scheduled test would have been in my shift orders.",
            after=("lights",),
            evidence=("relay",),
        ),
    },
    "june": {
        "stream_recording": Line(
            "Is there a recording of the whole broadcast?",
            "There is. The booth and camera had backup power. I kept answering questions because dead air gives people time to invent their own story.",
            after=("alibi",),
        ),
        "stream_footage": Line(
            "Your stream covers the blackout. When did you learn about the swap?",
            "After the lights came back. A gallery attendant held up a note that said 'check the print.' I finished the answer I was giving, then cut the feed.",
            after=("alibi",),
            evidence=("stream",),
        ),
        "treatment_request": Line(
            "Why did you turn down the treatment request?",
            "Conservation wanted the original off display before the preview. I asked them to wait until after. We had donors coming specifically to see that sheet.",
            after=("print",),
        ),
        "planned_outage": Line(
            "The relay log shows a manual test. Did anyone clear one with you?",
            "No. Even a ten-second interruption would have gone in the running order. I'd have had the room cleared first.",
            after=("lights",),
            evidence=("relay",),
        ),
    },
}

LINES = {
    suspect["id"]: {
        **{
            topic: Line(question, suspect["answers"][topic])
            for topic, question in CASE["topics"].items()
        },
        **FOLLOW_UPS[suspect["id"]],
    }
    for suspect in CASE["suspects"]
}
EVIDENCE_TITLES = {item["id"]: item["title"] for item in CASE["evidence"]}


def interview_view(state, suspect):
    lines = LINES[suspect]
    transcript = [
        {**entry, "question": entry.get("question") or lines[entry["topic"]].question}
        for entry in state["interviews"]
        if entry["suspect"] == suspect
    ]
    asked = {entry["topic"] for entry in transcript}
    options = []
    for topic, line in lines.items():
        option = {"id": topic, "label": line.question, "status": "available"}
        missing = [
            *(f"Ask: {lines[previous].question}" for previous in line.after if previous not in asked),
            *(f"Examine: {EVIDENCE_TITLES[clue]}" for clue in line.evidence if clue not in state["board"]),
        ]
        if topic in asked:
            option["status"] = "asked"
        elif state["result"] is not None:
            option.update(status="locked", hint="This investigation is closed.")
        elif missing:
            option.update(status="locked", hint=" · ".join(missing))
        if option["status"] == "locked" and line.evidence:
            option["label"] = f"Discuss the {EVIDENCE_TITLES[line.evidence[0]].lower()}"
        options.append(option)
    return {"suspect": suspect, "opening": OPENINGS[suspect], "options": options,
            "transcript": transcript}
