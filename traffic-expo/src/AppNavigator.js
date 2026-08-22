// The logged-in shell: a slide-out drawer (Home / Settings) with the ON-Time
// header, plus the Add Meeting screen pushed on top when you tap the "+".
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MeetingsScreen } from './screens/MeetingsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AddMeetingScreen } from './screens/AddMeetingScreen';
import { DrawerContent } from './components/DrawerContent';
import { headerTitle } from './components/headerTitle';
import { useTheme } from './theme-context';

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// Home = the meetings list + a floating "+" that opens Add Meeting.
function HomeWithFab({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <MeetingsScreen />
      <TouchableOpacity
        onPress={() => navigation.navigate('AddMeeting')}
        activeOpacity={0.85}
        style={[styles.fab, { backgroundColor: colors.brand, bottom: 24 + insets.bottom }]}
      >
        <Text style={styles.fabPlus}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

function MainDrawer() {
  const { colors } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        // Always open the drawer from the LEFT, even if the phone is set to a
        // right-to-left language. Pairs with the forceLTR call in index.js.
        drawerPosition: 'left',
        headerTitle: headerTitle(colors),
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        drawerActiveTintColor: colors.brand,
        drawerInactiveTintColor: colors.text,
        drawerStyle: { backgroundColor: colors.surface },
        sceneContainerStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen name="Home" component={HomeWithFab} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

export function AppNavigator() {
  const { colors, dark } = useTheme();

  const navTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      primary: colors.brand,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={MainDrawer} options={{ headerShown: false }} />
        <Stack.Screen
          name="AddMeeting"
          component={AddMeetingScreen}
          options={{
            title: 'Add meeting',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  fabPlus: { color: '#FFFFFF', fontSize: 30, marginTop: -2 },
});
