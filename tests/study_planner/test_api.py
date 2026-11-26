import importlib
import json

from fastapi.testclient import TestClient

from study_planner.api.app import app

app_module = importlib.import_module("study_planner.api.app")

client = TestClient(app)


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


SIMPLE_REQUEST = {
    "tasks": [
        {
            "id": "cs_midterm",
            "name": "Study for CS Midterm",
            "course": "CS100",
            "deadline": ("2026-10-28T23:59:00"),
            "estimated_minutes": 120,
            "priority": 2,
        }
    ],
    "availability": [
        {
            "start": ("2026-10-26T14:00:00"),
            "end": ("2026-10-26T16:00:00"),
        }
    ],
}


def test_health_endpoint():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
    }


def test_plan_endpoint_returns_schedule(
    monkeypatch,
):
    monkeypatch.setattr(
        app_module,
        "generate_schedule",
        lambda prompt: VALID_SCHEDULE,
    )

    response = client.post(
        "/api/plan",
        json=SIMPLE_REQUEST,
    )

    assert response.status_code == 200

    body = response.json()

    assert body["status"] == "success"

    assert body["schedule"]["blocks"][0]["task_id"] == "cs_midterm"

    assert body["metadata"] == {
      "attempts": 1,
      "revisions": 0,
      "validator_failures": 0,
      "format_failures": 0,
    }


def test_plan_endpoint_reports_infeasible(
    monkeypatch,
):
    monkeypatch.setattr(
        app_module,
        "generate_schedule",
        lambda prompt: VALID_SCHEDULE,
    )

    request = {
        "tasks": [
            {
                "id": "cs_midterm",
                "name": "CS Midterm",
                "deadline": ("2026-10-27T17:00:00"),
                "estimated_minutes": 240,
                "priority": 1,
            },
            {
                "id": "math_midterm",
                "name": "Math Midterm",
                "deadline": ("2026-10-27T17:00:00"),
                "estimated_minutes": 240,
                "priority": 2,
            },
        ],
        "availability": [
            {
                "start": ("2026-10-26T09:00:00"),
                "end": ("2026-10-26T12:00:00"),
            },
            {
                "start": ("2026-10-27T09:00:00"),
                "end": ("2026-10-27T11:00:00"),
            },
        ],
    }

    response = client.post(
        "/api/plan",
        json=request,
    )

    assert response.status_code == 422

    body = response.json()

    assert body["status"] == "infeasible"
    assert "480 minutes" in body["message"]
    assert "300 minutes" in body["message"]


def test_plan_endpoint_rejects_invalid_task():
    response = client.post(
        "/api/plan",
        json={
            "tasks": [
                {
                    "id": "bad-task",
                }
            ],
            "availability": [],
        },
    )

    assert response.status_code == 422

def test_plan_endpoint_accepts_preferences(
    monkeypatch,
):
    prompts = []

    def generate(prompt):
        prompts.append(prompt)
        return VALID_SCHEDULE

    monkeypatch.setattr(
        app_module,
        "generate_schedule",
        generate,
    )

    request = {
        **SIMPLE_REQUEST,
        "preferences": {
            "study_period": "evening",
            "session_minutes": 60,
            "min_break_minutes": 15,
            "spread_across_days": True,
        },
    }

    response = client.post(
        "/api/plan",
        json=request,
    )

    assert response.status_code == 200

    assert '"study_period": "evening"' in prompts[0]
    assert '"session_minutes": 60' in prompts[0]

def test_plan_endpoint_uses_default_preferences(
    monkeypatch,
):
    prompts = []

    def generate(prompt):
        prompts.append(prompt)
        return VALID_SCHEDULE

    monkeypatch.setattr(
        app_module,
        "generate_schedule",
        generate,
    )

    response = client.post(
        "/api/plan",
        json=SIMPLE_REQUEST,
    )

    assert response.status_code == 200
    assert '"study_period": "any"' in prompts[0]

def test_plan_endpoint_reports_revision_metadata(
    monkeypatch,
):
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

    monkeypatch.setattr(
        app_module,
        "generate_schedule",
        generate,
    )

    response = client.post(
        "/api/plan",
        json=SIMPLE_REQUEST,
    )

    assert response.status_code == 200

    metadata = response.json()["metadata"]

    assert metadata["attempts"] == 2
    assert metadata["revisions"] == 1
    assert metadata["validator_failures"] >= 1
    assert metadata["format_failures"] == 0
