const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE } = require("./lib/dynamo");
const { createOAuthClient } = require("./lib/googleAuth");

// GET /auth/google/callback?code=xxx
// Google sends the user back here after they approve. We (1) exchange the code
// for tokens, (2) read WHO the user is from Google's identity token, and (3)
// store their record under their real Google id. Then we show a friendly page.
exports.handler = async (event) => {
  const code = event.queryStringParameters?.code;
  if (!code) {
    return page("⚠️ Something went wrong", "Missing authorization code. Please try connecting again.", 400);
  }

  const oauth2Client = createOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.id_token) {
    return page("⚠️ Almost there", "Google didn't return an identity. Please try connecting again.", 400);
  }
  if (!tokens.refresh_token) {
    return page("⚠️ Almost there", "No refresh token returned. Please try connecting again.", 400);
  }

  // Verify the identity token WITH Google and read who this is. `sub` is
  // Google's permanent, unique id for the account — we use it as our userId, so
  // every person's data is keyed to their real Google identity (never the URL).
  const ticket = await oauth2Client.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const userId = payload.sub;
  const email = payload.email || "";
  const name = payload.name || "";

  // Store (or update) this user's row under their Google id. UpdateCommand only
  // touches these fields, so any existing preferences on the row are preserved.
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression:
        "SET googleRefreshToken = :t, email = :e, #nm = :n, googleConnectedAt = :c",
      ExpressionAttributeNames: { "#nm": "name" }, // "name" is a reserved word
      ExpressionAttributeValues: {
        ":t": tokens.refresh_token,
        ":e": email,
        ":n": name,
        ":c": new Date().toISOString(),
      },
    })
  );

  console.log(`Connected user ${userId} (${email})`);

  return page(
    "✅ You're connected!",
    `Signed in as ${email}. You can close this tab and return to ON-Time.`,
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
