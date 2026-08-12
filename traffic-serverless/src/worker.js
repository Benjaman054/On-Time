const {
  ScanCommand,
  GetCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE } = require("./lib/dynamo");
const { buildPlansForUser } = require("./lib/planner");
const { sendPlanEmail } = require("./lib/email");
const { sendPlanTelegram } = require("./lib/telegram");

const TIMEZONE = process.env.TIMEZONE || "Asia/Jerusalem";

// Runs on a schedule (every minute, clock-aligned). For each user, it sends the
// summary once per day — at the first run at/after their chosen time. Because it
// runs every minute, "at/after their time" means right at their chosen minute.
//
// Manual test: invoke with { "userId": "benny" } to send immediately.
exports.handler = async (event = {}) => {
  if (event.userId) {
    const { Item } = await ddb.send(
      new GetCommand({ TableName: TABLE, Key: { userId: event.userId } })
    );
    if (Item) await processUser(Item);
    return { mode: "manual", userId: event.userId };
  }

  const { Items = [] } = await ddb.send(new ScanCommand({ TableName: TABLE }));

  let processed = 0;
  for (const user of Items) {
    // Skip internal bookkeeping rows (session#… / login#…), not real users.
    if (String(user.userId).includes("#")) continue;
    if (!user.googleRefreshToken || !user.homeAddress || user.paused) continue;
    if (user.signedOut) continue; // signed out -> no messages until they return
    // Skip only if the user wants NO notifications at all.
    const wantsEmail = user.notifyEmail !== false;
    const wantsTelegram = user.notifyTelegram === true && !!user.telegramChatId;
    if (!wantsEmail && !wantsTelegram) continue;

    // Evaluate "is it their time yet?" in THIS user's own timezone.
    const tz = user.timezone || TIMEZONE;
    const nowMinutes = currentMinutesInZone(tz);
    const today = currentDateInZone(tz); // "YYYY-MM-DD" in their zone

    const target = parseHHmm(user.checkTime);
    if (target === null) continue;

    // Due if we've reached the chosen time AND we haven't already emailed today.
    // Running every minute, this fires right at the chosen minute. The 30-min
    // window is a safety net: if a minute-run is ever skipped/fails, the next
    // run within 30 min still catches it (and lastEmailedDate stops duplicates).
    const due = nowMinutes >= target && nowMinutes - target < 30;
    if (!due || user.lastEmailedDate === today) continue;

    await processUser(user);
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { userId: user.userId },
        UpdateExpression: "SET lastEmailedDate = :d",
        ExpressionAttributeValues: { ":d": today },
      })
    );
    processed++;
  }

  return { mode: "scheduled", processed };
};

async function processUser(user) {
  console.log(
    `[debug] ${user.userId} (${user.email}): refresh=${!!user.googleRefreshToken}, ` +
      `home=${JSON.stringify(user.homeAddress)}, paused=${!!user.paused}, ` +
      `signedOut=${!!user.signedOut}, daysAhead=${user.daysAhead}, ` +
      `notifyEmail=${user.notifyEmail}, notifyTelegram=${user.notifyTelegram}, ` +
      `telegramChatId=${user.telegramChatId}`
  );
  if (!user.googleRefreshToken || !user.homeAddress) return;
  if (user.paused) {
    console.log(`Skipping ${user.userId} (paused)`);
    return;
  }
  if (user.signedOut) {
    console.log(`Skipping ${user.userId} (signed out)`);
    return;
  }

  const plans = await buildPlansForUser(user);

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId: user.userId },
      UpdateExpression: "SET plans = :p, plansUpdatedAt = :t",
      ExpressionAttributeValues: {
        ":p": plans,
        ":t": new Date().toISOString(),
      },
    })
  );
  console.log(`Saved ${plans.length} plans for ${user.userId}`);

  const tz = user.timezone || TIMEZONE;

  if (user.notifyEmail !== false && user.email && process.env.SENDER_EMAIL) {
    try {
      await sendPlanEmail(
        user.email,
        process.env.SENDER_EMAIL,
        plans,
        user.homeAddress,
        tz
      );
      console.log(`Emailed ${user.email}`);
    } catch (e) {
      console.error(`Email failed for ${user.userId}: ${e.message}`);
    }
  }

  if (user.notifyTelegram === true && user.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      await sendPlanTelegram(user.telegramChatId, plans, user.homeAddress, tz);
      console.log(`Telegrammed ${user.userId}`);
    } catch (e) {
      console.error(`Telegram failed for ${user.userId}: ${e.message}`);
    }
  }
}

function currentMinutesInZone(tz) {
  const s = new Date().toLocaleTimeString("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return parseHHmm(s);
}

function currentDateInZone(tz) {
  // en-CA formats as YYYY-MM-DD.
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

function parseHHmm(s) {
  const m = /^(\d{1,2}):(\d{2})/.exec(s || "");
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : null;
}
