// Reusable Telegram "Connect" logic, shared by Onboarding and Settings.
// It asks the backend for a one-time bot link, opens Telegram, then watches for
// the webhook to link the chat (polling + app-foreground check), and reports the
// linked chat id when done.
import { useEffect, useState } from 'react';
import { Linking, AppState, Alert } from 'react-native';
import { connectTelegram, getPreferences } from './api';

export function useTelegramConnect(initialChatId = '') {
  const [telegramChatId, setTelegramChatId] = useState(initialChatId);
  const [connecting, setConnecting] = useState(false);

  async function connect() {
    try {
      const { url } = await connectTelegram();
      setConnecting(true); // now waiting for you to come back from Telegram
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('Could not connect', e.message || 'Please try again.');
      setConnecting(false);
    }
  }

  // While connecting, poll for the link (works even if the app never
  // backgrounded) and also check the instant the app returns to the foreground.
  useEffect(() => {
    if (!connecting) return;
    let cancelled = false;

    async function checkOnce() {
      try {
        const p = await getPreferences();
        if (p?.telegramChatId && !cancelled) {
          setTelegramChatId(String(p.telegramChatId));
          setConnecting(false);
        }
      } catch {
        // ignore — next tick retries
      }
    }

    const interval = setInterval(checkOnce, 2500);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') checkOnce();
    });
    const timeout = setTimeout(() => {
      if (!cancelled) setConnecting(false);
    }, 120000);
    checkOnce();

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
      sub.remove();
    };
  }, [connecting]);

  return {
    telegramChatId,
    setTelegramChatId,
    connecting,
    connect,
    isConnected: !!telegramChatId,
  };
}
