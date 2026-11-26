"""
Planner execution metadata.

These models expose high-level information about how the planner reached
its result without leaking prompts, API keys, or model internals.
"""

from pydantic import BaseModel

from .schedule import Schedule


class PlannerExecutionMetadata(BaseModel):
    attempts: int = 0
    revisions: int = 0
    validator_failures: int = 0
    format_failures: int = 0


class PlannerResult(BaseModel):
    schedule: Schedule
    metadata: PlannerExecutionMetadata