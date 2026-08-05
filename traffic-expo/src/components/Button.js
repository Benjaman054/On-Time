// Two simple buttons used across screens: a filled primary and an outlined one.
import React from 'react';
import { Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

export function PrimaryButton({ title, onPress, disabled, loading, colors, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[
        styles.primary,
        { backgroundColor: colors.brand, opacity: disabled || loading ? 0.6 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onBrand} />
      ) : (
        <Text style={[styles.primaryText, { color: colors.onBrand }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function OutlineButton({ title, onPress, colors, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.outline, { borderColor: colors.border }, style]}
    >
      <Text style={[styles.outlineText, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primary: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  primaryText: { fontSize: 16, fontWeight: '600' },
  outline: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  outlineText: { fontSize: 15, fontWeight: '500' },
});
