# ON-Time — project notes / handoff

A calendar-traffic app: reads your Google Calendar, checks traffic, tells you
when to leave, and emails a daily summary.

## Folders
- `traffic-expo/` — the React Native app (Expo, runs in Expo Go). THE frontend.
- `traffic-android/` — OLD Kotlin/Compose app. Superseded by traffic-expo, kept
  as a reference. (English-only rebuild first; Hebrew/RTL still lives here.)
- `traffic-serverless/` — the AWS backend (Node.js + AWS SAM). THE backend.
- `traffic-backend/` — OLD Express version, superseded. Ignore/delete.

## Run the frontend (traffic-expo) in Expo Go
1. Install the "Expo Go" app on your phone (App Store / Play Store).
2. On the PC: `cd traffic-expo && npx expo start`
3. Scan the QR code with your phone's camera (iOS) or the Expo Go app (Android).
   Phone + PC must be on the same Wi-Fi. The app loads live; saving a file
   refreshes it on the phone automatically.
- Stack: Expo SDK 54, React Navigation (drawer + native stack), dayjs for the
  Asia/Jerusalem times, @react-native-community/datetimepicker for pickers.
- Same backend, same userId "benny". Screen-by-screen parity with the old app:
  Welcome → Onboarding (3 steps) → Home (meetings, 60s sync, pull-to-refresh,
  + FAB) / Settings (address, email time, days, notifications, pause, theme).
- Code map: src/api.js (all HTTP), src/screens/* (the 5 screens),
  src/components/* (Logo, AddressAutocomplete, Pickers, Button),
  src/AppNavigator.js (drawer+stack), App.js (welcome/onboarding gate + theme).

## Key facts
- Backend URL: https://hy76b43p4m.execute-api.eu-central-1.amazonaws.com
- AWS region: eu-central-1 (Frankfurt) · SAM stack name: `traffic-check`
- Single user for now: userId = "benny" (hardcoded in app + used everywhere)
- Timezone: Asia/Jerusalem (hardcoded in app display + backend)
- Secrets live in `traffic-serverless/samconfig.toml` (gitignored): Google client
  id/secret, Google Maps API key, SES sender email.

## Deploy / run
- Backend: `cd traffic-serverless && sam build && sam deploy`
  (params are saved in samconfig.toml — no flags needed)
  Fast dev loop: `sam sync --stack-name traffic-check --watch`
  Logs: `sam logs --stack-name traffic-check --name <FunctionName>`
- App: open `traffic-android` in Android Studio → Run. (After manifest/deps
  changes, do a full Run, not "Apply Changes".)

## Google Cloud (project "traffic-check")
- OAuth client: Web application; redirect URI = <backend>/auth/google/callback
- Scope: calendar.events (read + write)
- Enabled APIs: Google Calendar API, Routes API, Places API (New)
- Billing enabled (Maps/Places need it). App is in "Testing" (test user added).

## What works
- Welcome → real Google registration (OAuth) → 3-step onboarding → Home.
  Onboarding remembered on device (AppPrefs), so later launches skip to Home.
- Home: meetings list with leave-by + drive range + Open-in-Maps. Auto-syncs
  every 60s (cheap change-check; recomputes only if the calendar changed).
- Add meeting (+ FAB): writes the event to Google Calendar, then refreshes.
- Settings: address (Google Places autocomplete), daily email time, days-ahead
  (1-7), notifications (email + Telegram), pause, light/dark.
- Telegram notifications: worker sends the daily plan via the Telegram Bot API
  (src/lib/telegram.js). Needs TelegramBotToken (BotFather) in samconfig.toml and
  the user's telegramChatId saved in prefs. notifyTelegram replaced notifyWhatsapp.
- Daily email via SES: once/day at chosen time, styled HTML, 12h times, Maps link.
- Full Hebrew localization + RTL (values-iw/, locales_config.xml).

## What's left / ideas (roughly in priority order)
1. AUTHENTICATION — biggest gap. API has no auth; userId is a guessable query
   param. Real fix: sign-in + per-request identity (e.g. Cognito / verify Google
   ID token), derive userId from that, never trust the URL.
2. Edit / delete a meeting from inside the app (today: add + view only).
3. Persist the light/dark choice across restarts (DataStore).
4. (DONE) Telegram notifications via Bot API. Next: auto-capture chat id from
   the bot's /start instead of the user pasting it; multi-user auth.
5. Replace 60s polling with Google Calendar push notifications (events.watch).
6. Multi-timezone (store per-user tz instead of hardcoding Asia/Jerusalem).
7. Delete debug endpoints: src/hello.js, planTraffic.js, readCalendar.js.

## To resume with Claude
Open this folder and say: "read NOTES.md — let's continue the ON-Time project."
