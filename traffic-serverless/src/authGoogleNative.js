const crypto = require("crypto");
const { UpdateCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");
const { createOAuthClientNoRedirect } = require("./lib/googleAuth");

// POST /auth/google/native
// Body: { idToken, serverAuthCode } from native Google Sign-In on the phone.
//
// We (1) verify WHO this is from the id token, (2) exchange the auth code for a
// long-lived refresh token (offline calendar access), (3) store the user under
// their Google id, and (4) return an app session token. Same result as the old
// browser flow — just obtained natively, with no browser and no polling.
exports.handler = async (event) => {
  const body = JSON.parse(event.body || "{}");
  const { idToken, serverAuthCode } = body;
  if (!idToken || !serverAuthCode) {
    return response(400, { error: "idToken and serverAuthCode are required" });
  }

  const oauth2Client = createOAuthClientNoRedirect();

  // 1) Verify identity.
  let payload;
  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (e) {
    return response(401, { error: "Invalid Google identity token" });
  }
  const userId = payload.sub;
  const email = payload.email || "";
  const name = payload.name || "";

  // 2) Exchange the auth code for tokens (this yields the refresh token).
  let tokens;
  try {
    ({ tokens } = await oauth2Client.getToken(serverAuthCode));
  } catch (e) {
    return response(400, { error: `Could not exchange auth code: ${e.message}` });
  }

  // 3) Store the user. Only overwrite the refresh token if Google returned a new
  //    one (it may omit it on repeat sign-ins) so we never wipe a working one.
  const sets = [
    "email = :e",
    "#nm = :n",
    "googleConnectedAt = :c",
    "signedOut = :false",
  ];
  const values = {
    ":e": email,
    ":n": name,
    ":c": new Date().toISOString(),
    ":false": false,
  };
  if (tokens.refresh_token) {
    sets.push("googleRefreshToken = :t");
    values[":t"] = tokens.refresh_token;
  }
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: "SET " + sets.join(", "),
      ExpressionAttributeNames: { "#nm": "name" }, // "name" is reserved
      ExpressionAttributeValues: values,
    })
  );

  // 4) Issue an app session token.
  const sessionToken = crypto.randomBytes(24).toString("hex");
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        userId: `session#${sessionToken}`,
        ownerUserId: userId,
        createdAt: new Date().toISOString(),
      },
    })
  );

  console.log(
    `Native sign-in for ${userId} (${email}) — refresh_token received: ${!!tokens.refresh_token}`
  );
  return response(200, { token: sessionToken });
};
