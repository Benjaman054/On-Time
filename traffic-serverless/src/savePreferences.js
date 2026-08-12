const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");
const { buildPlansForUser } = require("./lib/planner");
const { clampDays } = require("./lib/util");
const { getUserIdFromRequest } = require("./lib/auth");

// POST /preferences   (identity comes from the session token)
// Body: { homeAddress, checkTime, email,
//         daysAhead, notifyEmail, notifyTelegram, telegramChatId, paused }
//
// Saves the preferences, then recomputes the plans right away so the app can
// show up-to-date meetings immediately (no waiting for the daily worker).
exports.handler = async (event) => {
  const userId = await getUserIdFromRequest(event);
  if (!userId) return response(401, { error: "Not signed in" });

  const body = JSON.parse(event.body || "{}");
  const {
    homeAddress,
    checkTime,
    daysAhead,
    notifyEmail,
    notifyTelegram,
    telegramChatId,
    paused,
    timezone,
  } = body;

  if (!homeAddress || !checkTime) {
    return response(400, {
      error: "homeAddress and checkTime are required",
    });
  }

  // Read the current record first, so we can tell if the notification time is
  // actually changing. If it is, we clear `lastEmailedDate` (the "already sent
  // today" guard) so the new time can fire again TODAY instead of waiting for
  // tomorrow. We only do this on a real time change — saving other settings
  // (e.g. toggling Telegram) must NOT trigger a duplicate send.
  const { Item: existing } = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { userId } })
  );
  const timeChanged = existing?.checkTime !== checkTime;

  // NOTE: we do NOT set `email` here — it comes from the user's Google account
  // (saved at sign-in) so it's always correct and can't be spoofed per-user.
  let updateExpression =
    "SET homeAddress = :h, checkTime = :c, " +
    "daysAhead = :d, notifyEmail = :ne, notifyTelegram = :nt, " +
    "telegramChatId = :tc, paused = :p, #tz = :tz";
  if (timeChanged) {
    updateExpression += " REMOVE lastEmailedDate";
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: { "#tz": "timezone" }, // "timezone" is reserved
      ExpressionAttributeValues: {
        ":h": homeAddress,
        ":c": checkTime,
        ":d": clampDays(daysAhead),
        ":ne": notifyEmail !== false, // default true
        ":nt": notifyTelegram === true, // default false
        ":tc": (telegramChatId || "").toString().trim(), // "" if not set
        ":p": paused === true, // default false
        ":tz": timezone || "Asia/Jerusalem", // the user's IANA timezone
      },
    })
  );

  // Recompute now with the new settings, so /meetings is fresh. A failure here
  // must NOT fail the save — the preferences are already stored.
  let plansCount = null;
  try {
    const { Item } = await ddb.send(
      new GetCommand({ TableName: TABLE, Key: { userId } })
    );
    if (Item?.googleRefreshToken && Item.homeAddress && !Item.paused) {
      const plans = await buildPlansForUser(Item);
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId },
          UpdateExpression: "SET plans = :p, plansUpdatedAt = :t",
          ExpressionAttributeValues: {
            ":p": plans,
            ":t": new Date().toISOString(),
          },
        })
      );
      plansCount = plans.length;
    }
  } catch (e) {
    console.error("Recompute after save failed:", e.message);
  }

  return response(200, { message: "Preferences saved", userId, plansCount });
};
