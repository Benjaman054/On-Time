// A tappable row with a label on the left and a switch on the right. Tapping
// anywhere on the row flips the switch.
import React from 'react';
import { Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';

export function ToggleRow({ label, value, onChange, colors }) {
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

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
