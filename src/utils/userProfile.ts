import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../constants';
import { UserProfile } from '../types';

export const EMPTY_USER_PROFILE: UserProfile = {
  workerName: '',
  workerSignature: '',
  roleTitle: '',
  organization: '',
  defaultLocation: '',
  providerNumber: '',
};

export async function getUserProfile(): Promise<UserProfile> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEYS.USER_PROFILE);
    if (!stored) return EMPTY_USER_PROFILE;

    return {
      ...EMPTY_USER_PROFILE,
      ...JSON.parse(stored),
    };
  } catch (error) {
    console.error('Error loading user profile:', error);
    return EMPTY_USER_PROFILE;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await SecureStore.setItemAsync(
    STORAGE_KEYS.USER_PROFILE,
    JSON.stringify({
      workerName: profile.workerName.trim(),
      workerSignature: profile.workerSignature?.trim() || '',
      roleTitle: profile.roleTitle?.trim() || '',
      organization: profile.organization?.trim() || '',
      defaultLocation: profile.defaultLocation?.trim() || '',
      providerNumber: profile.providerNumber?.trim() || '',
    })
  );
}
