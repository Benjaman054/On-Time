// On-device storage for small flags — the Expo Go equivalent of the Android
// app's SharedPreferences (AppPrefs.kt). Survives app restarts.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_ONBOARDED = 'ontime.onboarded';
const KEY_THEME = 'ontime.theme'; // 'light' | 'dark'

export async function isOnboarded() {
  return (await AsyncStorage.getItem(KEY_ONBOARDED)) === 'true';
}

export async function setOnboarded(value) {
  await AsyncStorage.setItem(KEY_ONBOARDED, value ? 'true' : 'false');
}

export async function getThemeIsDark() {
  return (await AsyncStorage.getItem(KEY_THEME)) === 'dark';
}

export async function setThemeIsDark(isDark) {
  await AsyncStorage.setItem(KEY_THEME, isDark ? 'dark' : 'light');
}
