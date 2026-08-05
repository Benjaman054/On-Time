const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");

// GET /preferences?userId=xxx
// Returns ONLY the safe, user-facing settings. Never the googleRefreshToken,
// stored plans, or sync bookkeeping — those stay server-side.
exports.handler = async (event) => {
  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return response(400, { error: "userId query parameter is required" });
  }

  const result = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { userId } })
  );
  const user = result.Item;
  if (!user) {
    return response(404, { error: "No preferences found for this user" });
  }

  // Whitelist — never spread the whole item into the response.
  return response(200, {
    userId: user.userId,
    homeAddress: user.homeAddress ?? null,
    checkTime: user.checkTime ?? null,
    email: user.email ?? null,
    daysAhead: user.daysAhead ?? null,
    notifyEmail: user.notifyEmail ?? null,
    notifyTelegram: user.notifyTelegram ?? null,
    telegramChatId: user.telegramChatId ?? null,
    paused: user.paused ?? null,
  });
};
