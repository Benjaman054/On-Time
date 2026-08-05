// Settings: home address, daily email time, days-ahead, notification toggles,
// pause switch, and light/dark theme. Save posts everything to the backend.
import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { TimeField, DaysSelector } from '../components/Pickers';
import { PrimaryButton } from '../components/Button';
import { useTheme } from '../theme-context';
import { getPreferences, savePreferences } from '../api';
import { USER_EMAIL } from '../constants';

export function SettingsScreen() {
  const { colors, dark, toggle } = useTheme();
  const insets = useSafeAreaInsets();

  const [address, setAddress] = useState('');
  const [hour, setHour] = useState(20);
  const [minute, setMinute] = useState(0);
  const [days, setDays] = useState(7);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifyTelegram, setNotifyTelegram] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState('');
  const [paused, setPaused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Load existing preferences once.
  useEffect(() => {
    (async () => {
      try {
        const p = await getPreferences();
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
        email: USER_EMAIL,
        daysAhead: days,
        notifyEmail,
        notifyTelegram,
        telegramChatId: telegramChatId.trim(),
        paused,
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
          <View style={{ gap: 6, marginTop: 4 }}>
            <TextInput
              value={telegramChatId}
              onChangeText={setTelegramChatId}
              placeholder="Telegram chat ID (e.g. 123456789)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numbers-and-punctuation"
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg },
              ]}
            />
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>
              Open our Telegram bot, tap Start, and it will show you this number.
            </Text>
          </View>
        )}
      </Section>

      <View style={styles.rowBetween}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Pause daily emails</Text>
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
});
