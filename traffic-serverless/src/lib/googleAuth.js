// Builds a Google OAuth client from our credentials.
//
// The client id, secret, and redirect URI all come from environment variables
// (set in template.yaml, with real values passed in at deploy time). The
// secret NEVER lives in the code or the app — only here on the backend.
const { google } = require("googleapis");

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

// What we ask the user to grant:
//  - openid / email / profile: so Google tells us WHO the user is (their unique
//    id, email, name) — this is how we identify the account. Non-sensitive.
//  - calendar.events: read (to plan trips) + write (to add meetings).
const SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
];

module.exports = { createOAuthClient, SCOPES };
