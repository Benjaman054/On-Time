const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");
const { getUser } = require("./lib/users");
const { buildPlansForUser, } = require("./lib/planner");
const { hasCalendarChangedSince } = require("./lib/calendar");
const { getUserIdFromRequest } = require("./lib/auth");

// GET /meetings[&refresh=true][&sync=true]   (identity from the session token)
//
//   (nothing)      -> return the stored plans (instant, cheap)
//   sync=true      -> cheap "did the calendar change?" check; recompute only
//                     if it did. This is what the 1-minute poll uses.
//   refresh=true   -> force a full recompute (used rarely, e.g. debugging)
exports.handler = async (event) => {
  const userId = await getUserIdFromRequest(event);
  if (!userId) return response(401, { error: "Not signed in" });

  const qs = event.queryStringParameters || {};
  const refresh = qs.refresh === "true";
  const sync = qs.sync === "true";

  const user = await getUser(userId);
  if (!user) return response(200, { count: 0, plans: [], updatedAt: null });

  const canCompute = user.googleRefreshToken && user.homeAddress && !user.paused;

  // Forced full recompute.
  if (refresh && canCompute) {
    return recomputeAndReturn(user);
  }

  // Cheap sync: recompute only if the calendar actually changed.
  if (sync && canCompute) {
    const now = new Date().toISOString();

    let changed = !user.lastSyncTime; // first ever sync -> compute once
    if (user.lastSyncTime) {
      try {
        changed = await hasCalendarChangedSince(
          user.googleRefreshToken,
          user.lastSyncTime
        );
      } catch (e) {
        console.error("Sync check failed:", e.message);
        changed = false;
      }
    }

    if (changed) {
      return recomputeAndReturn(user, now);
    }

    // Nothing changed — just move the marker forward, return what we have.
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { userId },
        UpdateExpression: "SET lastSyncTime = :s",
        ExpressionAttributeValues: { ":s": now },
      })
    );
    return stored(user);
  }

  return stored(user);
};

async function recomputeAndReturn(user, syncTime) {
  const now = syncTime || new Date().toISOString();
  try {
    const plans = await buildPlansForUser(user);
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { userId: user.userId },
        UpdateExpression:
          "SET plans = :p, plansUpdatedAt = :t, lastSyncTime = :s",
        ExpressionAttributeValues: { ":p": plans, ":t": now, ":s": now },
      })
    );
    return response(200, { count: plans.length, plans, updatedAt: now });
  } catch (e) {
    console.error("Recompute failed:", e.message);
    return stored(user);
  }
}

function stored(user) {
  const plans = user.plans || [];
  return response(200, {
    count: plans.length,
    plans,
    updatedAt: user.plansUpdatedAt || null,
  });
}
