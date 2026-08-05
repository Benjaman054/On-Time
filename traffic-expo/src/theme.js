// Central colors + shared style tokens. One place to change the look.
// Light and dark palettes mirror the Android app's Material theme.

export const BRAND_BLUE = '#2563EB';      // primary accent
export const BRAND_BLUE_DARK = '#1E3A8A'; // deep blue (logo gradient bottom)

const light = {
  brand: BRAND_BLUE,
  brandDark: BRAND_BLUE_DARK,
  background: '#FFFFFF',
  surface: '#FFFFFF',
  card: '#F4F6FB',
  border: '#E2E6EF',
  text: '#111418',
  textMuted: '#5B6472',
  onBrand: '#FFFFFF',
  error: '#DC2626',
  inputBg: '#FFFFFF',
};

const dark = {
  brand: '#5B8DEF',
  brandDark: BRAND_BLUE_DARK,
  background: '#0E1116',
  surface: '#151A21',
  card: '#1B222C',
  border: '#2A313C',
  text: '#ECEFF4',
  textMuted: '#9AA4B2',
  onBrand: '#FFFFFF',
  error: '#F87171',
  inputBg: '#151A21',
};

export function getColors(darkMode) {
  return darkMode ? dark : light;
}
