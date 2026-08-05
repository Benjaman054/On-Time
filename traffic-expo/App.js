// App entry: decides which stage to show and provides theme + gesture context.
//
//   first launch:   Welcome → (register with Google) → Onboarding → App
//   later launches: straight to the App (onboarding is remembered on-device)
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './src/theme-context';
import { getColors } from './src/theme';
import {
  isOnboarded,
  setOnboarded,
  getThemeIsDark,
  setThemeIsDark,
} from './src/storage';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { AppNavigator } from './src/AppNavigator';

export default function App() {
  const [stage, setStage] = useState('loading'); // loading | welcome | onboarding | app
  const [dark, setDarkState] = useState(false);

  // On startup: read the saved theme and whether onboarding is done.
  useEffect(() => {
    (async () => {
      setDarkState(await getThemeIsDark());
      setStage((await isOnboarded()) ? 'app' : 'welcome');
    })();
  }, []);

  // Persist theme changes so the choice survives restarts.
  function setDark(value) {
    setDarkState(value);
    setThemeIsDark(value);
  }

  async function finishOnboarding() {
    await setOnboarded(true);
    setStage('app');
  }

  const colors = getColors(dark);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider dark={dark} setDark={setDark}>
          <StatusBar style={dark ? 'light' : 'dark'} />
          {stage === 'loading' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
              <ActivityIndicator size="large" color={colors.brand} />
            </View>
          )}
          {stage === 'welcome' && (
            <WelcomeScreen onRegistered={() => setStage('onboarding')} />
          )}
          {stage === 'onboarding' && (
            <OnboardingScreen onFinished={finishOnboarding} />
          )}
          {stage === 'app' && <AppNavigator />}
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
