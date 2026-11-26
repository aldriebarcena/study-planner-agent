"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { ScheduleOutput } from "@/components/schedule-output";
import {
  isPlannerApiResponse,
  type PlannerInput,
  type PlannerPreferences,
  type PlannerSchedule,
  type PlannerTask,
} from "@/planner-types";

type AvailabilityBlock = {
  id: string;
  start: string;
  end: string;
};

type PlanningState = "empty" | "loading" | "success" | "infeasible" | "error";

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return [hours ? `${hours}h` : "", remainingMinutes ? `${remainingMinutes}m` : ""].filter(Boolean).join(" ");
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateTime: string) {
  return new Date(dateTime).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
}

function toApiDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

function formatAvailabilityDates(start: string, end: string) {
  const startDate = start.slice(0, 10);
  const endDate = end.slice(0, 10);
  return startDate === endDate
    ? formatDate(startDate)
    : `${formatDate(startDate)} – ${formatDate(endDate)}`;
}

export function StudyPlanner() {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [taskName, setTaskName] = useState("");
  const [taskCourse, setTaskCourse] = useState("");
  const [taskDeadline, setTaskDeadline] = useState("");
  const [taskMinutes, setTaskMinutes] = useState("60");
  const [taskPriority, setTaskPriority] = useState("");
  const [taskError, setTaskError] = useState("");
  const [availabilityStartDate, setAvailabilityStartDate] = useState("");
  const [availabilityEndDate, setAvailabilityEndDate] = useState("");
  const [availabilityStart, setAvailabilityStart] = useState("09:00");
  const [availabilityEnd, setAvailabilityEnd] = useState("11:00");
  const [availabilityError, setAvailabilityError] = useState("");
  const [editingAvailabilityId, setEditingAvailabilityId] = useState<string | null>(null);
  const [plannerError, setPlannerError] = useState("");
  const [studyPeriod, setStudyPeriod] = useState<PlannerPreferences["study_period"]>("any");
  const [sessionMinutes, setSessionMinutes] = useState("");
  const [minBreakMinutes, setMinBreakMinutes] = useState("0");
  const [spreadAcrossDays, setSpreadAcrossDays] = useState(false);
  const [planningState, setPlanningState] = useState<PlanningState>("empty");
  const [isGenerating, setIsGenerating] = useState(false);
  const [planningMessage, setPlanningMessage] = useState("");
  const [schedule, setSchedule] = useState<PlannerSchedule | null>(null);
  const [scheduledTasks, setScheduledTasks] = useState<PlannerTask[]>([]);

  function clearSchedule() {
    if (isGenerating) return;
    setPlanningState("empty");
    setPlanningMessage("");
    setSchedule(null);
    setScheduledTasks([]);
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = taskName.trim();
    const minutes = Number(taskMinutes);
    const priority = Number(taskPriority);

    if (!name) {
      setTaskError("Add a task name to continue.");
      return;
    }
    if (!Number.isSafeInteger(minutes) || minutes < 1) {
      setTaskError("Estimated study time must be a whole number greater than zero.");
      return;
    }
    if (!taskDeadline || !Number.isFinite(new Date(taskDeadline).getTime())) {
      setTaskError("Enter a valid deadline.");
      return;
    }
    if (new Date(taskDeadline).getTime() <= Date.now()) {
      setTaskError("Deadline must be in the future.");
      return;
    }
    if (![1, 2, 3].includes(priority)) {
      setTaskError("Choose a priority from 1 (low) to 3 (high).");
      return;
    }

    setTasks((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        course: taskCourse.trim() || null,
        deadline: `${taskDeadline}:00`,
        estimated_minutes: minutes,
        priority,
      },
    ]);
    setTaskName("");
    setTaskCourse("");
    setTaskDeadline("");
    setTaskMinutes("60");
    setTaskPriority("");
    setTaskError("");
    setPlannerError("");
    clearSchedule();
  }

  function addAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!availabilityStartDate || !availabilityEndDate || !availabilityStart || !availabilityEnd) {
      setAvailabilityError("Choose a start date and time, and an end date and time.");
      return;
    }
    const startDateTime = new Date(`${availabilityStartDate}T${availabilityStart}`).getTime();
    const endDateTime = new Date(`${availabilityEndDate}T${availabilityEnd}`).getTime();
    if (!Number.isFinite(startDateTime) || !Number.isFinite(endDateTime)) {
      setAvailabilityError("Enter valid start and end dates and times.");
      return;
    }
    if (startDateTime <= Date.now()) {
      setAvailabilityError("Availability must start in the future.");
      return;
    }
    if (endDateTime <= startDateTime) {
      setAvailabilityError("The end date and time must be after the start.");
      return;
    }

    const start = toApiDateTime(availabilityStartDate, availabilityStart);
    const end = toApiDateTime(availabilityEndDate, availabilityEnd);
    const overlaps = availability.some(
      (window) =>
        window.id !== editingAvailabilityId &&
        start < window.end &&
        end > window.start,
    );
    if (overlaps) {
      setAvailabilityError("This window overlaps another availability window.");
      return;
    }

    const window = {
      id: editingAvailabilityId ?? crypto.randomUUID(),
      start,
      end,
    };
    setAvailability((current) =>
      editingAvailabilityId
        ? current.map((item) => (item.id === editingAvailabilityId ? window : item))
        : [...current, window],
    );
    setEditingAvailabilityId(null);
    setAvailabilityError("");
    setPlannerError("");
    clearSchedule();
  }

  function editAvailability(window: AvailabilityBlock) {
    setEditingAvailabilityId(window.id);
    setAvailabilityStartDate(window.start.slice(0, 10));
    setAvailabilityEndDate(window.end.slice(0, 10));
    setAvailabilityStart(window.start.slice(11, 16));
    setAvailabilityEnd(window.end.slice(11, 16));
    setAvailabilityError("");
    clearSchedule();
  }

  function cancelAvailabilityEdit() {
    setEditingAvailabilityId(null);
    setAvailabilityStartDate("");
    setAvailabilityEndDate("");
    setAvailabilityStart("09:00");
    setAvailabilityEnd("11:00");
    setAvailabilityError("");
  }

  async function submitPlanner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tasks.length || !availability.length) {
      setPlannerError("Add at least one task and one availability window to continue.");
      return;
    }

    const sessionLength = sessionMinutes ? Number(sessionMinutes) : null;
    const minimumBreak = Number(minBreakMinutes);
    if (sessionLength !== null && (!Number.isSafeInteger(sessionLength) || sessionLength < 1)) {
      setPlannerError("Session length must be a whole number greater than zero.");
      return;
    }
    if (!Number.isSafeInteger(minimumBreak) || minimumBreak < 0) {
      setPlannerError("Minimum break must be a whole number of zero or more.");
      return;
    }

    const input: PlannerInput = {
      tasks: tasks.map(({ id, name, course, deadline, estimated_minutes, priority }) => ({
        id,
        name,
        course,
        deadline,
        estimated_minutes,
        priority,
      })),
      availability: availability.map(({ start, end }) => ({ start, end })),
      preferences: {
        study_period: studyPeriod,
        session_minutes: sessionLength,
        min_break_minutes: minimumBreak,
        spread_across_days: spreadAcrossDays,
      },
    };
    setPlannerError("");
    setPlanningMessage("");
    setPlanningState("loading");
    setIsGenerating(true);
    setSchedule(null);
    setScheduledTasks(input.tasks);

    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error("The planning API returned an invalid response.");
      }

      if (!isPlannerApiResponse(body)) {
        throw new Error("The planning API returned an unexpected response.");
      }
      if (body.status === "infeasible") {
        setPlanningState("infeasible");
        setPlanningMessage("There isn't enough available study time to complete all your tasks before their deadlines.");
        setScheduledTasks([]);
        return;
      }
      if (body.status === "error") {
        throw new Error(body.message);
      }
      if (!response.ok) {
        throw new Error(`The planning API returned HTTP ${response.status}.`);
      }

      const taskIds = new Set(input.tasks.map((task) => task.id));
      if (body.schedule.blocks.some((block) => !taskIds.has(block.task_id))) {
        throw new Error("The planning API returned a session for an unknown task.");
      }

      setSchedule(body.schedule);
      setPlanningState(body.schedule.blocks.length ? "success" : "empty");
      setPlanningMessage(body.schedule.blocks.length ? "" : "The planner returned no study sessions.");
    } catch (error) {
      setPlanningState("error");
      setPlanningMessage(
        error instanceof TypeError
          ? "Unable to connect to the planning API. Check that the backend is running and try again."
          : error instanceof Error
            ? error.message
            : "Unable to generate a study schedule.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const plannedMinutes = tasks.reduce((total, task) => total + task.estimated_minutes, 0);

  return (
    <div className="planner-app">
      <header className="planner-header">
        <div className="brand">
          <span className="brand-name">Study Planner</span>
        </div>
      </header>

      <main className="planner-main">
        <section aria-labelledby="welcome-title" className="planner-hero">
          <h1 id="welcome-title">Plan your study week.</h1>
          <p className="planner-intro">Add your study tasks and available times to build a weekly schedule.</p>
        </section>

        <fieldset aria-label="Planner input" className="planner-layout planner-fieldset" disabled={isGenerating}>
          <section aria-labelledby="builder-title" className="planner-card builder-card">
            <header className="planner-card-heading">
              <div>
                <p className="eyebrow">START WITH THE BASICS</p>
                <h2 id="builder-title">Build your plan</h2>
              </div>
              <span className="planner-card-icon"><Icon name="check" size={18} /></span>
            </header>

            <form className="planner-form-section" onSubmit={addTask}>
              <div className="planner-section-heading">
                <span className="planner-step">01</span>
                <div><h3>Add a task</h3><p>What do you need to work on?</p></div>
              </div>
              <label className="planner-field">
                <span>Task name</span>
                <input
                  autoComplete="off"
                  className="planner-input"
                  onChange={(event) => {
                    setTaskName(event.target.value);
                    setTaskError("");
                  }}
                  placeholder="e.g. Review biology lecture notes"
                  required
                  value={taskName}
                />
              </label>
              <div className="task-details-grid">
                <label className="planner-field">
                  <span>Course <span className="field-optional">(optional)</span></span>
                  <input
                    className="planner-input"
                    onChange={(event) => setTaskCourse(event.target.value)}
                    placeholder="e.g. BIOL 005"
                    value={taskCourse}
                  />
                </label>
                <label className="planner-field">
                  <span>Deadline</span>
                  <input
                    className="planner-input"
                    onChange={(event) => {
                      setTaskDeadline(event.target.value);
                      setTaskError("");
                    }}
                    required
                    type="datetime-local"
                    value={taskDeadline}
                  />
                </label>
                <label className="planner-field">
                  <span>Estimated study time</span>
                  <div className="planner-input-wrap">
                    <input
                      className="planner-input"
                      min="1"
                      onChange={(event) => {
                        setTaskMinutes(event.target.value);
                        setTaskError("");
                      }}
                      required
                      step="1"
                      type="number"
                      value={taskMinutes}
                    />
                    <span className="input-suffix">minutes</span>
                  </div>
                </label>
                <label className="planner-field">
                  <span>Priority</span>
                  <select
                    className="planner-input"
                    onChange={(event) => setTaskPriority(event.target.value)}
                    required
                    value={taskPriority}
                  >
                    <option disabled value="">Select priority</option>
                    <option value="1">1 · Low</option>
                    <option value="2">2 · Medium</option>
                    <option value="3">3 · High</option>
                  </select>
                </label>
              </div>
              <div className="task-submit-row">
                {taskError && <p className="planner-error" role="alert">{taskError}</p>}
                <button className="planner-button" type="submit"><Icon name="plus" size={17} /> Add task</button>
              </div>
            </form>

            <form className="planner-form-section availability-form" onSubmit={addAvailability}>
              <div className="planner-section-heading">
                <span className="planner-step">02</span>
                <div><h3>Set your availability</h3><p>Choose the start and end of an open time window.</p></div>
              </div>
              <div className="planner-form-row availability-date-row">
                <label className="planner-field">
                  <span>Start date</span>
                  <input
                    className="planner-input"
                    onChange={(event) => {
                      setAvailabilityStartDate(event.target.value);
                      setAvailabilityError("");
                    }}
                    required
                    type="date"
                    value={availabilityStartDate}
                  />
                </label>
                <label className="planner-field">
                  <span>End date</span>
                  <input
                    className="planner-input"
                    onChange={(event) => {
                      setAvailabilityEndDate(event.target.value);
                      setAvailabilityError("");
                    }}
                    required
                    type="date"
                    value={availabilityEndDate}
                  />
                </label>
              </div>
              <div className="planner-form-row time-row">
                <label className="planner-field">
                  <span>Start time</span>
                  <input
                    className="planner-input"
                    onChange={(event) => {
                      setAvailabilityStart(event.target.value);
                      setAvailabilityError("");
                    }}
                    required
                    type="time"
                    value={availabilityStart}
                  />
                </label>
                <label className="planner-field">
                  <span>End time</span>
                  <input
                    className="planner-input"
                    onChange={(event) => {
                      setAvailabilityEnd(event.target.value);
                      setAvailabilityError("");
                    }}
                    required
                    type="time"
                    value={availabilityEnd}
                  />
                </label>
                <button className="planner-button" type="submit">
                  <Icon name="plus" size={17} /> {editingAvailabilityId ? "Save window" : "Add window"}
                </button>
              </div>
              {availabilityError && <p className="planner-error" role="alert">{availabilityError}</p>}
              {editingAvailabilityId && (
                <button className="cancel-edit-button" onClick={cancelAvailabilityEdit} type="button">
                  Cancel editing
                </button>
              )}
            </form>

            <section aria-labelledby="preferences-title" className="planner-form-section">
              <div className="planner-section-heading">
                <span className="planner-step">03</span>
                <div><h3 id="preferences-title">Scheduling preferences</h3><p>Guide how the planner fits study sessions into your time.</p></div>
              </div>
              <div className="task-details-grid">
                <label className="planner-field">
                  <span>Preferred study time</span>
                  <select
                    className="planner-input"
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "morning" || value === "afternoon" || value === "evening" || value === "any") {
                        setStudyPeriod(value);
                      }
                      clearSchedule();
                    }}
                    value={studyPeriod}
                  >
                    <option value="any">Any time</option>
                    <option value="morning">Morning</option>
                    <option value="afternoon">Afternoon</option>
                    <option value="evening">Evening</option>
                  </select>
                </label>
                <label className="planner-field">
                  <span>Preferred session length <span className="field-optional">(optional)</span></span>
                  <div className="planner-input-wrap">
                    <input
                      className="planner-input"
                      min="1"
                      onChange={(event) => {
                        setSessionMinutes(event.target.value);
                        clearSchedule();
                      }}
                      step="1"
                      type="number"
                      value={sessionMinutes}
                    />
                    <span className="input-suffix">minutes</span>
                  </div>
                </label>
                <label className="planner-field">
                  <span>Minimum break between sessions</span>
                  <div className="planner-input-wrap">
                    <input
                      className="planner-input"
                      min="0"
                      onChange={(event) => {
                        setMinBreakMinutes(event.target.value);
                        clearSchedule();
                      }}
                      required
                      step="1"
                      type="number"
                      value={minBreakMinutes}
                    />
                    <span className="input-suffix">minutes</span>
                  </div>
                </label>
                <label className="preference-toggle">
                  <input
                    checked={spreadAcrossDays}
                    onChange={(event) => {
                      setSpreadAcrossDays(event.target.checked);
                      clearSchedule();
                    }}
                    type="checkbox"
                  />
                  <span>Spread study across days when possible</span>
                </label>
              </div>
            </section>
          </section>

          <section aria-labelledby="preview-title" className="planner-card preview-card">
            <header className="planner-card-heading preview-heading">
              <div>
                <p className="eyebrow">UPDATES AS YOU GO</p>
                <h2 id="preview-title">Your plan</h2>
              </div>
              <span className="live-indicator"><span /> LIVE PREVIEW</span>
            </header>

            <div className="plan-summary">
              <div><strong>{tasks.length}</strong><span>{tasks.length === 1 ? "task" : "tasks"}</span></div>
              <span className="summary-divider" />
              <div><strong>{availability.length}</strong><span>{availability.length === 1 ? "time window" : "time windows"}</span></div>
              {plannedMinutes > 0 && <span className="summary-total">{formatDuration(plannedMinutes)} of study</span>}
            </div>

            <section aria-labelledby="preview-tasks-title" className="preview-section">
              <header className="preview-section-heading">
                <h3 id="preview-tasks-title"><Icon name="book" size={16} /> Tasks</h3>
                <span>{tasks.length}</span>
              </header>
              {tasks.length ? (
                <ul className="preview-list">
                  {tasks.map((task) => (
                    <li className="preview-item" key={task.id}>
                      <span className="preview-item-mark"><Icon name="check" size={14} /></span>
                      <span className="preview-item-title">
                        <strong>{task.name}</strong>
                        <small>{task.course || "No course"} · Priority {task.priority} · Due {formatDateTime(task.deadline)}</small>
                      </span>
                      <span className="preview-item-detail">{formatDuration(task.estimated_minutes)}</span>
                      <button
                        aria-label={`Remove ${task.name}`}
                        className="remove-item"
                        onClick={() => {
                          setTasks((current) => current.filter((item) => item.id !== task.id));
                          clearSchedule();
                        }}
                        type="button"
                      >Remove</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="preview-empty">Your tasks will appear here.</p>
              )}
            </section>

            <section aria-labelledby="preview-availability-title" className="preview-section">
              <header className="preview-section-heading">
                <h3 id="preview-availability-title"><Icon name="calendar" size={16} /> Availability</h3>
                <span>{availability.length}</span>
              </header>
              {availability.length ? (
                <ul className="preview-list">
                  {availability.map((window) => (
                    <li className="preview-item availability-item" key={window.id}>
                      <span className="availability-day"><Icon name="calendar" size={13} /></span>
                      <span className="preview-item-title">
                        <strong>{formatAvailabilityDates(window.start, window.end)}</strong>
                        <small>{formatTime(window.start.slice(11, 16))} – {formatTime(window.end.slice(11, 16))}</small>
                      </span>
                      <button
                        aria-label={`Edit availability ${formatAvailabilityDates(window.start, window.end)}`}
                        className="remove-item"
                        onClick={() => editAvailability(window)}
                        type="button"
                      >Edit</button>
                      <button
                        aria-label={`Remove availability ${formatAvailabilityDates(window.start, window.end)}`}
                        className="remove-item"
                        onClick={() => {
                          setAvailability((current) => current.filter((item) => item.id !== window.id));
                          if (editingAvailabilityId === window.id) cancelAvailabilityEdit();
                          clearSchedule();
                        }}
                        type="button"
                      >Remove</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="preview-empty">Your open time windows will appear here.</p>
              )}
            </section>
          </section>
        </fieldset>

        <form className="planner-submit-section" onSubmit={submitPlanner}>
          {plannerError && <p className="planner-error" role="alert">{plannerError}</p>}
          <button className="planner-button planner-submit-button" disabled={isGenerating} type="submit">
            {isGenerating ? "Generating schedule…" : "Generate schedule"}
          </button>
        </form>

        <ScheduleOutput
          message={planningMessage}
          schedule={schedule}
          state={planningState}
          tasks={scheduledTasks}
          availability={availability}
        />
      </main>
    </div>
  );
}
