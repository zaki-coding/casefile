"""Reusable equipment catalog and private, case-specific examination challenges.

Public scenes contain choices, never accepted answers or unrecovered observations.
Career points grant access; they are never spent. Findings live in the investigation
JSON so existing SQLite saves need no destructive schema migration.
"""

from fastapi import HTTPException


TOOLS = {
    "lens": {"id": "lens", "name": "Investigation Lens", "threshold": 0,
             "description": "Inspect a selected region for subtle marks and visual context."},
    "forensic": {"id": "forensic", "name": "Forensic Kit", "threshold": 50,
                 "description": "Choose a suitable trace examination for physical evidence."},
    "digital": {"id": "digital", "name": "Digital Evidence Analyzer", "threshold": 110,
                "description": "Compare examined records and test their timing relationships."},
    "timeline": {"id": "timeline", "name": "Timeline Reconstruction Board", "threshold": 170,
                 "description": "Arrange sourced events and distinguish a moment from an alibi."},
}


def catalog(points):
    return [{**tool, "unlocked": points >= tool["threshold"],
             "remaining": max(0, tool["threshold"] - points)} for tool in TOOLS.values()]


def scene(identifier, tool, target, title, prompt, choices, sources, answer, message, retry):
    return {"id": identifier, "toolId": tool, "kind": tool, "target": target,
            "title": title, "prompt": prompt,
            "choices": [{"id": key, "label": label} for key, label in choices],
            "sources": sources, "answer": answer, "message": message, "retry": retry}


EXAMINATIONS = {
    "001": [
        scene("proof-mark", "lens", "proof", "Inspect the replacement print",
              "Move your inspection to the area most likely to preserve handling context.",
              [("front", "Printed image"), ("reverse", "Reverse and frame clips"), ("glass", "Outer glass")],
              ["proof"], ["reverse"],
              "Under the clips, the proof mark runs beneath a shallow handling crease. The sheet was marked before it was mounted; the mark alone cannot date the swap.",
              "That surface does not preserve the sheet's mounting sequence. Try a less exposed region."),
        scene("relay-label", "lens", "relay", "Inspect the relay panel",
              "Choose a region to inspect on the event panel photograph.",
              [("housing", "Painted housing"), ("legend", "Event code legend"), ("screw", "Outer fixing screw")],
              ["relay"], ["legend"],
              "The legend distinguishes TEST from SUPPLY LOSS. The recorded code is a local test event, not a diagnosis of who pressed the switch.",
              "That region cannot explain the recorded event code. Examine the panel's annotations."),
        scene("proof-trace", "forensic", "proof", "Examine paper handling traces",
              "Choose a method that preserves fragile paper and its shallow impressions.",
              [("powder", "Dust the entire sheet for prints"), ("light", "Use raking light without contact"), ("solvent", "Apply solvent to the proof mark")],
              ["proof"], ["light"],
              "Raking light reveals parallel clip impressions with no torn fibers at the edge. This supports removal through the frame's release rather than a forced tear. There is no identifiable fingerprint.",
              "Avoid adding material or moisture to fragile paper. Select a non-contact examination."),
        scene("clock-comparison", "digital", "badge", "Cross-reference independent clocks",
              "Choose two records that compare access timing with the start of the outage.",
              [("badge", "Badge access report"), ("relay", "Relay event log"), ("gate", "East gate video"), ("stream", "Livestream archive")],
              ["badge", "relay", "gate", "stream"], ["badge", "relay"],
              "The corridor access at 23:59 precedes the panel test at midnight; enclosure access falls in the outage window. The sequence links access and opportunity, but a credential is not a visual identification.",
              "Those records do not directly compare entry with the panel test. Choose access and power records."),
        scene("midnight-sequence", "timeline", "relay", "Reconstruct the midnight window",
              "Order these sourced events from earliest to latest. Midnight follows 23:59.",
              [("enclosure", "00:00:00 · Enclosure opens (badge report)"),
               ("restored", "00:00:43 · Gallery power returns (relay log)"),
               ("corridor", "23:59 · Corridor entry (badge report)"),
               ("gate_start", "23:58 · East gate coverage begins (gate video)")],
              ["badge", "relay", "gate"], ["gate_start", "corridor", "enclosure", "restored"],
              "The entry predates the outage, and the enclosure opens before power returns. Gate footage covers the whole window. Compare these constraints with each interview rather than treating any one timestamp as a complete alibi.",
              "Check the midnight rollover and the 43-second outage. Keep the camera's start before the access events."),
    ],
    "002": [
        scene("seal-rails", "lens", "seal", "Inspect the archive cage",
              "Select a region that could explain movement without opening the sealed door.",
              [("stamp", "Stamped seal face"), ("rails", "Guide rails beneath the cradle"), ("hinge", "Door hinge")],
              ["seal"], ["rails"],
              "The rails pass under the sealed cage wall. Their polished inner edges continue into the transfer channel: an intact door seal does not establish that the recorder stayed inside.",
              "That region concerns the door. Look for an existing route that does not cross the seal."),
        scene("preview-scale", "lens", "preview", "Inspect the pressure preview",
              "Choose the region that limits what this chart can establish.",
              [("heading", "Chart heading"), ("floor", "Flattened trough and scale boundary"), ("margin", "Blank margin")],
              ["preview"], ["floor"],
              "The trough lies exactly on the display boundary. Several different pressure excursions would produce this same clipped shape; its depth cannot be recovered from this preview.",
              "That region does not describe the instrument's range. Compare the trace with the scale."),
        scene("drawer-residue", "forensic", "drawer", "Examine the drawer residue",
              "Choose an examination that compares the residue's distribution without moving it.",
              [("swab", "Swab the whole liner together"), ("map", "Map salt band height and fiber positions"), ("print", "Search only the outer handle for prints")],
              ["drawer"], ["map"],
              "The salt forms a narrow upright cylinder boundary; the blue fibers lie outside that band. The recorder contacted the liner before fabric brushed it. The traces indicate handling order, not the handler's identity.",
              "Preserve the relative positions: mixing the residue loses sequence information. Examine the spatial pattern."),
        scene("latch-profile", "forensic", "latch", "Compare selector impressions",
              "Select the comparison that can distinguish the two service tools.",
              [("color", "Compare surface color"), ("profile", "Compare missing corner and burr profile"), ("size", "Compare overall wrench length")],
              ["latch"], ["profile"],
              "Two separate defects repeat in the soft jaw impression. This supports a particular tool profile rather than merely the shared triangular size; it does not establish who held the tool at that moment.",
              "Shared size or surface appearance cannot distinguish these tools. Compare individual contact defects."),
        scene("drum-audio", "digital", "route", "Align mechanical and recorded events",
              "Choose the two sources that can independently test the carrier's arrival time.",
              [("register", "Briefing register"), ("route", "Carrier drum trace"), ("lab", "Mainland lab link"), ("deck", "Launch deck camera")],
              ["register", "route", "lab", "deck"], ["route", "lab"],
              "The second audio peak aligns with the drum's loaded arrival at 02:12 within one second. Continuous weather noise surrounds both peaks, supporting a local mechanical event rather than an edited gap in the recording.",
              "Those sources do not both record the transfer. Compare the mechanical trace with the nearby audio."),
        scene("storm-sequence", "timeline", "route", "Reconstruct the lockdown window",
              "Order the observed events. A signature records one moment, not continuous presence.",
              [("carrier", "02:12 · Loaded carrier arrives (drum trace)"),
               ("lab_start", "02:09 · Lab link begins (lab record)"),
               ("register", "02:08 · Register signed (briefing register)"),
               ("pump_start", "02:10 · Pump training feed begins (pump record)")],
              ["register", "route", "lab", "pumps"], ["register", "lab_start", "pump_start", "carrier"],
              "The signature precedes the transfer by four minutes. The lab and pump feeds begin before the transfer and continue across it. Ask which claims describe continuous presence and which describe only an arrival.",
              "Use the timestamps on each source, and place the single signature before the continuous recordings."),
    ],
}


def options(state, points):
    findings = state.get("equipmentFindings", [])
    completed = {finding["id"] for finding in findings}
    tools = catalog(points)
    for tool in tools:
        tool["examinations"] = []
        for examination in EXAMINATIONS.get(state["caseId"], []):
            if examination["toolId"] != tool["id"]:
                continue
            # Digital challenges offer extra records; only the selected pair must
            # be examined. Other scenes require all their source files.
            required = ([examination["target"]] if tool["id"] == "digital"
                        else examination["sources"])
            missing = [source for source in required if source not in state["board"]]
            closed = state["result"] is not None
            requirement = ("Investigation closed" if closed else
                           f"Requires {tool['threshold']} career points" if not tool["unlocked"] else
                           "Examine source files: " + ", ".join(missing) if missing else "")
            public = {key: examination[key] for key in
                      ("id", "target", "title", "prompt", "kind", "choices", "sources")}
            public.update(available=not requirement, requirement=requirement,
                          completed=examination["id"] in completed)
            public["examinedSources"] = list(state["board"])
            tool["examinations"].append(public)
    return {"points": points, "tools": tools, "findings": findings}


def use(state, points, tool_id, examination_id, selection):
    if tool_id not in TOOLS:
        raise HTTPException(422, "Unknown equipment")
    if points < TOOLS[tool_id]["threshold"]:
        raise HTTPException(409, f"Requires {TOOLS[tool_id]['threshold']} career points")
    examination = next((item for item in EXAMINATIONS.get(state["caseId"], [])
                        if item["id"] == examination_id and item["toolId"] == tool_id), None)
    if examination is None:
        raise HTTPException(422, "This equipment examination is not available in this case")
    scene_options = next(item for tool in options(state, points)["tools"]
                         for item in tool["examinations"] if item["id"] == examination_id)
    if not scene_options["available"]:
        raise HTTPException(409, scene_options["requirement"])
    allowed = {choice["id"] for choice in examination["choices"]}
    expected_length = len(examination["answer"])
    if (len(selection) != expected_length or len(set(selection)) != len(selection)
            or set(selection) - allowed):
        raise HTTPException(422, "Choose the required number of distinct examination options")
    if tool_id == "digital" and set(selection) - state["board"].keys():
        raise HTTPException(409, "Examine both selected source files before comparing them")
    accepted = (selection == examination["answer"] if tool_id == "timeline"
                else set(selection) == set(examination["answer"]))
    if not accepted:
        raise HTTPException(409, examination["retry"])
    findings = state.setdefault("equipmentFindings", [])
    if not any(item["id"] == examination_id for item in findings):
        findings.append({key: examination[key] for key in
                         ("id", "toolId", "target", "title", "message")})
