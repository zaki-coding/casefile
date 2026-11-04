"""Content validation for the second case's clue and dialogue graph."""

from backend import case002


def test_ninth_sounding_covers_its_suspects_and_clues():
    case = case002.CASE
    suspect_ids = {suspect["id"] for suspect in case["suspects"]}
    clue_ids = {clue["id"] for clue in case["evidence"]}

    assert len(suspect_ids) == len(case["suspects"]) >= 4
    assert len(clue_ids) == len(case["evidence"])
    assert 8 <= len(clue_ids) <= 12
    assert set(case002.OPENINGS) == set(case002.FOLLOW_UPS) == suspect_ids
    assert set(case002.FORENSICS) == clue_ids
    assert case002.CULPRIT in suspect_ids
    assert case002.METHOD in case["methods"]
    assert len(case002.DECISIVE_EVIDENCE) == 2
    assert case002.DECISIVE_EVIDENCE <= clue_ids
    assert case002.PRESSURE["suspect"] in suspect_ids
    assert len(case002.TIMELINE) >= 4


def test_ninth_sounding_dialogue_can_be_unlocked_without_pressure():
    case = case002.CASE
    clue_ids = {clue["id"] for clue in case["evidence"]}
    for suspect in case["suspects"]:
        unlocked = set(case["topics"])
        assert set(suspect["answers"]) == unlocked
        remaining = dict(case002.FOLLOW_UPS[suspect["id"]])
        assert not unlocked.intersection(remaining)
        assert case002.PRESSURE["topic"] not in unlocked.union(remaining)
        while remaining:
            available = {
                topic for topic, line in remaining.items()
                if set(line.get("after", ())) <= unlocked
            }
            assert available, f"Unreachable dialogue for {suspect['id']}: {remaining.keys()}"
            for topic in available:
                assert set(remaining[topic].get("evidence", ())) <= clue_ids
                unlocked.add(topic)
                del remaining[topic]
