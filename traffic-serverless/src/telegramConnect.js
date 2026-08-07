const crypto = require("crypto");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");
const { getUserIdFromRequest } = require("./lib/auth");

// POST /telegram/connect   (identity from the session token)
// Makes a one-time "connect code" tied to this user, and returns a deep link to
// our bot carrying that code. When the user taps Start there, Telegram calls our
// webhook with the code, which links their chat to this account.
exports.handler = async (event) => {
  const userId = await getUserIdFromRequest(event);
  if (!userId) return response(401, { error: "Not signed in" });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return response(500, { error: "Telegram is not configured" });

  // A random, unguessable, short-lived code that maps to this user.
  const code = crypto.randomBytes(16).toString("hex");
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        userId: `tgconnect#${code}`,
        ownerUserId: userId,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes to complete
      },
    })
  );

  // Look up the bot's @username so we can build the t.me deep link.
  let username;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await res.json();
    username = data?.result?.username;
  } catch (e) {
    return response(502, { error: "Could not reach Telegram" });
  }
  if (!username) return response(502, { error: "Could not read bot info" });

  return response(200, { url: `https://t.me/${username}?start=${code}` });
};
