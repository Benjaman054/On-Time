const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE } = require("./dynamo");

// Figures out WHO is calling, from their session token — never from the URL.
//
// The app sends its token in the "Authorization: Bearer <token>" header. We look
// up the matching session#<token> row and return its owner's userId (the Google
// id). Returns null if the token is missing or unknown (caller should 401).
async function getUserIdFromRequest(event) {
  const headers = event.headers || {};
  // API Gateway lowercases header names, but be defensive either way.
  const header = headers.authorization || headers.Authorization || "";
  if (!header.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const { Item } = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { userId: `session#${token}` } })
  );
  return Item?.ownerUserId || null;
}

module.exports = { getUserIdFromRequest };
