import { api } from './client';

export interface VerifyLocationPayload {
  officeId: string;
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
}

export interface VerifyLocationResponse {
  isInside: boolean;
  officeId: string;
  officeCode: string;
  officeName: string;
  distanceToBoundaryMeters: number;
  withinElevation: boolean;
}

export interface Office {
  id: string;
  code: string;
  name: string;
  city?: string;
  country?: string;
  isActive: boolean;
  minAltitude?: number | null;
  maxAltitude?: number | null;
  boundary?: any;
}

export const geofenceApi = {
  async listOffices(): Promise<Office[]> {
    const res = await api.get('/offices');
    return res.data?.data || [];
  },

  async verifyLocation(payload: VerifyLocationPayload): Promise<VerifyLocationResponse> {
    const res = await api.post('/geofence/verify', payload);
    return res.data?.data;
  },
};

