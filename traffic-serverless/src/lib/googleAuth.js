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

// Read AND write events — read is needed to plan trips, write so the app can
// add meetings to the calendar. (calendar.events covers both.)
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

module.exports = { createOAuthClient, SCOPES };
