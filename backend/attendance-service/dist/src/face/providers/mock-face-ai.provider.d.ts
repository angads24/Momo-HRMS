import { FaceAiProvider, FaceVerificationResult } from '../interfaces/face-ai-provider.interface';
export declare class MockFaceAiProvider implements FaceAiProvider {
    private readonly logger;
    validateVerificationToken(employeeId: string, token: string): Promise<FaceVerificationResult>;
}
