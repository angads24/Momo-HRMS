import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';

@Controller('health')
export class HealthController {
  private readonly services: Record<string, string>;

  constructor(private readonly configService: ConfigService) {
    this.services = {
      auth: this.configService.get<string>('services.auth', 'http://localhost:3001'),
      attendance: this.configService.get<string>('services.attendance', 'http://localhost:3002'),
      geofence: this.configService.get<string>('services.geofence', 'http://localhost:3003'),
      employee: this.configService.get<string>('services.employee', 'http://localhost:3004'),
      notification: this.configService.get<string>('services.notification', 'http://localhost:3005'),
      face: this.configService.get<string>('services.face', 'http://localhost:3006'),
    };
  }

  @Get()
  async check() {
    const checks: Record<string, any> = {};

    await Promise.all(
      Object.entries(this.services).map(async ([name, url]) => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          let res = await fetch(`${url}/health`, { signal: controller.signal });
          if (!res.ok && res.status === 404) {
            res = await fetch(`${url}/api/v1/health`, { signal: controller.signal });
          }
          clearTimeout(timeoutId);
          checks[name] = res.ok ? 'up' : `status ${res.status}`;
        } catch {
          checks[name] = 'down';
        }
      }),
    );

    const allUp = Object.values(checks).every((s) => s === 'up');

    return {
      status: allUp ? 'healthy' : 'degraded',
      service: 'api-gateway',
      port: this.configService.get<number>('port', 8000),
      timestamp: new Date().toISOString(),
      microservices: checks,
    };
  }

  @Get('db-check')
  async dbCheck() {
    const rawUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || '';
    if (!rawUrl) {
      return {
        ok: false,
        error: 'DATABASE_URL environment variable is NOT set in Render environment!',
      };
    }

    const maskedUrl = rawUrl.replace(/:([^:@]+)@/, ':****@');
    let host = '';
    let port = 3306;
    try {
      const u = new URL(rawUrl.replace(/^mysql:/, 'http:'));
      host = u.hostname;
      port = parseInt(u.port || '3306', 10);
    } catch (e: any) {
      return { ok: false, error: `Invalid URL: ${e.message}`, maskedUrl };
    }

    const isInternal = host.includes('railway.internal');

    const tcpResult = await new Promise<{ connected: boolean; error?: string }>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(4000);
      socket.on('connect', () => {
        socket.destroy();
        resolve({ connected: true });
      });
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ connected: false, error: 'Connection timed out (4s)' });
      });
      socket.on('error', (err: any) => {
        resolve({ connected: false, error: err.message });
      });
      socket.connect(port, host);
    });

    return {
      ok: tcpResult.connected,
      host,
      port,
      isInternalRailwayDomain: isInternal,
      diagnosis: isInternal
        ? 'CRITICAL ERROR: mysql.railway.internal is a private Railway internal domain that CANNOT be resolved from outside Railway (e.g. from Render). You must use the Public TCP Proxy URL from Railway (e.g. *.proxy.rlwy.net:PORT).'
        : tcpResult.connected
        ? 'TCP connection to database host succeeded!'
        : `Cannot connect to database host: ${tcpResult.error}`,
      tcpTest: tcpResult,
      maskedUrl,
    };
  }
}
