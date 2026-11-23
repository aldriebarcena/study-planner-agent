"""Soft quality scores (0-1, higher is better) for schedules that already pass the validators.

Hard constraint violations stay validator failures and are not scored. A criterion is None
when its preference is unset or there is nothing to measure; `overall` averages the rest.

- priority: share of task pairs where the higher-priority task (3 = high) finishes first
- study_period: share of minutes in the preferred period (morning <12, afternoon 12-17, evening 17+)
- session_duration: per block, 1 - |minutes - session_minutes| / session_minutes (min 0)
- breaks: share of same-day gaps >= min_break_minutes
- deadline_buffer: per task, hours between last block and deadline / 24 (max 1)
- spread: per task, distinct days used / number of blocks
- fragmentation: share of blocks >= 30 min and not back-to-back with the same task
"""

from datetime import datetime, timedelta

from study_planner.schemas import Schedule, SchedulingPreferences, StudyBlock, Task

PERIODS = {"morning": (0, 12), "afternoon": (12, 17), "evening": (17, 24)}


def _minutes(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / 60


def _mean(values) -> float | None:
    values = list(values)
    return sum(values) / len(values) if values else None


def _period_share(blocks: list[StudyBlock], start_hour: int, end_hour: int) -> float | None:
    def inside(block: StudyBlock) -> float:
        day = block.start.replace(hour=0, minute=0, second=0, microsecond=0)
        return max(0.0, _minutes(max(block.start, day + timedelta(hours=start_hour)), min(block.end, day + timedelta(hours=end_hour))))

    total = sum(_minutes(b.start, b.end) for b in blocks)
    return sum(inside(b) for b in blocks) / total if total else None


def score_schedule(
    schedule: Schedule, tasks: list[Task], preferences: SchedulingPreferences | None = None
) -> dict[str, float | None]:
    prefs = preferences or SchedulingPreferences()
    blocks = sorted(schedule.blocks, key=lambda b: (b.start, b.end, b.task_id))
    by_task = {t.id: [b for b in blocks if b.task_id == t.id] for t in tasks}
    scheduled = [t for t in tasks if by_task[t.id]]
    finish = {t.id: by_task[t.id][-1].end for t in scheduled}
    same_day_gaps = [_minutes(a.end, b.start) for a, b in zip(blocks, blocks[1:]) if a.end.date() == b.start.date()]
    session = prefs.session_minutes

    scores = {
        "priority": _mean(float(finish[a.id] <= finish[b.id]) for a in scheduled for b in scheduled if a.priority > b.priority),
        "study_period": None if prefs.study_period == "any" else _period_share(blocks, *PERIODS[prefs.study_period]),
        "session_duration": None if session is None else _mean(max(0.0, 1 - abs(_minutes(b.start, b.end) - session) / session) for b in blocks),
        "breaks": None if not prefs.min_break_minutes else _mean(float(gap >= prefs.min_break_minutes) for gap in same_day_gaps),
        "deadline_buffer": _mean(min(1.0, max(0.0, _minutes(finish[t.id], t.deadline) / (24 * 60))) for t in scheduled),
        "spread": None if not prefs.spread_across_days else _mean(len({b.start.date() for b in by_task[t.id]}) / len(by_task[t.id]) for t in scheduled),
        "fragmentation": _mean(
            float(_minutes(b.start, b.end) >= 30 and not any(o.task_id == b.task_id and (o.end == b.start or o.start == b.end) for o in blocks))
            for b in blocks
        ),
    }
    return {**scores, "overall": _mean(s for s in scores.values() if s is not None)}
