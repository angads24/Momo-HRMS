import { api } from './client';

export type AttendanceStatus = 'WORKING' | 'PAUSED' | 'CHECKED_OUT';
export type CheckInStatus = 'ON_TIME' | 'LATE' | 'EXCEPTION';

export interface AttendancePause {
  id: string;
  pauseStartAt: string;
  pauseEndAt?: string | null;
  pauseDurationSeconds?: number | null;
  endReason?: string | null;
}

export interface AttendanceSession {
  id: string;
  employeeId: string;
  officeId: string;
  sessionDate: string;
  status: AttendanceStatus;
  checkInStatus: CheckInStatus;
  checkInAt: string;
  checkOutAt?: string | null;
  checkOutStatus?: string | null;
  totalWorkingSeconds: number;
  totalPauseSeconds: number;
  currentPauseId?: string | null;
  currentPauseStartedAt?: string | null;
  currentGraceDeadline?: string | null;
  graceDeadlineAt?: string | null;
  pauses?: AttendancePause[];
}

export interface AttendanceException {
  id: string;
  employeeId: string;
  officeId?: string;
  type?: string;
  exceptionType?: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED' | 'EXPIRED' | string;
  requestedAt?: string;
  createdAt?: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
}

export const attendanceApi = {
  async getTodaySession(): Promise<AttendanceSession | null> {
    try {
      const res = await api.get<{ success: boolean; data: AttendanceSession }>('/attendance/today');
      return res.data.data;
    } catch {
      return null;
    }
  },

  async getHistory(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    employeeId?: string;
    all?: boolean;
  }): Promise<{ items: AttendanceSession[]; total: number; page: number; limit: number }> {
    // FIX: Added try/catch to match the consistent error handling pattern of
    // getTodaySession and listExceptions. Previously unhandled rejections propagated
    // to every caller individually.
    try {
      const res = await api.get<{
        success: boolean;
        data: { items: AttendanceSession[]; total: number; page: number; limit: number };
      }>('/attendance/history', { params });
      return res.data.data;
    } catch {
      return { items: [], total: 0, page: params?.page ?? 1, limit: params?.limit ?? 20 };
    }
  },

  async listExceptions(): Promise<AttendanceException[]> {
    try {
      const res = await api.get<{ success: boolean; data: AttendanceException[] }>('/attendance/exceptions');
      return res.data.data ?? [];
    } catch {
      return [];
    }
  },

  async createException(payload: {
    employeeId: string;
    attendanceDate: string;
    type: string;
    reason: string;
    validFrom: string;
    validUntil: string;
    attendanceSessionId?: string;
  }): Promise<AttendanceException> {
    const res = await api.post<{ success: boolean; data: AttendanceException }>(
      '/attendance/exceptions',
      payload,
    );
    return res.data.data;
  },

  async approveException(exceptionId: string, notes?: string): Promise<AttendanceException> {
    const res = await api.post<{ success: boolean; data: AttendanceException }>(
      `/attendance/exceptions/${exceptionId}/approve`,
      { notes },
    );
    return res.data.data;
  },
};
