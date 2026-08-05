// First page: the ON-Time logo and a "Register with Google" button. The button
// opens the backend's Google sign-in page in the browser (same as Android),
// then moves on to onboarding.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { LogoBadge, Wordmark } from '../components/Logo';
import { PrimaryButton } from '../components/Button';
import { useTheme } from '../theme-context';
import { registerUrl } from '../api';

export function WelcomeScreen({ onRegistered }) {
  const { colors } = useTheme();

  async function handleRegister() {
    try {
      await WebBrowser.openBrowserAsync(registerUrl);
    } catch {
      // Even if the browser fails to open, let the user continue setup.
    }
    onRegistered();
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
        title="Register with Google"
        onPress={handleRegister}
        colors={colors}
        style={{ width: '100%' }}
      />
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
