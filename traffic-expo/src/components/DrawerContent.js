// The slide-out drawer's contents: the ON-Time logo pinned above the menu
// items (Home / Settings). Passed to the drawer navigator via `drawerContent`.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { LogoBadge, Wordmark } from './Logo';
import { useTheme } from '../theme-context';

export function DrawerContent(props) {
  const { colors } = useTheme();
  return (
    <DrawerContentScrollView {...props}>
      <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
        <LogoBadge size={56} />
        <View style={{ height: 10 }} />
        <Wordmark color={colors.text} fontSize={26} />
      </View>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
});
