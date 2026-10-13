import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
export declare class LoginThrottlerGuard extends ThrottlerGuard {
    protected getTracker(req: Request): Promise<string>;
}
