"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import type { PlannerSchedule, PlannerTask } from "@/planner-types";

type PreviewState = "success" | "loading" | "empty" | "infeasible" | "error";

type StudySession = {
  id: string;
  taskId: string;
  start: string;
  end: string;
};

type AvailabilityBlock = {
  id: string;
  start: string;
  end: string;
};

type ScheduleOutputProps = {
  state: PreviewState;
  schedule: PlannerSchedule | null;
  tasks: PlannerTask[];
  message: string;
  availability: AvailabilityBlock[];
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

const taskColors = ["#dceafa", "#fce4d6", "#e4f1df", "#ede0f5", "#f7e9c9"];
const startHour = 0;
const endHour = 24;
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

export function ScheduleOutput({ state, schedule, tasks, message, availability }: ScheduleOutputProps) {
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

  const sessions: StudySession[] = (schedule?.blocks ?? [])
    .map((block, index) => ({
      id: `${block.task_id}-${block.start}-${index}`,
      taskId: block.task_id,
      start: block.start,
      end: block.end,
    }))
    .sort((left, right) => left.start.localeCompare(right.start));
  const scheduleTasks = tasks.map((task, index) => ({
    ...task,
    color: taskColors[index % taskColors.length],
  }));
  const taskDetails = new Map(scheduleTasks.map((task) => [task.id, task]));
  const selectedTask = selectedSession
    ? taskDetails.get(selectedSession.taskId)
    : null;

  const selectedStart = selectedSession
    ? new Date(selectedSession.start)
    : null;

  const selectedEnd = selectedSession
    ? new Date(selectedSession.end)
    : null;
  const firstSession = sessions[0];
  const weekStart = firstSession ? new Date(firstSession.start) : new Date(0);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  function renderSchedule() {
    if (state === "loading") {
      return (
        <div className="schedule-state">
          <span className="schedule-spinner" />
          <h3>Putting your week together...</h3>
          <p>
            Finding time for your tasks and checking your
            availability.
          </p>
        </div>
      );
    }

    if (state === "empty") {
      return (
        <div className="schedule-state">
          <span className="schedule-state-icon">
            <Icon name="calendar" size={23} />
          </span>
          <h3>No study sessions scheduled</h3>
          <p>{message || "Your weekly schedule is currently empty. Add tasks and availability to get started."}</p>
        </div>
      );
    }

    if (state === "infeasible") {
      return (
        <div className="schedule-message schedule-warning">
          <span className="schedule-message-icon">
            <Icon name="alert-circle" size={21} />
          </span>
          <div>
            <h3>Your workload needs a little more room</h3>
            <p>
              {message || "There is not enough available time to fit all your tasks before their deadlines."}
            </p>
            <p className="schedule-suggestion">
              Try adding more availability or adjusting
              your estimated study times.
            </p>
          </div>
        </div>
      );
    }

    if (state === "error") {
      return (
        <div className="schedule-message schedule-error">
          <span className="schedule-message-icon">
            <Icon name="alert-circle" size={21} />
          </span>
          <div>
            <h3>We could not create your schedule</h3>
            <p>
              {message || "Something went wrong while preparing your study plan. Please try again."}
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
          <span className="schedule-revision">Planner API</span>
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
                        style={{
                          top: index * hourHeight,
                          transform: index === 0 ? "translateY(0)" : "translateY(-50%)",
                        }}
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

              const daySessions = sessions.filter(
                (session) => new Date(session.start).toDateString() === date.toDateString(),
              );

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
                    {availability.map((window) => {
                    const windowStart = new Date(window.start);
                    const windowEnd = new Date(window.end);

                    const dayStart = new Date(date);
                    dayStart.setHours(startHour, 0, 0, 0);

                    const dayEnd = new Date(date);
                    dayEnd.setHours(endHour, 0, 0, 0);

                    const visibleStart = new Date(
                      Math.max(windowStart.getTime(), dayStart.getTime())
                    );

                    const visibleEnd = new Date(
                      Math.min(windowEnd.getTime(), dayEnd.getTime())
                    );

                    if (visibleEnd <= visibleStart) return null;

                    const minutesFromStart =
                      (visibleStart.getTime() - dayStart.getTime()) / 60000;

                    const duration =
                      (visibleEnd.getTime() - visibleStart.getTime()) / 60000;

                    return (
                      <div
                        className="schedule-availability-block"
                        key={`${window.id}-${dayIndex}`}
                        style={{
                          top: `${(minutesFromStart / 60) * hourHeight}px`,
                          height: `${(duration / 60) * hourHeight}px`,
                        }}
                      >
                      </div>
                    );
                  })}
                    {daySessions.map((session) => {
                      const start = new Date(session.start);
                      const end = new Date(session.end);
                      const task = taskDetails.get(session.taskId);
                      if (!task) return null;

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
          <div className="schedule-legend-item">
            <span
              className="schedule-legend-color"
              style={{ backgroundColor: "rgba(34, 197, 94, 0.35)" }}
            />
            <span>
              <strong>Available time</strong>
              <small>Open study windows</small>
            </span>
          </div>
          <div className="schedule-legend-items">
            {scheduleTasks.map((task) => (
              <div className="schedule-legend-item" key={task.id}>
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
                <strong>{selectedTask.course || "No course"}</strong>
              </div>
              <div>
                <span>Deadline</span>
                <strong>
                  {new Date(selectedTask.deadline).toLocaleString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </strong>
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
