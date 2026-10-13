import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';
export declare class AppException extends HttpException {
    constructor(code: ErrorCode, message: string, status?: HttpStatus);
}
