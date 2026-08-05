const { google } = require("googleapis");
const { createOAuthClient } = require("./googleAuth");

// Reads a user's upcoming calendar events using their stored refresh token.
//
// The refresh token is the long-lived key we saved during the OAuth flow.
// We hand it to the OAuth client, and googleapis quietly uses it to get a
// fresh short-lived access token whenever it needs one — no user login.
async function readUpcomingEvents(refreshToken, days = 7) {
  const auth = createOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth });

  const now = new Date();
  const later = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: later.toISOString(),
    singleEvents: true, // expand recurring meetings into individual dates
    orderBy: "startTime",
  });

  // Map Google's big event objects down to just the fields we care about.
  return (res.data.items || []).map((e) => ({
    id: e.id,
    title: e.summary || "(no title)",
    location: e.location || "",
    // Timed events use dateTime; all-day events use date. Prefer dateTime.
    start: e.start?.dateTime || e.start?.date || null,
    end: e.end?.dateTime || e.end?.date || null,
  }));
}

// Cheap change-detection: has anything in the calendar been added/edited/
// deleted since `sinceIso`? Uses `updatedMin` and asks for just one result —
// no Maps calls, tiny response. This is what makes the 1-minute poll scalable.
async function hasCalendarChangedSince(refreshToken, sinceIso) {
  const auth = createOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.list({
    calendarId: "primary",
    updatedMin: sinceIso,   // only events modified since the last check
    showDeleted: true,      // so deletions count as a change too
    singleEvents: true,
    maxResults: 1,          // we only need to know IF something changed
  });

  return (res.data.items || []).length > 0;
}

// Adds a new event to the user's primary calendar.
async function createEvent(refreshToken, { title, location, start, end }) {
  const auth = createOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: title,
      location: location || "",
      start: { dateTime: start }, // ISO with offset, e.g. 2026-07-30T09:00:00+03:00
      end: { dateTime: end },
    },
  });

  return res.data;
}

module.exports = { readUpcomingEvents, createEvent, hasCalendarChangedSince };
