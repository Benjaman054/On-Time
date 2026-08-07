// Settings: home address, daily email time, days-ahead, notification toggles,
// pause switch, and light/dark theme. Save posts everything to the backend.
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ScrollView, Alert, Linking, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { TimeField, DaysSelector } from '../components/Pickers';
import { PrimaryButton } from '../components/Button';
import { useTheme } from '../theme-context';
import { useAuth } from '../auth-context';
import { getPreferences, savePreferences, connectTelegram } from '../api';
import { deviceTimeZone } from '../time';

export function SettingsScreen() {
  const { colors, dark, toggle } = useTheme();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You will need to sign in with Google again.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  // Ask the backend for a one-time bot link, open Telegram, then poll until the
  // webhook has linked the chat to this account.
  async function handleConnectTelegram() {
    setConnectingTg(true);
    try {
      const { url } = await connectTelegram();
      await Linking.openURL(url); // opens the Telegram app at our bot
      const linked = await pollForTelegramLink();
      if (linked) {
        setTelegramChatId(linked);
        setNotifyTelegram(true);
      } else {
        Alert.alert('Not linked yet', 'Tap Start in Telegram, then try Connect again.');
      }
    } catch (e) {
      Alert.alert('Could not connect', e.message || 'Please try again.');
    } finally {
      setConnectingTg(false);
    }
  }

  async function pollForTelegramLink({ attempts = 40, intervalMs = 2000 } = {}) {
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, intervalMs));
      try {
        const p = await getPreferences();
        if (p?.telegramChatId) return p.telegramChatId;
      } catch {
        // keep polling through transient errors
      }
    }
    return null;
  }

  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [hour, setHour] = useState(20);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState(7);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyTelegram, setNotifyTelegram] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [connectingTg, setConnectingTg] = useState(false);

  // Load existing preferences once.
  useEffect(() => {
    (async () => {
      try {
        const p = await getPreferences();
        if (p?.email) setEmail(p.email);
        if (p?.homeAddress) setAddress(p.homeAddress);
        if (p?.checkTime) {
          const [h, m] = p.checkTime.split(':').map((x) => parseInt(x, 10));
          if (!Number.isNaN(h)) setHour(h);
          if (!Number.isNaN(m)) setMinute(m);
        }
        if (p?.daysAhead) setDays(p.daysAhead);
        if (typeof p?.notifyEmail === 'boolean') setNotifyEmail(p.notifyEmail);
        if (typeof p?.notifyTelegram === 'boolean') setNotifyTelegram(p.notifyTelegram);
        if (p?.telegramChatId) setTelegramChatId(String(p.telegramChatId));
        if (typeof p?.paused === 'boolean') setPaused(p.paused);
      } catch {
        // Keep defaults if the load fails.
      }
    })();
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await savePreferences({
        homeAddress: address,
        checkTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        daysAhead: days,
        notifyEmail,
        notifyTelegram,
        telegramChatId: telegramChatId.trim(),
        paused,
        timezone: deviceTimeZone(),
      });
      setSaving(false);
      setMessage('Saved ✓');
      setTimeout(() => setMessage(null), 2000);
    } catch (e) {
      setSaving(false);
      setMessage(e.message || 'Could not save.');
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: 24 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      <Section title="Home address" colors={colors}>
        <AddressAutocomplete
          value={address}
          onChangeText={setAddress}
          onSelect={setAddress}
          colors={colors}
          placeholder="e.g. Herzl 1, Tel Aviv"
        />
      </Section>

      <Section title="Daily email time" colors={colors}>
        <TimeField
          hour={hour}
          minute={minute}
          onChange={(h, m) => {
            setHour(h);
            setMinute(m);
          }}
          colors={colors}
        />
      </Section>

      <Section title={`Look ahead: ${days} ${days === 1 ? 'day' : 'days'}`} colors={colors}>
        <DaysSelector value={days} onChange={setDays} colors={colors} />
      </Section>

      <Section title="Notifications" colors={colors}>
        <ToggleRow label="Email" value={notifyEmail} onChange={setNotifyEmail} colors={colors} />
        <ToggleRow label="Telegram" value={notifyTelegram} onChange={setNotifyTelegram} colors={colors} />
        {notifyTelegram && (
          <View style={{ gap: 8, marginTop: 4 }}>
            {telegramChatId ? (
              <Text style={{ color: colors.brand, fontWeight: '600' }}>✓ Telegram connected</Text>
            ) : (
              <>
                <PrimaryButton
                  title={connectingTg ? 'Waiting for Telegram…' : 'Connect Telegram'}
                  onPress={handleConnectTelegram}
                  loading={connectingTg}
                  colors={colors}
                />
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  Opens our Telegram bot — tap Start there and you're linked automatically.
                </Text>
              </>
            )}
          </View>
        )}
      </Section>

      <View style={styles.rowBetween}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Pause all notifications</Text>
        <Switch
          value={paused}
          onValueChange={setPaused}
          trackColor={{ true: colors.brand }}
        />
      </View>

      <Section title="Appearance" colors={colors}>
        <View style={styles.themeRow}>
          <ThemeChip label="Light" selected={!dark} onPress={() => toggle(false)} colors={colors} />
          <ThemeChip label="Dark" selected={dark} onPress={() => toggle(true)} colors={colors} />
        </View>
      </Section>

      <PrimaryButton
        title={saving ? 'Saving…' : 'Save changes'}
        onPress={save}
        loading={saving}
        colors={colors}
        style={{ width: '100%' }}
      />
      {message ? <Text style={{ color: colors.textMuted }}>{message}</Text> : null}

      {email ? (
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
          Signed in as {email}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={confirmSignOut}
        style={[styles.signOut, { borderColor: colors.border }]}
      >
        <Text style={{ color: colors.error, fontWeight: '600', fontSize: 16 }}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Section({ title, colors, children }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function ToggleRow({ label, value, onChange, colors }) {
  return (
    <TouchableOpacity
      style={styles.rowBetween}
      activeOpacity={0.7}
      onPress={() => onChange(!value)}
    >
      <Text style={{ color: colors.text, fontSize: 16 }}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand }} />
    </TouchableOpacity>
  );
}

function ThemeChip({ label, selected, onPress, colors }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.themeChip,
        {
          borderColor: selected ? colors.brand : colors.border,
          backgroundColor: selected ? colors.brand : 'transparent',
        },
      ]}
    >
      <Text style={{ color: selected ? colors.onBrand : colors.text, fontWeight: '600' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 26 },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeRow: { flexDirection: 'row', gap: 12 },
  themeChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  signOut: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});

