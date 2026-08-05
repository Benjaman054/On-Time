// A Lambda is just a function AWS runs for you when something triggers it —
// here, an HTTP GET to /hello. No server to start, no port to listen on;
// AWS handles all of that. You only write this function.
//
// `event` holds details about the request (path, query, headers, body).
// You return an object describing the HTTP response.
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Hello from AWS Lambda 👋" }),
  };
};
