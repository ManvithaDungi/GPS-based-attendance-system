/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface AttendanceToday {
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'NONE';
  checkInTime: string | null;
  checkOutTime: string | null;
  duration: string;
  isInside: boolean;
}

export const useAttendance = () => {
  const [todayAttendance, setTodayAttendance] = useState<AttendanceToday | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timer, setTimer] = useState<string>('0h 0m');

  const fetchToday = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/attendance/today');
      if (!response.data) {
        setTodayAttendance(null);
        return;
      }

      const normalizedData = {
        status: response.data?.status ?? 'NONE',
        checkInTime: response.data?.checkInTime ?? null,
        checkOutTime: response.data?.checkOutTime ?? null,
        duration: response.data?.durationHours ? `${Math.floor(response.data.durationHours)}h ${Math.round((response.data.durationHours % 1) * 60)}m` : '0h 0m',
        isInside: response.data?.isInside ?? false,
      };
      setTodayAttendance(normalizedData);
      console.log('✅ Today Attendance:', JSON.stringify(normalizedData, null, 2));
    } catch (e: any) {
      if (e.response?.status === 404) {
        console.log('ℹ️ No attendance found for today');
        setTodayAttendance(null);
      } else {
        console.error('❌ Failed to fetch today attendance:', {
          message: e.message,
          status: e.response?.status,
          data: e.response?.data,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (todayAttendance?.checkInTime && !todayAttendance.checkOutTime) {
      interval = setInterval(() => {
        const checkIn = new Date(todayAttendance.checkInTime!).getTime();
        const now = new Date().getTime();
        const diff = now - checkIn;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimer(`${hours}h ${minutes}m`);
      }, 60000); // Update every minute
    }
    return () => clearInterval(interval);
  }, [todayAttendance]);

  const checkIn = async (location: { lat: number, lng: number }) => {
    try {
      const response = await api.post('/attendance/checkin', location);
      setTodayAttendance(response.data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.code || 'ERROR' };
    }
  };

  const checkOut = async (location: { lat: number, lng: number }) => {
    try {
      const response = await api.post('/attendance/checkout', location);
      setTodayAttendance(response.data);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.code || 'ERROR' };
    }
  };

  return { todayAttendance, isLoading, timer, checkIn, checkOut, refresh: fetchToday };
};
