const crypto = require("crypto");
const { createOAuthClient, SCOPES } = require("./lib/googleAuth");

// GET /auth/google/start?login=xxx
// Sends the user's browser to Google's consent screen. The `login` code is a
// one-time value the app made up; we carry it through the round-trip (in
// `state`) so the callback can park the session token where the app can find it.
exports.handler = async (event) => {
  const login = event.queryStringParameters?.login || crypto.randomUUID();

  const oauth2Client = createOAuthClient();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // ask for a long-lived "refresh token"
    // "select_account" lets the user pick WHICH Google account (needed for
    // multi-user); "consent" forces Google to return the refresh token.
    prompt: "select_account consent",
    scope: SCOPES,
    state: login, // carry the login code through the round-trip
  });

  // 302 = "redirect the browser to this Location".
  return {
    statusCode: 302,
    headers: { Location: url },
    body: "",
  };
};
