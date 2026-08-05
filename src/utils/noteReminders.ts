import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getDatabase } from '../database';

const CHANNEL_ID = 'unfinished-shift-notes';
const MAX_REMINDERS = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function initializeNoteReminders(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Unsubmitted shift notes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelNoteReminders(noteId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(item => item.content.data?.noteId === noteId)
      .map(item => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

export async function scheduleNoteReminders(noteId: string, shiftEnd: string): Promise<void> {
  await cancelNoteReminders(noteId);
  if (!(await initializeNoteReminders())) return;

  const finish = new Date(shiftEnd).getTime();
  const reminderOffsets = [60, 90];
  for (let minutes = 105; reminderOffsets.length < MAX_REMINDERS; minutes += 15) {
    reminderOffsets.push(minutes);
  }

  const now = Date.now();
  await Promise.all(reminderOffsets
    .map(minutes => new Date(finish + minutes * 60 * 1000))
    .filter(date => date.getTime() > now)
    .map(date => Notifications.scheduleNotificationAsync({
      content: {
        title: 'Shift note awaiting submission',
        body: 'Open Click Note Taker to complete and submit your shift note.',
        sound: 'default',
        data: { noteId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
        channelId: CHANNEL_ID,
      },
    })));
}

export async function reconcileNoteReminders(): Promise<void> {
  const db = await getDatabase();
  const notes = await db.getAllAsync<{ id: string; scheduledShiftEnd: string }>(
    `SELECT id, scheduledShiftEnd FROM notes
     WHERE status != 'submitted' AND scheduledShiftEnd IS NOT NULL`
  );
  for (const note of notes) {
    await scheduleNoteReminders(note.id, note.scheduledShiftEnd);
  }
}
