// Centralized Color Scheme Configuration
// Giải quyết vấn đề màu text trùng với màu background trong light/dark mode

export const colorScheme = {
  // Light Mode Colors
  light: {
    // Background Colors
    bg: {
      canvas: '#ffffff',        // Main background
      surface: '#ffffff',       // Card/surface background
      elevated: '#f8f9fa',      // Elevated surfaces
      muted: '#f1f3f4',         // Muted backgrounds
      subtle: '#e8eaed',        // Subtle backgrounds
    },
    
    // Text Colors (High Contrast)
    text: {
      primary: '#1a202c',       // Main text - very dark
      secondary: '#2d3748',     // Secondary text - dark
      muted: '#4a5568',         // Muted text - medium
      inverse: '#ffffff',       // White text for dark backgrounds
      disabled: '#a0aec0',      // Disabled text
    },
    
    // Border Colors
    border: {
      default: '#e2e8f0',       // Default borders
      muted: '#f1f5f9',         // Muted borders
      strong: '#cbd5e0',        // Strong borders
    },
    
    // Interactive Colors
    interactive: {
      primary: '#3182ce',       // Primary buttons/links
      primaryHover: '#2c5aa0',  // Primary hover
      secondary: '#718096',     // Secondary elements
      secondaryHover: '#4a5568', // Secondary hover
    },
    
    // Status Colors
    status: {
      success: '#38a169',       // Success states
      successBg: '#f0fff4',     // Success backgrounds
      warning: '#d69e2e',       // Warning states
      warningBg: '#fffbeb',     // Warning backgrounds
      error: '#e53e3e',         // Error states
      errorBg: '#fed7d7',       // Error backgrounds
      info: '#3182ce',          // Info states
      infoBg: '#ebf8ff',        // Info backgrounds
    }
  },
  
  // Dark Mode Colors
  dark: {
    // Background Colors
    bg: {
      canvas: '#0f1419',        // Main background - very dark
      surface: '#1a202c',       // Card/surface background
      elevated: '#2d3748',      // Elevated surfaces
      muted: '#374151',         // Muted backgrounds
      subtle: '#4a5568',        // Subtle backgrounds
    },
    
    // Text Colors (High Contrast)
    text: {
      primary: '#f7fafc',       // Main text - very light
      secondary: '#e2e8f0',     // Secondary text - light
      muted: '#a0aec0',         // Muted text - medium
      inverse: '#1a202c',       // Dark text for light backgrounds
      disabled: '#4a5568',      // Disabled text
    },
    
    // Border Colors
    border: {
      default: '#4a5568',       // Default borders
      muted: '#374151',         // Muted borders
      strong: '#718096',        // Strong borders
    },
    
    // Interactive Colors
    interactive: {
      primary: '#63b3ed',       // Primary buttons/links - lighter in dark mode
      primaryHover: '#90cdf4',  // Primary hover
      secondary: '#a0aec0',     // Secondary elements
      secondaryHover: '#cbd5e0', // Secondary hover
    },
    
    // Status Colors
    status: {
      success: '#68d391',       // Success states - lighter
      successBg: '#1a2e1a',     // Success backgrounds - dark
      warning: '#fbd38d',       // Warning states - lighter
      warningBg: '#2d2a1a',     // Warning backgrounds - dark
      error: '#fc8181',         // Error states - lighter
      errorBg: '#2d1b1b',       // Error backgrounds - dark
      info: '#63b3ed',          // Info states - lighter
      infoBg: '#1a2332',        // Info backgrounds - dark
    }
  }
};

// Helper function to get colors based on color mode
export const getColors = (colorMode: 'light' | 'dark') => {
  return colorScheme[colorMode];
};

// CSS Custom Properties for runtime theme switching
export const getCSSVariables = (colorMode: 'light' | 'dark') => {
  const colors = getColors(colorMode);
  
  return {
    // Background variables
    '--color-bg-canvas': colors.bg.canvas,
    '--color-bg-surface': colors.bg.surface,
    '--color-bg-elevated': colors.bg.elevated,
    '--color-bg-muted': colors.bg.muted,
    '--color-bg-subtle': colors.bg.subtle,
    
    // Text variables
    '--color-text-primary': colors.text.primary,
    '--color-text-secondary': colors.text.secondary,
    '--color-text-muted': colors.text.muted,
    '--color-text-inverse': colors.text.inverse,
    '--color-text-disabled': colors.text.disabled,
    
    // Border variables
    '--color-border-default': colors.border.default,
    '--color-border-muted': colors.border.muted,
    '--color-border-strong': colors.border.strong,
    
    // Interactive variables
    '--color-interactive-primary': colors.interactive.primary,
    '--color-interactive-primary-hover': colors.interactive.primaryHover,
    '--color-interactive-secondary': colors.interactive.secondary,
    '--color-interactive-secondary-hover': colors.interactive.secondaryHover,
    
    // Status variables
    '--color-status-success': colors.status.success,
    '--color-status-success-bg': colors.status.successBg,
    '--color-status-warning': colors.status.warning,
    '--color-status-warning-bg': colors.status.warningBg,
    '--color-status-error': colors.status.error,
    '--color-status-error-bg': colors.status.errorBg,
    '--color-status-info': colors.status.info,
    '--color-status-info-bg': colors.status.infoBg,
  };
};

// Chakra UI theme extension
export const chakraColorExtension = {
  colors: {
    // Custom color tokens that work with both modes
    app: {
      bg: {
        canvas: { _light: colorScheme.light.bg.canvas, _dark: colorScheme.dark.bg.canvas },
        surface: { _light: colorScheme.light.bg.surface, _dark: colorScheme.dark.bg.surface },
        elevated: { _light: colorScheme.light.bg.elevated, _dark: colorScheme.dark.bg.elevated },
        muted: { _light: colorScheme.light.bg.muted, _dark: colorScheme.dark.bg.muted },
        subtle: { _light: colorScheme.light.bg.subtle, _dark: colorScheme.dark.bg.subtle },
      },
      text: {
        primary: { _light: colorScheme.light.text.primary, _dark: colorScheme.dark.text.primary },
        secondary: { _light: colorScheme.light.text.secondary, _dark: colorScheme.dark.text.secondary },
        muted: { _light: colorScheme.light.text.muted, _dark: colorScheme.dark.text.muted },
        inverse: { _light: colorScheme.light.text.inverse, _dark: colorScheme.dark.text.inverse },
        disabled: { _light: colorScheme.light.text.disabled, _dark: colorScheme.dark.text.disabled },
      },
      border: {
        default: { _light: colorScheme.light.border.default, _dark: colorScheme.dark.border.default },
        muted: { _light: colorScheme.light.border.muted, _dark: colorScheme.dark.border.muted },
        strong: { _light: colorScheme.light.border.strong, _dark: colorScheme.dark.border.strong },
      },
      interactive: {
        primary: { _light: colorScheme.light.interactive.primary, _dark: colorScheme.dark.interactive.primary },
        primaryHover: { _light: colorScheme.light.interactive.primaryHover, _dark: colorScheme.dark.interactive.primaryHover },
        secondary: { _light: colorScheme.light.interactive.secondary, _dark: colorScheme.dark.interactive.secondary },
        secondaryHover: { _light: colorScheme.light.interactive.secondaryHover, _dark: colorScheme.dark.interactive.secondaryHover },
      }
    }
  }
};

// Hook for using theme colors in components
export const useAppColors = (colorMode: 'light' | 'dark') => {
  return getColors(colorMode);
};