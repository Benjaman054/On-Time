import { registerRootComponent } from 'expo';
import { I18nManager } from 'react-native';

import App from './App';

// Force the app to ALWAYS lay out left-to-right (English), no matter the phone's
// language or region. Without this, a device set to a right-to-left language
// (e.g. Hebrew or Arabic) would mirror the entire UI. Runs before the app is
// registered/rendered, so the layout is locked in from the first frame.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
