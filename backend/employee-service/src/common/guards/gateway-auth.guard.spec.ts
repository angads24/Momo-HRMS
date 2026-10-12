import * as crypto from 'crypto';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { GatewayAuthGuard } from './gateway-auth.guard';

function buildContext(headers: Record<string, string>, url = '/api/v1/employees'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers,
        url,
        originalUrl: url,
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('GatewayAuthGuard', () => {
  const secret = 'test-gateway-shared-secret';
  let reflector: Reflector;
  let configService: ConfigService;
  let guard: GatewayAuthGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as Reflector;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'devAuth') return false;
        if (key === 'gatewayAuth') {
          return {
            sharedSecretHeader: 'x-gateway-secret',
            sharedSecret: secret,
          };
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    guard = new GatewayAuthGuard(configService as any, reflector);
  });

  it('allows access if endpoint is marked @Public()', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    expect(guard.canActivate(buildContext({}))).toBe(true);
  });

  it('throws UnauthorizedException if x-gateway-secret is missing', () => {
    expect(() => guard.canActivate(buildContext({}))).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException if x-gateway-secret is incorrect', () => {
    expect(() =>
      guard.canActivate(buildContext({ 'x-gateway-secret': 'wrong-secret' })),
    ).toThrow(UnauthorizedException);
  });

  it('allows access if valid secret is provided without signature', () => {
    expect(
      guard.canActivate(buildContext({ 'x-gateway-secret': secret })),
    ).toBe(true);
  });

  it('throws UnauthorizedException if signature timestamp is expired (> 5 min)', () => {
    const expiredTimestamp = (Date.now() - 400000).toString();
    const sig = crypto
      .createHmac('sha256', secret)
      .update(`/api/v1/employees:${expiredTimestamp}:${secret}`)
      .digest('hex');

    expect(() =>
      guard.canActivate(
        buildContext({
          'x-gateway-secret': secret,
          'x-gateway-timestamp': expiredTimestamp,
          'x-gateway-signature': sig,
        }),
      ),
    ).toThrow('Gateway request signature expired');
  });

  it('throws UnauthorizedException if HMAC signature is tampered', () => {
    const now = Date.now().toString();
    expect(() =>
      guard.canActivate(
        buildContext({
          'x-gateway-secret': secret,
          'x-gateway-timestamp': now,
          'x-gateway-signature': 'invalid-signature-hash',
        }),
      ),
    ).toThrow('Invalid HMAC gateway signature');
  });

  it('allows access when HMAC signature and timestamp are fully valid', () => {
    const url = '/api/v1/employees';
    const now = Date.now().toString();
    const validSig = crypto
      .createHmac('sha256', secret)
      .update(`${url}:${now}:${secret}`)
      .digest('hex');

    expect(
      guard.canActivate(
        buildContext(
          {
            'x-gateway-secret': secret,
            'x-gateway-timestamp': now,
            'x-gateway-signature': validSig,
          },
          url,
        ),
      ),
    ).toBe(true);
  });
});
