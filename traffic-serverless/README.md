# ON-Time — serverless backend

The AWS backend for **[ON-Time](../README.md)**, built with **AWS SAM** (Lambda + API Gateway HTTP API + DynamoDB). It handles Google sign-in, reads calendars, computes traffic-aware "leave by" times, and sends the daily summary by email and Telegram.

> This is the backend half of the ON-Time monorepo. See the [root README](../README.md) for the full project overview, architecture, and screenshots.

## Structure

```
src/
├── *.js            # Lambda handlers, one per endpoint (auth, meetings, preferences, worker, …)
└── lib/            # Shared logic reused across handlers
    ├── auth.js         # session-token → userId lookup
    ├── calendar.js     # read/create Google Calendar events
    ├── maps.js         # traffic-aware drive estimate (Google Routes API)
    ├── planner.js      # builds each user's "leave by" plan
    ├── email.js        # SES daily summary (HTML + text)
    ├── telegram.js     # Telegram daily summary
    └── dynamo.js       # DynamoDB client + helpers
template.yaml       # Infrastructure as code — every route + the scheduled worker
```

## Endpoints

All routes are defined in `template.yaml`. Every endpoint that reads user data or spends paid API quota requires a valid session token (`Authorization: Bearer <token>`). See the [API reference](../README.md#-api-reference) in the root README for the full list.

The **worker** is not an HTTP endpoint — it runs on an EventBridge schedule (`cron(* * * * ? *)`, every minute) and sends each user their summary at their chosen time, once per day.

## Configuration

The stack takes its secrets as CloudFormation **parameters** (never committed):

| Parameter | Purpose |
|-----------|---------|
| `GoogleClientId` / `GoogleClientSecret` | Google OAuth (verify tokens, exchange auth codes) |
| `GoogleMapsApiKey` | Google Routes + Places APIs |
| `SenderEmail` | The verified SES "from" address |
| `TelegramBotToken` | Telegram Bot API |

In CI these come from **GitHub Actions secrets**; for local deploys they live in `samconfig.toml` (gitignored).

## Deploy

Pushing to `main` deploys automatically via GitHub Actions. To deploy manually:

```bash
sam build
sam deploy     # uses samconfig.toml (first time: sam deploy --guided)
```

Tear everything down (stops all costs):

```bash
sam delete
```

## Status

All backend milestones are complete: foundation, DynamoDB, Google OAuth (native sign-in + session tokens), the daily worker (Calendar → Routes → DynamoDB), EventBridge scheduling, email + Telegram delivery, and the mobile app wired up.
