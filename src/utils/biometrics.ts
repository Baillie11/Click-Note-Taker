import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';

export interface BiometricCapability {
  available: boolean;
  biometricType: LocalAuthentication.AuthenticationType[];
  enrolled: boolean;
}

/**
 * Check if device supports biometric authentication
 */
export async function checkBiometricCapability(): Promise<BiometricCapability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    
    return {
      available: hasHardware && supportedTypes.length > 0,
      biometricType: supportedTypes,
      enrolled: isEnrolled,
    };
  } catch (error) {
    console.error('Error checking biometric capability:', error);
    return {
      available: false,
      biometricType: [],
      enrolled: false,
    };
  }
}

/**
 * Get friendly name for biometric type
 */
export function getBiometricTypeName(types: LocalAuthentication.AuthenticationType[]): string {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return 'Iris';
  }
  return 'Biometrics';
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometrics(): Promise<boolean> {
  try {
    const capability = await checkBiometricCapability();
    
    if (!capability.available || !capability.enrolled) {
      return false;
    }
    
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Click Note Taker',
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true,
      fallbackLabel: 'Use PIN',
    });
    
    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

/**
 * Check if biometrics are enabled in settings
 */
export async function isBiometricsEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRICS_ENABLED);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking biometrics setting:', error);
    return false;
  }
}

/**
 * Enable or disable biometrics
 */
export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRICS_ENABLED, enabled.toString());
}

/**
 * Store last active time for grace period
 */
export async function storeLastActiveTime(): Promise<void> {
  await SecureStore.setItemAsync(
    STORAGE_KEYS.LAST_ACTIVE_TIME, 
    Date.now().toString()
  );
}

/**
 * Check if within grace period
 */
export async function isWithinGracePeriod(): Promise<boolean> {
  try {
    const gracePeriodEnabled = await SecureStore.getItemAsync(STORAGE_KEYS.GRACE_PERIOD_ENABLED);
    if (gracePeriodEnabled !== 'true') return false;
    
    const lastActiveStr = await SecureStore.getItemAsync(STORAGE_KEYS.LAST_ACTIVE_TIME);
    if (!lastActiveStr) return false;
    
    const gracePeriodMinutesStr = await SecureStore.getItemAsync(STORAGE_KEYS.GRACE_PERIOD_MINUTES);
    const gracePeriodMinutes = gracePeriodMinutesStr ? parseInt(gracePeriodMinutesStr, 10) : 1;
    
    const lastActive = parseInt(lastActiveStr, 10);
    const elapsed = Date.now() - lastActive;
    const gracePeriodMs = gracePeriodMinutes * 60 * 1000;
    
    return elapsed < gracePeriodMs;
  } catch (error) {
    console.error('Error checking grace period:', error);
    return false;
  }
}

/**
 * Set grace period settings
 */
export async function setGracePeriodSettings(
  enabled: boolean, 
  minutes: number = 1
): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.GRACE_PERIOD_ENABLED, enabled.toString());
  await SecureStore.setItemAsync(STORAGE_KEYS.GRACE_PERIOD_MINUTES, minutes.toString());
}

/**
 * Get grace period settings
 */
export async function getGracePeriodSettings(): Promise<{ enabled: boolean; minutes: number }> {
  try {
    const enabled = await SecureStore.getItemAsync(STORAGE_KEYS.GRACE_PERIOD_ENABLED);
    const minutes = await SecureStore.getItemAsync(STORAGE_KEYS.GRACE_PERIOD_MINUTES);
    
    return {
      enabled: enabled === 'true',
      minutes: minutes ? parseInt(minutes, 10) : 1,
    };
  } catch (error) {
    return { enabled: false, minutes: 1 };
  }
}
