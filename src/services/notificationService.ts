// Placeholder notification service — not wired yet
// Wire up when sweep scheduling / digest reminders are implemented

export interface NotificationSchedule {
  id:      string;
  title:   string;
  body:    string;
  hour:    number;
  minute:  number;
}

export async function requestPermission(): Promise<boolean> {
  // TODO: use expo-notifications or @notifee/react-native
  console.warn('[NotificationService] requestPermission not yet implemented');
  return false;
}

export async function scheduleNotification(_schedule: NotificationSchedule): Promise<void> {
  console.warn('[NotificationService] scheduleNotification not yet implemented');
}

export async function cancelNotification(_id: string): Promise<void> {
  console.warn('[NotificationService] cancelNotification not yet implemented');
}

export async function cancelAll(): Promise<void> {
  console.warn('[NotificationService] cancelAll not yet implemented');
}
