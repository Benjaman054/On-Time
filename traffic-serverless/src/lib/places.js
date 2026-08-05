// Calls Google's Places API (New) to turn a typed fragment into address
// suggestions. The Maps API key stays here on the backend, never in the app.
async function autocomplete(input) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // If the user is typing Hebrew (any char in the Hebrew Unicode block), ask
  // Google for Hebrew results; otherwise English. Bias to Israel either way.
  const isHebrew = /[֐-׿]/.test(input);

  const res = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input,
        languageCode: isHebrew ? "he" : "en",
        includedRegionCodes: ["il"],
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API error ${res.status}: ${text}`);
  }

  const data = await res.json();

  // Each suggestion holds a placePrediction with the display text + an id.
  return (data.suggestions || [])
    .map((s) => s.placePrediction)
    .filter(Boolean)
    .map((p) => ({
      description: p.text?.text || "",
      placeId: p.placeId || "",
    }));
}

module.exports = { autocomplete };
