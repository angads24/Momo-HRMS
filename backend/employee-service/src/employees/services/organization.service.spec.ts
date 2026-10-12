import { OrganizationService } from './organization.service';
import { AppException } from '../../common/exceptions/app.exception';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let fakePrisma: any;

  beforeEach(() => {
    fakePrisma = {
      department: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'dept-1',
            code: 'ENG',
            name: 'Engineering',
            description: 'Tech dept',
            designations: [{ id: 'des-1', code: 'SWE', title: 'Software Engineer' }],
            _count: { employees: 5 },
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-02'),
          },
        ]),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'dept-new', ...data })),
      },
      designation: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'des-new', ...data })),
      },
    };

    service = new OrganizationService(fakePrisma);
  });

  describe('listDepartments', () => {
    it('returns formatted departments with employeeCount', async () => {
      const res = await service.listDepartments();
      expect(res).toHaveLength(1);
      expect(res[0].code).toBe('ENG');
      expect(res[0].employeeCount).toBe(5);
      expect(res[0].status).toBe('ACTIVE');
    });
  });

  describe('createDepartment', () => {
    it('throws AppException if department code already exists', async () => {
      fakePrisma.department.findUnique.mockResolvedValue({ id: 'dept-1', code: 'ENG' });
      await expect(
        service.createDepartment({ code: 'ENG', name: 'Engineering', description: 'desc' }),
      ).rejects.toThrow(AppException);
    });

    it('creates and returns department if code is unique', async () => {
      fakePrisma.department.findUnique.mockResolvedValue(null);
      const res = await service.createDepartment({ code: 'MKT', name: 'Marketing', description: 'desc' });
      expect(res.code).toBe('MKT');
      expect(fakePrisma.department.create).toHaveBeenCalledWith({
        data: { code: 'MKT', name: 'Marketing', description: 'desc' },
      });
    });
  });

  describe('listRoles', () => {
    it('returns predefined system roles', async () => {
      const roles = await service.listRoles();
      expect(roles).toHaveLength(4);
      expect(roles.map((r) => r.name)).toContain('SUPER_ADMIN');
      expect(roles.map((r) => r.name)).toContain('EMPLOYEE');
    });
  });
});
