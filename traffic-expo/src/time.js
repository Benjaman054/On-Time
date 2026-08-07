// Time helpers that use the PHONE'S OWN timezone — so the app is correct for a
// user anywhere in the world, with no hardcoded zone.
//
// Key idea: JavaScript's Date methods (getHours, getDate, …) always work in the
// device's local timezone, and they work reliably on React Native's engine
// (Hermes) with no Intl needed. So we lean on those instead of any tz library.
import * as Localization from 'expo-localization';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n) {
  return String(n).padStart(2, '0');
}

// Format any ISO string (with +offset OR trailing Z) in the phone's local time,
// e.g. "Wed, Aug 5 • 9:00 AM".
export function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  let h = d.getHours(); // local hour on this device
  const min = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;

  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()} • ${h}:${pad(min)} ${ampm}`;
}

// Build an RFC-3339 string with the phone's local offset from a wall-clock
// date + time, e.g. 2026-08-05T09:00:00+03:00 (or -04:00 in New York). This is
// what Google Calendar stores.
export function toLocalIso(dateObj, h, m) {
  // A Date built from local components; the engine attaches the device offset.
  const dt = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), h, m, 0);
  const offMin = -dt.getTimezoneOffset(); // e.g. +180 in Israel, -240 in New York
  const sign = offMin >= 0 ? '+' : '-';
  const oh = pad(Math.floor(Math.abs(offMin) / 60));
  const om = pad(Math.abs(offMin) % 60);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(h)}:${pad(m)}:00${sign}${oh}:${om}`;
}

// Epoch millis for a local wall-clock date+time, for "is it in the past?" checks.
export function localWallClockEpoch(dateObj, h, m) {
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), h, m, 0).getTime();
}

// Short "HH:mm" label for buttons.
export function hhmm(h, m) {
  return `${pad(h)}:${pad(m)}`;
}

// The phone's IANA timezone name (e.g. "Asia/Jerusalem", "America/New_York").
// Sent to the backend so the daily worker uses each user's own zone.
export function deviceTimeZone() {
  try {
    const cal = Localization.getCalendars?.()[0];
    return cal?.timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
