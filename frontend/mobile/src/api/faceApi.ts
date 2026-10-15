import { api } from './client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FaceStatus {
  employee_id: string;
  is_enrolled: boolean;
  enrolled_at?: string;
  last_verified_at?: string;
}

export interface Challenge {
  challenge_id: string;
  action: string;
  instructions: string;
  expires_at: string;
}

export interface VerifyResult {
  verified: boolean;
  confidence: number;
  is_live: boolean;
  verification_token?: string;
  message: string;
}

// Helper to unwrap { success: true, data: T } envelope if present
function unwrap<T>(resData: any): T {
  if (resData && typeof resData === 'object' && 'data' in resData && resData.data !== undefined) {
    return resData.data as T;
  }
  return resData as T;
}

// ─── Face AI API ──────────────────────────────────────────────────────────────

export async function getFaceStatus(employeeId: string): Promise<FaceStatus> {
  const { data } = await api.get<FaceStatus>(`/face/status/${employeeId}`);
  return unwrap<FaceStatus>(data);
}

export async function getChallenge(employeeId: string): Promise<Challenge> {
  const { data } = await api.get<Challenge>('/face/challenge', {
    params: { employee_id: employeeId },
  });
  return unwrap<Challenge>(data);
}

export async function enrollFace(payload: {
  employee_id: string;
  image_base64: string;
}): Promise<{ success: boolean; message: string }> {
  const { data } = await api.post('/face/enroll', payload);
  return unwrap<{ success: boolean; message: string }>(data);
}

export async function verifyFace(payload: {
  employee_id: string;
  challenge_id: string;
  frames: string[];
}): Promise<VerifyResult> {
  const { data } = await api.post<VerifyResult>('/face/verify', payload);
  return unwrap<VerifyResult>(data);
}

export interface DetectNeutralResult {
  detected: boolean;
  message: string;
}

export interface DetectActionResult {
  detected: boolean;
  action: string;
  confidence: number;
  message: string;
}

export async function detectNeutralPose(current_frame: string): Promise<DetectNeutralResult> {
  const { data } = await api.post<DetectNeutralResult>('/face/detect-neutral', { current_frame });
  return unwrap<DetectNeutralResult>(data);
}

export async function detectLiveAction(payload: {
  action: string;
  neutral_frame: string;
  current_frame: string;
}): Promise<DetectActionResult> {
  const { data } = await api.post<DetectActionResult>('/face/detect-action', payload);
  return unwrap<DetectActionResult>(data);
}

