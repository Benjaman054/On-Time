// A pill button used to pick the light/dark theme. Fills with the brand colour
// when it's the selected one.
import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';

export function ThemeChip({ label, selected, onPress, colors }) {
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
  themeChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
});
