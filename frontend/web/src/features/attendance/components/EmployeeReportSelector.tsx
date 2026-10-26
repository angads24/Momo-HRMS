import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { PATHS } from '../../../routes/paths';
import type { Employee } from '../../../types/employee';

interface EmployeeReportSelectorProps {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
}

export function EmployeeReportSelector({
  open,
  onClose,
  employees,
}: EmployeeReportSelectorProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const name = `${e.firstName} ${e.lastName}`.toLowerCase();
      const code = (e.employeeCode || '').toLowerCase();
      const dept = (e.department?.name || '').toLowerCase();
      const title = (e.jobTitle || '').toLowerCase();
      return name.includes(q) || code.includes(q) || dept.includes(q) || title.includes(q);
    });
  }, [employees, search]);

  const handleSelect = (emp: Employee) => {
    onClose();
    navigate(PATHS.hrEmployeeReport(emp.id || emp.employeeCode));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 2.5 } } }}>
      <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'rgba(27, 75, 143, 0.08)', color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PersonIcon />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Select Employee
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Generate individual attendance profile and timeline report
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by name, employee code, department..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ mb: 2 }}
        />

        <Paper variant="outlined" sx={{ maxHeight: 380, overflow: 'auto', borderRadius: 2 }}>
          {filteredEmployees.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              No employees matched your search.
            </Box>
          ) : (
            <List disablePadding>
              {filteredEmployees.map((emp, idx) => {
                const fullName = `${emp.firstName} ${emp.lastName}`.trim();
                const initials = `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase();

                return (
                  <ListItem
                    key={emp.id}
                    divider={idx < filteredEmployees.length - 1}
                    sx={{
                      py: 1.5,
                      px: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.15s ease',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ListItemAvatar sx={{ minWidth: 42 }}>
                        <Avatar
                          src={emp.profilePhotoUrl || undefined}
                          sx={{ width: 38, height: 38, bgcolor: 'primary.main', fontSize: '0.875rem', fontWeight: 700 }}
                        >
                          {initials}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {fullName}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {emp.employeeCode} • {emp.jobTitle} ({emp.department?.name || 'General'})
                          </Typography>
                        }
                      />
                    </Box>

                    <Button
                      variant="outlined"
                      size="small"
                      endIcon={<ArrowForwardIcon fontSize="small" />}
                      onClick={() => handleSelect(emp)}
                      sx={{ fontWeight: 600, fontSize: '0.75rem', borderRadius: 1.5, textTransform: 'none' }}
                    >
                      View Report
                    </Button>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Paper>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <Button variant="text" onClick={onClose} sx={{ fontWeight: 600 }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
