// Component style overrides cho Chakra UI
// Tùy chỉnh styling cho các component với semantic tokens và high contrast

export const components = {
  // Button component overrides với contrast cao
  Button: {
    baseStyle: {
      fontWeight: 'semibold',
      borderRadius: 'md',
      transition: 'all 0.2s',
      _focus: {
        boxShadow: '0 0 0 3px',
        boxShadowColor: 'interactive.primary',
        outline: 'none',
      },
    },
    variants: {
      solid: {
        bg: 'interactive.primary',
        color: 'text.inverse',
        _hover: {
          bg: 'interactive.primaryHover',
          transform: 'translateY(-1px)',
          boxShadow: 'lg',
        },
        _active: {
          bg: 'interactive.primaryHover',
          transform: 'translateY(0)',
        },
        _disabled: {
          bg: 'gray.300',
          color: 'gray.500',
          cursor: 'not-allowed',
          _hover: {
            bg: 'gray.300',
            transform: 'none',
            boxShadow: 'none',
          },
          _dark: {
            bg: 'gray.600',
            color: 'gray.400',
            _hover: {
              bg: 'gray.600',
            },
          },
        },
      },
      outline: {
        border: '2px solid',
        borderColor: 'interactive.primary',
        color: 'interactive.primary',
        bg: 'transparent',
        _hover: {
          bg: 'interactive.primary',
          color: 'text.inverse',
          transform: 'translateY(-1px)',
        },
        _active: {
          bg: 'interactive.primaryHover',
          borderColor: 'interactive.primaryHover',
        },
      },
      ghost: {
        color: 'text.primary',
        bg: 'transparent',
        _hover: {
          bg: 'bg.muted',
          color: 'text.primary',
        },
        _active: {
          bg: 'bg.elevated',
        },
      },
    },
    sizes: {
      sm: {
        h: '8',
        minW: '8',
        fontSize: 'text.sm',
        px: '3',
      },
      md: {
        h: '10',
        minW: '10',
        fontSize: 'text.base',
        px: '4',
      },
      lg: {
        h: '12',
        minW: '12',
        fontSize: 'text.lg',
        px: '6',
      },
    },
  },

  // Input component overrides với contrast cao
  Input: {
    baseStyle: {
      field: {
        borderRadius: 'md',
        transition: 'all 0.2s',
        _placeholder: {
          color: 'text.muted',
        },
      },
    },
    variants: {
      outline: {
        field: {
          bg: 'bg.canvas',
          border: '2px solid',
          borderColor: 'border.default',
          color: 'text.primary',
          _hover: {
            borderColor: 'interactive.primary',
          },
          _focus: {
            borderColor: 'interactive.primary',
            boxShadow: '0 0 0 1px',
            boxShadowColor: 'interactive.primary',
            outline: 'none',
          },
          _invalid: {
            borderColor: 'red.500',
            boxShadow: '0 0 0 1px',
            boxShadowColor: 'red.500',
          },
        },
      },
      filled: {
        field: {
          bg: 'bg.elevated',
          border: '2px solid transparent',
          color: 'text.primary',
          _hover: {
            bg: 'bg.muted',
          },
          _focus: {
            bg: 'bg.canvas',
            borderColor: 'interactive.primary',
            boxShadow: '0 0 0 1px',
            boxShadowColor: 'interactive.primary',
          },
        },
      },
    },
  },

  // Card component overrides với contrast cao
  Card: {
    baseStyle: {
      container: {
        bg: 'bg.surface',
        borderRadius: 'lg',
        border: '1px solid',
        borderColor: 'border.default',
        boxShadow: 'base',
        transition: 'all 0.2s',
        _hover: {
          boxShadow: 'lg',
          transform: 'translateY(-2px)',
        },
      },
      header: {
        color: 'text.primary',
        fontWeight: 'semibold',
        borderBottom: '1px solid',
        borderColor: 'border.default',
      },
      body: {
        color: 'text.secondary',
      },
    },
  },

  // Heading component overrides với contrast cao
  Heading: {
    baseStyle: {
      color: 'text.primary',
      fontWeight: 'bold',
      lineHeight: 'shorter',
    },
    sizes: {
      xs: {
        fontSize: 'sm',
      },
      sm: {
        fontSize: 'md',
      },
      md: {
        fontSize: 'lg',
      },
      lg: {
        fontSize: 'xl',
      },
      xl: {
        fontSize: '2xl',
      },
      '2xl': {
        fontSize: '3xl',
      },
      '3xl': {
        fontSize: '4xl',
      },
      '4xl': {
        fontSize: '5xl',
      },
    },
  },

  // Text component overrides với contrast cao
  Text: {
    baseStyle: {
      color: 'text.secondary',
      lineHeight: 'base',
    },
    variants: {
      primary: {
        color: 'text.primary',
      },
      secondary: {
        color: 'text.secondary',
      },
      muted: {
        color: 'text.muted',
      },
      disabled: {
        color: 'text.disabled',
      },
    },
  },

  // Link component overrides với contrast cao
  Link: {
    baseStyle: {
      color: 'interactive.primary',
      textDecoration: 'none',
      transition: 'all 0.2s',
      _hover: {
        color: 'interactive.primaryHover',
        textDecoration: 'underline',
      },
      _focus: {
        boxShadow: '0 0 0 2px',
        boxShadowColor: 'interactive.primary',
        borderRadius: 'sm',
        outline: 'none',
      },
    },
  },

  // Alert component overrides với contrast cao
  Alert: {
    baseStyle: {
      container: {
        borderRadius: 'md',
        border: '1px solid',
      },
      title: {
        color: 'text.primary',
        fontWeight: 'semibold',
      },
      description: {
        color: 'text.secondary',
      },
    },
    variants: {
      subtle: {
        container: {
          bg: 'bg.elevated',
          borderColor: 'border.default',
        },
      },
      'left-accent': {
        container: {
          bg: 'bg.elevated',
          borderLeft: '4px solid',
          borderColor: 'border.default',
        },
      },
      'top-accent': {
        container: {
          bg: 'bg.elevated',
          borderTop: '4px solid',
          borderColor: 'border.default',
        },
      },
      solid: {
        container: {
          color: 'text.inverse',
        },
      },
    },
  },

  // Modal component overrides với contrast cao
  Modal: {
    baseStyle: {
      dialog: {
        bg: 'bg.canvas',
        borderRadius: 'xl',
        boxShadow: 'xl',
        border: '1px solid',
        borderColor: 'border.default',
      },
      header: {
        color: 'text.primary',
        fontWeight: 'semibold',
        borderBottom: '1px solid',
        borderColor: 'border.default',
      },
      body: {
        color: 'text.secondary',
      },
      footer: {
        borderTop: '1px solid',
        borderColor: 'border.default',
      },
      closeButton: {
        color: 'text.muted',
        _hover: {
          color: 'text.primary',
          bg: 'bg.muted',
        },
      },
    },
  },

  // Drawer component overrides với contrast cao
  Drawer: {
    baseStyle: {
      dialog: {
        bg: 'bg.canvas',
        border: '1px solid',
        borderColor: 'border.default',
      },
      header: {
        color: 'text.primary',
        fontWeight: 'semibold',
        borderBottom: '1px solid',
        borderColor: 'border.default',
      },
      body: {
        color: 'text.secondary',
      },
      closeButton: {
        color: 'text.muted',
        _hover: {
          color: 'text.primary',
          bg: 'bg.muted',
        },
      },
    },
  },

  // Menu component overrides với contrast cao
  Menu: {
    baseStyle: {
      list: {
        bg: 'bg.canvas',
        borderRadius: 'md',
        border: '1px solid',
        borderColor: 'border.default',
        boxShadow: 'xl',
        py: '2',
      },
      item: {
        color: 'text.secondary',
        _hover: {
          bg: 'bg.elevated',
          color: 'text.primary',
        },
        _focus: {
          bg: 'bg.elevated',
          color: 'text.primary',
        },
      },
    },
  },

  // Tooltip component overrides với contrast cao
  Tooltip: {
    baseStyle: {
      bg: 'gray.800',
      color: 'white',
      borderRadius: 'md',
      fontSize: 'sm',
      px: '3',
      py: '2',
      maxW: 'xs',
      boxShadow: 'lg',
      _dark: {
        bg: 'gray.200',
        color: 'gray.800',
      },
    },
  },

  // Badge component overrides với contrast cao
  Badge: {
    baseStyle: {
      fontWeight: 'semibold',
      borderRadius: 'md',
      textTransform: 'uppercase',
      fontSize: 'xs',
    },
    variants: {
      solid: {
        bg: 'interactive.primary',
        color: 'text.inverse',
      },
      subtle: {
        bg: 'bg.elevated',
        color: 'text.primary',
        border: '1px solid',
        borderColor: 'border.default',
      },
      outline: {
        bg: 'transparent',
        color: 'text.primary',
        border: '1px solid',
        borderColor: 'border.default',
      },
    },
  },

  // Tabs component overrides với contrast cao
  Tabs: {
    variants: {
      line: {
        tab: {
          color: 'text.muted',
          borderBottom: '2px solid transparent',
          _selected: {
            color: 'interactive.primary',
            borderColor: 'interactive.primary',
          },
          _hover: {
            color: 'text.primary',
          },
        },
        tabpanel: {
          color: 'text.secondary',
        },
      },
      enclosed: {
        tab: {
          color: 'text.muted',
          bg: 'bg.elevated',
          border: '1px solid',
          borderColor: 'border.default',
          _selected: {
            color: 'text.primary',
            bg: 'bg.canvas',
            borderBottomColor: 'bg.canvas',
          },
          _hover: {
            color: 'text.primary',
          },
        },
        tabpanel: {
          color: 'text.secondary',
          bg: 'bg.canvas',
          border: '1px solid',
          borderColor: 'border.default',
          borderTop: 'none',
        },
      },
    },
  },
};