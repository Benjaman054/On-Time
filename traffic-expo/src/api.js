// All network calls to the AWS backend live here. Every request now carries the
// session token in the Authorization header — the backend uses THAT to know who
// you are. We never send a userId; the URL is no longer trusted.
import { BASE_URL } from './config';
import { getToken, clearToken } from './auth';

// Shared helper: attach the token, run the request, and turn failures into
// readable Errors. A 401 means our session is no longer valid → forget it.
async function request(path, options = {}) {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (res.status === 401) {
    // Session invalid/expired — drop the token so the app returns to sign-in.
    await clearToken();
    throw new Error('Your session expired. Please sign in again.');
  }
  if (!res.ok) {
    const msg = data && data.error ? data.error : `Server error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ---- /meetings ----  Returns { count, plans: [...], updatedAt }
export function getMeetings({ refresh = false, sync = false } = {}) {
  const params = new URLSearchParams({
    refresh: String(refresh),
    sync: String(sync),
  });
  return request(`/meetings?${params.toString()}`);
}

// ---- /preferences ----
export function getPreferences() {
  return request('/preferences');
}

export function savePreferences(prefs) {
  return request('/preferences', {
    method: 'POST',
    body: JSON.stringify(prefs),
  });
}

// ---- /places/autocomplete ----  Returns { predictions: [{ description, placeId }] }
export function autocomplete(input) {
  const params = new URLSearchParams({ input });
  return request(`/places/autocomplete?${params.toString()}`);
}

// ---- /meetings/create ----
// start / end are RFC-3339 strings with offset, e.g. 2026-08-05T09:00:00+03:00
export function createMeeting({ title, location, start, end }) {
  return request('/meetings/create', {
    method: 'POST',
    body: JSON.stringify({ title, location, start, end }),
  });
}

// ---- /auth/signout ----  stops notifications + revokes the token server-side
export function signOutOnServer() {
  return request('/auth/signout', { method: 'POST' });
}

// ---- /telegram/connect ----  returns { url } — a one-time deep link to the bot
export function connectTelegram() {
  return request('/telegram/connect', { method: 'POST' });
}
