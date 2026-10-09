import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { LoadingIndicator } from '../components/LoadingIndicator';
import { useAuth } from '../context/AuthContext';
import { GuestRoute } from './GuestRoute';
import { PATHS, homePathForUser } from './paths';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleBasedRoute } from './RoleBasedRoute';

const AdminHomePage = lazy(() => import('../pages/AdminHomePage'));
const HrHomePage = lazy(() => import('../pages/HrHomePage'));
const HrEmployeeReportPage = lazy(() => import('../pages/HrEmployeeReportPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'));
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage'));
const EmployeeListPage = lazy(() => import('../features/employees/pages/EmployeeListPage'));
const EmployeeDetailsPage = lazy(() => import('../features/employees/pages/EmployeeDetailsPage'));
const AddEmployeePage = lazy(() => import('../features/employees/pages/AddEmployeePage'));
const EditEmployeePage = lazy(() => import('../features/employees/pages/EditEmployeePage'));
const EmployeeImportPage = lazy(() => import('../features/employees/pages/EmployeeImportPage'));
const AttendanceDashboardPage = lazy(() => import('../features/attendance/pages/AttendanceDashboardPage'));
const AttendanceHistoryPage = lazy(() => import('../features/attendance/pages/AttendanceHistoryPage'));
const AttendanceDetailsPage = lazy(() => import('../features/attendance/pages/AttendanceDetailsPage'));
const AttendanceReportsPage = lazy(() => import('../features/attendance/pages/AttendanceReportsPage'));
const GeofenceListPage = lazy(() => import('../features/geofence/pages/GeofenceListPage'));
const AddOfficePage = lazy(() => import('../features/geofence/pages/AddOfficePage'));
const EditOfficePolygonPage = lazy(() => import('../features/geofence/pages/EditOfficePolygonPage'));
const NotificationListPage = lazy(() => import('../features/notifications/pages/NotificationListPage'));
const NotificationHistoryPage = lazy(() => import('../features/notifications/pages/NotificationHistoryPage'));

/** "/" and any unknown URL: send the user wherever they belong. */
function HomeRedirect() {
  const { status, user } = useAuth();
  if (status === 'loading') return <LoadingIndicator fullScreen />;
  return <Navigate to={homePathForUser(user)} replace />;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingIndicator fullScreen />}>
      <Routes>
      <Route element={<GuestRoute />}>
        <Route path={PATHS.login} element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute allowPasswordReset />}>
        <Route path={PATHS.resetPassword} element={<ResetPasswordPage />} />
        <Route path={PATHS.unauthorized} element={<UnauthorizedPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        {/* Dashboard and employee shortcut redirects */}
        <Route path={PATHS.dashboard} element={<HomeRedirect />} />
        <Route path={PATHS.employee} element={<Navigate to={PATHS.attendance} replace />} />

        {/* Personal attendance self-punch routes accessible to Employee only */}
        <Route element={<RoleBasedRoute allowedRoles={['EMPLOYEE']} />}>
          <Route path={PATHS.attendance} element={<AttendanceDashboardPage />} />
          <Route path={PATHS.attendanceHistory} element={<AttendanceHistoryPage />} />
          <Route path={PATHS.attendanceDetailsPattern} element={<AttendanceDetailsPage />} />
        </Route>

        {/* Notifications accessible to all authenticated roles (Admin, HR, Employee) */}
        <Route element={<RoleBasedRoute allowedRoles={['ADMIN', 'HR', 'EMPLOYEE']} />}>
          <Route path={PATHS.notifications} element={<NotificationListPage />} />
          <Route path={PATHS.notificationHistory} element={<NotificationHistoryPage />} />
        </Route>

        {/* Management routes accessible to Admin and HR */}
        <Route element={<RoleBasedRoute allowedRoles={['ADMIN', 'HR']} />}>
          <Route path={PATHS.employees} element={<EmployeeListPage />} />
          <Route path={PATHS.employeeDetailsPattern} element={<EmployeeDetailsPage />} />
          <Route path={PATHS.attendanceReports} element={<AttendanceReportsPage />} />
        </Route>

        {/* HR & Management Dashboard routes */}
        <Route element={<RoleBasedRoute allowedRoles={['HR', 'ADMIN']} />}>
          <Route path={PATHS.hr} element={<HrHomePage />} />
          <Route path={PATHS.hrEmployeeReportPattern} element={<HrEmployeeReportPage />} />
        </Route>


        {/* ADMIN-only routes (Geofences & Office setup, Employee creation, bulk import, profile edit) */}
        <Route element={<RoleBasedRoute allowedRoles={['ADMIN']} />}>
          <Route path={PATHS.admin} element={<AdminHomePage />} />
          <Route path={PATHS.addEmployee} element={<AddEmployeePage />} />
          <Route path={PATHS.importEmployees} element={<EmployeeImportPage />} />
          <Route path={PATHS.editEmployeePattern} element={<EditEmployeePage />} />
          <Route path={PATHS.geofences} element={<GeofenceListPage />} />
          <Route path={PATHS.addGeofence} element={<AddOfficePage />} />
          <Route path={PATHS.editGeofencePattern} element={<EditOfficePolygonPage />} />
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  </Suspense>
  );
}

