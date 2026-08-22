export const APP_NAME = 'Click Note Taker';
export const APP_VERSION = '1.1.0-beta.1';
export const APP_TAGLINE = 'Powered by Click eCommerce';
export const COMPANY_URL = 'https://www.clickecommerce.com.au';

// Storage keys
export const STORAGE_KEYS = {
  PIN_HASH: 'pin_hash',
  BIOMETRICS_ENABLED: 'biometrics_enabled',
  GRACE_PERIOD_ENABLED: 'grace_period_enabled',
  GRACE_PERIOD_MINUTES: 'grace_period_minutes',
  LAST_ACTIVE_TIME: 'last_active_time',
  EMERGENCY_LOCK_UNTIL: 'emergency_lock_until',
  USER_PROFILE: 'user_profile',
  PAY_SETTINGS: 'pay_settings',
} as const;

export const EMERGENCY_LOCK_CODE = '999';
export const EMERGENCY_LOCK_MINUTES = 15;

// Colors - Calm, professional palette
export const COLORS = {
  primary: '#2C5282',       // Deep blue
  primaryLight: '#4A7AB8',
  primaryDark: '#1A365D',
  secondary: '#38A169',     // Green for success
  accent: '#805AD5',        // Purple accent
  background: '#F7FAFC',
  surface: '#FFFFFF',
  text: '#2D3748',
  textLight: '#718096',
  textMuted: '#A0AEC0',
  border: '#E2E8F0',
  error: '#E53E3E',
  warning: '#DD6B20',
  success: '#38A169',
  disabled: '#CBD5E0',
} as const;

// Typography
export const TYPOGRAPHY = {
  fontSizeSmall: 12,
  fontSizeBase: 16,
  fontSizeMedium: 18,
  fontSizeLarge: 20,
  fontSizeXLarge: 24,
  fontSizeTitle: 28,
} as const;

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

// Autosave interval in milliseconds
export const AUTOSAVE_INTERVAL = 5000;

// Grace period default (minutes)
export const DEFAULT_GRACE_PERIOD = 1;
