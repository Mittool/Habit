// Server-side transport for scheduled push notifications.
//
// Talks to OneSignal REST API. We use the "external_user_id" filter so we can
// target the exact device belonging to a Supabase-authenticated user
// (see /docs/PUSH_SETUP.md for the wiring on the mobile side).
//
// Env vars (set in .env.local AND in your Vercel/host dashboard):
//   ONESIGNAL_APP_ID           — same as public app id
//   ONESIGNAL_REST_API_KEY     — SECRET, never expose to the client
//
// Endpoints:
//   POST /api/notifications  body: { action: "schedule", ... }  -> { notificationId }
//   POST /api/notifications  body: { action: "cancel",   notificationId } -> { ok: true }

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "ad5bb9f0-fe63-460c-8a8d-cf5331800d5c";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || "";

const ONESIGNAL_URL = "https://api.onesignal.com/notifications";

function haveOneSignalKey(): boolean {
  return typeof ONESIGNAL_REST_API_KEY === "string" && ONESIGNAL_REST_API_KEY.length > 10;
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid-json" }, { status: 400 });
  }

  const action = body?.action as string | undefined;

  // ─── Schedule ───
  if (action === "schedule") {
    const {
      externalUserId,
      title,
      body: msgBody,
      sendAt,
      targetType,
      targetId,
    } = body as {
      externalUserId: string;
      title: string;
      body: string;
      sendAt: string; // ISO
      targetType?: string;
      targetId?: string;
    };

    if (!externalUserId || !title || !msgBody || !sendAt) {
      return NextResponse.json({ error: "missing-fields" }, { status: 400 });
    }

    if (!haveOneSignalKey()) {
      // Graceful no-op so the app still works during local dev without a REST key.
      // The client stores whatever we return as scheduledReminderId; the dummy
      // id lets subsequent cancels remain no-ops.
      return NextResponse.json({
        notificationId: `local-${targetType}-${targetId}-${Date.now()}`,
        warning: "ONESIGNAL_REST_API_KEY not set; scheduled locally only",
      });
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: {
        external_id: [externalUserId],
      },
      target_channel: "push",
      headings: { en: title },
      contents: { en: msgBody },
      // OneSignal accepts ISO8601 with timezone offset; more reliable than RFC 2822
      send_after: new Date(sendAt).toISOString(),
      // OneSignal collapses same-id notifications so we never stack duplicates:
      android_group: `trac-${targetType}-${targetId}`,
      collapse_id: `trac-${targetType}-${targetId}`,
      // Custom data lets the client route to the right screen when tapped
      data: { targetType, targetId, kind: "reminder" },
    };

    try {
      const res = await fetch(ONESIGNAL_URL, {
        method: "POST",
        headers: {
          "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[OneSignal] schedule failed:", res.status, data);
        return NextResponse.json({ error: "onesignal-error", detail: data }, { status: 502 });
      }
      // If no device is currently subscribed for this external_id, OneSignal
      // returns { id: "", recipients: 0 } with no `errors`. That's not a
      // failure — it just means the reminder can't be delivered right now.
      // Return a synthetic id so the caller can still store & later cancel it
      // without pounding OneSignal's DELETE endpoint with empty strings.
      const rawId: string = typeof data.id === "string" ? data.id : "";
      const recipients: number = typeof data.recipients === "number" ? data.recipients : 0;
      const notificationId = rawId.length > 0
        ? rawId
        : `pending-${targetType}-${targetId}-${Date.now()}`;
      return NextResponse.json({
        notificationId,
        recipients,
        pending: rawId.length === 0,
      });
    } catch (err: any) {
      console.error("[OneSignal] schedule exception:", err);
      return NextResponse.json({ error: "network", detail: String(err?.message || err) }, { status: 500 });
    }
  }

  // ─── Cancel ───
  if (action === "cancel") {
    const { notificationId } = body as { notificationId: string };
    if (!notificationId) return NextResponse.json({ ok: true, skipped: "no-id" });

    // Local-only IDs (dev fallback) OR pending IDs (no subscribers at schedule
    // time) — nothing to cancel remotely.
    if (notificationId.startsWith("local-") || notificationId.startsWith("pending-")) {
      return NextResponse.json({ ok: true, skipped: "synthetic-id" });
    }

    if (!haveOneSignalKey()) {
      return NextResponse.json({ ok: true, warning: "ONESIGNAL_REST_API_KEY not set" });
    }

    try {
      const url = `${ONESIGNAL_URL}/${encodeURIComponent(notificationId)}?app_id=${ONESIGNAL_APP_ID}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: {
          "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
          "Accept": "application/json",
        },
      });
      // OneSignal returns 200 even if already fired; treat 404 as "already gone".
      if (!res.ok && res.status !== 404) {
        const detail = await res.text().catch(() => "");
        console.warn("[OneSignal] cancel non-ok:", res.status, detail);
      }
      return NextResponse.json({ ok: true });
    } catch (err: any) {
      console.warn("[OneSignal] cancel exception:", err);
      return NextResponse.json({ ok: true, warning: String(err?.message || err) });
    }
  }

  return NextResponse.json({ error: "unknown-action", action }, { status: 400 });
}
