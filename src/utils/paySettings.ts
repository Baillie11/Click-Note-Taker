import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';
import { PaySettings } from '../types';

export const DEFAULT_PAY_SETTINGS: PaySettings = {
  hourlyRate: 0,
  employmentType: 'casual',
  rateIncludesCasualLoading: true,
  payPeriodFrequency: 'weekly',
  weekStartsOn: 1,
  claimsTaxFreeThreshold: true,
  minimumPaidHours: 3,
  publicHolidayNoteIds: [],
};

export async function getPaySettings(): Promise<PaySettings> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEYS.PAY_SETTINGS);
    if (!stored) return DEFAULT_PAY_SETTINGS;
    return { ...DEFAULT_PAY_SETTINGS, ...JSON.parse(stored) };
  } catch (error) {
    console.error('Error loading pay settings:', error);
    return DEFAULT_PAY_SETTINGS;
  }
}

export async function savePaySettings(settings: PaySettings): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.PAY_SETTINGS, JSON.stringify(settings));
}
