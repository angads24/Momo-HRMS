import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
export interface ApiResponseEnvelope<T> {
    success: true;
    data: T;
    message?: string;
}
export declare class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiResponseEnvelope<T> | T> {
    private readonly reflector;
    constructor(reflector: Reflector);
    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponseEnvelope<T> | T>;
}
