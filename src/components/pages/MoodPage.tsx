"use client";
import { useState } from "react";
import { useAppStore, getTodayStr, MoodType } from "@/lib/store";
import { format, subDays } from "date-fns";
import { Smile, Save } from "lucide-react";

const MOODS: { value: MoodType; label: string; color: string; desc: string }[] = [
  { value: "great", label: "Great", color: "#22c55e", desc: "Energized and motivated" },
  { value: "good", label: "Good", color: "#84cc16", desc: "Feeling positive" },
  { value: "neutral", label: "Neutral", color: "#f59e0b", desc: "Just okay" },
  { value: "bad", label: "Bad", color: "#ef4444", desc: "Struggling a bit" },
  { value: "awful", label: "Awful", color: "#7c3aed", desc: "Really tough day" },
];

export default function MoodPage() {
  const { moodEntries, addMoodEntry } = useAppStore();
  const today = getTodayStr();
  const todayEntry = moodEntries.find((m) => m.date === today);

  const [selectedMood, setSelectedMood] = useState<MoodType | "">(todayEntry?.mood || "");
  const [note, setNote] = useState(todayEntry?.note || "");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!selectedMood) return;
    addMoodEntry({ date: today, mood: selectedMood, note: note.trim() || undefined });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Last 14 days
  const history = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(new Date(), 13 - i);
    const key = format(d, "yyyy-MM-dd");
    const entry = moodEntries.find((m) => m.date === key);
    const mood = MOODS.find((m) => m.value === entry?.mood);
    return { key, day: format(d, "EEE"), date: format(d, "d"), entry, mood };
  });

  return (
    <div style={{ padding: "24px", maxWidth: "600px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <Smile size={20} color="var(--accent)" />
        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
          Mood Tracker
        </h2>
      </div>

      {/* Today's mood */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "var(--text-primary)",
            margin: "0 0 16px",
          }}
        >
          How are you feeling today?
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setSelectedMood(m.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 16px",
                borderRadius: "8px",
                border: `2px solid ${selectedMood === m.value ? m.color : "var(--border)"}`,
                backgroundColor:
                  selectedMood === m.value ? m.color + "15" : "var(--bg-secondary)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "50%",
                  backgroundColor: m.color,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: selectedMood === m.value ? "600" : "500",
                    color: "var(--text-primary)",
                  }}
                >
                  {m.label}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{m.desc}</div>
              </div>
              {selectedMood === m.value && (
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: m.color,
                  }}
                />
              )}
            </button>
          ))}
        </div>

        <textarea
          placeholder="Add a note about your day (optional)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          style={{ width: "100%", resize: "vertical", marginBottom: "12px" }}
        />

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={!selectedMood}
          style={{
            width: "100%",
            padding: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            opacity: !selectedMood ? 0.5 : 1,
          }}
        >
          <Save size={16} />
          {saved ? "Saved!" : todayEntry ? "Update Mood" : "Save Mood"}
        </button>
      </div>

      {/* 14-day history */}
      <div className="card" style={{ padding: "20px" }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: "600",
            color: "var(--text-primary)",
            margin: "0 0 16px",
          }}
        >
          14-Day History
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
          {history.map((d) => (
            <div
              key={d.key}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}
              title={d.entry ? `${d.mood?.label}${d.entry.note ? ": " + d.entry.note : ""}` : "No entry"}
            >
              <span
                style={{
                  fontSize: "9px",
                  color: "var(--text-muted)",
                  textTransform: "none",
                  letterSpacing: "0.3px",
                }}
              >
                {d.day}
              </span>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: d.mood ? d.mood.color + "44" : "var(--bg-secondary)",
                  border: `2px solid ${d.mood ? d.mood.color : "var(--border)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {d.mood && (
                  <div
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: d.mood.color,
                    }}
                  />
                )}
              </div>
              <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{d.date}</span>
            </div>
          ))}
        </div>

        {/* Mood legend */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid var(--border)",
          }}
        >
          {MOODS.map((m) => (
            <div
              key={m.value}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: m.color,
                }}
              />
              {m.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
