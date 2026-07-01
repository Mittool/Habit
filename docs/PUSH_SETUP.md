# Push Notification Setup — OneSignal + Median + Supabase

This is the exact, complete checklist for wiring real background push notifications
into Trac so the adaptive reminder engine in `src/lib/scheduler.ts` can deliver
alerts to users' phones.

The code side is already done. You only need to complete the console + build steps below.

---

## 1. OneSignal — dashboard setup

### 1.1 Create the two platforms (once)

Go to https://dashboard.onesignal.com → your app → **Settings → Platforms**.

- **Android (Google Android)**
  - Firebase Sender ID + Firebase Service Account JSON
  - Get these from Firebase Console → Project Settings → Cloud Messaging + Service Accounts
  - You already have `google-services.json` in this repo — use the same Firebase project
- **iOS (Apple iOS)**
  - Upload your Apple Push key (`.p8`) from the Apple Developer portal
  - Key ID, Team ID, Bundle ID
- **Web Push** — already active for the PWA (no extra config)

### 1.2 Grab the two keys

**Settings → Keys & IDs**:

| Key | Where it goes | Sensitivity |
|---|---|---|
| `OneSignal App ID` | client + server (already hard-coded in `src/lib/onesignal.ts`) | public |
| `REST API Key` | **server only** — env var `ONESIGNAL_REST_API_KEY` | **SECRET** |

Add the REST API Key to:
- Local: `.env.local`
- Production: your hosting provider (Vercel → Settings → Environment Variables)

```bash
# .env.local
ONESIGNAL_APP_ID=ad5bb9f0-fe63-460c-8a8d-cf5331800d5c
ONESIGNAL_REST_API_KEY=<paste the REST API Key from OneSignal here>
```

Without this key, `/api/notifications` returns local-only stub IDs and no real push is sent.

---

## 2. Median.co — mobile wrapper setup

### 2.1 Enable the OneSignal plugin

Median dashboard → your app → **App Config → Plugins → OneSignal**.

- Toggle **Enable**
- Paste your **OneSignal App ID** in the plugin config
- Save

Median will auto-inject the OneSignal native SDK into both iOS and Android builds.
You do **not** need to bundle the OneSignal npm package into the WebView JS — the
plugin exposes it as `window.OneSignal` inside the wrapper, and the web SDK we already
load (`src/lib/onesignal.ts`) will detect and use it.

### 2.2 Rebuild the apps

Trigger new builds in the Median dashboard so the OneSignal plugin ships with the binary:

- **App Config → Build → Android APK / AAB**
- **App Config → Build → iOS IPA**

### 2.3 Enable Push permission prompt

Median dashboard → **Native Navigation & UI → Push Notifications**:

- **Prompt for push permission on first launch:** ✅
  (or leave off and use the in-app button we already have in `NotificationsPage.tsx`
  which calls `promptOneSignalPush()`)

### 2.4 (Optional) Deep-link on tap

We already emit `data: { targetType, targetId, kind: "reminder" }` in the notification
payload. To make a tap land on the right screen inside Median:

Median dashboard → **JavaScript Bridge → Custom OneSignal handler**:

```js
median.OneSignal.setNotificationOpenedHandler((data) => {
  const { targetType, targetId } = data.notification.additionalData || {};
  if (targetType === "habit") {
    location.href = "/?tab=habits&highlight=" + targetId;
  } else if (targetType === "todo") {
    location.href = "/?tab=planner&highlight=" + targetId;
  }
});
```

---

## 3. Supabase — link auth user ↔ OneSignal device

The code path is already wired:

- `src/app/auth/page.tsx` calls `setOneSignalExternalUserId(user.id)` on sign-in
- `src/components/PWALayout.tsx` calls it again on cold-start if a Supabase session already exists
- `src/lib/onesignal.ts` runs `OneSignal.login(userId)` under the hood, which sets
  `external_user_id` on the device
- `src/app/api/notifications/route.ts` sends notifications using
  `include_aliases: { external_id: [userId] }`

So a notification scheduled for user `x` will only reach devices where that same
user is signed in — perfect for multi-device support.

### 3.1 (Optional but recommended) Persist scheduled reminders in Supabase

Currently `scheduledReminderId` lives in `localStorage` (via Zustand persist). If you
want scheduled reminders to survive a device reset or move between devices, add a
`habit_reminders` table:

```sql
create table habit_reminders (
  habit_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id text,
  scheduled_for timestamptz,
  updated_at timestamptz default now()
);

alter table habit_reminders enable row level security;
create policy "own reminders" on habit_reminders
  for all using (auth.uid() = user_id);
```

Then extend `cloud.ts` to mirror `habit.scheduledReminderId` / `habit.scheduledReminderAt`
into this table on each write. (Optional — the app works fine without it.)

---

## 4. Local development quick test

```bash
# 1. Set the env vars
echo 'ONESIGNAL_REST_API_KEY=<paste>' >> .env.local

# 2. Run the dev server
npm run dev

# 3. Open http://localhost:3000, sign in, and toggle a habit's completion.
#    Check the Network tab for POST /api/notifications with action=schedule.
#    Response should contain a notificationId beginning with a UUID (not "local-").

# 4. Force the fire time to now-ish for a quick test:
#    edit a habit → set Manual reminderTime to two minutes from now → save.
#    Wait — the notification should land on any device where you are logged in.
```

---

## 5. Verifying the adaptive engine

The algorithm lives in `src/lib/reminders.ts` and satisfies every spec step:

| Spec step | Implementation |
|---|---|
| 1. Store completion history | `Habit.completionHistory: string[]` in `store.ts` |
| 2. Save timestamp on completion | `toggleHabitCompletion` in `store.ts` appends ISO string |
| 3. Week 1: yesterday minus 20 min | `computeNextReminder` case A |
| 4. Week 2+: rolling avg minus 20 min | `computeNextReminder` case B with 14-window |
| 5. Ignore outliers | `trimOutliers` uses MAD + 2 h floor + circular distance |
| 6. Tasks do NOT learn | `computeTaskReminder` — pure `dueAt - leadTime` |
| 7. Cancel + reschedule on edit / delete / complete | `store.ts` dynamic imports in each action |
| 8. Daily refresh on app open + midnight | `src/app/page.tsx` calls `refreshAllReminders` + `scheduleMidnightRefresh` |

Unit-verified with these cases (see git history for the test harness):

```
7 completions around 8:20 PM + 1 outlier at 3 AM
  Raw mean:      21:00        ← the outlier drags the average
  Trimmed set:   20:15..20:30
  Clean mean:    20:22        ← outlier gone
  Reminder at:   20:02        ✅

Spec example 8:15, 8:22, 8:30, 8:19, 8:28, 8:17, 8:21
  Average:       08:22        ✅ matches spec
  Reminder:      08:02        ✅ matches spec

Week 1 fallback — yesterday 20:25
  Reminder:      20:05        ✅ matches spec
```

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `notificationId` starts with `local-` | `ONESIGNAL_REST_API_KEY` env var missing | Set it and restart the server |
| API returns `502 onesignal-error` | REST key wrong / app id mismatch | Copy both values fresh from OneSignal dashboard |
| Notification never arrives on device | External user id not linked | Log out and back in — check console for `[OneSignal] linked external_user_id:` |
| Reminders don't change after completion | Store update did not fire reschedule | Check dev-tools console for `POST /api/notifications` after each toggle |
| Old reminder still fires after edit | Cancel was skipped | Ensure the habit had `scheduledReminderId` set from the previous schedule (localStorage `trac-storage`) |
| Wrong timezone | Daily refresh not running | Force it by clearing `localStorage.trac-last-daily-refresh` and reloading |
