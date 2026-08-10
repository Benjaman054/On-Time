// The app's sign-in logic, now using NATIVE Google Sign-In (the one-tap account
// picker). Much simpler than the old browser+poll flow: the SDK gives us an ID
// token + a one-time server auth code, we hand both to the backend, and get our
// session token straight back. The token is stored in the phone's SECURE store.
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { BASE_URL, WEB_CLIENT_ID } from './config';

const TOKEN_KEY = 'ontime.sessionToken';

// Configure the Google SDK once when this module loads.
GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID, // so we get an ID token + server auth code
  offlineAccess: true, // so the server can get a long-lived refresh token
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
});

// ---- token storage ----
export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}
export async function saveToken(token) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}
export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Native sign-in: pick the account, then swap the Google tokens for our session
// token at the backend. Returns the session token (also stored).
export async function login() {
  await GoogleSignin.hasPlayServices();
  const result = await GoogleSignin.signIn();

  // The library's response shape changed across versions; handle both.
  const data = result?.data || result;
  const idToken = data?.idToken;
  const serverAuthCode = data?.serverAuthCode;
  if (!idToken || !serverAuthCode) {
    throw new Error('Google sign-in did not return the expected tokens.');
  }

  const res = await fetch(`${BASE_URL}/auth/google/native`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, serverAuthCode }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.token) {
    throw new Error(json.error || 'Sign-in failed on the server.');
  }

  await saveToken(json.token);
  return json.token;
}

// Clears the native Google session too, so the next sign-in shows the picker.
export async function nativeSignOut() {
  try {
    await GoogleSignin.signOut();
  } catch {
    // ignore — nothing to sign out of
  }
}
