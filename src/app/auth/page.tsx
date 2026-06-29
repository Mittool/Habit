"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, EyeOff, ChevronRight } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import { restoreFromCloudDatabase } from "@/lib/cloud";

export default function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const router = useRouter();
  const { setUser, setAuthenticated, onboardingDone, isAuthenticated } = useAppStore();

  // Wait for Zustand hydration
  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  // If already authenticated, redirect away from auth page
  useEffect(() => {
    if (!hydrated) return;
    if (isAuthenticated) {
      router.replace(onboardingDone ? "/" : "/onboarding");
    }
  }, [hydrated, isAuthenticated, onboardingDone, router]);

  if (!hydrated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-primary)",
        }}
      >
        <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>Loading...</div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!supabase || !isSupabaseConfigured) {
      setError("Cloud database connection unreachable. Please verify network or Supabase credentials.");
      setLoading(false);
      return;
    }

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || email.split("@")[0] } },
        });

        if (signUpError) {
          setError(signUpError.message || "Failed to create Supabase account.");
          setLoading(false);
          return;
        }

        if (data.user) {
          useAppStore.setState({
            user: {
              id: data.user.id,
              email: data.user.email || email,
              name: name || email.split("@")[0],
            },
            isAuthenticated: true,
            onboardingDone: false,
          });
          router.push("/onboarding");
        } else {
          setError("Account created! Please check your email inbox to confirm registration.");
          setLoading(false);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message || "Invalid login credentials. Please verify your email and password.");
          setLoading(false);
          return;
        }

        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || email.split("@")[0],
          });
          setAuthenticated(true);
          await restoreFromCloudDatabase();
          router.push(onboardingDone ? "/" : "/onboarding");
        } else {
          setError("Authentication rejected. No valid Supabase user session returned.");
          setLoading(false);
        }
      }
    } catch (err: any) {
      setError(err?.message || "Authentication failed. Please verify your Supabase credentials.");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--bg-primary)",
        padding: "24px",
      }}
    >
      <div
        className="card fade-in"
        style={{ width: "100%", maxWidth: "400px", padding: "40px 32px" }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src="/logo-inside.png"
            alt="Trac"
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "22%",
              objectFit: "cover",
              boxShadow: "0 8px 24px rgba(13,148,136,0.25)",
              margin: "0 auto 16px",
              display: "block",
            }}
          />
          <h1
            style={{
              fontSize: "24px",
              fontWeight: "600",
              color: "var(--text-primary)",
              margin: "0 0 4px",
              letterSpacing: "-0.5px",
            }}
          >
            Trac App
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
            {mode === "signin" ? "Cloud Account Sign In" : "Create Cloud Account"}
          </p>
        </div>

        {/* Tab toggle */}
        <div
          style={{
            display: "flex",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "8px",
            padding: "4px",
            marginBottom: "24px",
          }}
        >
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              style={{
                flex: 1,
                padding: "8px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontSize: "13px",
                fontFamily: "inherit",
                fontWeight: mode === m ? "600" : "400",
                backgroundColor: mode === m ? "var(--bg-card)" : "transparent",
                color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
                boxShadow: mode === m ? "0 1px 3px var(--shadow)" : "none",
                transition: "all 0.2s",
              }}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {mode === "signup" && (
            <div style={{ position: "relative" }}>
              <User
                size={16}
                color="var(--text-muted)"
                style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: "100%", paddingLeft: "36px" }}
              />
            </div>
          )}

          <div style={{ position: "relative" }}>
            <Mail
              size={16}
              color="var(--text-muted)"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: "100%", paddingLeft: "36px" }}
            />
          </div>

          <div style={{ position: "relative" }}>
            <Lock
              size={16}
              color="var(--text-muted)"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type={showPw ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", paddingLeft: "36px", paddingRight: "40px" }}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "var(--text-muted)",
              }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {error && (
            <div
              className="fade-in"
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                padding: "12px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                lineHeight: "1.5",
                border: "1px solid #f87171"
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary cursor-pointer"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "14px",
              marginTop: "4px",
              fontSize: "14px",
              fontWeight: "600"
            }}
          >
            {loading ? "Signing in..." : mode === "signin" ? "Sign In" : "Sign Up"}
            {!loading && <ChevronRight size={16} />}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "24px",
            lineHeight: "1.5",
          }}
        >
          Cloud account sync active.
          <br />
          Secure storage enabled.
        </p>
      </div>
    </div>
  );
}
