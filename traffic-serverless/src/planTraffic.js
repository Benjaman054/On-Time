const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");
const { buildPlansForUser } = require("./lib/planner");

// GET /debug/plan?userId=xxx
// Builds the plans live and returns them (doesn't store). Handy for testing.
exports.handler = async (event) => {
  const userId = event.queryStringParameters?.userId;
  if (!userId) return response(400, { error: "userId is required" });

  const result = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { userId } })
  );
  const user = result.Item;

  if (!user?.googleRefreshToken) {
    return response(400, { error: "Google Calendar not connected" });
  }
  if (!user.homeAddress) {
    return response(400, { error: "No home address saved — POST /preferences first" });
  }

  const plans = await buildPlansForUser(user);
  return response(200, { count: plans.length, plans });
};
