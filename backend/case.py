"""Public case material and private solution for The Midnight Proof."""

CASE = {
    "title": "The Midnight Proof",
    "location": "Bellweather Printworks",
    "brief": "At midnight, the lights went out at a museum preview. When they came back, the original Bellweather lithograph had been swapped for a reproduction. Find who made the switch and how.",
    "suspects": [
        {"id": "mara", "name": "Mara Vale", "role": "Paper conservator",
         "answers": {"alibi": "I was alone in the washroom. My access card never left my pocket.",
                     "print": "The replacement is a proof from the conservation studio.",
                     "lights": "I heard the emergency relay click twice."}},
        {"id": "ellis", "name": "Ellis Ward", "role": "Night security",
         "answers": {"alibi": "I was escorting the caterer out through the east gate.",
                     "print": "Only conservation can open the frame without breaking its seal.",
                     "lights": "The manual test switch is inside the service corridor."}},
        {"id": "june", "name": "June Park", "role": "Exhibition producer",
         "answers": {"alibi": "I was taking donor questions on the recorded livestream.",
                     "print": "I rejected a request to remove the original for treatment.",
                     "lights": "The outage wasn't on the event schedule."}},
    ],
    "topics": {"alibi": "Where were you at midnight?", "print": "What do you know about the print?",
               "lights": "What happened to the lights?"},
    "evidence": [
        {"id": "relay", "title": "Relay event log", "source": "Service corridor",
         "detail": "The corridor's manual test switch cut gallery power for 43 seconds at midnight. External power stayed stable."},
        {"id": "badge", "title": "Badge access report", "source": "Security desk",
         "detail": "Mara's personal badge opened the service corridor at 23:59 and the gallery frame enclosure at 00:00."},
        {"id": "proof", "title": "Replacement print", "source": "Gallery frame",
         "detail": "The reverse bears Mara's conservation proof mark. The frame seal is intact, consistent with use of its conservation release."},
        {"id": "gate", "title": "East gate video", "source": "Security archive",
         "detail": "Ellis appears continuously on the gate camera from 23:58 to 00:03."},
        {"id": "stream", "title": "Livestream archive", "source": "Event booth",
         "detail": "June is visible and answering questions continuously throughout the blackout."},
    ],
    "methods": {"switch": "Triggered the manual relay and used conservation access",
                "storm": "Waited for an external power failure",
                "seal": "Forced the frame while guests were distracted"},
}

CULPRIT = "mara"
METHOD = "switch"
EXPLANATION = (
    "Mara cut the lights from the service corridor, used her badge to open the enclosure, "
    "and swapped the original for her studio proof. The badge report contradicts her washroom "
    "alibi and her claim that the card stayed with her. The relay log establishes the staged outage."
)
