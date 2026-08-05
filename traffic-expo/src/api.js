// All network calls to the AWS backend live here. The rest of the app never
// touches fetch() directly — it calls these functions. Same backend and same
// single-user id ("benny") as the Android app; nothing on the server changes.

export const BASE_URL =
  'https://hy76b43p4m.execute-api.eu-central-1.amazonaws.com';

export const USER_ID = 'benny';

// The Google sign-in page we open in the browser from the Welcome screen.
export const registerUrl = `${BASE_URL}/auth/google/start?userId=${USER_ID}`;

// Shared helper: run a request, and turn a failure into a readable Error.
// It also pulls the backend's { "error": "..." } message out when present.
async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data && data.error ? data.error : `Server error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ---- /meetings ----
// Returns { count, plans: [...], updatedAt }
export function getMeetings({ refresh = false, sync = false } = {}) {
  const params = new URLSearchParams({
    userId: USER_ID,
    refresh: String(refresh),
    sync: String(sync),
  });
  return request(`/meetings?${params.toString()}`);
}

// ---- /preferences ----
export function getPreferences() {
  const params = new URLSearchParams({ userId: USER_ID });
  return request(`/preferences?${params.toString()}`);
}

export function savePreferences(prefs) {
  return request('/preferences', {
    method: 'POST',
    body: JSON.stringify({ userId: USER_ID, ...prefs }),
  });
}

// ---- /places/autocomplete ----
// Returns { predictions: [{ description, placeId }] }
export function autocomplete(input) {
  const params = new URLSearchParams({ input });
  return request(`/places/autocomplete?${params.toString()}`);
}

// ---- /meetings/create ----
// start / end are RFC-3339 strings with offset, e.g. 2026-08-05T09:00:00+03:00
export function createMeeting({ title, location, start, end }) {
  return request('/meetings/create', {
    method: 'POST',
    body: JSON.stringify({ userId: USER_ID, title, location, start, end }),
  });
}
