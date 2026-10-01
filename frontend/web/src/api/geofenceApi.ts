import { api } from './client';

export interface PolygonVertex {
  id?: string;
  sequenceOrder?: number;
  sequence?: number;
  latitude: number | string;
  longitude: number | string;
}

export interface GeofencePolygon {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  vertices: PolygonVertex[];
}

export interface Office {
  id: string;
  code: string;
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  minAltitudeMeters?: number | null;
  maxAltitudeMeters?: number | null;
  isActive: boolean;
  activePolygon?: GeofencePolygon | null;
  polygons?: GeofencePolygon[];
}

export interface CreateOfficePayload {
  code: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  minAltitudeMeters?: number;
  maxAltitudeMeters?: number;
  polygon: {
    name: string;
    vertices: { sequence: number; latitude: number; longitude: number }[];
  };
}

export interface UpdatePolygonPayload {
  name: string;
  vertices: { sequence: number; latitude: number; longitude: number }[];
}

export interface VerifyLocationPayload {
  officeId: string;
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
}

export interface VerifyLocationResponse {
  isInside: boolean;
  officeId: string;
  officeCode?: string;
  officeName: string;
  distanceToBoundaryMeters: number;
  withinElevation?: boolean;
}

export const geofenceApi = {
  async listOffices(): Promise<Office[]> {
    const res = await api.get<{ success: boolean; data: Office[] }>('/offices');
    return res.data.data;
  },

  async getOffice(id: string): Promise<Office> {
    const res = await api.get<{ success: boolean; data: Office }>(`/offices/${id}`);
    return res.data.data;
  },

  async createOffice(payload: CreateOfficePayload): Promise<Office> {
    const { polygon, ...officePayload } = payload;
    const res = await api.post<{ success: boolean; data: Office }>('/offices', officePayload);
    const office = res.data.data;
    if (polygon?.vertices && polygon.vertices.length >= 3) {
      await api.put(`/offices/${office.id}/polygon`, polygon);
    }
    return office;
  },

  async updateOfficePolygon(officeId: string, payload: UpdatePolygonPayload): Promise<GeofencePolygon> {
    const res = await api.put<{ success: boolean; data: GeofencePolygon }>(`/offices/${officeId}/polygon`, payload);
    return res.data.data;
  },

  async verifyLocation(payload: VerifyLocationPayload): Promise<VerifyLocationResponse> {
    const res = await api.post<{ success: boolean; data: VerifyLocationResponse }>('/geofence/verify', payload);
    return res.data.data;
  },

  async deleteOfficePolygon(officeId: string, hard: boolean = true): Promise<void> {
    await api.delete(`/offices/${officeId}/polygon`, { params: { hard } });
  },

  async deleteOffice(officeId: string, hard: boolean = true): Promise<void> {
    await api.delete(`/offices/${officeId}`, { params: { hard } });
  },
};

