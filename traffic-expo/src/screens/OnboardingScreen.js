// First-run setup: home address, daily time, days-ahead, and how to be notified
// (email and/or Telegram) — then it saves preferences and calls onFinished().
import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { TimeField, DaysSelector } from '../components/Pickers';
import { PrimaryButton, OutlineButton } from '../components/Button';
import { useTheme } from '../theme-context';
import { savePreferences } from '../api';
import { deviceTimeZone } from '../time';
import { useTelegramConnect } from '../useTelegramConnect';

const TOTAL = 4;

export function OnboardingScreen({ onFinished }) {
  const { colors } = useTheme();

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState('');
  const [hour, setHour] = useState(20);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState(7);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const { telegramChatId, connecting, connect, isConnected } = useTelegramConnect();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const canProceed = step !== 0 || address.trim().length > 0;

  async function finish() {
    setSaving(true);
    setMessage(null);
    try {
      await savePreferences({
        homeAddress: address,
        checkTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        daysAhead: days,
        notifyEmail,
        notifyTelegram: isConnected, // on only if Telegram was actually linked
        telegramChatId,
        paused: false,
        timezone: deviceTimeZone(),
      });
      onFinished();
    } catch (e) {
      setSaving(false);
      setMessage(e.message || 'Could not save. Check your connection.');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Let's set you up</Text>
      <Text style={[styles.step, { color: colors.textMuted }]}>
        Step {step + 1} of {TOTAL}
      </Text>

      <View style={styles.body}>
        {step === 0 && (
          <View style={{ gap: 8 }}>
            <Text style={[styles.q, { color: colors.text }]}>Where do you leave from?</Text>
            <AddressAutocomplete
              value={address}
              onChangeText={setAddress}
              onSelect={setAddress}
              colors={colors}
              placeholder="e.g. Herzl 1, Tel Aviv"
            />
          </View>
        )}

        {step === 1 && (
          <View style={{ gap: 12 }}>
            <Text style={[styles.q, { color: colors.text }]}>
              When should we email your daily plan?
            </Text>
            <TimeField
              hour={hour}
              minute={minute}
              onChange={(h, m) => {
                setHour(h);
                setMinute(m);
              }}
              colors={colors}
            />
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: 12 }}>
            <Text style={[styles.q, { color: colors.text }]}>
              How many days ahead should we look?
            </Text>
            <Text style={{ color: colors.textMuted }}>
              {days} {days === 1 ? 'day' : 'days'}
            </Text>
            <DaysSelector value={days} onChange={setDays} colors={colors} />
          </View>
        )}

        {step === 3 && (
          <View style={{ gap: 16 }}>
            <Text style={[styles.q, { color: colors.text }]}>Where should we send it?</Text>

            <View style={styles.row}>
              <Text style={{ color: colors.text, fontSize: 16 }}>
                Email {'\n'}
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  to your Google account
                </Text>
              </Text>
              <Switch
                value={notifyEmail}
                onValueChange={setNotifyEmail}
                trackColor={{ true: colors.brand }}
              />
            </View>

            <View style={{ gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 16 }}>Telegram</Text>
              {isConnected ? (
                <Text style={{ color: colors.brand, fontWeight: '600' }}>✓ Connected</Text>
              ) : (
                <>
                  <PrimaryButton
                    title={connecting ? 'Waiting for Telegram…' : 'Connect Telegram'}
                    onPress={connect}
                    loading={connecting}
                    colors={colors}
                  />
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    Optional — opens Telegram, tap Start, then come back. You can also
                    do this later in Settings.
                  </Text>
                </>
              )}
            </View>
          </View>
        )}
      </View>

      <View style={styles.nav}>
        {step > 0 ? (
          <OutlineButton title="Back" onPress={() => setStep(step - 1)} colors={colors} />
        ) : (
          <View style={{ width: 1 }} />
        )}

        {step < TOTAL - 1 ? (
          <PrimaryButton
            title="Next"
            onPress={() => setStep(step + 1)}
            disabled={!canProceed}
            colors={colors}
          />
        ) : (
          <PrimaryButton
            title={saving ? 'Saving…' : 'Finish'}
            onPress={finish}
            loading={saving}
            colors={colors}
          />
        )}
      </View>

      {message ? (
        <Text style={[styles.message, { color: colors.error }]}>{message}</Text>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '700' },
  step: { fontSize: 14, marginTop: 4 },
  body: { flex: 1, marginTop: 28 },
  q: { fontSize: 18, fontWeight: '600' },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  message: { marginTop: 12, fontSize: 14 },
});
