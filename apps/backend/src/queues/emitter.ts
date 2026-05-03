import { attendanceEventsQueue, notificationsQueue } from './index';

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
 * Fires fraud detection and notification workers asynchronously.
 * Never throws — failures are logged but don't affect the API response.
 */
export const emitCheckIn = async (data: CheckInEventData): Promise<void> => {
  try {
    await attendanceEventsQueue.add('checkin', data, {
      jobId: `checkin-${data.logId}`,
    });
  } catch (err) {
    console.error('[Queue] Failed to emit checkin event:', err);
  }
};

/**
 * Emit a check-out event to the attendance-events queue.
 * Fires fraud detection, stats update, and notification workers asynchronously.
 * Never throws — failures are logged but don't affect the API response.
 */
export const emitCheckOut = async (data: CheckOutEventData): Promise<void> => {
  try {
    await attendanceEventsQueue.add('checkout', data, {
      jobId: `checkout-${data.logId}`,
    });
  } catch (err) {
    console.error('[Queue] Failed to emit checkout event:', err);
  }
};

/**
 * Emit a notification event (late alert, absent alert, etc.).
 * Never throws.
 */
export const emitNotification = async (data: {
  userId: string;
  title: string;
  body: string;
  type: string;
}): Promise<void> => {
  try {
    await notificationsQueue.add('send-notification', data);
  } catch (err) {
    console.error('[Queue] Failed to emit notification:', err);
  }
};
