import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const list = await this.prisma.permission.findMany({ orderBy: { name: 'asc' } });
    return list.map((p) => ({
      id: p.name,
      name: p.name,
      description: p.description,
    }));
  }
}
