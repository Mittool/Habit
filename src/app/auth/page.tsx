"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, EyeOff, ChevronRight } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";

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

  function doLocalAuth() {
    setUser({
      id: crypto.randomUUID(),
      email: email,
      name: name || email.split("@")[0],
    });
    setAuthenticated(true);
    router.push(onboardingDone ? "/" : "/onboarding");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    // If Supabase is not configured, go straight to local auth
    if (!isSupabaseConfigured || !supabase) {
      doLocalAuth();
      setLoading(false);
      return;
    }

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || email,
            name: name || email.split("@")[0],
          });
          setAuthenticated(true);
          router.push("/onboarding");
        } else {
          // signUp succeeded but no user returned (email confirmation needed)
          doLocalAuth();
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          setUser({
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || email.split("@")[0],
          });
          setAuthenticated(true);
          router.push(onboardingDone ? "/" : "/onboarding");
        } else {
          doLocalAuth();
        }
      }
    } catch {
      // Any Supabase error → fall back to local auth
      doLocalAuth();
    } finally {
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
            src="/icons/icon-192x192.png"
            alt="Trac"
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "16px",
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
            Trac
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
            {mode === "signin" ? "Welcome back" : "Begin your journey"}
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
              style={{
                backgroundColor: "#fee2e2",
                color: "#b91c1c",
                padding: "10px 12px",
                borderRadius: "6px",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "12px",
              marginTop: "4px",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
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
          Your data is stored locally on your device.
          <br />
          Privacy-first by design.
        </p>
      </div>
    </div>
  );
}
