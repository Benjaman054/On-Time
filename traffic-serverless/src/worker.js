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

// Runs on a schedule (every 15 minutes). For each user, it sends the summary
// once per day — at the first run at/after their chosen time.
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

  const nowMinutes = currentMinutesInZone(TIMEZONE);
  const today = currentDateInZone(TIMEZONE); // "YYYY-MM-DD"
  const { Items = [] } = await ddb.send(new ScanCommand({ TableName: TABLE }));

  let processed = 0;
  for (const user of Items) {
    if (!user.googleRefreshToken || !user.homeAddress || user.paused) continue;
    // Skip only if the user wants NO notifications at all.
    const wantsEmail = user.notifyEmail !== false;
    const wantsTelegram = user.notifyTelegram === true && !!user.telegramChatId;
    if (!wantsEmail && !wantsTelegram) continue;

    const target = parseHHmm(user.checkTime);
    if (target === null) continue;

    // Due if we've reached the chosen time (within the last 30 min) AND we
    // haven't already emailed today. The 30-min window comfortably covers the
    // 15-min gaps between runs, so a time is never missed.
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
  if (!user.googleRefreshToken || !user.homeAddress) return;
  if (user.paused) {
    console.log(`Skipping ${user.userId} (paused)`);
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

  if (user.notifyEmail !== false && user.email && process.env.SENDER_EMAIL) {
    try {
      await sendPlanEmail(
        user.email,
        process.env.SENDER_EMAIL,
        plans,
        user.homeAddress
      );
      console.log(`Emailed ${user.email}`);
    } catch (e) {
      console.error(`Email failed for ${user.userId}: ${e.message}`);
    }
  }

  if (user.notifyTelegram === true && user.telegramChatId && process.env.TELEGRAM_BOT_TOKEN) {
    try {
      await sendPlanTelegram(user.telegramChatId, plans, user.homeAddress);
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
