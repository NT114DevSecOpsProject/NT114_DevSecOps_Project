// useTheme hook
// Custom hook để quản lý theme state và persistence

import { useState, useEffect, useCallback } from 'react';
import { themeStorage } from '../utils/storage';

export type ColorMode = 'light' | 'dark';

interface UseThemeReturn {
  colorMode: ColorMode;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  isLoading: boolean;
}

/**
 * Custom hook để quản lý theme state với localStorage persistence
 * @returns Object chứa colorMode, toggleColorMode, setColorMode, và isLoading
 */
export const useTheme = (): UseThemeReturn => {
  const [colorMode, setColorModeState] = useState<ColorMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Lấy system preference cho color mode
   * @returns 'dark' nếu system prefer dark mode, ngược lại 'light'
   */
  const getSystemPreference = useCallback((): ColorMode => {
    if (typeof window === 'undefined') {
      return 'light';
    }
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  /**
   * Áp dụng theme vào DOM với high contrast CSS variables
   * @param mode - Theme mode cần áp dụng
   */
  const applyThemeToDOM = useCallback((mode: ColorMode) => {
    if (typeof document === 'undefined') {
      return;
    }

    // Set data-theme attribute cho CSS variables
    document.documentElement.setAttribute('data-theme', mode);
    
    // Set class cho CSS selectors
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    // Set Chakra UI color mode
    document.documentElement.style.setProperty('--chakra-ui-color-mode', mode);
    
    // Áp dụng high contrast colors cho Chakra UI semantic tokens
    const root = document.documentElement;
    
    if (mode === 'dark') {
      // Dark mode high contrast colors
      root.style.setProperty('--chakra-colors-bg-canvas', '#0f1419');
      root.style.setProperty('--chakra-colors-bg-surface', '#1a202c');
      root.style.setProperty('--chakra-colors-bg-elevated', '#2d3748');
      root.style.setProperty('--chakra-colors-bg-muted', '#374151');
      
      root.style.setProperty('--chakra-colors-text-primary', '#f7fafc');
      root.style.setProperty('--chakra-colors-text-secondary', '#e2e8f0');
      root.style.setProperty('--chakra-colors-text-muted', '#a0aec0');
      root.style.setProperty('--chakra-colors-text-inverse', '#1a202c');
      
      root.style.setProperty('--chakra-colors-border-default', '#4a5568');
      root.style.setProperty('--chakra-colors-border-muted', '#374151');
      
      root.style.setProperty('--chakra-colors-interactive-primary', '#63b3ed');
      root.style.setProperty('--chakra-colors-interactive-primaryHover', '#90cdf4');
    } else {
      // Light mode high contrast colors
      root.style.setProperty('--chakra-colors-bg-canvas', '#ffffff');
      root.style.setProperty('--chakra-colors-bg-surface', '#ffffff');
      root.style.setProperty('--chakra-colors-bg-elevated', '#f8f9fa');
      root.style.setProperty('--chakra-colors-bg-muted', '#f1f3f4');
      
      root.style.setProperty('--chakra-colors-text-primary', '#1a202c');
      root.style.setProperty('--chakra-colors-text-secondary', '#2d3748');
      root.style.setProperty('--chakra-colors-text-muted', '#4a5568');
      root.style.setProperty('--chakra-colors-text-inverse', '#ffffff');
      
      root.style.setProperty('--chakra-colors-border-default', '#e2e8f0');
      root.style.setProperty('--chakra-colors-border-muted', '#f1f5f9');
      
      root.style.setProperty('--chakra-colors-interactive-primary', '#3182ce');
      root.style.setProperty('--chakra-colors-interactive-primaryHover', '#2c5aa0');
    }
    
    // Dispatch custom event để notify các components khác
    const event = new CustomEvent('themeChange', { 
      detail: { colorMode: mode } 
    });
    window.dispatchEvent(event);
  }, []);

  /**
   * Set color mode và persist vào localStorage
   * @param mode - Theme mode mới
   */
  const setColorMode = useCallback((mode: ColorMode) => {
    setColorModeState(mode);
    themeStorage.setThemeMode(mode);
    applyThemeToDOM(mode);
  }, [applyThemeToDOM]);

  /**
   * Toggle giữa light và dark mode
   */
  const toggleColorMode = useCallback(() => {
    const newMode = colorMode === 'light' ? 'dark' : 'light';
    setColorMode(newMode);
  }, [colorMode, setColorMode]);

  // Initialize theme khi component mount
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // 1. Kiểm tra localStorage trước
        const savedTheme = themeStorage.getThemeMode();
        
        if (savedTheme) {
          setColorModeState(savedTheme);
          applyThemeToDOM(savedTheme);
        } else {
          // 2. Nếu không có saved theme, dùng system preference
          const systemTheme = getSystemPreference();
          setColorModeState(systemTheme);
          applyThemeToDOM(systemTheme);
          // Lưu system preference vào localStorage
          themeStorage.setThemeMode(systemTheme);
        }
      } catch (error) {
        console.warn('Lỗi khi khởi tạo theme:', error);
        // Fallback về light mode
        setColorModeState('light');
        applyThemeToDOM('light');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, [applyThemeToDOM, getSystemPreference]);

  // Listen cho system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // Chỉ update nếu user chưa có preference được lưu
      const savedTheme = themeStorage.getThemeMode();
      if (!savedTheme) {
        const newMode = e.matches ? 'dark' : 'light';
        setColorModeState(newMode);
        applyThemeToDOM(newMode);
      }
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    } 
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange);
      return () => mediaQuery.removeListener(handleSystemThemeChange);
    }
  }, [applyThemeToDOM]);

  // Cleanup khi component unmount
  useEffect(() => {
    return () => {
      // Remove custom event listeners nếu có
      if (typeof window !== 'undefined') {
        // Cleanup logic có thể được thêm ở đây nếu cần
      }
    };
  }, []);

  return {
    colorMode,
    toggleColorMode,
    setColorMode,
    isLoading,
  };
};

export default useTheme;