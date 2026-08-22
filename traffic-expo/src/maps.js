// Opens Google Maps with driving directions TO a given address. `destination`
// is free-text (e.g. "Dizengoff 100, Tel Aviv"); encodeURIComponent makes it
// safe to drop into the URL.
import { Linking } from 'react-native';

export function openMaps(destination) {
  const url =
    'https://www.google.com/maps/dir/?api=1&destination=' +
    encodeURIComponent(destination) +
    '&travelmode=driving';
  Linking.openURL(url);
}
