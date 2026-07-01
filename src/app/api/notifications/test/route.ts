// Diagnostic endpoint. Sends a real push IMMEDIATELY to the current user's
// external_user_id so you can verify:
//   1. Server-side REST key is configured correctly
//   2. Device is actually subscribed under this external_user_id
//   3. OneSignal → device delivery works
//
// Kept as an internal debug endpoint. Can be called with an authenticated
// user's external_user_id to verify OneSignal delivery end-to-end.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "ad5bb9f0-fe63-460c-8a8d-cf5331800d5c";
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || "";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const externalUserId = body?.externalUserId as string | undefined;

  const diagnostics: Record<string, any> = {
    hasAppId: Boolean(ONESIGNAL_APP_ID) && ONESIGNAL_APP_ID.length > 10,
    hasRestKey: Boolean(ONESIGNAL_REST_API_KEY) && ONESIGNAL_REST_API_KEY.length > 10,
    receivedExternalId: externalUserId || null,
  };

  if (!diagnostics.hasRestKey) {
    return NextResponse.json({
      ok: false,
      error: "ONESIGNAL_REST_API_KEY env var is missing on the server. Set it in your host and redeploy.",
      diagnostics,
    }, { status: 500 });
  }

  if (!externalUserId) {
    return NextResponse.json({
      ok: false,
      error: "No externalUserId sent. You are not signed in, or OneSignal.login has not run yet.",
      diagnostics,
    }, { status: 400 });
  }

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: { external_id: [externalUserId] },
    target_channel: "push",
    headings: { en: "Trac test push" },
    contents: { en: "If you see this, adaptive reminders will work too." },
    data: { kind: "test" },
    // No send_after → sends immediately
  };

  try {
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        "Authorization": `Key ${ONESIGNAL_REST_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    const recipients = typeof data.recipients === "number" ? data.recipients : 0;
    const idStr = typeof data.id === "string" ? data.id : "";

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: `OneSignal returned ${res.status}`,
        oneSignalResponse: data,
        diagnostics,
      }, { status: 502 });
    }

    if (recipients === 0) {
      return NextResponse.json({
        ok: false,
        error: `OneSignal accepted the request but zero devices received it. Your external_user_id "${externalUserId}" is not linked to any subscribed device. Log out and back in inside the mobile app so OneSignal.login runs.`,
        oneSignalResponse: data,
        diagnostics,
      }, { status: 200 });
    }

    return NextResponse.json({
      ok: true,
      notificationId: idStr,
      recipients,
      message: `✅ Push sent to ${recipients} device(s). Should arrive within 5 seconds.`,
      diagnostics,
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: `Network error calling OneSignal: ${err?.message || err}`,
      diagnostics,
    }, { status: 500 });
  }
}
