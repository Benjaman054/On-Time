// Reusable form controls shared by Onboarding, Settings and Add Meeting:
//  - TimeField: a button that opens the native time picker (⏰ HH:mm)
//  - DateField: a button that opens the native date picker (📅 date)
//  - DaysSelector: a row of 1–7 chips (replaces the Android slider, no extra dep)
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Slider from '@react-native-community/slider';
import { hhmm } from '../time';

export function TimeField({ hour, minute, onChange, colors, label }) {
  const [show, setShow] = useState(false);
  const value = new Date();
  value.setHours(hour, minute, 0, 0);

  return (
    <View>
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[styles.field, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
      >
        <Text style={[styles.fieldText, { color: colors.text }]}>⏰  {hhmm(hour, minute)}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={value}
          mode="time"
          is24Hour
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            setShow(false);
            if (event.type === 'set' && selected) {
              onChange(selected.getHours(), selected.getMinutes());
            }
          }}
        />
      )}
    </View>
  );
}

export function DateField({ date, onChange, colors, label, minimumDate }) {
  const [show, setShow] = useState(false);
  return (
    <View>
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={[styles.field, { borderColor: colors.border, backgroundColor: colors.inputBg }]}
      >
        <Text style={[styles.fieldText, { color: colors.text }]}>
          📅  {date.toDateString()}
        </Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          minimumDate={minimumDate}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            setShow(false);
            if (event.type === 'set' && selected) onChange(selected);
          }}
        />
      )}
    </View>
  );
}

export function DaysSelector({ value, onChange, colors }) {
  return (
    <Slider
      style={{ width: '100%', height: 40 }}
      minimumValue={1}
      maximumValue={7}
      step={1}
      value={value}
      onValueChange={(v) => onChange(Math.round(v))}
      minimumTrackTintColor={colors.brand}
      maximumTrackTintColor={colors.border}
      thumbTintColor={colors.brand}
    />
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginBottom: 6 },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignSelf: 'flex-start',
    minWidth: 140,
  },
  fieldText: { fontSize: 16 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
