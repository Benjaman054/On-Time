// Higher-level helpers for the single user table, so handlers don't repeat the
// same DynamoDB commands. Built on top of the shared connection in dynamo.js.
//
// Rule of thumb: add a function here once the same query shows up in 2+ handlers.
const { GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb, TABLE } = require("./dynamo");

// Reads one user's full row by their id. Returns the item, or undefined if
// there is no row for that user yet.
async function getUser(userId) {
  const { Item } = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { userId } })
  );
  return Item;
}

// Saves a freshly computed plan list onto the user's row, stamped with the
// current time. (getMeetings.js has its own variant that also moves the sync
// marker, so it deliberately does not use this.)
async function savePlans(userId, plans) {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: "SET plans = :p, plansUpdatedAt = :t",
      ExpressionAttributeValues: {
        ":p": plans,
        ":t": new Date().toISOString(),
      },
    })
  );
}

module.exports = { getUser, savePlans };
