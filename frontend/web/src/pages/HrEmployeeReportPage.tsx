import { useEffect, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import { DashboardLayout } from '../components/DashboardLayout';
import { EmployeeAttendanceReportView } from '../features/hr/components/EmployeeAttendanceReportView';
import { useAuth } from '../context/AuthContext';
import { fetchOffices } from '../features/geofence/services/geofenceService';
import {
  isEmployeeInAnyOffice,
  resolveHrAssignedOffices,
} from '../utils/officeJurisdiction';
import { fetchEmployees } from '../services/employeeService';
import type { Employee } from '../types/employee';
import { PATHS } from '../routes/paths';

export default function HrEmployeeReportPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchEmployees(), fetchOffices()])
      .then(async ([empRes, officesData]) => {
        if (!mounted) return;
        const rawEmps = Array.isArray(empRes.data) ? empRes.data : [];
        if (user?.appRole === 'HR') {
          const hrScope = await resolveHrAssignedOffices(user, officesData as any);
          if (hrScope.isScoped && hrScope.assignedOffices.length > 0) {
            const scoped = rawEmps.filter((emp) =>
              isEmployeeInAnyOffice(emp, hrScope.assignedOffices)
            );
            setEmployees(scoped);
            return;
          }
        }
        setEmployees(rawEmps);
      })
      .catch((e) => console.warn('Could not load employees list for switcher:', e));

    return () => {
      mounted = false;
    };
  }, [user]);

  if (!id) {
    navigate(PATHS.hr);
    return null;
  }

  return (
    <DashboardLayout
      title="Employee Attendance & Work Reports"
      subtitle="HR Analytics • Detailed session timestamps, daily timeline visual & approved hours"
      hideUserCard
      maxWidth="xl"
    >
      <Box sx={{ py: 1 }}>
        <EmployeeAttendanceReportView
          employeeId={id}
          allEmployees={employees}
          onSelectEmployee={(newId) => navigate(PATHS.hrEmployeeReport(newId))}
          onBack={() => navigate(PATHS.hr)}
        />
      </Box>
    </DashboardLayout>
  );
}
