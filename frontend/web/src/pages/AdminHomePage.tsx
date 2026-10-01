import { useState } from 'react';
import Box from '@mui/material/Box';
import { DashboardLayout } from '../components/DashboardLayout';
import { AdminOverviewTab } from '../components/tabs/AdminOverviewTab';
import { EmployeeManagementTab } from '../components/tabs/EmployeeManagementTab';
import { GeofenceOfficesTab } from '../components/tabs/GeofenceOfficesTab';
import { LiveAttendanceTab } from '../components/tabs/LiveAttendanceTab';
import { ExceptionApprovalsTab } from '../components/tabs/ExceptionApprovalsTab';
import { AnalyticsTab } from '../components/tabs/AnalyticsTab';
import { AuditLogsTab } from '../components/tabs/AuditLogsTab';

export default function AdminHomePage() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <Box sx={{ mt: 0.5 }}>
        {activeTab === 0 && <AdminOverviewTab onNavigateTab={setActiveTab} />}
        {activeTab === 1 && <EmployeeManagementTab />}
        {activeTab === 2 && <GeofenceOfficesTab />}
        {activeTab === 3 && <LiveAttendanceTab />}
        {activeTab === 4 && <ExceptionApprovalsTab />}
        {activeTab === 5 && <AnalyticsTab />}
        {activeTab === 6 && <AuditLogsTab />}
      </Box>
    </DashboardLayout>
  );
}
