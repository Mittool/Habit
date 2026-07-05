"use client";
import React from "react";

/**
 * Renders a ring-pulse + 6-dot confetti burst centered on the container.
 * The parent must be `position: relative` so this can absolute-position
 * itself over the just-clicked check icon.
 *
 * All animation is transform+opacity so it runs on the GPU compositor
 * at 60fps. Self-cleans after ~700ms — the parent conditionally mounts
 * it and unmounts when done, so we don't leak animation frames.
 */
export default function CompletionBurst({ color = "var(--accent)" }: { color?: string }) {
  // 6 dots evenly around a circle
  const dots = [0, 60, 120, 180, 240, 300].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return {
      tx: `${Math.cos(rad) * 28}px`,
      ty: `${Math.sin(rad) * 28}px`,
    };
  });

  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        color,
      }}
    >
      <span className="ring-pulse" style={{ color }} />
      {dots.map((d, i) => (
        <span
          key={i}
          className="confetti-dot"
          style={{
            backgroundColor: color,
            // @ts-expect-error CSS custom props typed loosely
            "--tx": d.tx,
            "--ty": d.ty,
          }}
        />
      ))}
    </span>
  );
}
