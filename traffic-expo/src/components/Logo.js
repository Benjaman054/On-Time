// The ON-Time logo. The badge is the robot image asset; the wordmark is text.
import React from 'react';
import { Image, Text } from 'react-native';
import { BRAND_BLUE } from '../theme';

// Shows the robot logo as a rounded badge. Used on the Welcome screen (large)
// and in the app header (small).
export function LogoBadge({ size = 112 }) {
  return (
    <Image
      source={require('../../assets/robot.png')}
      style={{ width: size, height: size, borderRadius: size * 0.25 }}
      resizeMode="cover"
    />
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
