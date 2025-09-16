// LocalStorage utilities
// Các tiện ích để làm việc với localStorage một cách an toàn

import { STORAGE_KEYS } from './constants';

/**
 * Lấy giá trị từ localStorage một cách an toàn
 * @param key - Key để lấy giá trị
 * @param defaultValue - Giá trị mặc định nếu không tìm thấy
 * @returns Giá trị từ localStorage hoặc giá trị mặc định
 */
export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    
    const item = window.localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    
    // Thử parse JSON, nếu không được thì trả về string
    try {
      return JSON.parse(item);
    } catch {
      return item as unknown as T;
    }
  } catch (error) {
    console.warn(`Lỗi khi đọc localStorage key "${key}":`, error);
    return defaultValue;
  }
};

/**
 * Lưu giá trị vào localStorage một cách an toàn
 * @param key - Key để lưu giá trị
 * @param value - Giá trị cần lưu
 */
export const setStorageItem = <T>(key: string, value: T): void => {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, serializedValue);
  } catch (error) {
    console.warn(`Lỗi khi ghi localStorage key "${key}":`, error);
  }
};

/**
 * Xóa giá trị khỏi localStorage
 * @param key - Key cần xóa
 */
export const removeStorageItem = (key: string): void => {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Lỗi khi xóa localStorage key "${key}":`, error);
  }
};

/**
 * Kiểm tra xem localStorage có khả dụng không
 * @returns true nếu localStorage khả dụng
 */
export const isStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

// Theme-specific storage utilities
export const themeStorage = {
  /**
   * Lấy theme mode từ localStorage với migration support
   * @returns Theme mode hoặc null nếu không có
   */
  getThemeMode: (): 'light' | 'dark' | null => {
    // Kiểm tra key mới trước
    let theme = getStorageItem<'light' | 'dark' | null>(STORAGE_KEYS.THEME_MODE, null);
    
    // Nếu không có, kiểm tra key cũ để migration
    if (!theme) {
      const legacyTheme = getStorageItem<'light' | 'dark' | null>(STORAGE_KEYS.CHAKRA_COLOR_MODE, null);
      if (legacyTheme) {
        // Migrate từ key cũ sang key mới
        setStorageItem(STORAGE_KEYS.THEME_MODE, legacyTheme);
        removeStorageItem(STORAGE_KEYS.CHAKRA_COLOR_MODE);
        theme = legacyTheme;
      }
    }
    
    return theme;
  },
  
  /**
   * Lưu theme mode vào localStorage
   * @param mode - Theme mode cần lưu
   */
  setThemeMode: (mode: 'light' | 'dark'): void => {
    setStorageItem(STORAGE_KEYS.THEME_MODE, mode);
  },
  
  /**
   * Xóa theme mode khỏi localStorage
   */
  removeThemeMode: (): void => {
    removeStorageItem(STORAGE_KEYS.THEME_MODE);
  },
};

// Auth-specific storage utilities
export const authStorage = {
  /**
   * Lấy auth token từ localStorage
   * @returns Auth token hoặc null nếu không có
   */
  getAuthToken: (): string | null => {
    return getStorageItem<string | null>(STORAGE_KEYS.AUTH_TOKEN, null);
  },
  
  /**
   * Lưu auth token vào localStorage
   * @param token - Auth token cần lưu
   */
  setAuthToken: (token: string): void => {
    setStorageItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },
  
  /**
   * Xóa auth token khỏi localStorage
   */
  removeAuthToken: (): void => {
    removeStorageItem(STORAGE_KEYS.AUTH_TOKEN);
  },
};

// User data storage utilities
export const userStorage = {
  /**
   * Lấy user data từ localStorage
   * @returns User data hoặc null nếu không có
   */
  getUserData: <T>(): T | null => {
    return getStorageItem<T | null>(STORAGE_KEYS.USER_DATA, null);
  },
  
  /**
   * Lưu user data vào localStorage
   * @param userData - User data cần lưu
   */
  setUserData: <T>(userData: T): void => {
    setStorageItem(STORAGE_KEYS.USER_DATA, userData);
  },
  
  /**
   * Xóa user data khỏi localStorage
   */
  removeUserData: (): void => {
    removeStorageItem(STORAGE_KEYS.USER_DATA);
  },
};