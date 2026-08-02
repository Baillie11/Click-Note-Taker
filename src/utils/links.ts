import { Linking } from 'react-native';
import { COMPANY_URL } from '../constants';

export async function openCompanyWebsite(): Promise<void> {
  try {
    await Linking.openURL(COMPANY_URL);
  } catch (error) {
    console.error('Error opening company website:', error);
  }
}
