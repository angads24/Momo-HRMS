"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const error_codes_1 = require("../constants/error-codes");
let HttpExceptionFilter = class HttpExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger('ExceptionFilter');
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        let status = common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        let code = error_codes_1.ErrorCodes.INTERNAL_ERROR;
        let message = 'Internal server error';
        let details;
        if (exception instanceof common_1.HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === 'string') {
                message = body;
                code = this.codeForStatus(status);
            }
            else if (typeof body === 'object' && body !== null) {
                const typedBody = body;
                if (typedBody.code) {
                    code = typedBody.code;
                    message = Array.isArray(typedBody.message)
                        ? typedBody.message.join('; ')
                        : (typedBody.message ?? exception.message);
                }
                else {
                    code = this.codeForStatus(status);
                    if (Array.isArray(typedBody.message)) {
                        message = 'Request validation failed';
                        details = typedBody.message;
                    }
                    else {
                        message = typedBody.message ?? exception.message;
                    }
                }
            }
        }
        else if (exception instanceof Error) {
            this.logger.error(exception.message, exception.stack);
        }
        const errorResponse = {
            success: false,
            error: { code, message, ...(details ? { details } : {}) },
        };
        this.logger.warn(`${request.method} ${request.url} -> ${status} ${code}`);
        response.status(status).json(errorResponse);
    }
    codeForStatus(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return error_codes_1.ErrorCodes.VALIDATION_FAILED;
            case common_1.HttpStatus.UNAUTHORIZED:
                return error_codes_1.ErrorCodes.UNAUTHENTICATED;
            case common_1.HttpStatus.FORBIDDEN:
                return error_codes_1.ErrorCodes.FORBIDDEN;
            case common_1.HttpStatus.NOT_FOUND:
                return error_codes_1.ErrorCodes.SESSION_NOT_FOUND;
            case common_1.HttpStatus.CONFLICT:
                return error_codes_1.ErrorCodes.CONFLICT;
            default:
                return error_codes_1.ErrorCodes.INTERNAL_ERROR;
        }
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map