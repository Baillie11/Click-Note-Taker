import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';

export async function getAiAccessCode(): Promise<string> {
  return (await SecureStore.getItemAsync(STORAGE_KEYS.AI_ACCESS_CODE)) || '';
}

export async function saveAiAccessCode(value: string): Promise<void> {
  const trimmed = value.trim();
  if (trimmed) await SecureStore.setItemAsync(STORAGE_KEYS.AI_ACCESS_CODE, trimmed);
  else await SecureStore.deleteItemAsync(STORAGE_KEYS.AI_ACCESS_CODE);
}
