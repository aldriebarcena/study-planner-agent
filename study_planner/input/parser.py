import json
from pathlib import Path

from pydantic import ValidationError

from study_planner.schemas import AvailabilityBlock, Task


def parse_planner_input(data: object) -> tuple[list[Task], list[AvailabilityBlock]]:
    if not isinstance(data, dict):
        raise ValueError("Planner input must be a JSON object")
    if "tasks" not in data:
        raise ValueError("Planner input is missing 'tasks'")
    if "availability" not in data:
        raise ValueError("Planner input is missing 'availability'")
    if not isinstance(data["tasks"], list):
        raise ValueError("Planner input 'tasks' must be a list")
    if not isinstance(data["availability"], list):
        raise ValueError("Planner input 'availability' must be a list")

    try:
        tasks = [Task.model_validate(task) for task in data["tasks"]]
        availability = [AvailabilityBlock.model_validate(block) for block in data["availability"]]
    except ValidationError as exc:
        raise ValueError(f"Invalid planner input: {exc}") from exc

    return tasks, availability


def load_planner_input(path: str | Path) -> tuple[list[Task], list[AvailabilityBlock]]:
    path = Path(path)

    try:
        with path.open() as file:
            data = json.load(file)
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Unable to load planner input: {exc}") from exc

    return parse_planner_input(data)