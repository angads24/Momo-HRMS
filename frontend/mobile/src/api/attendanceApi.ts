import { api } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Location {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  accuracyMeters?: number;
  timestamp?: string;
  isMocked?: boolean;
}

export interface AttendanceSession {
  id: string;
  employeeId: string;
  officeId: string;
  attendanceDate: string;
  status: 'WORKING' | 'PAUSED' | 'CHECKED_OUT';
  checkInAt: string;
  checkOutAt?: string;
  checkInStatus: string;
  totalWorkingSeconds: number;
  currentPauseStartedAt?: string;
  currentGraceDeadline?: string;
}

export interface TodayAttendance {
  attendanceDate: string;
  sessions: AttendanceSession[];
  totalWorkingSecondsToday: number;
  hasActiveSession: boolean;
}

export interface HistoryItem {
  id: string;
  attendanceDate: string;
  status: string;
  checkInAt: string;
  checkOutAt?: string;
  totalWorkingSeconds: number;
  officeId: string;
}

export interface HistoryResponse {
  items: HistoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Helper to unwrap { success: true, data: T } envelope from attendance-service
function unwrap<T>(resData: any): T {
  if (resData && typeof resData === 'object' && 'data' in resData && resData.data !== undefined) {
    return resData.data as T;
  }
  return resData as T;
}

function cleanLocation(rawLoc?: Location): Record<string, any> | undefined {
  if (!rawLoc) return undefined;
  const loc: Record<string, any> = {
    latitude: rawLoc.latitude,
    longitude: rawLoc.longitude,
    timestamp: rawLoc.timestamp || new Date().toISOString(),
  };
  if (rawLoc.altitudeMeters != null && !isNaN(rawLoc.altitudeMeters)) {
    loc.altitudeMeters = rawLoc.altitudeMeters;
  }
  if (rawLoc.accuracyMeters != null && !isNaN(rawLoc.accuracyMeters)) {
    loc.accuracyMeters = rawLoc.accuracyMeters;
  }
  return loc;
}

// ─── Attendance API ───────────────────────────────────────────────────────────

export async function checkIn(payload: {
  officeId: string;
  location: Location;
  faceVerificationToken: string;
  clientEventId: string;
  employeeId?: string;
}): Promise<AttendanceSession> {
  const { employeeId, ...bodyPayload } = payload;
  const headers: Record<string, string> = {};
  if (employeeId) {
    headers['x-employee-id'] = employeeId;
  }
  const locationToSend = cleanLocation(bodyPayload.location)!;

  const { data } = await api.post(
    '/attendance/check-in',
    {
      officeId: bodyPayload.officeId,
      faceVerificationToken: bodyPayload.faceVerificationToken,
      clientEventId: bodyPayload.clientEventId,
      location: locationToSend,
      ...(employeeId ? { employeeId } : {}),
    },
    { headers }
  );
  return unwrap<AttendanceSession>(data);
}

export async function checkOut(payload: {
  officeId?: string;
  location?: Location;
  clientEventId: string;
  employeeId?: string;
}): Promise<AttendanceSession> {
  const { employeeId, ...bodyPayload } = payload;
  const headers: Record<string, string> = {};
  if (employeeId) {
    headers['x-employee-id'] = employeeId;
  }
  const { data } = await api.post(
    '/attendance/check-out',
    {
      ...bodyPayload,
      ...(bodyPayload.location ? { location: cleanLocation(bodyPayload.location) } : {}),
      ...(employeeId ? { employeeId } : {}),
    },
    { headers }
  );
  return unwrap<AttendanceSession>(data);
}

export async function geofenceExit(payload: {
  officeId: string;
  location: Location;
  clientEventId: string;
  employeeId?: string;
}): Promise<AttendanceSession> {
  const { employeeId, ...bodyPayload } = payload;
  const headers: Record<string, string> = {};
  if (employeeId) {
    headers['x-employee-id'] = employeeId;
  }
  const { data } = await api.post(
    '/attendance/geofence-exit',
    {
      officeId: bodyPayload.officeId,
      clientEventId: bodyPayload.clientEventId,
      location: cleanLocation(bodyPayload.location),
      ...(employeeId ? { employeeId } : {}),
    },
    { headers }
  );
  return unwrap<AttendanceSession>(data);
}

export async function geofenceReturn(payload: {
  officeId: string;
  location: Location;
  clientEventId: string;
  employeeId?: string;
}): Promise<AttendanceSession> {
  const { employeeId, ...bodyPayload } = payload;
  const headers: Record<string, string> = {};
  if (employeeId) {
    headers['x-employee-id'] = employeeId;
  }
  const { data } = await api.post(
    '/attendance/geofence-return',
    {
      officeId: bodyPayload.officeId,
      clientEventId: bodyPayload.clientEventId,
      location: cleanLocation(bodyPayload.location),
      ...(employeeId ? { employeeId } : {}),
    },
    { headers }
  );
  return unwrap<AttendanceSession>(data);
}


export async function getTodayAttendance(): Promise<TodayAttendance> {
  const { data } = await api.get('/attendance/today');
  return unwrap<TodayAttendance>(data);
}

export async function getAttendanceHistory(params?: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}): Promise<HistoryResponse> {
  const { data } = await api.get('/attendance/history', { params });
  return unwrap<HistoryResponse>(data);
}
