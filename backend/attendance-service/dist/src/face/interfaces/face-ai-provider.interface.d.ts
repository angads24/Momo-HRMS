export declare const FACE_AI_PROVIDER = "FACE_AI_PROVIDER";
export interface FaceVerificationResult {
    valid: boolean;
    confidence: number;
    message: string;
}
export interface FaceAiProvider {
    validateVerificationToken(employeeId: string, token: string): Promise<FaceVerificationResult>;
}
