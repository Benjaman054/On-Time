const { autocomplete } = require("./lib/places");
const { getUserIdFromRequest } = require("./lib/auth");

// GET /places/autocomplete?input=roth
// Returns address suggestions matching what the user has typed so far.
// Requires a valid session token: this endpoint spends PAID Google Places
// quota, so it must not be open to the public (would let anyone run up charges).
exports.handler = async (event) => {
  const userId = await getUserIdFromRequest(event);
  if (!userId) return json(401, { error: "Not signed in" });

  const input = event.queryStringParameters?.input;

  // Don't bother Google (or spend quota) on 1-2 characters.
  if (!input || input.length < 3) {
    return json(200, { predictions: [] });
  }

  try {
    const predictions = await autocomplete(input);
    return json(200, { predictions });
  } catch (e) {
    return json(500, { error: e.message });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
