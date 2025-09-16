// App constants
// Các hằng số của ứng dụng

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'codeland_auth_token',
  THEME_MODE: 'codeland_theme_mode',
  USER_DATA: 'codeland_user_data',
  // Legacy key cho backward compatibility
  CHAKRA_COLOR_MODE: 'chakra-ui-color-mode',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    STATUS: '/auth/status',
  },
  // Users
  USERS: {
    BASE: '/users/',
    PING: '/users/ping',
    BY_ID: (id: number) => `/users/${id}`,
  },
  // Exercises
  EXERCISES: {
    BASE: '/exercises/',
    PING: '/exercises/ping',
  },
  // Scores
  SCORES: {
    BASE: '/scores/',
    PING: '/scores/ping',
    USER: '/scores/user',
    USER_BY_ID: (id: number) => `/scores/user/${id}`,
    BY_EXERCISE_ID: (id: number) => `/scores/${id}`,
  },
} as const;

// App Configuration
export const APP_CONFIG = {
  NAME: 'CodeLand.io',
  DESCRIPTION: 'ReactJS Code Exercise Platform',
  VERSION: '1.0.0',
} as const;