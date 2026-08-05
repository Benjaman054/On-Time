// A tiny React Context that hands every screen the current colors and a way to
// flip light/dark. Screens call useTheme() instead of receiving props.
import React, { createContext, useContext } from 'react';
import { getColors } from './theme';

const ThemeContext = createContext({
  dark: false,
  colors: getColors(false),
  toggle: () => {},
});

export function ThemeProvider({ dark, setDark, children }) {
  const value = {
    dark,
    colors: getColors(dark),
    toggle: (isDark) => setDark(isDark),
  };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
