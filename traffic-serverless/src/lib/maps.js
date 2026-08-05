// Asks Google's Routes API how long a drive takes, WITH traffic.
//
// We send an origin, a destination, and a departure time. Google returns two
// numbers we care about:
//   - duration        : drive time accounting for predicted traffic
//   - staticDuration   : drive time on an empty road (no traffic)
// The pair gives us a range: best case vs. traffic-included.
async function getDriveEstimate(origin, destination, departureTimeIso) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const body = {
    origin: { address: origin },
    destination: { address: destination },
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    departureTime: departureTimeIso, // must be in the future
  };

  const res = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // FieldMask = "only send back these fields" (required by the Routes API).
        "X-Goog-FieldMask":
          "routes.duration,routes.staticDuration,routes.distanceMeters",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Routes API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No route found");

  // Durations come as strings like "1234s".
  return {
    durationSeconds: parseInt(route.duration),
    staticSeconds: parseInt(route.staticDuration),
    distanceMeters: route.distanceMeters,
  };
}

module.exports = { getDriveEstimate };
