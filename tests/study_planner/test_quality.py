from datetime import datetime

import pytest

from study_planner.eval import score_schedule
from study_planner.schemas import Schedule, SchedulingPreferences, StudyBlock, Task

TASKS = [Task(id=i, name=i, deadline=datetime(2026, 10, 30), estimated_minutes=60, priority=p) for i, p in [("hi", 3), ("lo", 1)]]
PREFS = SchedulingPreferences(study_period="evening", session_minutes=60, min_break_minutes=15, spread_across_days=True)


def schedule(*blocks: tuple[str, str, str]) -> Schedule:
    return Schedule(blocks=[StudyBlock(task_id=t, start=f"2026-10-{s}", end=f"2026-10-{e}") for t, s, e in blocks])


GOOD = schedule(("hi", "26T18:00", "26T19:00"), ("lo", "26T19:30", "26T20:30"))
POOR = schedule(("lo", "29T08:00", "29T09:00"), ("hi", "29T09:00", "29T09:30"), ("hi", "29T09:30", "29T10:00"))
CRITERIA = ["priority", "study_period", "session_duration", "breaks", "deadline_buffer", "spread", "fragmentation"]


@pytest.mark.parametrize(
    ("sched", "expected"),
    [(GOOD, [1, 1, 1, 1, 1, 1, 1]), (POOR, [0, 0, 2 / 3, 0, 29 / 48, 0.75, 1 / 3])],
)
def test_score_schedule(sched, expected):
    scores = score_schedule(sched, TASKS, PREFS)
    assert scores == pytest.approx({**dict(zip(CRITERIA, expected)), "overall": sum(expected) / 7})
    assert score_schedule(Schedule(blocks=sched.blocks[::-1]), TASKS, PREFS) == scores


def test_unset_preferences_are_skipped():
    scores = score_schedule(GOOD, TASKS)
    assert [k for k, v in scores.items() if v is None] == ["study_period", "session_duration", "breaks", "spread"]
