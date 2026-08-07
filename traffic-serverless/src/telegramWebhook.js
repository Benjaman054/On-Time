const {
  GetCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");

// POST /telegram/webhook   (called by TELEGRAM, not by our app)
// When a user taps "Start" via a connect link, Telegram sends us "/start <code>".
// We look up which account that code belongs to, link this chat to it, and
// confirm in the chat. Any other message is ignored.
exports.handler = async (event) => {
  let update;
  try {
    update = JSON.parse(event.body || "{}");
  } catch {
    return response(200, { ok: true }); // never make Telegram retry on junk
  }

  const msg = update.message;
  const text = msg?.text || "";
  const chatId = msg?.chat?.id;
  const token = process.env.TELEGRAM_BOT_TOKEN;

  // We only care about "/start <code>".
  const match = /^\/start\s+(\S+)/.exec(text);
  if (!match || !chatId) return response(200, { ok: true });

  const code = match[1];
  const key = { userId: `tgconnect#${code}` };
  const { Item } = await ddb.send(new GetCommand({ TableName: TABLE, Key: key }));

  // One-time: remove the code whether it's valid or not.
  if (Item) await ddb.send(new DeleteCommand({ TableName: TABLE, Key: key }));

  if (!Item || (Item.expiresAt && Date.now() > Item.expiresAt)) {
    await tgSend(token, chatId, "⚠️ That link expired. Tap “Connect Telegram” in the app again.");
    return response(200, { ok: true });
  }

  // Link this chat to the user and switch Telegram notifications on.
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId: Item.ownerUserId },
      UpdateExpression: "SET telegramChatId = :c, notifyTelegram = :t",
      ExpressionAttributeValues: { ":c": String(chatId), ":t": true },
    })
  );

  await tgSend(token, chatId, "✅ Connected to ON-Time! You'll get your daily plan here.");
  return response(200, { ok: true });
};

async function tgSend(token, chatId, text) {
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch {
    // best-effort confirmation — ignore failures
  }
}
