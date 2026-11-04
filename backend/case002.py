"""Case 002 content. The catalog exposes the brief and keeps the solution private."""

CASE = {
    "title": "The Ninth Sounding",
    "location": "Kestrel Tide Observatory",
    "brief": (
        "A steel pressure recorder from the ninth seabed survey disappeared during a storm lockdown. "
        "Its readings could halt tomorrow's opening of the Kestrel flood barrier. The vault seal is intact, "
        "but the recorder is gone. Reconstruct its route and identify who set it in motion."
    ),
    "suspects": [
        {
            "id": "ivo", "name": "Ivo Rusk", "role": "Night maintenance chief",
            "answers": {
                "alibi": "At 02:12 I was under the pump deck talking a new hire through a stuck intake. Both hands were busy.",
                "recorder": "The recorder fits a dry carrier. We move reference weights that way. The survey team normally takes the real instruments through the vault door.",
                "lockdown": "The storm interlock stops regular transfers. There is a hand-operated test selector for maintenance, but we were under orders to leave it alone.",
            },
        },
        {
            "id": "sabine", "name": "Sabine Vey", "role": "Barrier safety certifier",
            "answers": {
                "alibi": "I signed the briefing register at 02:08 and worked at my seat until the all-clear. I did not go into the transfer alcove.",
                "recorder": "A single reading is meaningless out of context. I had planned to review it in daylight, with the calibration charts in front of me.",
                "lockdown": "Once the storm alarm went, I assumed everything mechanical was locked in place. That is what the notice says.",
            },
        },
        {
            "id": "noa", "name": "Noa Serrat", "role": "Hydroacoustics researcher",
            "answers": {
                "alibi": "I was presenting the ninth sounding over the lab link. You can hear me arguing with the mainland office on the recording.",
                "recorder": "The digital preview clipped the steepest pressure drop. Without the original I can show that something happened, but I can't measure how bad it was.",
                "lockdown": "I heard a hollow double knock through my headset. I assumed it was rain on the dish and kept talking.",
            },
        },
        {
            "id": "rhea", "name": "Rhea Pike", "role": "Launch pilot",
            "answers": {
                "alibi": "I was securing the launch. The deck camera is pointed straight at the lines, which is where I spent the whole alarm.",
                "recorder": "I brought it in sealed. I know boats and tow lines. Once a recorder crosses the quarantine stripe it belongs to the station.",
                "lockdown": "The stern hatch didn't open. In that swell you'd have heard the warning bell all the way up the stairs.",
            },
        },
    ],
    "topics": {
        "alibi": "Where were you when the recorder went missing?",
        "recorder": "What did the ninth sounding mean to you?",
        "lockdown": "What did you notice during the lockdown?",
    },
    "evidence": [
        {"id": "seal", "title": "Vault seal inspection", "source": "Archive cage",
         "detail": "The stamped wire seal is intact and unspliced. Inside the cage, a set of dry-carrier guide rails runs from the cradle into the wall."},
        {"id": "route", "title": "Carrier drum trace", "source": "Transfer alcove",
         "detail": "A mechanical drum records a loaded carrier leaving the vault at 02:12 and arriving at the isolated sample drawer. The load and cradle code match recorder N-09. The trace includes a manual test pulse."},
        {"id": "latch", "title": "Selector jaw impression", "source": "Transfer alcove",
         "detail": "The jammed test selector holds a fresh impression from a chipped triangular service wrench. Only two wrenches fit. Ivo's intact wrench was sealed with his pump kit, and the checkout image shows the chipped wrench clipped to Sabine's wrist tether."},
        {"id": "drawer", "title": "Sample drawer liner", "source": "Isolation bay",
         "detail": "The liner holds wet salt from a cylindrical object and two blue fibers. The empty carrier sits beside it. The storm crew found a tied blue isolation sack under the reclaim grate."},
        {"id": "certification", "title": "Conditional approval memo", "source": "Briefing table",
         "detail": "Sabine signed off on the barrier subject to the ninth sounding. An abnormal reading would suspend her certificate and reopen a repair she certified six months earlier."},
        {"id": "register", "title": "Briefing register", "source": "Briefing room",
         "detail": "Sabine signed at 02:08. There are no later entries or witnesses. The transfer alcove is ten seconds from the briefing room by the interior stairs."},
        {"id": "pumps", "title": "Pump deck training feed", "source": "Maintenance terminal",
         "detail": "The training camera shows Ivo and the apprentice working on the intake from 02:10 to 02:16. A numbered seal on Ivo's wrench roll remains intact throughout."},
        {"id": "lab", "title": "Mainland lab link", "source": "Research console",
         "detail": "Noa's camera and microphone run continuously from 02:09 to 02:15. At 02:12 a muffled double knock is audible. Noa is still visible at the console."},
        {"id": "deck", "title": "Launch deck camera", "source": "Mooring station",
         "detail": "Rhea is on the exposed deck from 02:08 through 02:16. The hatch warning circuit stays closed, and no one transfers anything between the launch and the station."},
        {"id": "preview", "title": "Clipped pressure preview", "source": "Chart recorder",
         "detail": "The preview from N-09 bottoms out at the display limit. That does not prove failure, but the original recorder is the only record of the full excursion."},
    ],
    "methods": {
        "bypass": "Used the manual test selector to reroute the recorder in a dry carrier",
        "hatch": "Removed the recorder through the stern hatch during the storm",
        "substitute": "Substituted a dummy recorder before the launch docked",
        "forced": "Broke into the archive cage and took the recorder by hand",
    },
}

CULPRIT = "sabine"
METHOD = "bypass"
DECISIVE_EVIDENCE = {"route", "latch"}
EXPLANATION = (
    "Sabine used the chipped service wrench on the local test selector while the station was locked down. "
    "It sent the loaded dry carrier from the sealed vault to the sample drawer. She took N-09 out of the carrier "
    "and hid it in an isolation sack under the reclaim grate. The recorder was recovered from that sack. "
    "She was trying to keep the full pressure trace out of the review that would suspend her barrier certificate."
)

TIMELINE = [
    {"time": "02:08", "title": "A signature buys an alibi",
     "description": "Sabine signed in at the briefing table. The register proved she arrived, but it could not place her there four minutes later.",
     "evidence": "Briefing register"},
    {"time": "02:12", "title": "One wrench defeats the interlock",
     "description": "Sabine turned the jammed selector with the chipped service wrench. The soft jaw took an impression of its damaged corner.",
     "evidence": "Selector jaw impression"},
    {"time": "02:12", "title": "N-09 leaves a sealed vault",
     "description": "The test circuit sent the recorder down the dry transfer rails. Noa's microphone caught the carrier seating in the sample drawer.",
     "evidence": "Carrier drum trace and mainland lab link"},
    {"time": "02:14", "title": "The recording is hidden",
     "description": "Sabine emptied the carrier and slipped N-09 into a blue isolation sack beneath the reclaim grate.",
     "evidence": "Sample drawer liner"},
    {"time": "After the storm", "title": "The barrier stays shut",
     "description": "The original trace was recovered. The mainland office suspended the opening pending a full pressure review.",
     "evidence": "Conditional approval memo and clipped pressure preview"},
]

OPENINGS = {
    "ivo": "Mind the bucket. It's catching water in two places, if you count the drip off my sleeve.",
    "sabine": "You can ask about my movements or my judgment. Those are separate questions.",
    "noa": "I have the raw preview queued. Give me one minute to prove what it doesn't show.",
    "rhea": "The launch is still taking weather. If I'm needed upstairs, say what for.",
}

FOLLOW_UPS = {
    "ivo": {
        "cradle": {
            "question": "Could a carrier take the recorder without anyone opening the cage?",
            "answer": "If it was already in the cradle, yes. The rails run under the seal. An interlock can stop the carriage without changing the physical route.",
            "after": ("recorder",), "evidence": ("seal",),
        },
        "service_wrench": {
            "question": "Why were there two wrenches for a selector nobody was supposed to use?",
            "answer": "Mine stays with the pump kit. The inspection spare goes to whoever signs off on isolation. You need the full jaw to turn a good selector, but this one was already chewed up.",
            "after": ("lockdown",), "evidence": ("latch",),
        },
        "pump_witness": {
            "question": "Could the apprentice have opened your wrench roll while you worked?",
            "answer": "They were in frame holding the intake plate. Look at the white tag on the roll. That's the same numbered seal I cut after we were done.",
            "after": ("alibi",), "evidence": ("pumps",),
        },
    },
    "sabine": {
        "register_gap": {
            "question": "The register places you there at 02:08. Who saw you at 02:12?",
            "answer": "No one, apparently. I left the table to fetch a folder. I still dispute the suggestion that a missing witness is evidence of a theft.",
            "after": ("alibi",), "evidence": ("register",),
        },
        "certificate_risk": {
            "question": "What would an abnormal reading do to your existing certificate?",
            "answer": "Suspend it, yes. It would also strand a dozen crews and force another season of manual flood watches. I am aware of the consequences.",
            "after": ("recorder",), "evidence": ("certification",),
        },
        "wrench_tether": {
            "question": "The chipped wrench was tethered to your wrist. Who else could use it?",
            "answer": "No one unless I handed it over. I carried it during the inspection. I don't remember removing it before I changed out of my wet coat.",
            "after": ("lockdown",), "evidence": ("latch",),
        },
    },
    "noa": {
        "trace_limit": {
            "question": "Can the preview establish how far beyond the limit the pressure fell?",
            "answer": "No. A flat line at the floor looks the same whether you barely cross it or plunge through it. That distinction is why I insisted we retain the original.",
            "after": ("recorder",), "evidence": ("preview",),
        },
        "double_knock": {
            "question": "The lab link caught two knocks. Could you tell what direction they came from?",
            "answer": "The headset was on its desk mic, and the wall behind that desk backs onto the isolation bay. The knocks are close enough together to be one heavy mechanism settling twice.",
            "after": ("lockdown",), "evidence": ("lab",),
        },
        "drum_sync": {
            "question": "Can you place the knocks against the mechanical carrier trace?",
            "answer": "Within a second. The second peak matches the loaded carrier reaching the drawer. The weather noise is continuous, so those peaks stand out.",
            "after": ("double_knock",), "evidence": ("route",),
        },
    },
    "rhea": {
        "deck_alibi": {
            "question": "Did the camera have any blind window while you were securing the launch?",
            "answer": "It lost my face for a second when a line swung past, but both hands stayed visible. The hatch is inside the same frame.",
            "after": ("alibi",), "evidence": ("deck",),
        },
        "sack_origin": {
            "question": "Are the blue sacks used to carry survey equipment on the launch?",
            "answer": "Ours are orange so we can see them overboard. The blue ones live in the station's isolation bay. You'd reach one before you reached the outside deck.",
            "after": ("recorder",), "evidence": ("drawer",),
        },
        "hatch_alarm": {
            "question": "Can the stern hatch be opened without sounding its warning?",
            "answer": "You could cut the wire, but the monitor would show an open circuit until someone rejoined it. The deck record would catch that too.",
            "after": ("lockdown",),
        },
    },
}

PRESSURE = {
    "suspect": "ivo", "topic": "pressure_detent",
    "question": "Tell me what your official incident report left out about the test selector.",
    "answer": (
        "All right. The selector had a half-detent we were supposed to file off. You can hold it there "
        "long enough to send a single carrier, then let the spring snap it back. Whoever used it had to stand at the alcove."
    ),
}

INSIGHT = (
    "Separate access from movement. An intact seal rules out opening the vault door, "
    "but a loaded carrier could travel by a route that the seal never touched."
)

FORENSICS = {
    "seal": "The uninterrupted seal wire rules out a quick rethread. Fresh abrasion is concentrated on the interior guide rails.",
    "route": "The test pulse precedes the load rise. This was an intentional reroute, and the carrier arrived loaded rather than returning empty.",
    "latch": "The impression includes a missing corner and a raised burr. Those two imperfections rule out the intact service wrench.",
    "drawer": "The salt band ends at the same height as the carrier sleeve, indicating that a wet recorder sat upright in the drawer.",
    "certification": "The memo names the ninth sounding as a condition of the existing certificate. The condition was effective before the recorder went missing.",
    "register": "There is no clock-out column. Even the exact signature time establishes a single moment, not continuous presence.",
    "pumps": "The wrench-roll seal number is readable before and after the critical window. There is no cut or substitution visible.",
    "lab": "The two knocks have a hard metallic onset and a short decay, unlike wind noise. They line up with a carrier docking.",
    "deck": "Frame timestamps and the hatch circuit were recorded independently. Both cover the critical window.",
    "preview": "The flattened portion is the display ceiling for negative pressure. It cannot be used to calculate the magnitude without the original trace.",
}
