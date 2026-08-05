// The ON-Time logo, drawn with plain Views (no image asset, no SVG library):
// a white clock on a blue rounded square, plus the "ON-Time" wordmark.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BRAND_BLUE } from '../theme';

export function LogoBadge({ size = 112 }) {
  const face = size * 0.52;   // clock face diameter
  const ring = size * 0.045;  // stroke thickness
  return (
    <View
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.25 },
      ]}
    >
      <View
        style={{
          width: face,
          height: face,
          borderRadius: face / 2,
          borderWidth: ring,
          borderColor: '#FFFFFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* hour hand — points up */}
        <View
          style={{
            position: 'absolute',
            width: ring,
            height: face * 0.28,
            backgroundColor: '#FFFFFF',
            borderRadius: ring,
            top: face * 0.16,
          }}
        />
        {/* minute hand — points right */}
        <View
          style={{
            position: 'absolute',
            width: face * 0.32,
            height: ring,
            backgroundColor: '#FFFFFF',
            borderRadius: ring,
            left: face * 0.42,
          }}
        />
        {/* center dot */}
        <View
          style={{
            width: ring * 1.6,
            height: ring * 1.6,
            borderRadius: ring,
            backgroundColor: '#FFFFFF',
          }}
        />
      </View>
    </View>
  );
}

export function Wordmark({ color = '#111418', fontSize = 42 }) {
  return (
    <Text style={{ fontSize, letterSpacing: 0.5 }}>
      <Text style={{ color: BRAND_BLUE, fontWeight: '900' }}>ON</Text>
      <Text style={{ color, fontWeight: '300' }}>-Time</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: BRAND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
