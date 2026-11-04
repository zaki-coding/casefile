"""Case catalog. Private case material stays on the server."""

from dataclasses import dataclass

from . import case, case002, solution
from .dialogue import LINES, OPENINGS, Line, interview_view


@dataclass(frozen=True)
class CaseFile:
    id: str
    data: dict
    culprit: str
    method: str
    explanation: str
    decisive: set
    timeline: list
    lines: dict
    openings: dict
    pressure: dict
    insight: str
    forensics: dict

    def summary(self):
        return {
            "id": self.id, "number": self.id,
            **{key: self.data[key] for key in ("title", "location", "brief")},
            "suspectCount": len(self.data["suspects"]),
            "evidenceCount": len(self.data["evidence"]),
        }

    def brief(self):
        return {
            **self.summary(),
            "suspects": [{key: person[key] for key in ("id", "name", "role")}
                         for person in self.data["suspects"]],
            "evidence": [{key: clue[key] for key in ("id", "title", "source")}
                         for clue in self.data["evidence"]],
            "topics": self.data["topics"],
            "methods": self.data["methods"],
        }

    def scene(self, state, suspect):
        lines = self.lines[suspect]
        ability = state.get("ability") or {}
        if ability.get("type") == "pressure" and ability.get("target") == suspect:
            lines = {**lines, self.pressure["topic"]: Line(
                self.pressure["question"], self.pressure["answer"],
            )}
        titles = {clue["id"]: clue["title"] for clue in self.data["evidence"]}
        return interview_view(state, suspect, {suspect: lines}, self.openings, titles), lines


def build_lines(data, follow_ups):
    return {
        suspect["id"]: {
            **{topic: Line(question, suspect["answers"][topic])
               for topic, question in data["topics"].items()},
            **{topic: Line(**line) for topic, line in follow_ups[suspect["id"]].items()},
        }
        for suspect in data["suspects"]
    }


CASES = {
    "001": CaseFile(
        "001", case.CASE, case.CULPRIT, case.METHOD, case.EXPLANATION,
        solution.DECISIVE_EVIDENCE, solution.TIMELINE, LINES, OPENINGS,
        {
            "suspect": "ellis", "topic": "pressure_override", "evidence": "relay",
            "question": "Your report skips the panel interlock. What did you leave out?",
            "answer": "The test button only works with the corridor door shut. Whoever did it was inside. I left that out because the interlock had failed its inspection last month. It was working that night.",
        },
        "Put the access events and the outage on one timeline. A manual test establishes where the operator had to be. A badge by itself only tells you which credential opened the door.",
        {
            "relay": "The timestamp is recorded at the panel, independent of the gallery controller. A fault upstream would register as an undervoltage event, which is absent.",
            "badge": "Both entries report an accepted physical badge tap. There is no remote unlock or denied credential immediately before either event.",
            "proof": "The paper has recent handling impressions under the frame clips. The intact seal rules out levering the backing out through the sealed edge.",
            "gate": "Frame sequence numbers are uninterrupted. The camera clock agrees with the access controller to within one second.",
            "stream": "The raw audio and video tracks have continuous timestamps. The posted archive contains no cut during the blackout.",
        },
    ),
    "002": CaseFile(
        "002", case002.CASE, case002.CULPRIT, case002.METHOD, case002.EXPLANATION,
        case002.DECISIVE_EVIDENCE, case002.TIMELINE,
        build_lines(case002.CASE, case002.FOLLOW_UPS), case002.OPENINGS,
        {**case002.PRESSURE, "evidence": "route"}, case002.INSIGHT, case002.FORENSICS,
    ),
}
