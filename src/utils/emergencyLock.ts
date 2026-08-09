import * as SecureStore from 'expo-secure-store';
import { EMERGENCY_LOCK_MINUTES, STORAGE_KEYS } from '../constants';

export async function activateEmergencyLock(): Promise<number> {
  const lockUntil = Date.now() + EMERGENCY_LOCK_MINUTES * 60 * 1000;
  await SecureStore.setItemAsync(STORAGE_KEYS.EMERGENCY_LOCK_UNTIL, lockUntil.toString());
  return lockUntil;
}

export async function getEmergencyLockRemainingMs(): Promise<number> {
  const storedValue = await SecureStore.getItemAsync(STORAGE_KEYS.EMERGENCY_LOCK_UNTIL);
  if (!storedValue) return 0;

  const lockUntil = Number.parseInt(storedValue, 10);
  const remaining = lockUntil - Date.now();
  if (!Number.isFinite(lockUntil) || remaining <= 0) {
    await SecureStore.deleteItemAsync(STORAGE_KEYS.EMERGENCY_LOCK_UNTIL);
    return 0;
  }

  return remaining;
}
