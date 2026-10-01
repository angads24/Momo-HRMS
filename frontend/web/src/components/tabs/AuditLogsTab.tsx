import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import SearchIcon from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';

interface AuditLog {
  id: string;
  timestamp: string;
  eventType: string;
  actor: string;
  actorRole: string;
  ipAddress: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
  details: Record<string, unknown>;
}

export function AuditLogsTab() {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const mockLogs: AuditLog[] = [
    {
      id: 'log-001',
      timestamp: '2026-09-29 14:15:22',
      eventType: 'AUTH_LOGIN_SUCCESS',
      actor: 'hr@company.com',
      actorRole: 'HR_ADMIN',
      ipAddress: '192.168.1.104',
      severity: 'INFO',
      description: 'Successful HR Administrator login via Web Portal.',
      details: { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', authMethod: 'PASSWORD_ARGON2' },
    },
    {
      id: 'log-002',
      timestamp: '2026-09-29 14:02:18',
      eventType: 'ATTENDANCE_CHECK_IN',
      actor: 'EMP-001 (John Doe)',
      actorRole: 'EMPLOYEE',
      ipAddress: '192.168.40.221',
      severity: 'INFO',
      description: 'Face biometric verification confirmed (confidence 99.4%) inside HQ Geofence polygon.',
      details: { officeId: 'hq-01', livenessPassed: true, coordinates: [37.7749, -122.4194] },
    },
    {
      id: 'log-003',
      timestamp: '2026-09-29 13:45:00',
      eventType: 'EXCEPTION_APPROVED',
      actor: 'admin@company.com',
      actorRole: 'SUPER_ADMIN',
      ipAddress: '192.168.1.10',
      severity: 'INFO',
      description: 'Approved Client-Site exception request for EMP-004.',
      details: { requestId: 'req-984', reason: 'Client deployment onsite meeting' },
    },
    {
      id: 'log-004',
      timestamp: '2026-09-29 11:30:14',
      eventType: 'GEOFENCE_UPDATED',
      actor: 'admin@company.com',
      actorRole: 'SUPER_ADMIN',
      ipAddress: '192.168.1.10',
      severity: 'WARNING',
      description: 'Updated polygon boundary vertices for Tech Campus Office.',
      details: { officeId: 'campus-02', verticesCount: 6, updatedBy: 'admin@company.com' },
    },
    {
      id: 'log-005',
      timestamp: '2026-09-29 09:12:05',
      eventType: 'GEOFENCE_BREACH_ATTEMPT',
      actor: 'EMP-014 (Sarah Smith)',
      actorRole: 'EMPLOYEE',
      ipAddress: '172.56.21.90',
      severity: 'WARNING',
      description: 'Check-in attempted 420m outside authorized office perimeter.',
      details: { distanceMeters: 420, rayCrossings: 0, status: 'REJECTED' },
    },
    {
      id: 'log-006',
      timestamp: '2026-09-29 08:00:00',
      eventType: 'CRON_AUTO_CHECKOUT_JOB',
      actor: 'SYSTEM_DAEMON',
      actorRole: 'SYSTEM',
      ipAddress: '127.0.0.1',
      severity: 'INFO',
      description: 'Executed daily auto-checkout scanner. Reconciled 0 unclosed sessions.',
      details: { checkedCount: 48, closedCount: 0 },
    },
  ];

  const filteredLogs = useMemo(() => {
    return mockLogs.filter((log) => {
      const matchesSearch =
        search === '' ||
        log.eventType.toLowerCase().includes(search.toLowerCase()) ||
        log.actor.toLowerCase().includes(search.toLowerCase()) ||
        log.description.toLowerCase().includes(search.toLowerCase());

      const matchesSeverity = severityFilter === 'ALL' || log.severity === severityFilter;

      return matchesSearch && matchesSeverity;
    });
  }, [search, severityFilter]);

  const exportAuditLogs = () => {
    const csvContent =
      'Timestamp,Event Type,Actor,Role,IP Address,Severity,Description\n' +
      mockLogs
        .map((l) => `"${l.timestamp}","${l.eventType}","${l.actor}","${l.actorRole}","${l.ipAddress}","${l.severity}","${l.description}"`)
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <SecurityIcon sx={{ color: '#FF6B35', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Security & System Audit Trail
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Immutable cryptographic logs of all administrative operations, authentication events, and polygon modifications.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<FileDownloadIcon />}
          onClick={exportAuditLogs}
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            textTransform: 'none',
            background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          }}
        >
          Export Audit Trail CSV
        </Button>
      </Box>

      {/* Filter and Search Bar */}
      <Card sx={{ p: 2, mb: 3, borderRadius: 3, border: '1px solid #E2E8F0', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Search by event, actor, or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 260 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: '#94A3B8' }} />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: 'flex', gap: 1 }}>
          {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map((sev) => (
            <Chip
              key={sev}
              label={sev}
              clickable
              color={severityFilter === sev ? 'primary' : 'default'}
              variant={severityFilter === sev ? 'filled' : 'outlined'}
              onClick={() => setSeverityFilter(sev)}
              sx={{ fontWeight: 700, fontSize: 12 }}
            />
          ))}
        </Box>
      </Card>

      {/* Logs Table */}
      <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>TIMESTAMP</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>SEVERITY</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>EVENT TYPE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>ACTOR</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>DESCRIPTION</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }}>IP ADDRESS</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: 12 }} align="right">
                  DETAILS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ fontSize: 13, fontFamily: 'monospace', color: '#64748B' }}>{log.timestamp}</TableCell>
                  <TableCell>
                    <Chip
                      icon={
                        log.severity === 'CRITICAL' ? (
                          <ReportProblemOutlinedIcon />
                        ) : log.severity === 'WARNING' ? (
                          <WarningAmberIcon />
                        ) : (
                          <InfoOutlinedIcon />
                        )
                      }
                      label={log.severity}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        bgcolor:
                          log.severity === 'CRITICAL'
                            ? '#FEE2E2'
                            : log.severity === 'WARNING'
                            ? '#FEF3C7'
                            : '#E0F2FE',
                        color:
                          log.severity === 'CRITICAL'
                            ? '#991B1B'
                            : log.severity === 'WARNING'
                            ? '#92400E'
                            : '#0369A1',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{log.eventType}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B', fontSize: 13 }}>
                      {log.actor}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                      {log.actorRole}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 13, color: '#334155', maxWidth: 320 }}>{log.description}</TableCell>
                  <TableCell sx={{ fontSize: 13, fontFamily: 'monospace', color: '#64748B' }}>{log.ipAddress}</TableCell>
                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setSelectedLog(log)}
                      sx={{ borderRadius: 1.5, fontSize: 11, textTransform: 'none', fontWeight: 600 }}
                    >
                      View JSON
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Details Dialog */}
      <Dialog open={Boolean(selectedLog)} onClose={() => setSelectedLog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldOutlinedIcon color="primary" />
          Audit Log Event: {selectedLog?.eventType}
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block' }}>
              ACTOR & TIMESTAMP
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {selectedLog?.actor} ({selectedLog?.actorRole}) at {selectedLog?.timestamp}
            </Typography>
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block' }}>
              DESCRIPTION
            </Typography>
            <Typography variant="body2">{selectedLog?.description}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block', mb: 0.5 }}>
              METADATA PAYLOAD (JSON)
            </Typography>
            <Box
              component="pre"
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: '#0F172A',
                color: '#38BDF8',
                fontSize: 12,
                fontFamily: 'monospace',
                overflowX: 'auto',
                m: 0,
              }}
            >
              {JSON.stringify(selectedLog?.details, null, 2)}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedLog(null)} sx={{ fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
