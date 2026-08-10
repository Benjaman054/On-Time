# ON-Time — Agent Handoff (living document — keep this updated every turn)

> Read this first to resume. It's the running state of the project. Update it as work progresses.
> Companion doc: `NOTES.md` (older project notes). Auto-memory also holds a summary.

---

## 🔴 IMMEDIATE NEXT STEP (where we left off)

**Debugging: manual worker send runs but NO email/Telegram arrives.**

We added `[debug]` logging (already committed locally, may or may not be deployed yet):
- `src/worker.js` → `processUser()` logs refresh/home/paused/signedOut/notify/telegramChatId/email.
- `src/lib/planner.js` → `buildPlansForUser()` logs how many events were read and how many have a location.

**Do this to diagnose:**
1. Deploy: `git add -A && git commit -m "..." && git push`, wait for green GitHub Actions.
2. Re-invoke the worker **in cmd** (PowerShell mangles the JSON):
   ```
   sam remote invoke WorkerFunction --stack-name traffic-check -e "{\"userId\":\"10933032706049200760\"}"
   ```
   (`10933032706049200760` = Benny's Google `sub` / userId, from AuthGoogleNative logs.)
3. Read logs: `sam logs --stack-name traffic-check --name WorkerFunction -s "5 minutes ago"`
4. Find the two `[debug]` lines. They reveal the cause:
   - `refresh=false` → calendar can't be read.
   - `home=null` → no home address on this account.
   - `read 0 events` → wrong Google account or nothing in window.
   - `read N events, 0 have a location` → meetings lack an address → skipped.

**Known constraint feeding this:** the worker only builds a plan for meetings **within `daysAhead` (max 7) that have a location**. Benny's meetings are reportedly 3 days and 2 weeks out; the 2-week one is out of the 7-day window by design. Last invoke ran in ~465ms (too fast for Maps calls) → likely built 0 plans.

**UPDATE:** Benny confirmed the deploy WAS green before invoking, yet the `[debug]`
line still did NOT print. Since that line is the first statement in `processUser()`,
and `processUser` only runs `if (Item)` (record found), this means **the record was
NOT found → the userId is wrong.** Strong suspicion: `10933032706049200760` is only
**20 digits, but Google `sub` ids are 21** — a digit was likely dropped when copying
it from an earlier *mangled* PowerShell error message.

**NEXT: get the EXACT userId, then re-invoke.**
- Reliable way: tail + re-sign-in:
  ```
  sam logs --stack-name traffic-check --name AuthGoogleNativeFunction --tail
  ```
  then in the app Sign out → Sign in; copy the full `sub` from `Native sign-in for <sub> (<email>)` (should be ~21 digits), Ctrl+C.
- Or widen the window: `sam logs ... --name AuthGoogleNativeFunction -s "6 hours ago"` and read the sub carefully.
- Then re-invoke **in cmd** with the correct id and read the `[debug]` lines.
- (Alternative: also worth confirming the record exists directly, e.g. an `aws dynamodb get-item` on the table for that userId.)

---

## What the app is

**ON-Time**: reads your Google Calendar, checks traffic, tells you when to leave, and sends a daily summary (email + Telegram). Benny (beginner dev, learning by building) is the user/developer.

## Locations & key facts

- Root: `C:\Users\Benny\Downloads\truffic_project\`
  - `traffic-expo/` — **THE frontend** (React Native / Expo SDK 54). Written in JS (React Native uses JS).
  - `traffic-serverless/` — **THE backend** (Node.js + AWS SAM).
  - `traffic-android/`, `traffic-backend/` — legacy, gitignored, ignore.
- GitHub (private): https://github.com/Benjaman054/On-Time (monorepo; only expo + serverless tracked).
- Backend API base: `https://hy76b43p4m.execute-api.eu-central-1.amazonaws.com`
- AWS: region `eu-central-1`, SAM stack `traffic-check`, single DynamoDB table (key `userId`).
- App identity: name "ON-Time", Android package + iOS bundle = `com.benny.ontime`.
- EAS project id: `40ffd085-b8c5-442e-ba21-1195f6da4785` (in app.json).
- Secrets: gitignored (`samconfig.toml`, `Benjamin_accessKeys.csv` = AWS keys, `.env`). In CI they're GitHub Actions repo secrets. NEVER commit them.

## Architecture / how auth works now (multi-user)

- **Native Google Sign-In** (dev build only, NOT Expo Go): app uses `@react-native-google-signin/google-signin` → gets `idToken` + `serverAuthCode` → `POST /auth/google/native` → backend verifies id token (userId = Google `sub`), exchanges auth code for refresh token, stores user, returns an **opaque session token**.
- App stores the session token in **expo-secure-store**, sends it as `Authorization: Bearer <token>` on **every** request. Backend `lib/auth.js#getUserIdFromRequest` looks up `session#<token>` → userId. The URL is never trusted (old security hole closed).
- Per-user data keyed by Google `sub`. Email comes from Google (not the app). Timezone auto-detected via `expo-localization`, stored per-user; backend worker/formatters use it.
- Sign out: `/auth/signout` sets `signedOut=true` (worker skips) + deletes the session row + native `GoogleSignin.signOut()`. Sign-in clears `signedOut`.
- Onboarding decided by backend (does this user have a `homeAddress`?), not a device flag.

## Backend endpoints (traffic-serverless/src, all in template.yaml)

- `POST /auth/google/native` — native sign-in (current path).
- `GET /auth/google/start`, `GET /auth/google/callback`, `GET /auth/session` — OLD browser+poll flow (superseded, still present/harmless).
- `POST /auth/signout`.
- `GET/POST /preferences`, `GET /meetings`, `POST /meetings/create`, `GET /places/autocomplete`.
- `POST /telegram/connect` (returns bot deep link), `POST /telegram/webhook` (Telegram calls it).
- Worker: scheduled every 15 min; also manually invokable with `{ "userId": "..." }`.

## Feature history (done)

1. Rebuilt Android→Expo RN frontend (English only; Hebrew/RTL not ported).
2. Screens: Welcome, Onboarding (3 steps), Home/Meetings (60s sync, pull-refresh, +FAB), Add Meeting, Settings. Nav = React Navigation drawer+stack (`src/AppNavigator.js`).
3. CI/CD: `.github/workflows/ci.yml` — checks both apps on push/PR; `sam deploy` on push to main. Deploy secrets in GitHub Actions.
4. Multi-user auth (Steps 1–3): Google identity, session tokens, per-request verification.
5. Telegram notifications + automatic connect (deep-link + webhook). Uses `AppState` foreground + polling to detect the link.
6. Per-user timezone, per-user email, sign-out stops messages.
7. **Native Google Sign-In + EAS development build** (left Expo Go).

## How to run / build / deploy

- **Dev (current):** dev build installed on phone; `cd traffic-expo && npx expo start --dev-client`. (Expo Go no longer works — native modules.)
- **Rebuild the app** (after native changes): `eas build --profile development --platform android` (~10–20 min; free-tier queue can be long).
- **Backend deploy:** just `git push` to main → CI/CD runs `sam deploy`. (Manual: `cd traffic-serverless && sam build && sam deploy`.)
- **Verify frontend before pushing:** `cd traffic-expo && npx expo export --platform android --output-dir <tmp>` (catches bundle errors).
- **Verify backend files:** `node --check src/<file>.js`.

## Gotchas / lessons learned (important)

- **PowerShell mangles JSON** for `sam remote invoke -e '...'`. Use **cmd** with `-e "{\"userId\":\"...\"}"`, or pipe via stdin, or `--event-file`.
- **Hermes can't do Intl timezone** on-device → `src/time.js` uses plain `Date` local methods (no tz lib). Display is device-local; event creation uses device offset.
- **EAS `DEVELOPER_ERROR`** on Google sign-in = SHA-1 mismatch. Benny has **TWO keystores** (`wWuYMVUvVw` default SHA1 `65:7A:68:…:6C:BE`, and `cNMnx8LSAI` SHA1 `62:82:49:…:88:D2`). Both SHA-1s were registered as Android OAuth clients (package `com.benny.ontime`) to make it work. **TODO: clean up to one keystore.**
- **Google OAuth app is in "Testing"** → only added test users can sign in (Google Cloud → Auth Platform → **Audience** → Test users).
- **Telegram webhook must be registered once:** `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<API>/telegram/webhook`. Check with `getWebhookInfo`.
- **Meetings only show** if within `daysAhead` (**max 7**, `lib/util.js#clampDays`) AND have a location. Benny asked to raise the max to 30 then said revert — it's back to 7.
- Session tokens: opaque, revocable, stored hashed? NO — stored raw (possible future hardening). Refresh tokens (Google) never leave the backend; `getPreferences` whitelists fields.
- **Google refresh token gotcha:** wiping the DynamoDB user row does NOT revoke Google's
  OAuth consent, so the next native sign-in returns NO refresh token → no calendar access
  → no meetings. Fixes: `forceCodeForRefreshToken: true` in `auth.js` GoogleSignin.configure
  (added), AND if you wiped the DB, revoke the app at myaccount.google.com/connections
  (listed as "traffic-check") then sign in again. `authGoogleNative` logs
  `refresh_token received: true/false` to confirm.

## Recent changes (frontend, reload dev build — not deployed to backend)

- **Onboarding is now 4 steps** (was 3): address → daily time → days-ahead → **notifications**
  (email toggle + optional Connect Telegram). See `src/screens/OnboardingScreen.js`.
- New shared hook `src/useTelegramConnect.js` (connect flow: link → open Telegram →
  poll/foreground-detect). Onboarding uses it. **Settings still has its own inline copy**
  of the same logic — could be unified to the hook later (low priority, don't break Settings).

## Open items / TODO

- **Email deliverability (spam) — IN PROGRESS:** daily email works but lands in SPAM.
  Root cause = sending FROM `kivenko26@gmail.com` via SES fails SPF/DKIM/DMARC for
  gmail.com. Benny BOUGHT `ontime-app-plans.com` on **Namecheap** (DNS = Namecheap
  BasicDNS). SES domain identity created in eu-central-1 (Easy DKIM RSA_2048). The 3
  DKIM CNAMEs + a DMARC TXT (`_dmarc` = `v=DMARC1; p=none; rua=mailto:kivenko26@gmail.com`)
  were added in Namecheap Advanced DNS. WAITING on new-domain propagation — as of now
  the domain itself returns NXDOMAIN (brand new, not yet in global DNS), so SES can't
  verify yet. Plan continues:
  (1) buy domain [DONE] → (2) SES verify [DNS added, awaiting propagation]
  → (3) add DNS records: DKIM CNAMEs + SPF TXT (`v=spf1 include:amazonses.com ~all`)
  + DMARC TXT (`_dmarc` = `v=DMARC1; p=none; rua=mailto:...`) → (4) change `SenderEmail`
  GitHub secret (+ samconfig) to `noreply@<domain>` and redeploy → (5) request SES
  production access. NEXT: waiting on Benny to report the domain name + registrar,
  then guide SES verification.
- **Finish the current debug** (why manual send produced no message) — RESOLVED-ISH:
  the earlier userId was a digit short; with the correct 21-digit sub the send works.
- Clean up two keystores → one (avoid future DEVELOPER_ERROR / store issues).
- Decide on `daysAhead` max (currently 7; blocks the 2-week meeting).
- Harden `/places/autocomplete` (currently open, uses paid Maps key).
- Possibly remove the dead browser-auth endpoints.
- Eventually: publish to stores (needs Google OAuth verification for calendar scope, Apple $99/yr, Google Play $25, privacy policy).

## Benny's working style (from memory)

- Beginner — **define jargon, small steps, no walls of text.**
- Wants to run commands himself; **confirm before big/irreversible git or destructive actions** (he has interrupted pushes to review). Explain local commit vs remote push.
- Security-minded — asks good questions; explain the "why."
