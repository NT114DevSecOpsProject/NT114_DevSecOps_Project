// Semantic tokens cho theme system
// Định nghĩa các token có ý nghĩa semantic cho light và dark mode

export const semanticTokens = {
  colors: {
    // Background colors
    'bg.canvas': {
      default: 'white',
      _dark: 'gray.900',
    },
    'bg.surface': {
      default: 'gray.50',
      _dark: 'gray.800',
    },
    'bg.subtle': {
      default: 'gray.100',
      _dark: 'gray.700',
    },
    'bg.muted': {
      default: 'gray.200',
      _dark: 'gray.600',
    },
    
    // Text colors
    'text.primary': {
      default: 'gray.900',
      _dark: 'gray.100',
    },
    'text.secondary': {
      default: 'gray.700',
      _dark: 'gray.300',
    },
    'text.muted': {
      default: 'gray.500',
      _dark: 'gray.400',
    },
    'text.disabled': {
      default: 'gray.400',
      _dark: 'gray.500',
    },
    
    // Border colors
    'border.default': {
      default: 'gray.200',
      _dark: 'gray.600',
    },
    'border.muted': {
      default: 'gray.100',
      _dark: 'gray.700',
    },
    'border.subtle': {
      default: 'gray.50',
      _dark: 'gray.800',
    },
    
    // Interactive colors
    'interactive.default': {
      default: 'brand.500',
      _dark: 'brand.400',
    },
    'interactive.hover': {
      default: 'brand.600',
      _dark: 'brand.300',
    },
    'interactive.active': {
      default: 'brand.700',
      _dark: 'brand.200',
    },
    'interactive.disabled': {
      default: 'gray.300',
      _dark: 'gray.600',
    },
    
    // Status colors
    'status.success': {
      default: 'success.500',
      _dark: 'success.400',
    },
    'status.error': {
      default: 'error.500',
      _dark: 'error.400',
    },
    'status.warning': {
      default: 'warning.500',
      _dark: 'warning.400',
    },
    'status.info': {
      default: 'brand.500',
      _dark: 'brand.400',
    },
    
    // Focus colors
    'focus.ring': {
      default: 'brand.500',
      _dark: 'brand.400',
    },
    
    // Shadow colors
    'shadow.default': {
      default: 'rgba(0, 0, 0, 0.1)',
      _dark: 'rgba(0, 0, 0, 0.3)',
    },
    'shadow.lg': {
      default: 'rgba(0, 0, 0, 0.15)',
      _dark: 'rgba(0, 0, 0, 0.4)',
    },
  },
  
  // Spacing semantic tokens
  space: {
    'container.sm': '640px',
    'container.md': '768px',
    'container.lg': '1024px',
    'container.xl': '1280px',
    'container.2xl': '1536px',
  },
  
  // Typography semantic tokens
  fontSizes: {
    'text.xs': '0.75rem',
    'text.sm': '0.875rem',
    'text.base': '1rem',
    'text.lg': '1.125rem',
    'text.xl': '1.25rem',
    'text.2xl': '1.5rem',
    'text.3xl': '1.875rem',
    'text.4xl': '2.25rem',
    'text.5xl': '3rem',
  },
  
  // Border radius semantic tokens
  radii: {
    'radius.sm': '0.125rem',
    'radius.base': '0.25rem',
    'radius.md': '0.375rem',
    'radius.lg': '0.5rem',
    'radius.xl': '0.75rem',
    'radius.2xl': '1rem',
    'radius.full': '9999px',
  },
};