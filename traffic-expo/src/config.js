// App-wide config. Kept separate so both api.js and auth.js can import it
// without importing each other (which would be a circular dependency).
export const BASE_URL =
  'https://hy76b43p4m.execute-api.eu-central-1.amazonaws.com';

// The Google "Web" OAuth client ID. Public by design (it's embedded in apps).
// Native Google Sign-In uses it to produce an ID token + server auth code that
// our backend can verify and exchange.
export const WEB_CLIENT_ID =
  '302378604161-1kfesrvvsc22tngne75jgaef6keau1is.apps.googleusercontent.com';
