// Shared DynamoDB connection, used by every handler that touches the database.
//
// The "DocumentClient" is the friendly wrapper: it lets us work with plain
// JavaScript objects ({ userId: "benny", ... }) instead of DynamoDB's raw
// typed format. Worth using every time.
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

// The table's real name is set by AWS and passed in as an environment
// variable (see TABLE_NAME in template.yaml).
const TABLE = process.env.TABLE_NAME;

// A small helper so every handler returns a consistent HTTP response.
function response(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

module.exports = { ddb, TABLE, response };
