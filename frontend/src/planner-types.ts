export type PlannerTask = {
  id: string;
  name: string;
  course: string | null;
  deadline: string;
  estimated_minutes: number;
  priority: number;
};

export type PlannerAvailability = {
  start: string;
  end: string;
};

export type PlannerPreferences = {
  study_period: "morning" | "afternoon" | "evening" | "any";
  session_minutes: number | null;
  min_break_minutes: number;
  spread_across_days: boolean;
};

export type PlannerInput = {
  tasks: PlannerTask[];
  availability: PlannerAvailability[];
  preferences: PlannerPreferences;
};

export type PlannerScheduleBlock = {
  task_id: string;
  start: string;
  end: string;
};

export type PlannerSchedule = {
  blocks: PlannerScheduleBlock[];
};

export type PlannerApiResponse =
  | { status: "success"; schedule: PlannerSchedule }
  | { status: "infeasible"; message: string }
  | { status: "error"; message: string };

function isScheduleBlock(value: unknown): value is PlannerScheduleBlock {
  if (
    typeof value !== "object" ||
    value === null ||
    !("task_id" in value) ||
    !("start" in value) ||
    !("end" in value) ||
    typeof value.task_id !== "string" ||
    typeof value.start !== "string" ||
    typeof value.end !== "string"
  ) {
    return false;
  }

  const start = new Date(value.start).getTime();
  const end = new Date(value.end).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}

export function isPlannerApiResponse(value: unknown): value is PlannerApiResponse {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return false;
  }

  if (value.status === "success") {
    return (
      "schedule" in value &&
      typeof value.schedule === "object" &&
      value.schedule !== null &&
      "blocks" in value.schedule &&
      Array.isArray(value.schedule.blocks) &&
      value.schedule.blocks.every(isScheduleBlock)
    );
  }

  return (
    (value.status === "infeasible" || value.status === "error") &&
    "message" in value &&
    typeof value.message === "string"
  );
}
