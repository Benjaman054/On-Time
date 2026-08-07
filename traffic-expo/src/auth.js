// The app's sign-in logic. It obtains a session token from the backend using the
// "open browser + poll" flow, and stores it in the phone's SECURE storage
// (Android Keystore / iOS Keychain) — not plain storage — so it's well protected.
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { BASE_URL } from './config';

const TOKEN_KEY = 'ontime.sessionToken';

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

/**
 * Runs the full sign-in:
 *   1. make a strong random login code (unguessable),
 *   2. open Google's consent page in the browser,
 *   3. poll the backend until our session token is ready,
 *   4. save the token securely.
 * Returns the token (also stored) or throws on timeout/expiry.
 */
export async function login() {
  const code = Crypto.randomUUID(); // cryptographically-random, ~122 bits

  // Open the browser but DON'T await it — we poll in parallel so the app can
  // advance on its own the moment the token is ready.
  WebBrowser.openBrowserAsync(`${BASE_URL}/auth/google/start?login=${code}`);

  try {
    const token = await pollForToken(code);
    await saveToken(token);
    return token;
  } finally {
    // Try to close the in-app browser. dismissBrowser() only exists on iOS
    // (returns undefined on Android), so guard it and never let it throw.
    try {
      WebBrowser.dismissBrowser();
    } catch {
      // not all platforms can dismiss programmatically — that's fine
    }
  }
}

// Ask /auth/session repeatedly until it returns the token (or we give up).
async function pollForToken(code, { attempts = 90, intervalMs = 2000 } = {}) {
  const url = `${BASE_URL}/auth/session?login=${code}`;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 410) throw new Error('Sign-in expired. Please try again.');
      const data = await res.json();
      if (data.status === 'ready' && data.token) return data.token;
    } catch (e) {
      if (String(e.message).includes('expired')) throw e;
      // otherwise a transient network error — keep polling
    }
    await sleep(intervalMs);
  }
  throw new Error('Sign-in timed out. Please try again.');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
