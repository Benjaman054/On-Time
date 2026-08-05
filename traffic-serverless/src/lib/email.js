const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");

const ses = new SESClient({});
const TIMEZONE = process.env.TIMEZONE || "Asia/Jerusalem";
const BRAND = "#2563EB";

async function sendPlanEmail(to, from, plans, homeAddress) {
  const valid = plans.filter((p) => p.leaveBy);
  if (valid.length === 0) return;

  // ---- plain-text fallback ----
  const text = valid
    .map(
      (p) =>
        `${p.title} — ${p.location}\n` +
        `Meeting: ${fmt(p.meetingTime)}\n` +
        `LEAVE BY: ${fmt(p.leaveBy)}  (drive ${driveRange(p)})\n` +
        `Route: ${mapsLink(homeAddress, p.location)}`
    )
    .join("\n\n");

  // ---- HTML cards ----
  const cards = valid
    .map(
      (p) => `
    <div style="border:1px solid #e5e7eb;border-radius:14px;padding:20px 22px;margin:0 0 16px;">
      <div style="font-size:22px;font-weight:700;color:#111827;">${esc(p.title)}</div>
      <div style="font-size:16px;color:#6b7280;margin:4px 0 16px;">${esc(p.location)}</div>

      <div style="font-size:16px;color:#374151;margin-bottom:6px;">
        Meeting: <strong>${fmt(p.meetingTime)}</strong>
      </div>
      <div style="font-size:22px;font-weight:700;color:${BRAND};margin-bottom:4px;">
        Leave by ${fmt(p.leaveBy)}
      </div>
      <div style="font-size:15px;color:#6b7280;margin-bottom:18px;">
        Drive ${driveRange(p)}
      </div>

      <a href="${mapsLink(homeAddress, p.location)}"
         style="display:inline-block;background:${BRAND};color:#ffffff;font-size:16px;font-weight:600;
                text-decoration:none;padding:12px 22px;border-radius:10px;">
        Open route in Maps
      </a>
    </div>`
    )
    .join("");

  const html = `
  <div style="background:#f3f4f6;padding:24px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;">
      <div style="background:${BRAND};padding:26px 24px;">
        <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">ON-Time</div>
        <div style="font-size:16px;color:#dbeafe;margin-top:4px;">Your plan for the days ahead</div>
      </div>
      <div style="padding:24px;">
        ${cards}
        <div style="font-size:13px;color:#9ca3af;margin-top:8px;">
          Drive times show best-case–with-traffic. Tip: in Maps, set the departure
          time to your leave-by time for exact traffic.
        </div>
      </div>
    </div>
  </div>`;

  await ses.send(
    new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: "🚗 Your ON-Time plan" },
        Body: { Text: { Data: text }, Html: { Data: html } },
      },
    })
  );
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

function fmt(iso) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true, // 12-hour with am/pm, so morning vs evening is clear
  });
}

function esc(s) {
  return String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  );
}

module.exports = { sendPlanEmail };
