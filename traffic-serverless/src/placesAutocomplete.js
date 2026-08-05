const { autocomplete } = require("./lib/places");

// GET /places/autocomplete?input=roth
// Returns address suggestions matching what the user has typed so far.
exports.handler = async (event) => {
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
