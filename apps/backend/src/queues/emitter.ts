import { getAttendanceEventsQueue, getNotificationsQueue } from './index';

interface CheckInEventData {
  logId: string;
  studentId: string;
  locationId: string;
  latitude: number;
  longitude: number;
  distanceM: number;
  accuracyMeters: number;
  deviceId?: string | null;
  timestamp: string;
}

interface CheckOutEventData {
  logId: string;
  studentId: string;
  locationId: string;
  latitude: number;
  longitude: number;
  distanceM: number;
  accuracyMeters: number;
  durationHours: number;
  status: string;
  punctuality: string | null;
  timestamp: string;
}

/**
 * Emit a check-in event to the attendance-events queue.
 * No-op if Redis is not configured. Never throws.
 */
export const emitCheckIn = async (data: CheckInEventData): Promise<void> => {
  try {
    const queue = getAttendanceEventsQueue();
    if (!queue) return;
    await queue.add('checkin', data, {
      jobId: `checkin-${data.logId}`,
    });
  } catch (err) {
    console.error('[Queue] Failed to emit checkin event:', err);
  }
};

/**
 * Emit a check-out event to the attendance-events queue.
 * No-op if Redis is not configured. Never throws.
 */
export const emitCheckOut = async (data: CheckOutEventData): Promise<void> => {
  try {
    const queue = getAttendanceEventsQueue();
    if (!queue) return;
    await queue.add('checkout', data, {
      jobId: `checkout-${data.logId}`,
    });
  } catch (err) {
    console.error('[Queue] Failed to emit checkout event:', err);
  }
};

/**
 * Emit a notification event. No-op if Redis is not configured. Never throws.
 */
export const emitNotification = async (data: {
  userId: string;
  title: string;
  body: string;
  type: string;
}): Promise<void> => {
  try {
    const queue = getNotificationsQueue();
    if (!queue) return;
    await queue.add('send-notification', data);
  } catch (err) {
    console.error('[Queue] Failed to emit notification:', err);
  }
};
