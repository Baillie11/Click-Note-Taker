import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { STORAGE_KEYS } from '../constants';

/**
 * Hash a PIN using SHA-256
 */
export async function hashPin(pin: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin
  );
  return digest;
}

/**
 * Store hashed PIN securely
 */
export async function storePin(pin: string): Promise<void> {
  const hashedPin = await hashPin(pin);
  await SecureStore.setItemAsync(STORAGE_KEYS.PIN_HASH, hashedPin);
}

/**
 * Verify entered PIN against stored hash
 */
export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const storedHash = await SecureStore.getItemAsync(STORAGE_KEYS.PIN_HASH);
    if (!storedHash) return false;
    
    const enteredHash = await hashPin(pin);
    return storedHash === enteredHash;
  } catch (error) {
    console.error('Error verifying PIN:', error);
    return false;
  }
}

/**
 * Check if PIN has been set up
 */
export async function isPinConfigured(): Promise<boolean> {
  try {
    const storedHash = await SecureStore.getItemAsync(STORAGE_KEYS.PIN_HASH);
    return !!storedHash;
  } catch (error) {
    console.error('Error checking PIN configuration:', error);
    return false;
  }
}

/**
 * Validate PIN format (4-6 digits)
 */
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin) {
    return { valid: false, error: 'PIN is required' };
  }
  
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only digits' };
  }
  
  if (pin.length < 4 || pin.length > 6) {
    return { valid: false, error: 'PIN must be 4-6 digits' };
  }
  
  return { valid: true };
}

/**
 * Delete stored PIN (for reset functionality)
 */
export async function deletePin(): Promise<void> {
  await SecureStore.deleteItemAsync(STORAGE_KEYS.PIN_HASH);
}
