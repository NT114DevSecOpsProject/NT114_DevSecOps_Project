// Chakra UI v2 theme configuration với color scheme cải tiến
import { extendTheme } from '@chakra-ui/react';
import { chakraColorExtension, colorScheme } from './colors';
import { components } from './components';
import { foundations } from './foundations';

// Tạo theme với color scheme cải tiến để giải quyết vấn đề contrast
const theme = extendTheme({
  // Color mode config
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  
  // Colors với high contrast
  colors: {
    // Sử dụng color scheme mới
    ...chakraColorExtension.colors,
    
    // Brand colors với contrast tốt
    brand: {
      50: '#e3f2fd',
      100: '#bbdefb', 
      200: '#90caf9',
      300: '#64b5f6',
      400: '#42a5f5',
      500: '#2196f3', // Primary brand
      600: '#1e88e5',
      700: '#1976d2',
      800: '#1565c0',
      900: '#0d47a1',
    },
    
    // Gray scale với contrast cao
    gray: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee', 
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121',
    },
    
    // Success colors
    green: {
      50: '#e8f5e8',
      100: '#c8e6c9',
      200: '#a5d6a7',
      300: '#81c784',
      400: '#66bb6a',
      500: '#4caf50', // Success primary
      600: '#43a047',
      700: '#388e3c',
      800: '#2e7d32',
      900: '#1b5e20',
    },
    
    // Error colors
    red: {
      50: '#ffebee',
      100: '#ffcdd2',
      200: '#ef9a9a',
      300: '#e57373',
      400: '#ef5350',
      500: '#f44336', // Error primary
      600: '#e53935',
      700: '#d32f2f',
      800: '#c62828',
      900: '#b71c1c',
    },
    
    // Warning colors
    orange: {
      50: '#fff3e0',
      100: '#ffe0b2',
      200: '#ffcc80',
      300: '#ffb74d',
      400: '#ffa726',
      500: '#ff9800', // Warning primary
      600: '#fb8c00',
      700: '#f57c00',
      800: '#ef6c00',
      900: '#e65100',
    },
  },
  
  // Semantic tokens cho color mode switching
  semanticTokens: {
    colors: {
      // Background tokens
      'bg.canvas': {
        default: colorScheme.light.bg.canvas,
        _dark: colorScheme.dark.bg.canvas,
      },
      'bg.surface': {
        default: colorScheme.light.bg.surface,
        _dark: colorScheme.dark.bg.surface,
      },
      'bg.elevated': {
        default: colorScheme.light.bg.elevated,
        _dark: colorScheme.dark.bg.elevated,
      },
      'bg.muted': {
        default: colorScheme.light.bg.muted,
        _dark: colorScheme.dark.bg.muted,
      },
      
      // Text tokens
      'text.primary': {
        default: colorScheme.light.text.primary,
        _dark: colorScheme.dark.text.primary,
      },
      'text.secondary': {
        default: colorScheme.light.text.secondary,
        _dark: colorScheme.dark.text.secondary,
      },
      'text.muted': {
        default: colorScheme.light.text.muted,
        _dark: colorScheme.dark.text.muted,
      },
      'text.inverse': {
        default: colorScheme.light.text.inverse,
        _dark: colorScheme.dark.text.inverse,
      },
      
      // Border tokens
      'border.default': {
        default: colorScheme.light.border.default,
        _dark: colorScheme.dark.border.default,
      },
      'border.muted': {
        default: colorScheme.light.border.muted,
        _dark: colorScheme.dark.border.muted,
      },
      
      // Interactive tokens
      'interactive.primary': {
        default: colorScheme.light.interactive.primary,
        _dark: colorScheme.dark.interactive.primary,
      },
      'interactive.primaryHover': {
        default: colorScheme.light.interactive.primaryHover,
        _dark: colorScheme.dark.interactive.primaryHover,
      },
    },
  },
  
  // Typography
  fonts: foundations.fonts,
  fontSizes: foundations.fontSizes,
  fontWeights: foundations.fontWeights,
  lineHeights: foundations.lineHeights,
  
  // Layout
  space: foundations.space,
  sizes: foundations.sizes,
  radii: foundations.radii,
  shadows: foundations.shadows,
  zIndices: foundations.zIndices,
  breakpoints: foundations.breakpoints,
  
  // Component styles
  components,
  
  // Global styles với high contrast
  styles: {
    global: () => ({
      body: {
        bg: 'bg.canvas',
        color: 'text.primary',
        // Đảm bảo font rendering tốt
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        lineHeight: '1.6',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      },
      
      // Đảm bảo tất cả text có contrast tốt
      '*': {
        borderColor: 'border.default',
      },
      
      // Link styles
      'a': {
        color: 'interactive.primary',
        textDecoration: 'none',
        _hover: {
          color: 'interactive.primaryHover',
          textDecoration: 'underline',
        },
      },
      
      // Focus styles cho accessibility
      '*:focus': {
        outline: '2px solid',
        outlineColor: 'interactive.primary',
        outlineOffset: '2px',
      },
    }),
  },
});

export default theme;

// Export individual parts cho testing và debugging
export { components, foundations };