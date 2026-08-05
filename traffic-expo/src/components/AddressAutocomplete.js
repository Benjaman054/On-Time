// A text field that suggests addresses as you type, using the backend's
// /places/autocomplete proxy. Debounced (waits 300ms) and only searches once
// you've typed 3+ characters — same behaviour as the Android app.
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { autocomplete } from '../api';

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  colors,
  label,
  placeholder,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const timer = useRef(null);

  function handleChange(text) {
    onChangeText(text);
    if (timer.current) clearTimeout(timer.current);

    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await autocomplete(text);
        setSuggestions(res?.predictions ?? []);
      } catch {
        // Ignore autocomplete failures — the user can still type freely.
      }
    }, 300);
  }

  function pick(prediction) {
    if (timer.current) clearTimeout(timer.current);
    onSelect(prediction.description);
    setSuggestions([]);
  }

  return (
    <View>
      {label ? (
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.inputBg,
          },
        ]}
      />
      {suggestions.length > 0 && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {suggestions.map((s, i) => (
            <TouchableOpacity
              key={`${s.placeId ?? s.description}-${i}`}
              onPress={() => pick(s)}
              style={[
                styles.row,
                i > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <Text style={{ color: colors.text }}>{s.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 6,
    overflow: 'hidden',
  },
  row: { paddingHorizontal: 14, paddingVertical: 14 },
});
