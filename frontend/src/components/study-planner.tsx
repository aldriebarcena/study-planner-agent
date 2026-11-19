"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { ScheduleOutput } from "@/components/schedule-output";

type StudyTask = {
  id: string;
  title: string;
  minutes: number;
};

type AvailabilityBlock = {
  id: string;
  day: string;
  start: string;
  end: string;
};

const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return [hours ? `${hours}h` : "", remainingMinutes ? `${remainingMinutes}m` : ""].filter(Boolean).join(" ");
}

function formatTime(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function StudyPlanner() {
  const [tasks, setTasks] = useState<StudyTask[]>([]);
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskMinutes, setTaskMinutes] = useState("60");
  const [taskError, setTaskError] = useState("");
  const [availabilityDay, setAvailabilityDay] = useState("Monday");
  const [availabilityStart, setAvailabilityStart] = useState("09:00");
  const [availabilityEnd, setAvailabilityEnd] = useState("11:00");
  const [availabilityError, setAvailabilityError] = useState("");

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskTitle.trim();
    const minutes = Number(taskMinutes);

    if (!title) {
      setTaskError("Add a task name to continue.");
      return;
    }

    setTasks((current) => [...current, { id: crypto.randomUUID(), title, minutes }]);
    setTaskTitle("");
    setTaskMinutes("60");
    setTaskError("");
  }

  function addAvailability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (availabilityEnd <= availabilityStart) {
      setAvailabilityError("End time must be after start time.");
      return;
    }

    setAvailability((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        day: availabilityDay,
        start: availabilityStart,
        end: availabilityEnd,
      },
    ]);
    setAvailabilityError("");
  }

  const plannedMinutes = tasks.reduce((total, task) => total + task.minutes, 0);

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

        <div className="planner-layout">
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
                    setTaskTitle(event.target.value);
                    setTaskError("");
                  }}
                  placeholder="e.g. Review biology lecture notes"
                  required
                  value={taskTitle}
                />
              </label>
              <div className="planner-form-row">
                <label className="planner-field">
                  <span>Estimated time</span>
                  <div className="planner-input-wrap">
                    <input
                      className="planner-input"
                      min="1"
                      onChange={(event) => setTaskMinutes(event.target.value)}
                      required
                      type="number"
                      value={taskMinutes}
                    />
                    <span className="input-suffix">minutes</span>
                  </div>
                </label>
                <button className="planner-button" type="submit"><Icon name="plus" size={17} /> Add task</button>
              </div>
              {taskError && <p className="planner-error" role="alert">{taskError}</p>}
            </form>

            <form className="planner-form-section availability-form" onSubmit={addAvailability}>
              <div className="planner-section-heading">
                <span className="planner-step">02</span>
                <div><h3>Set your availability</h3><p>Choose a day and an open time block.</p></div>
              </div>
              <label className="planner-field">
                <span>Day</span>
                <select
                  className="planner-input"
                  onChange={(event) => setAvailabilityDay(event.target.value)}
                  value={availabilityDay}
                >
                  {weekdays.map((day) => <option key={day}>{day}</option>)}
                </select>
              </label>
              <div className="planner-form-row time-row">
                <label className="planner-field">
                  <span>Starts</span>
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
                  <span>Ends</span>
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
                <button className="planner-button" type="submit"><Icon name="plus" size={17} /> Add time</button>
              </div>
              {availabilityError && <p className="planner-error" role="alert">{availabilityError}</p>}
            </form>
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
              <div><strong>{availability.length}</strong><span>{availability.length === 1 ? "time block" : "time blocks"}</span></div>
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
                      <span className="preview-item-title">{task.title}</span>
                      <span className="preview-item-detail">{formatDuration(task.minutes)}</span>
                      <button
                        aria-label={`Remove ${task.title}`}
                        className="remove-item"
                        onClick={() => setTasks((current) => current.filter((item) => item.id !== task.id))}
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
                  {availability.map((block) => (
                    <li className="preview-item availability-item" key={block.id}>
                      <span className="availability-day">{block.day.slice(0, 3)}</span>
                      <span className="preview-item-title">{block.day}</span>
                      <span className="preview-item-detail">{formatTime(block.start)} – {formatTime(block.end)}</span>
                      <button
                        aria-label={`Remove ${block.day} availability`}
                        className="remove-item"
                        onClick={() => setAvailability((current) => current.filter((item) => item.id !== block.id))}
                        type="button"
                      >Remove</button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="preview-empty">Your open time blocks will appear here.</p>
              )}
            </section>
          </section>
        </div>

        <ScheduleOutput />

        <footer className="planner-footer">
          <span>Nothing is sent to a server.</span>
        </footer>
      </main>
    </div>
  );
}
