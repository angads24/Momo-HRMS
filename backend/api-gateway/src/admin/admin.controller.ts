import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('api/v1/admin')
export class AdminController {
  private readonly employeeUrl: string;
  private readonly geofenceUrl: string;
  private readonly gatewaySecret: string;

  constructor(private readonly configService: ConfigService) {
    this.employeeUrl = this.configService.get<string>('services.employee', 'http://localhost:3004');
    this.geofenceUrl = this.configService.get<string>('services.geofence', 'http://localhost:3003');
    this.gatewaySecret = this.configService.get<string>('gatewaySharedSecret', 'dev-gateway-secret');
  }

  @Get('stats')
  async getDashboardStats() {
    let employeeCount = 0;
    let departmentCount = 0;
    let officeCount = 0;

    const headers = {
      'x-gateway-secret': this.gatewaySecret,
      'Content-Type': 'application/json',
    };

    const fetchWithTimeout = async (url: string, timeoutMs = 2500) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);
        return res;
      } catch {
        clearTimeout(timeoutId);
        return null;
      }
    };

    const [empRes, geoRes] = await Promise.all([
      fetchWithTimeout(`${this.employeeUrl}/api/v1/employees/metrics`).then(async (r) => {
        if (r && r.ok) return r;
        return fetchWithTimeout(`${this.employeeUrl}/employees/metrics`);
      }),
      fetchWithTimeout(`${this.geofenceUrl}/api/v1/offices/count`).then(async (r) => {
        if (r && r.ok) return r;
        return fetchWithTimeout(`${this.geofenceUrl}/offices/count`);
      }),
    ]);

    if (empRes && empRes.ok) {
      try {
        const empData = await empRes.json();
        const payload = empData?.data || empData;
        employeeCount = payload.employeeCount || 0;
        departmentCount = payload.departmentCount || 0;
      } catch {
        // Fallback default
      }
    }

    if (geoRes && geoRes.ok) {
      try {
        const geoData = await geoRes.json();
        const payload = geoData?.data || geoData;
        officeCount = payload.count || 0;
      } catch {
        // Fallback default
      }
    }

    return {
      success: true,
      data: {
        employeeCount,
        officeCount,
        departmentCount,
        systemStatus: 'operational',
      },
    };
  }
}
