const {
  GetCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE, response } = require("./lib/dynamo");

// GET /auth/session?login=<code>
// The app polls this after opening the Google sign-in page. Until the user
// finishes, there's nothing parked yet -> we answer "pending". Once the callback
// has parked the token, we hand it over ONCE (then delete it) so the app can
// save it and start making authenticated requests.
exports.handler = async (event) => {
  const login = event.queryStringParameters?.login;
  if (!login) {
    return response(400, { error: "login code is required" });
  }

  const { Item } = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { userId: `login#${login}` } })
  );

  // Not finished yet — tell the app to keep polling.
  if (!Item) {
    return response(200, { status: "pending" });
  }

  // Always remove the mailbox item now — it's single-use either way.
  await ddb.send(
    new DeleteCommand({ TableName: TABLE, Key: { userId: `login#${login}` } })
  );

  if (Item.expiresAt && Date.now() > Item.expiresAt) {
    return response(410, { error: "login expired, please try again" });
  }

  return response(200, { status: "ready", token: Item.sessionToken });
};
