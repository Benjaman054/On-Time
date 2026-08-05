const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE } = require("./lib/dynamo");
const { createOAuthClient } = require("./lib/googleAuth");

// GET /auth/google/callback?code=xxx&state=userId
// Google sends the user back here after they approve. We store the token, then
// show a friendly "connected" page. The user closes the browser tab to return
// to the app (the Expo app already moved on to onboarding).
exports.handler = async (event) => {
  const code = event.queryStringParameters?.code;
  const userId = event.queryStringParameters?.state;

  if (!code || !userId) {
    return page("⚠️ Something went wrong", "Missing code or user. Please try connecting again.", 400);
  }

  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    return page("⚠️ Almost there", "No refresh token returned. Please try connecting again.", 400);
  }

  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: "SET googleRefreshToken = :t",
      ExpressionAttributeValues: { ":t": tokens.refresh_token },
    })
  );

  return page(
    "✅ You're connected!",
    "Your Google Calendar is linked. You can close this tab and return to ON-Time.",
    200
  );
};

// A small self-contained HTML page (works in the in-app browser).
function page(title, message, statusCode) {
  return {
    statusCode,
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ON-Time</title></head>
<body style="font-family:system-ui,sans-serif;text-align:center;padding:64px 24px;color:#111">
<h2 style="color:#2563EB">${title}</h2>
<p style="font-size:16px;color:#5B6472">${message}</p>
</body></html>`,
  };
}
