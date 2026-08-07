// Sends the daily plan as a Telegram message. Telegram's Bot API is a plain
// HTTPS endpoint — no SDK, no middleman. We POST to it with the bot token
// (kept secret in the TELEGRAM_BOT_TOKEN env var) and the user's chat id.
//
// Unlike WhatsApp there is no approval or template step: once the user has
// tapped "Start" on the bot, we can message them any time.

const TIMEZONE = process.env.TIMEZONE || "Asia/Jerusalem";

async function sendPlanTelegram(chatId, plans, homeAddress, timezone) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  if (!chatId) throw new Error("No Telegram chat id for this user");

  const tz = timezone || TIMEZONE;
  const valid = plans.filter((p) => p.leaveBy);
  if (valid.length === 0) return; // nothing worth sending

  const blocks = valid
    .map(
      (p) =>
        `<b>${esc(p.title)}</b> — ${esc(p.location)}\n` +
        `Meeting: ${fmt(p.meetingTime, tz)}\n` +
        `Leave by <b>${fmt(p.leaveBy, tz)}</b>` +
        (driveRange(p) ? ` (drive ${driveRange(p)})` : "") +
        `\n<a href="${mapsLink(homeAddress, p.location)}">Open route in Maps</a>`
    )
    .join("\n\n");

  const text = `🚗 <b>Your ON-Time plan</b>\n\n${blocks}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Telegram API ${res.status}: ${body}`);
  }
}

function mapsLink(origin, destination) {
  const o = encodeURIComponent(origin || "");
  const d = encodeURIComponent(destination || "");
  return `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=driving`;
}

function driveRange(p) {
  const d = p.driveMinutes;
  return d ? `${d.withoutTraffic}–${d.withTraffic} min` : "";
}

function fmt(iso, tz) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: tz || TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// Telegram HTML mode only needs &, <, > escaped.
function esc(s) {
  return String(s).replace(
    /[&<>]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
  );
}

module.exports = { sendPlanTelegram };
