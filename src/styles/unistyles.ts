import { StyleSheet } from 'react-native-unistyles';
import { lightTheme, darkTheme } from './theme';

export const breakpoints = {
  xs: 0,
  sm: 380,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

type AppBreakpoints = typeof breakpoints;
type AppThemes = {
  light: typeof lightTheme;
  dark: typeof darkTheme;
};

declare module 'react-native-unistyles' {
  export interface UnistylesBreakpoints extends AppBreakpoints {}
  export interface UnistylesThemes extends AppThemes {}
}

StyleSheet.configure({
  breakpoints,
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  settings: {
    initialTheme: 'dark',
  },
});

