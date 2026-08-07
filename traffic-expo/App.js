// App entry: decides which stage to show and provides theme + gesture context.
//
//   no session token yet: Welcome (sign in) → Onboarding → App
//   already signed in:     straight to Onboarding or App
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme-context';
import { getColors } from './src/theme';
import { getThemeIsDark, setThemeIsDark } from './src/storage';
import { getToken, clearToken } from './src/auth';
import { getPreferences } from './src/api';
import { AuthProvider } from './src/auth-context';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AppNavigator } from './src/AppNavigator';

export default function App() {
  const [stage, setStage] = useState('loading'); // loading | welcome | onboarding | app
  const [dark, setDarkState] = useState(false);

  // On startup: read the theme, then route based on the session token.
  useEffect(() => {
    (async () => {
      setDarkState(await getThemeIsDark());
      const token = await getToken();
      if (!token) {
        setStage('welcome'); // must sign in first
      } else {
        await routeAfterAuth();
      }
    })();
  }, []);

  // Persist theme changes so the choice survives restarts.
  function setDark(value) {
    setDarkState(value);
    setThemeIsDark(value);
  }

  // After sign-in (or on startup with a token): a brand-new user has no home
  // address saved yet -> send them through onboarding; otherwise into the app.
  // This "am I set up?" check comes from the BACKEND (per-user), not a device
  // flag, so each account gets the right flow on any phone.
  async function routeAfterAuth() {
    try {
      const prefs = await getPreferences();
      setStage(prefs?.homeAddress ? 'app' : 'onboarding');
    } catch {
      // 401 => api.js already cleared the token, so send them to sign-in.
      // Any other error (e.g. network) => proceed; screens show their own errors.
      const stillSignedIn = await getToken();
      setStage(stillSignedIn ? 'app' : 'welcome');
    }
  }

  // Called after a successful sign-in.
  async function handleLoggedIn() {
    await routeAfterAuth();
  }

  async function finishOnboarding() {
    setStage('app');
  }

  // Sign out: forget the session token and return to the Welcome screen.
  async function handleSignOut() {
    await clearToken();
    setStage('welcome');
  }

  const colors = getColors(dark);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider dark={dark} setDark={setDark}>
          <AuthProvider signOut={handleSignOut}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          {stage === 'loading' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          )}
          {stage === 'welcome' && <WelcomeScreen onLoggedIn={handleLoggedIn} />}
          {stage === 'onboarding' && (
            <OnboardingScreen onFinished={finishOnboarding} />
          )}
          {stage === 'app' && <AppNavigator />}
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
