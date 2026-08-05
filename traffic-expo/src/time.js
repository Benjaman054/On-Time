// Time helpers for Israel (Asia/Jerusalem) — written WITHOUT Intl or a timezone
// library on purpose. React Native's engine (Hermes) doesn't reliably support
// Intl timezone conversion on-device, so dayjs/luxon `.tz()` silently fell back
// to UTC and showed every time 2–3h early. Instead we compute Israel's UTC
// offset ourselves from the official DST rule.
//
// Israel Summer Time (since 2013): +03:00 from the Friday before the last Sunday
// of March, until the last Sunday of October; +02:00 the rest of the year.

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pad(n) {
  return String(n).padStart(2, '0');
}

// Day-of-month of the last Sunday in a given month (month is 1-based).
function lastSundayDate(year, month1) {
  const last = new Date(Date.UTC(year, month1, 0)); // day 0 of next month = last day of this
  return last.getUTCDate() - last.getUTCDay();
}

// Israel's offset in minutes (+180 during DST, +120 otherwise) for a date.
// Uses date-only precision, which is fine except within ~2h of a switch.
export function israelOffsetMinutes(year, month1, day) {
  if (month1 < 3 || month1 > 10) return 120;
  if (month1 > 3 && month1 < 10) return 180;
  if (month1 === 3) {
    // DST starts the Friday (2 days) before the last Sunday of March.
    return day >= lastSundayDate(year, 3) - 2 ? 180 : 120;
  }
  // October: DST ends on the last Sunday.
  return day < lastSundayDate(year, 10) ? 180 : 120;
}

// Format any ISO string (with +offset OR trailing Z) as Israel wall-clock time,
// e.g. "Wed, Aug 5 • 9:00 AM".
export function formatTime(iso) {
  if (!iso) return '—';
  const epoch = Date.parse(iso);
  if (Number.isNaN(epoch)) return iso;

  // Pick the DST bucket from the UTC date, then shift to Israel wall-clock.
  const u = new Date(epoch);
  const off = israelOffsetMinutes(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate());
  const local = new Date(epoch + off * 60000);

  let h = local.getUTCHours();
  const min = local.getUTCMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;

  return `${WEEKDAYS[local.getUTCDay()]}, ${MONTHS[local.getUTCMonth()]} ${local.getUTCDate()} • ${h}:${pad(min)} ${ampm}`;
}

// Build an RFC-3339 string with Israel's offset from a wall-clock date + time,
// e.g. 2026-08-05T09:00:00+03:00. This is what Google Calendar stores.
export function toIsraelIso(dateObj, h, m) {
  const y = dateObj.getFullYear();
  const mo = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const off = israelOffsetMinutes(y, mo, day);
  const sign = off >= 0 ? '+' : '-';
  const oh = pad(Math.floor(Math.abs(off) / 60));
  const om = pad(Math.abs(off) % 60);
  return `${y}-${pad(mo)}-${pad(day)}T${pad(h)}:${pad(m)}:00${sign}${oh}:${om}`;
}

// Epoch millis for a wall-clock Israel date+time, for "is it in the past?" checks.
export function israelWallClockEpoch(dateObj, h, m) {
  return Date.parse(toIsraelIso(dateObj, h, m));
}

// Short "HH:mm" label for buttons.
export function hhmm(h, m) {
  return `${pad(h)}:${pad(m)}`;
}
