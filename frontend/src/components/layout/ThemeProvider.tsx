// Theme Provider Component
// Component wrapper để cung cấp theme context cho toàn bộ app

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useTheme } from '../../hooks/useTheme';
import type { ColorMode } from '../../hooks/useTheme';

interface ThemeContextType {
  colorMode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Theme Provider component để cung cấp theme context
 * @param children - Child components
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const themeHook = useTheme();

  return (
    <ThemeContext.Provider value={themeHook}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Hook để sử dụng theme context
 * @returns Theme context value
 * @throws Error nếu được sử dụng ngoài ThemeProvider
 */
export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useThemeContext phải được sử dụng trong ThemeProvider');
  }
  
  return context;
};

export default ThemeProvider;