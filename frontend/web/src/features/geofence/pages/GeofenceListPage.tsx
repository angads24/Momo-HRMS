import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { DashboardLayout } from '../../../components/DashboardLayout';
import { PATHS } from '../../../routes/paths';
import { deleteOffice, fetchOffices } from '../services/geofenceService';
import type { Office } from '../types/geofence';
import { GeofenceTable } from '../components/GeofenceTable';
import { LocationVerifyTester } from '../components/LocationVerifyTester';

export default function GeofenceListPage() {
  const navigate = useNavigate();

  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Probe tester state
  const [testTarget, setTestTarget] = useState<Office | null>(null);

  // Deletion modal state
  const [deleteTarget, setDeleteTarget] = useState<Office | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    fetchOffices()
      .then((data) => {
        if (active) {
          setOffices(Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (active) {
          const msg =
            axios.isAxiosError(err) && err.response?.data?.message
              ? String(err.response.data.message)
              : 'Unable to load workplace offices and geofences.';
          setError(msg);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteOffice(deleteTarget.id);
      const targetName = deleteTarget.name;
      const targetCode = deleteTarget.code;
      setOffices((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
      setFeedback(`Office "${targetName}" (${targetCode}) and associated geofence data deleted successfully.`);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? String(err.response.data.message)
          : 'Failed to delete office workplace. Please try again.';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout
      title="Geofences & Office Boundaries"
      subtitle="Establish workplace office locations and manage geofence polygon perimeters."
    >
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          color="inherit"
          onClick={() => navigate(PATHS.admin)}
        >
          Back to Admin Dashboard
        </Button>
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddLocationAltIcon />}
            onClick={() => navigate('/geofences/new')}
          >
            Add Office Workplace
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <GeofenceTable
        offices={offices}
        loading={loading}
        onEditPolygon={(office) => navigate(`/geofences/${office.id}/edit`)}
        onVerifyLocation={(office) => setTestTarget(office)}
        onDeleteOffice={(office) => setDeleteTarget(office)}
      />

      {/* Location Verification Tester Modal */}
      <LocationVerifyTester
        open={Boolean(testTarget)}
        office={testTarget}
        onClose={() => setTestTarget(null)}
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="error" />
          Delete Office Workplace
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, color: 'text.primary', fontSize: '0.95rem' }}>
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})?
          </DialogContentText>
          <Alert severity="error" variant="outlined" sx={{ borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              This action cannot be undone.
            </Typography>
            All geofence boundary coordinates, polygon vertices, and location configuration for this workplace will be permanently removed.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 1 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            color="inherit"
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
          >
            {deleting ? 'Deleting Office...' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Toast */}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4500}
        onClose={() => setFeedback(null)}
      >
        <Alert severity="success" onClose={() => setFeedback(null)} variant="filled" sx={{ width: '100%' }}>
          {feedback}
        </Alert>
      </Snackbar>
    </DashboardLayout>
  );
}
