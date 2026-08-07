// First page: the ON-Time logo and a "Sign in with Google" button. Tapping it
// runs the real sign-in (opens Google, waits for the session token), then moves
// the user on into the app.
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoBadge, Wordmark } from '../components/Logo';
import { PrimaryButton } from '../components/Button';
import { useTheme } from '../theme-context';
import { login } from '../auth';

export function WelcomeScreen({ onLoggedIn }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignIn() {
    setBusy(true);
    setError(null);
    try {
      await login(); // opens Google, polls, stores the token
      onLoggedIn();
    } catch (e) {
      setError(e.message || 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.spacer} />

      <LogoBadge size={112} />
      <View style={{ height: 24 }} />
      <Wordmark color={colors.text} />
      <View style={{ height: 10 }} />
      <Text style={[styles.tagline, { color: colors.textMuted }]}>
        Leave on time, every time.
      </Text>

      <View style={styles.spacer} />

      <PrimaryButton
        title={busy ? 'Signing in…' : 'Sign in with Google'}
        onPress={handleSignIn}
        loading={busy}
        colors={colors}
        style={{ width: '100%' }}
      />
      {busy && (
        <Text style={[styles.privacy, { color: colors.textMuted, marginTop: 12 }]}>
          Approve in the browser, then come back — we'll sign you in automatically.
        </Text>
      )}
      {error && (
        <Text style={[styles.privacy, { color: colors.error, marginTop: 12 }]}>{error}</Text>
      )}
      <View style={{ height: 16 }} />
      <Text style={[styles.privacy, { color: colors.textMuted }]}>
        We only read your calendar to tell you when to leave.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 20,
    alignItems: 'center',
  },
  spacer: { flex: 1 },
  tagline: { fontSize: 16 },
  privacy: { fontSize: 12, textAlign: 'center' },
});
