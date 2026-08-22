// A titled section: a heading followed by its content. Used to group related
// settings on the Settings screen.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function Section({ title, colors, children }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 17, fontWeight: '600' },
});
