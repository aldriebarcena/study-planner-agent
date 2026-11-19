"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

type PreviewState = "success" | "loading" | "empty" | "infeasible" | "error";

type StudySession = {
  id: string;
  taskId: string;
  start: string;
  end: string;
};

type StudyTask = {
  name: string;
  course: string;
  color: string;
};

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const weekStart = new Date(2026, 10, 16);

const tasks: Record<string, StudyTask> = {
  cs_midterm: {
    name: "Study for CS Midterm",
    course: "CS 166",
    color: "#dceafa",
  },
  math_midterm: {
    name: "Study for Math Midterm",
    course: "MATH 031",
    color: "#fce4d6",
  },
  biology_quiz: {
    name: "Prepare for Biology Quiz",
    course: "BIOL 005",
    color: "#e4f1df",
  },
};

const mockSessions: StudySession[] = [
  {
    id: "1",
    taskId: "cs_midterm",
    start: "2026-11-16T09:00:00",
    end: "2026-11-16T11:00:00",
  },
  {
    id: "2",
    taskId: "math_midterm",
    start: "2026-11-16T13:00:00",
    end: "2026-11-16T14:30:00",
  },
  {
    id: "3",
    taskId: "cs_midterm",
    start: "2026-11-17T10:00:00",
    end: "2026-11-17T11:00:00",
  },
  {
    id: "4",
    taskId: "biology_quiz",
    start: "2026-11-18T14:00:00",
    end: "2026-11-18T16:00:00",
  },
  {
    id: "5",
    taskId: "math_midterm",
    start: "2026-11-19T09:00:00",
    end: "2026-11-19T10:30:00",
  },
];

const startHour = 8;
const endHour = 20;
const hourHeight = 48;

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(start: Date, end: Date) {
  const minutes = (end.getTime() - start.getTime()) / 60000;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}m`;
  if (hours) return `${hours}h`;
  return `${remainingMinutes}m`;
}

export function ScheduleOutput() {
  const [previewState, setPreviewState] =
    useState<PreviewState>("success");

  const [selectedSession, setSelectedSession] =
    useState<StudySession | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedSession(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const sessions =
    previewState === "success" ? mockSessions : [];

  const selectedTask = selectedSession
    ? tasks[selectedSession.taskId]
    : null;

  const selectedStart = selectedSession
    ? new Date(selectedSession.start)
    : null;

  const selectedEnd = selectedSession
    ? new Date(selectedSession.end)
    : null;

  function renderSchedule() {
    if (previewState === "loading") {
      return (
        <div className="schedule-state">
          <span className="schedule-spinner" />
          <h3>Putting your week together...</h3>
          <p>
            Finding time for your tasks and checking your
            availability.
          </p>
          <div className="schedule-progress">
            <span />
          </div>
        </div>
      );
    }

    if (previewState === "empty") {
      return (
        <div className="schedule-state">
          <span className="schedule-state-icon">
            <Icon name="calendar" size={23} />
          </span>
          <h3>No study sessions scheduled</h3>
          <p>
            Your weekly schedule is currently empty.
            Add tasks and availability to get started.
          </p>
        </div>
      );
    }

    if (previewState === "infeasible") {
      return (
        <div className="schedule-message schedule-warning">
          <span className="schedule-message-icon">
            <Icon name="alert-circle" size={21} />
          </span>
          <div>
            <h3>Your workload needs a little more room</h3>
            <p>
              There isn't enough available time to fit all
              your tasks before their deadlines.
            </p>
            <p className="schedule-suggestion">
              Try adding more availability or adjusting
              your estimated study times.
            </p>
          </div>
        </div>
      );
    }

    if (previewState === "error") {
      return (
        <div className="schedule-message schedule-error">
          <span className="schedule-message-icon">
            <Icon name="alert-circle" size={21} />
          </span>
          <div>
            <h3>We couldn't create your schedule</h3>
            <p>
              Something went wrong while preparing your
              study plan. Please try again.
            </p>
            <p className="schedule-suggestion">
              Your tasks and availability are still here.
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="schedule-status">
          <span className="schedule-status-icon">
            <Icon name="check" size={14} />
          </span>
          <div>
            <strong>Schedule passed validation</strong>
            <span>All scheduled sessions fit your available time.</span>
          </div>
          <span className="schedule-revision">0 revisions</span>
        </div>

        <div className="schedule-calendar-scroll">
          <div className="schedule-calendar">
            <div className="schedule-time-axis">
              <div className="schedule-day-heading" />
              <div className="schedule-time-labels">
                {Array.from(
                  { length: endHour - startHour },
                  (_, index) => {
                    const hour = startHour + index;
                    const label = new Date(2026, 0, 1, hour);

                    return (
                      <span
                        key={hour}
                        style={{ top: index * hourHeight }}
                      >
                        {label.toLocaleTimeString("en-US", {
                          hour: "numeric",
                        })}
                      </span>
                    );
                  }
                )}
              </div>
            </div>

            {weekdays.map((day, dayIndex) => {
              const date = new Date(
                weekStart.getFullYear(),
                weekStart.getMonth(),
                weekStart.getDate() + dayIndex
              );

              const daySessions = sessions.filter((session) => {
                return (
                  new Date(session.start).getDate() === date.getDate()
                );
              });

              return (
                <div className="schedule-day-column" key={day}>
                  <div className="schedule-day-heading">
                    <strong>{day.slice(0, 3)}</strong>
                    <span>
                      {date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  <div className="schedule-day-timeline">
                    {daySessions.map((session) => {
                      const start = new Date(session.start);
                      const end = new Date(session.end);
                      const task = tasks[session.taskId];

                      const minutesFromStart =
                        (start.getHours() - startHour) * 60 +
                        start.getMinutes();

                      const duration =
                        (end.getTime() - start.getTime()) / 60000;

                      const top =
                        (minutesFromStart / 60) * hourHeight;

                      const height =
                        (duration / 60) * hourHeight;

                      return (
                        <button
                          aria-label={`${task.name}, ${formatTime(start)} to ${formatTime(end)}. View details`}
                          className="schedule-study-block"
                          key={session.id}
                          onClick={() =>
                            setSelectedSession(session)
                          }
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            backgroundColor: task.color,
                          }}
                          type="button"
                        >
                          <strong>{task.name}</strong>
                          <span>
                            {formatTime(start)} – {formatTime(end)}
                          </span>
                        </button>
                      );
                    })}

                    {daySessions.length === 0 && (
                      <span className="schedule-no-sessions">
                        No sessions
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="schedule-legend">
          <div className="schedule-legend-heading">
            <h3>Task legend</h3>
            <span>Color-coded by task</span>
          </div>

          <div className="schedule-legend-items">
            {Object.entries(tasks).map(([id, task]) => (
              <div className="schedule-legend-item" key={id}>
                <span
                  className="schedule-legend-color"
                  style={{ backgroundColor: task.color }}
                />
                <span>
                  <strong>{task.name}</strong>
                  <small>{task.course}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <section
      aria-labelledby="generated-schedule-title"
      className="planner-card schedule-output-card"
    >
      <header className="planner-card-heading schedule-output-heading">
        <div>
          <p className="eyebrow">YOUR WEEK AT A GLANCE</p>
          <h2 id="generated-schedule-title">Generated schedule</h2>
          <p className="schedule-description">
            A weekly view of your planned study sessions.
          </p>
        </div>

        <span className="planner-card-icon">
          <Icon name="calendar" size={18} />
        </span>
      </header>

      <div className="schedule-preview-controls">
        <label htmlFor="schedule-preview-state">
          Preview output state
        </label>
        <select
          className="planner-input schedule-state-select"
          id="schedule-preview-state"
          onChange={(event) =>
            setPreviewState(event.target.value as PreviewState)
          }
          value={previewState}
        >
          <option value="success">Successful schedule</option>
          <option value="loading">Loading</option>
          <option value="empty">Empty schedule</option>
          <option value="infeasible">Infeasible workload</option>
          <option value="error">Generation error</option>
        </select>
      </div>

      {renderSchedule()}

      {selectedSession && selectedTask && selectedStart && selectedEnd && (
        <div
          className="schedule-modal-backdrop"
          onClick={() => setSelectedSession(null)}
        >
          <section
            aria-labelledby="schedule-modal-title"
            aria-modal="true"
            className="schedule-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close task details"
              className="schedule-modal-close"
              onClick={() => setSelectedSession(null)}
              type="button"
            >
              <Icon name="x" size={18} />
            </button>

            <span
              className="schedule-modal-color"
              style={{ backgroundColor: selectedTask.color }}
            />

            <p className="eyebrow">STUDY SESSION DETAILS</p>
            <h3 id="schedule-modal-title">{selectedTask.name}</h3>

            <div className="schedule-modal-details">
              <div>
                <span>Course</span>
                <strong>{selectedTask.course}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>
                  {selectedStart.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </strong>
              </div>
              <div>
                <span>Start time</span>
                <strong>{formatTime(selectedStart)}</strong>
              </div>
              <div>
                <span>End time</span>
                <strong>{formatTime(selectedEnd)}</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{formatDuration(selectedStart, selectedEnd)}</strong>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
