import * as SecureStore from 'expo-secure-store';
import { File } from 'expo-file-system';
import { STORAGE_KEYS } from '../constants';
import { clearDatabaseRecords } from '../database';

export async function resetAppData(): Promise<void> {
  const recordingUris = await clearDatabaseRecords();

  await Promise.all(recordingUris.map(async (uri) => {
    try {
      const recording = new File(uri);
      if (recording.exists) {
        recording.delete();
      }
    } catch (error) {
      console.warn('Could not delete recording file:', error);
    }
  }));

  await Promise.all(
    Object.values(STORAGE_KEYS).map(key => SecureStore.deleteItemAsync(key))
  );
}
