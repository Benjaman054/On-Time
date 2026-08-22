// Add Meeting form: title, location (autocomplete), date, start/end time.
// On submit it writes the event to Google Calendar via the backend, then goes
// back to Home (which re-syncs on focus).
import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { TimeField, DateField } from '../components/Pickers';
import { PrimaryButton, OutlineButton } from '../components/Button';
import { useTheme } from '../theme-context';
import { createMeeting } from '../api';
import { toLocalIso, localWallClockEpoch, isEndAfterStart } from '../time';

export function AddMeetingScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date());
  const [start, setStart] = useState({ h: 9, m: 0 });
  const [end, setEnd] = useState({ h: 10, m: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function submit() {
    if (title.trim().length === 0) {
      setError('Please add a title.');
      return;
    }
    if (!isEndAfterStart(start, end)) {
      setError('End time must be after start time.');
      return;
    }
    if (localWallClockEpoch(date, start.h, start.m) < Date.now()) {
      setError('That time is already in the past.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createMeeting({
        title,
        location,
        start: toLocalIso(date, start.h, start.m),
        end: toLocalIso(date, end.h, end.m),
      });
      navigation.goBack();
    } catch (e) {
      setError(e.message || 'Could not add the meeting.');
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.container, { paddingBottom: 24 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
      />

      <AddressAutocomplete
        value={location}
        onChangeText={setLocation}
        onSelect={setLocation}
        colors={colors}
        label="Location"
        placeholder="e.g. Dizengoff 100, Tel Aviv"
      />

      <DateField
        date={date}
        onChange={setDate}
        colors={colors}
        label="Date"
        minimumDate={new Date()}
      />

      <View style={styles.timeRow}>
        <View style={{ flex: 1 }}>
          <TimeField
            hour={start.h}
            minute={start.m}
            onChange={(h, m) => {
              setStart({ h, m });
              setError(null);
              // Nudge end forward if it's no longer after start.
              if (end.h * 60 + end.m <= h * 60 + m) {
                const total = Math.min(h * 60 + m + 60, 23 * 60 + 59);
                setEnd({ h: Math.floor(total / 60), m: total % 60 });
              }
            }}
            colors={colors}
            label="Start"
          />
        </View>
        <View style={{ flex: 1 }}>
          <TimeField
            hour={end.h}
            minute={end.m}
            onChange={(h, m) => {
              setError(null);
              const startMin = start.h * 60 + start.m;
              if (h * 60 + m <= startMin) {
                // End isn't after start — snap to one hour after the start.
                const total = Math.min(startMin + 60, 23 * 60 + 59);
                setEnd({ h: Math.floor(total / 60), m: total % 60 });
              } else {
                setEnd({ h, m });
              }
            }}
            colors={colors}
            label="End"
          />
        </View>
      </View>

      {error ? <Text style={{ color: colors.error }}>{error}</Text> : null}

      <PrimaryButton
        title={submitting ? 'Adding…' : 'Add to calendar'}
        onPress={submit}
        loading={submitting}
        colors={colors}
        style={{ width: '100%' }}
      />
      <OutlineButton title="Cancel" onPress={() => navigation.goBack()} colors={colors} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  timeRow: { flexDirection: 'row', gap: 12 },
});
