from typing import Literal

from pydantic import BaseModel, Field

from study_planner.schemas import (
    AvailabilityBlock,
    PlannerExecutionMetadata,
    Schedule,
    SchedulingPreferences,
    Task,
)


class PlanRequest(BaseModel):
    tasks: list[Task]
    availability: list[AvailabilityBlock]
    preferences: SchedulingPreferences = Field(
        default_factory=SchedulingPreferences
    )


class PlanSuccessResponse(BaseModel):
    status: Literal["success"] = "success"
    schedule: Schedule
    metadata: PlannerExecutionMetadata


class PlanInfeasibleResponse(BaseModel):
    status: Literal["infeasible"] = "infeasible"
    message: str


class PlanErrorResponse(BaseModel):
    status: Literal["error"] = "error"
    message: str
