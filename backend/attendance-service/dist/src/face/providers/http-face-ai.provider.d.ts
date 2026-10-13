import { ConfigService } from '@nestjs/config';
import { FaceAiProvider, FaceVerificationResult } from '../interfaces/face-ai-provider.interface';
import { MockFaceAiProvider } from './mock-face-ai.provider';
export declare class HttpFaceAiProvider implements FaceAiProvider {
    private readonly configService;
    private readonly mockProvider;
    private readonly logger;
    private readonly faceServiceUrl;
    constructor(configService: ConfigService, mockProvider: MockFaceAiProvider);
    validateVerificationToken(employeeId: string, token: string): Promise<FaceVerificationResult>;
}
