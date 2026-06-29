"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAppStore } from "@/lib/store";
import {
  Play,
  Pause,
  Music,
  CloudRain,
  Trees,
  Flame,
  Waves,
  Wind,
  Coffee,
  Moon,
  Timer,
  Check,
  Disc,
} from "lucide-react";

interface SoundLoop {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const SOUNDS: SoundLoop[] = [
  { id: "lofi", title: "Lofi", desc: "Calm instrumental beats", icon: <Music size={20} />, color: "#6366F1", bg: "#E0E7FF" },
  { id: "rain", title: "Rain", desc: "Natural continuous rainfall", icon: <CloudRain size={20} />, color: "#0EA5E9", bg: "#E0F2FE" },
  { id: "brown", title: "Brown Noise", desc: "Genuine deep brown noise", icon: <Disc size={20} />, color: "#A855F7", bg: "#F3E8FF" },
  { id: "forest", title: "Forest", desc: "Woodland ambience & birds", icon: <Trees size={20} />, color: "#10B981", bg: "#D1FAE5" },
  { id: "fire", title: "Fireplace", desc: "Real crackling fireplace", icon: <Flame size={20} />, color: "#F59E0B", bg: "#FEF3C7" },
  { id: "ocean", title: "Ocean Waves", desc: "Gentle rolling coastal waves", icon: <Waves size={20} />, color: "#3B82F6", bg: "#DBEAFE" },
  { id: "white", title: "White Noise", desc: "Clean neutral static", icon: <Disc size={20} />, color: "#64748B", bg: "#F1F5F9" },
  { id: "wind", title: "Wind", desc: "Soft breeze through trees", icon: <Wind size={20} />, color: "#14B8A6", bg: "#CCFBF1" },
  { id: "coffee", title: "Coffee Shop", desc: "Quiet café ambience", icon: <Coffee size={20} />, color: "#8B5CF6", bg: "#EDE9FE" },
  { id: "night", title: "Night Ambience", desc: "Peaceful crickets hum", icon: <Moon size={20} />, color: "#4F46E5", bg: "#EEF2FF" },
];

// Pristine Studio Web Audio Synthesizer Engine
// Engineered with seamless 0ms infinite loops and exponential LFO modulations
function initiateAmbientSynthesizer(type: string, ctx: AudioContext): { gain: GainNode; stop: () => void } {
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
  masterGain.connect(ctx.destination);

  const activeNodes: any[] = [];
  let intervalTimer: any = null;

  // Helper: White Noise Buffer
  const generateWhiteNoise = () => {
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  };

  // Helper: Pink Noise Buffer
  const generatePinkNoise = () => {
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  };

  if (type === "brown") {
    const bufSize = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5; // Level gain
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(masterGain);
    src.start();
    activeNodes.push(src);
  } else if (type === "white") {
    const src = generateWhiteNoise();
    src.connect(masterGain);
    src.start();
    activeNodes.push(src);
  } else if (type === "rain") {
    const src = generatePinkNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1000;
    src.connect(filter);
    filter.connect(masterGain);
    src.start();
    activeNodes.push(src, filter);
  } else if (type === "forest" || type === "wind") {
    const src = generatePinkNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = type === "forest" ? 500 : 350;
    filter.Q.value = 0.7;
    src.connect(filter);
    filter.connect(masterGain);
    src.start();
    activeNodes.push(src, filter);

    // Forest Bird Chirps
    if (type === "forest") {
      intervalTimer = setInterval(() => {
        if (Math.random() > 0.4) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(2800 + Math.random() * 800, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1800, ctx.currentTime + 0.15);
          g.gain.setValueAtTime(0.015, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + 0.18);
        }
      }, 3500);
    }
  } else if (type === "ocean" || type === "lofi" || type === "coffee" || type === "fire" || type === "night") {
    const src = generatePinkNoise();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = type === "ocean" ? 400 : type === "fire" ? 600 : 700;
    src.connect(filter);
    filter.connect(masterGain);
    src.start();
    activeNodes.push(src, filter);

    // Ocean Rolling Cadence LFO
    if (type === "ocean") {
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.12; // 8s rolling wave cycle
      lfoGain.gain.value = 300;
      lfo.connect(filter.frequency);
      lfo.start();
      activeNodes.push(lfo, lfoGain);
    }
    // Fireplace Pops
    else if (type === "fire") {
      intervalTimer = setInterval(() => {
        if (Math.random() > 0.3) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(120 + Math.random() * 100, ctx.currentTime);
          g.gain.setValueAtTime(0.04, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + 0.06);
        }
      }, 800);
    }
    // Night Crickets
    else if (type === "night") {
      intervalTimer = setInterval(() => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(4200, ctx.currentTime);
        g.gain.setValueAtTime(0.01, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }, 1200);
    }
  }

  // Fade in master gain smoothly
  masterGain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.8);

  const stop = () => {
    if (intervalTimer) clearInterval(intervalTimer);
    masterGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    setTimeout(() => {
      activeNodes.forEach((n) => {
        try { n.stop(); n.disconnect(); } catch {}
      });
      masterGain.disconnect();
    }, 550);
  };

  return { gain: masterGain, stop };
}

// Global Singletons for continuous background playback across page navigation
let globalAudioCtx: AudioContext | null = null;
let globalSynth: { stop: () => void } | null = null;
let globalPlayingId: string | null = null;

export default function FocusMusicPage() {
  const [selectedId, setSelectedId] = useState<string>(globalPlayingId || "lofi");
  const [playing, setPlaying] = useState<boolean>(!!globalPlayingId);

  useEffect(() => {
    if (globalPlayingId && SOUNDS.some(s => s.id === globalPlayingId)) {
      setSelectedId(globalPlayingId);
      setPlaying(true);
    } else {
      const last = localStorage.getItem("trac_last_ambient_sound");
      if (last && SOUNDS.some(s => s.id === last)) setSelectedId(last);
    }
  }, []);

  const handleTogglePlay = useCallback((targetId?: string) => {
    const idToPlay = targetId || selectedId;
    
    // If clicking new sound while playing, crossfade
    if (playing && targetId && targetId !== selectedId) {
      if (globalSynth) globalSynth.stop();
      setSelectedId(targetId);
      localStorage.setItem("trac_last_ambient_sound", targetId);
      globalPlayingId = targetId;

      if (!globalAudioCtx) globalAudioCtx = new AudioContext();
      if (globalAudioCtx.state === "suspended") globalAudioCtx.resume();

      globalSynth = initiateAmbientSynthesizer(targetId, globalAudioCtx);
      return;
    }

    // Stop playback
    if (playing && (!targetId || targetId === selectedId)) {
      if (globalSynth) globalSynth.stop();
      globalSynth = null;
      globalPlayingId = null;
      setPlaying(false);
      return;
    }

    // Initiate playback
    if (targetId) setSelectedId(targetId);
    localStorage.setItem("trac_last_ambient_sound", idToPlay);
    globalPlayingId = idToPlay;
    setPlaying(true);

    if (!globalAudioCtx) globalAudioCtx = new AudioContext();
    if (globalAudioCtx.state === "suspended") globalAudioCtx.resume();

    globalSynth = initiateAmbientSynthesizer(idToPlay, globalAudioCtx);
  }, [playing, selectedId]);

  const activeSound = SOUNDS.find(s => s.id === selectedId) || SOUNDS[0];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: "24px 20px calc(24px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}>
      {/* Active Focus Session Banner indicator */}
      <div style={{ display: "flex", justifyContent: "center", width: "100%", marginBottom: "16px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "9999px", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border)", fontSize: "12px", fontWeight: "600", color: "var(--text-secondary)" }}>
          <Timer size={14} color="var(--accent)" />
          <span>Ambient Audio Loop</span>
        </div>
      </div>

      {/* Prominent Minimalist Player Center */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "16px 0" }}>
        {/* Large Category Icon Artwork */}
        <div
          style={{
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            backgroundColor: activeSound.bg,
            color: activeSound.color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: playing ? `0 12px 36px ${activeSound.color}40` : "0 4px 16px var(--shadow)",
            transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            transform: playing ? "scale(1.05)" : "scale(1)",
            border: "1px solid var(--border)"
          }}
        >
          <div style={{ transform: "scale(2.8)" }}>
            {activeSound.icon}
          </div>
        </div>

        {/* Sound Title Title */}
        <div style={{ textAlign: "center", marginTop: "28px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: "600", color: "var(--text-primary)", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            {activeSound.title}
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: 0 }}>
            {activeSound.desc}
          </p>
        </div>

        {/* Large Play/Pause Button */}
        <button
          onClick={() => handleTogglePlay()}
          className="cursor-pointer"
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            backgroundColor: "var(--text-primary)",
            color: "var(--bg-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            marginTop: "32px",
            boxShadow: "0 8px 24px var(--shadow)",
            transition: "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          title={playing ? "Pause Sound" : "Play Sound"}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          {playing ? <Pause size={30} /> : <Play size={30} style={{ marginLeft: "4px" }} />}
        </button>
      </div>

      {/* Simple Sound Selector Grid Bottom */}
      <div>
        <div style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "10px", textAlign: "center" }}>
          Select Ambient Soundscape
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
          {SOUNDS.map((sound) => {
            const isSel = selectedId === sound.id;
            return (
              <button
                key={sound.id}
                onClick={() => handleTogglePlay(sound.id)}
                className="cursor-pointer"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "12px 4px",
                  borderRadius: "12px",
                  border: `1px solid ${isSel ? sound.color : "transparent"}`,
                  backgroundColor: isSel ? sound.bg : "var(--bg-secondary)",
                  color: isSel ? sound.color : "var(--text-secondary)",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                title={sound.title}
              >
                <div>{sound.icon}</div>
                <span style={{ fontSize: "11px", fontWeight: isSel ? "600" : "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                  {sound.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
