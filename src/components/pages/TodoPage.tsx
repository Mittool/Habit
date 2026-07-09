"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Plus, Trash2, CheckCircle, Circle, Timer, X, Link, Calendar } from "lucide-react";
import CompletionBurst from "@/components/CompletionBurst";

export default function TodoPage({ onNavigate }: { onNavigate: (p: string) => void }) {
  const { todos, habits, addTodo, updateTodo, deleteTodo } = useAppStore();
  const [text, setText] = useState("");
  const [linkedHabit, setLinkedHabit] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);

  function handleAdd() {
    if (!text.trim()) return;
    addTodo({ text, completed: false, habitId: linkedHabit || undefined });
    setText("");
    setLinkedHabit("");
    setShowForm(false);
  }

  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "done") return t.completed;
    return true;
  });

  const doneCount = todos.filter((t) => t.completed).length;

  return (
    <div style={{ padding: "24px", maxWidth: "720px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 2px" }}>
            Tasks
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>
            {doneCount}/{todos.length} completed
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="btn-secondary"
            onClick={() => onNavigate("timebox")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Calendar size={16} /> TimeBox
          </button>
          <button
            className="btn-primary"
            onClick={() => setShowForm(true)}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card fade-in" style={{ padding: "20px", marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h3 style={{ fontSize: "14px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
              New Task
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
              placeholder="Task description..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              style={{ width: "100%" }}
              autoFocus
            />
            {habits.length > 0 && (
              <div style={{ position: "relative" }}>
                <Link
                  size={14}
                  color="var(--text-muted)"
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                />
                <select
                  value={linkedHabit}
                  onChange={(e) => setLinkedHabit(e.target.value)}
                  style={{ width: "100%", paddingLeft: "30px" }}
                >
                  <option value="">Link to a habit (optional)</option>
                  {habits.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn-secondary"
                onClick={() => setShowForm(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAdd}
                disabled={!text.trim()}
                style={{ flex: 2 }}
              >
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: "8px",
          padding: "4px",
          marginBottom: "16px",
        }}
      >
        {(["all", "active", "done"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: "7px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "inherit",
              textTransform: "capitalize",
              backgroundColor: filter === f ? "var(--bg-card)" : "transparent",
              color: filter === f ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: filter === f ? "600" : "400",
              boxShadow: filter === f ? "0 1px 3px var(--shadow)" : "none",
              transition: "all 0.2s",
            }}
          >
            {f} {f === "active" ? `(${todos.filter((t) => !t.completed).length})` : ""}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div
          className="card"
          style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}
        >
          <CheckCircle size={36} strokeWidth={1} style={{ margin: "0 auto 10px", display: "block", opacity: 0.4 }} />
          <p style={{ fontSize: "14px", margin: 0 }}>
            {filter === "done" ? "No completed tasks" : "No tasks yet — add something to focus on!"}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((todo) => {
            const linkedH = habits.find((h) => h.id === todo.habitId);
            return (
              <div
                key={todo.id}
                className="card fade-in"
                style={{
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  opacity: todo.completed ? 0.7 : 1,
                }}
              >
                <button
                  onClick={() => {
                    if (!todo.completed) {
                      setJustCompletedId(todo.id);
                      setTimeout(() => setJustCompletedId(null), 800);
                    }
                    updateTodo(todo.id, { completed: !todo.completed });
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, position: "relative", width: 20, height: 20 }}
                  className={todo.completed ? "animate-check" : ""}
                >
                  {todo.completed ? (
                    <CheckCircle size={20} color="var(--accent)" />
                  ) : (
                    <Circle size={20} color="var(--border)" />
                  )}
                  {justCompletedId === todo.id && <CompletionBurst color="var(--accent)" />}
                </button>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "14px",
                      color: "var(--text-primary)",
                      textDecoration: todo.completed ? "line-through" : "none",
                      fontWeight: "500",
                    }}
                  >
                    {todo.text}
                  </div>
                  {linkedH && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        marginTop: "4px",
                        fontSize: "11px",
                        color: "var(--text-muted)",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: linkedH.color,
                        }}
                      />
                      {linkedH.name}
                    </div>
                  )}
                </div>

                {todo.pomodoroCount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "12px",
                      color: "#ef4444",
                      backgroundColor: "#fee2e2",
                      padding: "3px 8px",
                      borderRadius: "12px",
                    }}
                  >
                    <Timer size={12} />
                    {todo.pomodoroCount}
                  </div>
                )}

                <button
                  onClick={() => deleteTodo(todo.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "4px",
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      {todos.length > 0 && (
        <div
          style={{
            marginTop: "20px",
            padding: "16px",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "12px",
              color: "var(--text-muted)",
              marginBottom: "8px",
            }}
          >
            <span>Daily progress</span>
            <span>{Math.round((doneCount / todos.length) * 100)}%</span>
          </div>
          <div
            style={{
              height: "6px",
              backgroundColor: "var(--border)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${(doneCount / todos.length) * 100}%`,
                backgroundColor: "var(--accent)",
                borderRadius: "3px",
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
