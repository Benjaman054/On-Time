const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");
const { buildPlansForUser } = require("./lib/planner");
const { clampDays } = require("./lib/util");

// POST /preferences
// Body: { userId, homeAddress, checkTime, email,
//         daysAhead, notifyEmail, notifyWhatsapp, paused }
//
// Saves the preferences, then recomputes the plans right away so the app can
// show up-to-date meetings immediately (no waiting for the daily worker).
exports.handler = async (event) => {
  const body = JSON.parse(event.body || "{}");
  const {
    userId,
    homeAddress,
    checkTime,
    email,
    daysAhead,
    notifyEmail,
    notifyTelegram,
    telegramChatId,
    paused,
  } = body;

  if (!userId || !homeAddress || !checkTime || !email) {
    return response(400, {
      error: "userId, homeAddress, checkTime and email are all required",
    });
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression:
        "SET homeAddress = :h, checkTime = :c, email = :e, " +
        "daysAhead = :d, notifyEmail = :ne, notifyTelegram = :nt, " +
        "telegramChatId = :tc, paused = :p",
      ExpressionAttributeValues: {
        ":h": homeAddress,
        ":c": checkTime,
        ":e": email,
        ":d": clampDays(daysAhead),
        ":ne": notifyEmail !== false, // default true
        ":nt": notifyTelegram === true, // default false
        ":tc": (telegramChatId || "").toString().trim(), // "" if not set
        ":p": paused === true, // default false
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
