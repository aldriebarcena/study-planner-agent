import json

import pytest

from study_planner.input import load_planner_input

from study_planner.loop import (
    run_planner,
    run_planner_with_metadata,
    run_planning_loop,
)

from study_planner.schemas import SchedulingPreferences

VALID_SCHEDULE = json.dumps(
    {
        "blocks": [
            {
                "task_id": "cs_midterm",
                "start": "2026-10-26T14:00:00",
                "end": "2026-10-26T16:00:00",
            }
        ]
    }
)


def test_loop_returns_valid_schedule():
    def generate(prompt):
        return VALID_SCHEDULE

    schedule = run_planning_loop(
        "eval_cases/simple_week.json",
        generate,
    )

    assert len(schedule.blocks) == 1
    assert schedule.blocks[0].task_id == "cs_midterm"


def test_loop_revises_invalid_schedule():
    prompts = []

    invalid_schedule = json.dumps(
        {
            "blocks": [
                {
                    "task_id": "cs_midterm",
                    "start": "2026-10-26T14:00:00",
                    "end": "2026-10-26T15:00:00",
                }
            ]
        }
    )

    responses = [
        invalid_schedule,
        VALID_SCHEDULE,
    ]

    def generate(prompt):
        prompts.append(prompt)
        return responses.pop(0)

    schedule = run_planning_loop(
        "eval_cases/simple_week.json",
        generate,
    )

    assert len(schedule.blocks) == 1
    assert len(prompts) == 2

    assert "failed deterministic validation" in prompts[1]
    assert "under-scheduled" in prompts[1]


def test_loop_revises_malformed_output():
    prompts = []

    responses = [
        "this is not json",
        VALID_SCHEDULE,
    ]

    def generate(prompt):
        prompts.append(prompt)
        return responses.pop(0)

    schedule = run_planning_loop(
        "eval_cases/simple_week.json",
        generate,
    )

    assert len(schedule.blocks) == 1
    assert len(prompts) == 2

    assert "could not be parsed" in prompts[1]


def test_loop_stops_after_iteration_limit():
    invalid_schedule = json.dumps({"blocks": []})

    def generate(prompt):
        return invalid_schedule

    with pytest.raises(
        RuntimeError,
        match="Unable to produce a valid schedule",
    ):
        run_planning_loop(
            "eval_cases/simple_week.json",
            generate,
            max_iterations=2,
        )


def test_loop_stops_when_workload_is_infeasible():
    called = False

    def generate(prompt):
        nonlocal called
        called = True
        return VALID_SCHEDULE

    with pytest.raises(
        ValueError,
        match="infeasible",
    ):
        run_planning_loop(
            "eval_cases/overloaded_week.json",
            generate,
        )

    assert not called


def test_loop_accepts_structured_input():
    tasks, availability = load_planner_input("eval_cases/simple_week.json")

    def generate(prompt):
        return VALID_SCHEDULE

    schedule = run_planner(
        tasks,
        availability,
        generate,
    )

    assert len(schedule.blocks) == 1
    assert schedule.blocks[0].task_id == "cs_midterm"


def test_structured_loop_detects_infeasible_workload():
    tasks, availability = load_planner_input("eval_cases/overloaded_week.json")

    called = False

    def generate(prompt):
        nonlocal called
        called = True
        return VALID_SCHEDULE

    with pytest.raises(
        ValueError,
        match="infeasible",
    ):
        run_planner(
            tasks,
            availability,
            generate,
        )

    assert not called

def test_structured_loop_passes_preferences_to_prompt():
    tasks, availability = load_planner_input(
        "eval_cases/simple_week.json"
    )

    prompts = []

    def generate(prompt):
        prompts.append(prompt)
        return VALID_SCHEDULE

    run_planner(
        tasks,
        availability,
        generate,
        preferences=SchedulingPreferences(
            study_period="evening",
            session_minutes=60,
            min_break_minutes=15,
            spread_across_days=True,
        ),
    )

    assert len(prompts) == 1
    assert '"study_period": "evening"' in prompts[0]
    assert '"session_minutes": 60' in prompts[0]
    assert '"min_break_minutes": 15' in prompts[0]
    assert '"spread_across_days": true' in prompts[0]

def test_structured_loop_preserves_event_tracking():
    tasks, availability = load_planner_input(
        "eval_cases/simple_week.json"
    )

    events = []

    invalid_schedule = json.dumps(
        {
            "blocks": [
                {
                    "task_id": "cs_midterm",
                    "start": "2026-10-26T14:00:00",
                    "end": "2026-10-26T15:00:00",
                }
            ]
        }
    )

    responses = [
        invalid_schedule,
        VALID_SCHEDULE,
    ]

    def generate(prompt):
        return responses.pop(0)

    run_planner(
        tasks,
        availability,
        generate,
        record_event=events.append,
    )

    assert "validator_failure" in events

def test_planner_metadata_for_first_attempt_success():
    tasks, availability = load_planner_input(
        "eval_cases/simple_week.json"
    )

    def generate(prompt):
        return VALID_SCHEDULE

    result = run_planner_with_metadata(
        tasks,
        availability,
        generate,
    )

    assert result.metadata.attempts == 1
    assert result.metadata.revisions == 0
    assert result.metadata.validator_failures == 0
    assert result.metadata.format_failures == 0

def test_planner_metadata_tracks_validator_revision():
    tasks, availability = load_planner_input(
        "eval_cases/simple_week.json"
    )

    invalid_schedule = json.dumps(
        {
            "blocks": [
                {
                    "task_id": "cs_midterm",
                    "start": "2026-10-26T14:00:00",
                    "end": "2026-10-26T15:00:00",
                }
            ]
        }
    )

    responses = [
        invalid_schedule,
        VALID_SCHEDULE,
    ]

    def generate(prompt):
        return responses.pop(0)

    result = run_planner_with_metadata(
        tasks,
        availability,
        generate,
    )

    assert result.metadata.attempts == 2
    assert result.metadata.revisions == 1
    assert result.metadata.validator_failures >= 1
    assert result.metadata.format_failures == 0

def test_planner_metadata_tracks_format_failure():
    tasks, availability = load_planner_input(
        "eval_cases/simple_week.json"
    )

    responses = [
        "not valid json",
        VALID_SCHEDULE,
    ]

    def generate(prompt):
        return responses.pop(0)

    result = run_planner_with_metadata(
        tasks,
        availability,
        generate,
    )

    assert result.metadata.attempts == 2
    assert result.metadata.revisions == 1
    assert result.metadata.format_failures == 1
    assert result.metadata.validator_failures == 0
