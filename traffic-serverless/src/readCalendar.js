const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");
const { readUpcomingEvents } = require("./lib/calendar");

// GET /debug/calendar?userId=xxx
// A temporary test endpoint: reads the user's next 7 days of meetings live
// from Google Calendar and returns them, so we can confirm the connection
// works before adding traffic + storage.
exports.handler = async (event) => {
  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return response(400, { error: "userId query parameter is required" });
  }

  // 1. Look up the user's stored Google refresh token.
  const result = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { userId } })
  );
  const refreshToken = result.Item?.googleRefreshToken;

  if (!refreshToken) {
    return response(400, {
      error: "This user hasn't connected Google Calendar yet",
    });
  }

  // 2. Use it to read the calendar.
  const events = await readUpcomingEvents(refreshToken, 7);

  return response(200, { count: events.length, events });
};
