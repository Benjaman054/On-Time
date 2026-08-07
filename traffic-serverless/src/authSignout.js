const { UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");
const { getUserIdFromRequest } = require("./lib/auth");

// POST /auth/signout   (identity from the session token)
// Ends the session server-side:
//   1. sets signedOut=true, so the daily worker stops emailing/Telegramming.
//   2. deletes the session token row, so the token can't be reused (revoked).
// Signing back in with Google clears the flag and resumes notifications.
exports.handler = async (event) => {
  const userId = await getUserIdFromRequest(event);
  if (!userId) return response(401, { error: "Not signed in" });

  // Stop notifications until they sign in again.
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: "SET signedOut = :true",
      ExpressionAttributeValues: { ":true": true },
    })
  );

  // Revoke the session token so it's dead even if a copy leaked.
  const header =
    event.headers?.authorization || event.headers?.Authorization || "";
  if (header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (token) {
      await ddb.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { userId: `session#${token}` },
        })
      );
    }
  }

  return response(200, { message: "Signed out" });
};
