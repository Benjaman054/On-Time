const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");
const { createEvent } = require("./lib/calendar");
const { buildPlansForUser } = require("./lib/planner");
const { getUserIdFromRequest } = require("./lib/auth");

// POST /meetings/create   (identity comes from the session token)
// Body: { title, location, start, end }  (start/end = ISO with offset)
// Adds the event to Google Calendar, then recomputes so the app shows it.
exports.handler = async (event) => {
  const userId = await getUserIdFromRequest(event);
  if (!userId) return response(401, { error: "Not signed in" });

  const body = JSON.parse(event.body || "{}");
  const { title, location, start, end } = body;

  if (!title || !location || !start || !end) {
    return response(400, { error: "title, location, start and end are required" });
  }

  // Safety net: don't create meetings in the past. (The app also checks, but
  // the backend must never trust the client.)
  if (new Date(start).getTime() < Date.now()) {
    return response(400, { error: "That time has already passed" });
  }

  const { Item: user } = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { userId } })
  );
  if (!user?.googleRefreshToken) {
    return response(400, { error: "Google Calendar not connected" });
  }

  try {
    await createEvent(user.googleRefreshToken, {
      title,
      location: location || "",
      start,
      end,
    });
  } catch (e) {
    return response(500, { error: `Couldn't create event: ${e.message}` });
  }

  // Recompute plans so the new meeting appears right away.
  try {
    if (user.homeAddress && !user.paused) {
      const plans = await buildPlansForUser(user);
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId },
          UpdateExpression: "SET plans = :p, plansUpdatedAt = :t",
          ExpressionAttributeValues: {
            ":p": plans,
            ":t": new Date().toISOString(),
          },
        })
      );
    }
  } catch (e) {
    console.error("Recompute after create failed:", e.message);
  }

  return response(200, { message: "Meeting created" });
};
