const { readUpcomingEvents } = require("./calendar");
const { getDriveEstimate } = require("./maps");
const { clampDays } = require("./util");

// Safety margin added on top of the drive time.
const BUFFER_MINUTES = 10;

// Given a user (with a refresh token + home address), builds the list of
// "leave by" plans for their next 7 days of meetings.
//
// This is the shared brain used by BOTH the /debug/plan endpoint and the
// scheduled worker — one copy of the logic, no duplication.
async function buildPlansForUser(user) {
  const days = clampDays(user.daysAhead);
  const events = await readUpcomingEvents(user.googleRefreshToken, days);

  const plans = [];
  for (const ev of events) {
    if (!ev.location || !ev.start) continue; // can't route to it — skip

    const startMs = new Date(ev.start).getTime();
    const endMs = ev.end ? new Date(ev.end).getTime() : startMs;
    if (endMs <= Date.now()) continue; // meeting already ended — skip
    const departureIso = new Date(
      Math.max(Date.now() + 60_000, startMs)
    ).toISOString();

    try {
      const est = await getDriveEstimate(
        user.homeAddress,
        ev.location,
        departureIso
      );
      const leaveByMs =
        startMs - est.durationSeconds * 1000 - BUFFER_MINUTES * 60_000;

      plans.push({
        title: ev.title,
        location: ev.location,
        meetingTime: ev.start,
        endTime: ev.end || null,
        leaveBy: new Date(leaveByMs).toISOString(),
        driveMinutes: {
          withoutTraffic: Math.round(est.staticSeconds / 60),
          withTraffic: Math.round(est.durationSeconds / 60),
        },
      });
    } catch (e) {
      plans.push({
        title: ev.title,
        location: ev.location,
        meetingTime: ev.start,
        endTime: ev.end || null,
        error: e.message,
      });
    }
  }

  return plans;
}

module.exports = { buildPlansForUser };
