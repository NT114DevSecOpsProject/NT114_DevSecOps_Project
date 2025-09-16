/**
 * Theme-related TypeScript type definitions
 * Định nghĩa các types liên quan đến Theme system
 */

// Color mode type
export type ColorMode = 'light' | 'dark';

// Theme state interface
export interface ThemeState {
  colorMode: ColorMode;
  primaryColor: string;
  accentColor: string;
  isSystemTheme: boolean;
}

// Theme configuration interface
export interface ThemeConfig {
  initialColorMode: ColorMode;
  useSystemColorMode: boolean;
  colors: {
    primary: Record<string, string>;
    secondary: Record<string, string>;
    accent: Record<string, string>;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

// Theme context interface
export interface ThemeContextType {
  colorMode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  isSystemTheme: boolean;
  setSystemTheme: (useSystem: boolean) => void;
}

// Component theme override interface
export interface ComponentTheme {
  baseStyle?: Record<string, any>;
  sizes?: Record<string, any>;
  variants?: Record<string, any>;
  defaultProps?: Record<string, any>;
}

// Semantic tokens interface
export interface SemanticTokens {
  colors: {
    bg: {
      primary: { default: string; _dark: string };
      secondary: { default: string; _dark: string };
      accent: { default: string; _dark: string };
    };
    text: {
      primary: { default: string; _dark: string };
      secondary: { default: string; _dark: string };
      accent: { default: string; _dark: string };
    };
    border: {
      primary: { default: string; _dark: string };
      secondary: { default: string; _dark: string };
    };
  };
}