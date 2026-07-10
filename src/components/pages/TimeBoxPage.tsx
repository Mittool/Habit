"use client";
import { useState } from "react";
import { useAppStore, getTodayStr } from "@/lib/store";
import { format, addDays, subDays } from "date-fns";
import { Plus, Trash2, X, Check, ChevronLeft, ChevronRight } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return { value: `${h}:00`, label: i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM` };
});

// Half-hour options for finer time selection
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hr = Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  const h = hr.toString().padStart(2, "0");
  const label = hr === 0 ? `12:${min} AM` : hr < 12 ? `${hr}:${min} AM` : hr === 12 ? `12:${min} PM` : `${hr - 12}:${min} PM`;
  return { value: `${h}:${min}`, label };
});

interface BlockForm {
  startTime: string;
  endTime: string;
  label: string;
  habitId: string;
  todoId: string;
  color: string;
}

const BLOCK_COLORS = [
  "#5c7a5c", "#6b8cba", "#c47b5c", "#8b7ab8", "#b85c7a",
  "#5cb87a", "#b8a45c",
];

// Row height in pixels per hour
const ROW_HEIGHT = 48;

function formatHourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

export default function TimeBoxPage() {
  const { timeBlocks, habits, todos, addTimeBlock, deleteTimeBlock } = useAppStore();
  const [currentDate, setCurrentDate] = useState(getTodayStr());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BlockForm>({
    startTime: "09:00",
    endTime: "10:00",
    label: "",
    habitId: "",
    todoId: "",
    color: BLOCK_COLORS[0],
  });

  const todayBlocks = timeBlocks
    .filter((b) => b.date === currentDate)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  function handleAdd() {
    if (!form.label.trim()) return;
    addTimeBlock({
      ...form,
      date: currentDate,
      habitId: form.habitId || undefined,
      todoId: form.todoId || undefined,
    });
    setForm({
      startTime: "09:00",
      endTime: "10:00",
      label: "",
      habitId: "",
      todoId: "",
      color: BLOCK_COLORS[0],
    });
    setShowForm(false);
  }

  function timeToMinutes(t: string) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  }

  const navigateDate = (dir: number) => {
    const d = new Date(currentDate);
    dir > 0 ? setCurrentDate(format(addDays(d, 1), "yyyy-MM-dd")) : setCurrentDate(format(subDays(d, 1), "yyyy-MM-dd"));
  };

  const today = getTodayStr();
  const isToday = currentDate === today;

  // Current time indicator
  const nowMinutes = isToday ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  return (
    <div style={{ padding: "24px", maxWidth: "820px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
          Time Boxing
        </h2>
        <button
          className="btn-primary"
          onClick={() => setShowForm(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <Plus size={16} /> Block Time
        </button>
      </div>

      {/* Date navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "20px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          padding: "8px 12px",
        }}
      >
        <button
          onClick={() => navigateDate(-1)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px" }}
        >
          <ChevronLeft size={18} />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
            {isToday ? "Today" : format(new Date(currentDate), "EEEE")}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {format(new Date(currentDate), "MMMM d, yyyy")}
          </div>
        </div>
        <button
          onClick={() => navigateDate(1)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px" }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card fade-in" style={{ padding: "20px", marginBottom: "20px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "14px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
              New Time Block
            </h3>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <input
              type="text"
              placeholder="Block label..."
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              style={{ width: "100%" }}
              autoFocus
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  Start time
                </label>
                <select
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                  style={{ width: "100%" }}
                >
                  {TIME_OPTIONS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                  End time
                </label>
                <select
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                  style={{ width: "100%" }}
                >
                  {TIME_OPTIONS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {habits.length > 0 && (
              <select
                value={form.habitId}
                onChange={(e) => setForm((f) => ({ ...f, habitId: e.target.value }))}
                style={{ width: "100%" }}
              >
                <option value="">Link to habit (optional)</option>
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            )}
            {todos.length > 0 && (
              <select
                value={form.todoId}
                onChange={(e) => setForm((f) => ({ ...f, todoId: e.target.value }))}
                style={{ width: "100%" }}
              >
                <option value="">Link to task (optional)</option>
                {todos.filter((t) => !t.completed).map((t) => (
                  <option key={t.id} value={t.id}>{t.text}</option>
                ))}
              </select>
            )}
            <div>
              <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Color
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                {BLOCK_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: c,
                      border: form.color === c ? "3px solid var(--text-primary)" : "2px solid transparent",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button className="btn-secondary" onClick={() => setShowForm(false)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAdd}
                disabled={!form.label.trim()}
                style={{ flex: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
              >
                <Check size={16} /> Add Block
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 24-hour timeline view */}
      <div className="card" style={{ padding: "0", overflow: "hidden" }}>
        {todayBlocks.length === 0 && nowMinutes < 0 && (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px", borderBottom: "1px solid var(--border)" }}>
            No time blocks yet. Add blocks to structure your day.
          </div>
        )}

        <div style={{ position: "relative", maxHeight: "600px", overflowY: "auto" }}>
          {/* Hour grid rows — all 24 hours */}
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              style={{
                display: "flex",
                borderBottom: "1px solid var(--border)",
                minHeight: `${ROW_HEIGHT}px`,
              }}
            >
              <div
                style={{
                  width: "60px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  flexShrink: 0,
                  paddingTop: "6px",
                }}
              >
                {formatHourLabel(hour)}
              </div>
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  borderLeft: "1px solid var(--border)",
                }}
              />
            </div>
          ))}

          {/* Blocks overlay */}
          <div
            style={{
              position: "absolute",
              left: "60px",
              top: 0,
              right: 0,
              bottom: 0,
              pointerEvents: "none",
            }}
          >
            {todayBlocks.map((block) => {
              const startMins = timeToMinutes(block.startTime);
              const endMins = timeToMinutes(block.endTime);
              const topPx = (startMins / 60) * ROW_HEIGHT;
              const heightPx = Math.max(((endMins - startMins) / 60) * ROW_HEIGHT, 28);
              const linkedHabit = habits.find((h) => h.id === block.habitId);
              const linkedTodo = todos.find((t) => t.id === block.todoId);

              return (
                <div
                  key={block.id}
                  style={{
                    position: "absolute",
                    top: `${topPx}px`,
                    left: "8px",
                    right: "8px",
                    height: `${heightPx}px`,
                    backgroundColor: block.color + "dd",
                    borderRadius: "6px",
                    padding: "5px 8px",
                    color: "white",
                    fontSize: "12px",
                    overflow: "hidden",
                    pointerEvents: "all",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1px",
                  }}
                >
                  <div style={{ fontWeight: "600", lineHeight: 1.2 }}>{block.label}</div>
                  <div style={{ opacity: 0.8, fontSize: "10px" }}>
                    {block.startTime} – {block.endTime}
                  </div>
                  {(linkedHabit || linkedTodo) && (
                    <div style={{ opacity: 0.8, fontSize: "10px" }}>
                      {linkedHabit?.name || linkedTodo?.text}
                    </div>
                  )}
                  <button
                    onClick={() => deleteTimeBlock(block.id)}
                    style={{
                      position: "absolute",
                      top: "3px",
                      right: "4px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "white",
                      opacity: 0.6,
                      padding: "1px",
                    }}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })}

            {/* Current time indicator line */}
            {nowMinutes >= 0 && (
              <div
                style={{
                  position: "absolute",
                  left: "0",
                  right: "0",
                  top: `${(nowMinutes / 60) * ROW_HEIGHT}px`,
                  height: "2px",
                  backgroundColor: "#ef4444",
                  pointerEvents: "none",
                  zIndex: 10,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: "-4px",
                    top: "-3px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#ef4444",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {todayBlocks.length > 0 && (
        <div
          style={{
            marginTop: "16px",
            padding: "14px 16px",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
            color: "var(--text-muted)",
          }}
        >
          <span>{todayBlocks.length} block{todayBlocks.length !== 1 ? "s" : ""} scheduled</span>
          <span style={{ fontWeight: "600", color: "var(--accent)" }}>
            {todayBlocks.reduce((sum, b) => {
              const s = timeToMinutes(b.startTime);
              const e = timeToMinutes(b.endTime);
              return sum + Math.max(e - s, 0);
            }, 0) / 60}h planned
          </span>
        </div>
      )}
    </div>
  );
}
