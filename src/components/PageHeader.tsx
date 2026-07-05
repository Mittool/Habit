"use client";
import React from "react";

/**
 * Unified page header used across every top-level screen.
 *
 * Same visual shape everywhere:
 *   [SMALL UPPERCASE LABEL]
 *   Big serif title
 *   (optional trailing action slot on the right)
 *
 * Deliberately does not accept a "description" / "subtext" prop —
 * users kept flagging paragraph subtitles as noise, so we don't have
 * a place for them at all.
 */
export default function PageHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="fade-in" style={{ marginBottom: 22 }}>
      {eyebrow && (
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1
          className="serif"
          style={{
            fontSize: "clamp(34px, 7vw, 46px)",
            lineHeight: 1,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h1>
        {right && <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>{right}</div>}
      </div>
    </div>
  );
}
