const { createOAuthClient, SCOPES } = require("./lib/googleAuth");

// GET /auth/google/start?userId=xxx
// Sends the user's browser to Google's consent screen.
exports.handler = async (event) => {
  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return { statusCode: 400, body: "userId query parameter is required" };
  }

  const oauth2Client = createOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // ask for a long-lived "refresh token"
    prompt: "consent",      // force Google to return the refresh token
    scope: SCOPES,
    state: userId,          // carry the userId through the round-trip, so the
                            // callback knows whose calendar this is
  });

  // 302 = "redirect the browser to this Location".
  return {
    statusCode: 302,
    headers: { Location: url },
    body: "",
  };
};
