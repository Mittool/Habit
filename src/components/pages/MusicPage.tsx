"use client";
import { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Music } from "lucide-react";

interface Track {
  id: string;
  name: string;
  description: string;
  frequency: string;
  color: string;
}

const TRACKS: Track[] = [
  {
    id: "lofi",
    name: "Lo-Fi Focus",
    description: "Calm beats for deep concentration",
    frequency: "174 Hz",
    color: "#6366f1",
  },
  {
    id: "rain",
    name: "Rain Sounds",
    description: "Gentle rainfall for ambient focus",
    frequency: "Nature",
    color: "#0ea5e9",
  },
  {
    id: "brown",
    name: "Brown Noise",
    description: "Deep noise for blocking distractions",
    frequency: "20-20k Hz",
    color: "#8b7355",
  },
  {
    id: "binaural",
    name: "Binaural Alpha",
    description: "Alpha waves for relaxed focus",
    frequency: "8-12 Hz",
    color: "#8b5cf6",
  },
  {
    id: "nature",
    name: "Forest Ambience",
    description: "Birds and wind for creative flow",
    frequency: "Nature",
    color: "#22c55e",
  },
  {
    id: "fire",
    name: "Fireplace",
    description: "Cozy crackling for calm productivity",
    frequency: "Nature",
    color: "#f59e0b",
  },
];

// Web Audio API noise generator
function createNoiseGenerator(type: string, audioCtx: AudioContext): AudioNode[] {
  const nodes: AudioNode[] = [];

  if (type === "brown" || type === "lofi") {
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (type === "brown") {
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
      } else {
        data[i] = white * 0.15;
      }
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = type === "lofi" ? 800 : 400;

    source.connect(filter);
    nodes.push(source, filter);
    source.start();
  } else if (type === "rain" || type === "nature" || type === "fire") {
    // White noise for rain/nature
    const bufferSize = audioCtx.sampleRate * 2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = type === "fire" ? 200 : type === "nature" ? 600 : 1500;
    filter.Q.value = 0.8;

    source.connect(filter);
    nodes.push(source, filter);
    source.start();
  } else if (type === "binaural") {
    // Binaural beat simulation
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    osc1.frequency.value = 200;
    osc2.frequency.value = 210;
    osc1.type = "sine";
    osc2.type = "sine";
    nodes.push(osc1, osc2);
    osc1.start();
    osc2.start();
  }

  return nodes;
}

export default function MusicPage() {
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (activeTrack) {
      timerRef.current = setInterval(() => setMinutes((m) => m + 1), 60000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTrack]);

  function stopAll() {
    nodesRef.current.forEach((node) => {
      try {
        if (node instanceof AudioBufferSourceNode || node instanceof OscillatorNode) {
          node.stop();
        }
        node.disconnect();
      } catch {
        // already stopped
      }
    });
    nodesRef.current = [];
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    gainRef.current = null;
  }

  function playTrack(id: string) {
    if (activeTrack === id) {
      stopAll();
      setActiveTrack(null);
      return;
    }
    stopAll();

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = muted ? 0 : volume;
    gainNode.connect(audioCtx.destination);
    gainRef.current = gainNode;

    const nodes = createNoiseGenerator(id, audioCtx);
    nodesRef.current = nodes;

    // Connect last node to gain
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      lastNode.connect(gainNode);
    }

    setActiveTrack(id);
  }

  function handleVolumeChange(v: number) {
    setVolume(v);
    if (gainRef.current) gainRef.current.gain.value = muted ? 0 : v;
  }

  function handleMute() {
    const newMuted = !muted;
    setMuted(newMuted);
    if (gainRef.current) gainRef.current.gain.value = newMuted ? 0 : volume;
  }

  return (
    <div style={{ padding: "24px", maxWidth: "600px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "24px" }}>
        <Music size={20} color="var(--accent)" />
        <h2 style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
          Focus Music
        </h2>
      </div>

      {/* Now playing */}
      {activeTrack && (
        <div
          className="card fade-in"
          style={{
            padding: "16px 20px",
            marginBottom: "20px",
            borderLeft: `3px solid ${TRACKS.find((t) => t.id === activeTrack)?.color}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "2px" }}>
                Now Playing
              </div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                {TRACKS.find((t) => t.id === activeTrack)?.name}
              </div>
            </div>

            {/* Visualizer bars */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "24px" }}>
              {[16, 22, 14, 20, 18].map((h, i) => (
                <div
                  key={i}
                  className="music-bar"
                  style={{
                    height: `${h}px`,
                    backgroundColor: TRACKS.find((t) => t.id === activeTrack)?.color,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Volume control */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={handleMute}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-muted)",
                padding: 0,
              }}
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: "var(--accent)" }}
            />
            <span style={{ fontSize: "12px", color: "var(--text-muted)", width: "32px" }}>
              {Math.round(volume * 100)}%
            </span>
          </div>

          {minutes > 0 && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
              Listening for {minutes} min
            </div>
          )}
        </div>
      )}

      {/* Track list */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {TRACKS.map((track) => {
          const isActive = activeTrack === track.id;
          return (
            <button
              key={track.id}
              onClick={() => playTrack(track.id)}
              style={{
                padding: "16px",
                borderRadius: "10px",
                border: `2px solid ${isActive ? track.color : "var(--border)"}`,
                backgroundColor: isActive ? track.color + "15" : "var(--bg-card)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: track.color + "22",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {isActive ? (
                    <Pause size={14} color={track.color} />
                  ) : (
                    <Play size={14} color={track.color} />
                  )}
                </div>
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    backgroundColor: "var(--bg-secondary)",
                    padding: "2px 6px",
                    borderRadius: "10px",
                  }}
                >
                  {track.frequency}
                </span>
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  color: isActive ? track.color : "var(--text-primary)",
                  marginBottom: "3px",
                }}
              >
                {track.name}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.3" }}>
                {track.description}
              </div>
            </button>
          );
        })}
      </div>

      <p
        style={{
          marginTop: "20px",
          fontSize: "12px",
          color: "var(--text-muted)",
          textAlign: "center",
          lineHeight: "1.5",
        }}
      >
        Audio is generated locally using Web Audio API.
        <br />
        No internet connection required.
      </p>
    </div>
  );
}
