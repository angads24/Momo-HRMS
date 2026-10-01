import { useEffect, useState, useRef, useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import AddLocationAltIcon from '@mui/icons-material/AddLocationAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ExploreIcon from '@mui/icons-material/Explore';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import AddIcon from '@mui/icons-material/Add';
import PanToolIcon from '@mui/icons-material/PanTool';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

import { geofenceApi, type Office, type VerifyLocationResponse, type PolygonVertex } from '../../api/geofenceApi';

export function GeofenceOfficesTab() {
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable Vertices for Drag & Drop
  const [editableVertices, setEditableVertices] = useState<PolygonVertex[]>([]);
  const [draggedVertexIdx, setDraggedVertexIdx] = useState<number | null>(null);
  const [hoveredVertexIdx, setHoveredVertexIdx] = useState<number | null>(null);
  const [savingPolygon, setSavingPolygon] = useState(false);
  const [deletingPolygon, setDeletingPolygon] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingOffice, setDeletingOffice] = useState(false);
  const [deleteOfficeConfirmOpen, setDeleteOfficeConfirmOpen] = useState(false);
  const [officeToDelete, setOfficeToDelete] = useState<Office | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Simulator State
  const [testLat, setTestLat] = useState('18.5205');
  const [testLng, setTestLng] = useState('73.8565');
  const [testAltitude, setTestAltitude] = useState('550');
  const [verifying, setVerifying] = useState(false);

  // Paste Mobile GPS Coordinates Modal
  const [pasteCoordsOpen, setPasteCoordsOpen] = useState(false);
  const [pasteInputText, setPasteInputText] = useState('');
  const [pasteRadius, setPasteRadius] = useState(100);
  const [verifyResult, setVerifyResult] = useState<VerifyLocationResponse | null>(null);

  // Create Office Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [newOfficeCode, setNewOfficeCode] = useState('');
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newCountry, setNewCountry] = useState('India');
  const [newMinAlt, setNewMinAlt] = useState('500');
  const [newMaxAlt, setNewMaxAlt] = useState('650');
  const [verticesInput, setVerticesInput] = useState(
    '18.5210, 73.8560\n18.5210, 73.8570\n18.5200, 73.8570\n18.5200, 73.8560',
  );

  const loadOffices = async () => {
    setLoading(true);
    try {
      const data = await geofenceApi.listOffices();
      setOffices(data);
      if (data.length > 0) {
        const initial = selectedOffice ? data.find((o) => o.id === selectedOffice.id) || data[0] : data[0];
        setSelectedOffice(initial);
        if (initial?.activePolygon?.vertices) {
          setEditableVertices(initial.activePolygon.vertices);
        }
      } else {
        setSelectedOffice(null);
        setEditableVertices([]);
      }
    } catch {
      setErrorMsg('Failed to load offices and geofences.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffices();
  }, []);

  // Update editable vertices when selected office changes
  useEffect(() => {
    if (selectedOffice?.activePolygon?.vertices) {
      setEditableVertices(selectedOffice.activePolygon.vertices);
    } else {
      setEditableVertices([]);
    }
    setVerifyResult(null);
  }, [selectedOffice]);

  // Compute bounding box coordinates for mapping
  const bounds = useMemo(() => {
    if (editableVertices.length === 0) {
      return { minLat: 18.52, maxLat: 18.522, minLng: 73.855, maxLng: 73.858, latRange: 0.002, lngRange: 0.003 };
    }
    const lats = editableVertices.map((v) => Number(v.latitude));
    const lngs = editableVertices.map((v) => Number(v.longitude));
    let minLat = Math.min(...lats);
    let maxLat = Math.max(...lats);
    let minLng = Math.min(...lngs);
    let maxLng = Math.max(...lngs);

    let latRange = maxLat - minLat;
    let lngRange = maxLng - minLng;

    // Expand bounding box slightly for comfortable dragging margin
    if (latRange < 0.0008) latRange = 0.0008;
    if (lngRange < 0.0008) lngRange = 0.0008;
    minLat -= latRange * 0.15;
    maxLat += latRange * 0.15;
    minLng -= lngRange * 0.15;
    maxLng += lngRange * 0.15;
    latRange = maxLat - minLat;
    lngRange = maxLng - minLng;

    return { minLat, maxLat, minLng, maxLng, latRange, lngRange };
  }, [editableVertices]);

  // Map geographic coordinate (lat, lng) to SVG (x, y) (360x240 viewbox)
  const toSvgCoords = (lat: number, lng: number) => {
    const x = 30 + ((lng - bounds.minLng) / bounds.lngRange) * 300;
    const y = 210 - ((lat - bounds.minLat) / bounds.latRange) * 180;
    return { x: Math.max(15, Math.min(345, x)), y: Math.max(15, Math.min(225, y)) };
  };

  // Convert SVG coordinate back to geographic (lat, lng)
  const fromSvgCoords = (svgX: number, svgY: number) => {
    const lng = bounds.minLng + ((svgX - 30) / 300) * bounds.lngRange;
    const lat = bounds.minLat + ((210 - svgY) / 180) * bounds.latRange;
    return { latitude: Number(lat.toFixed(6)), longitude: Number(lng.toFixed(6)) };
  };

  // Compute SVG polygon points string
  const svgPoints = useMemo(() => {
    if (editableVertices.length === 0) return '';
    return editableVertices
      .map((v) => {
        const { x, y } = toSvgCoords(Number(v.latitude), Number(v.longitude));
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [editableVertices, bounds]);

  // Pointer drag event handlers for moving vertices
  const handlePointerDownVertex = (index: number, e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggedVertexIdx(index);
  };

  const handlePointerMoveSvg = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggedVertexIdx === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 360;
    const svgY = ((e.clientY - rect.top) / rect.height) * 240;

    const { latitude, longitude } = fromSvgCoords(svgX, svgY);

    setEditableVertices((prev) => {
      const next = [...prev];
      next[draggedVertexIdx] = {
        ...next[draggedVertexIdx],
        sequence: draggedVertexIdx,
        latitude,
        longitude,
      };
      return next;
    });
  };

  const handlePointerUpSvg = () => {
    setDraggedVertexIdx(null);
  };

  // Save polygon changes
  const handleSavePolygonChanges = async () => {
    if (!selectedOffice || editableVertices.length < 3) return;
    setSavingPolygon(true);
    setErrorMsg(null);
    try {
      const payloadVertices = editableVertices.map((v, i) => ({
        sequence: i,
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
      }));

      await geofenceApi.updateOfficePolygon(selectedOffice.id, {
        name: `${selectedOffice.name} Boundary (v${(selectedOffice.activePolygon?.version || 1) + 1})`,
        vertices: payloadVertices,
      });

      setSuccessMsg(`Geofence boundary for "${selectedOffice.name}" successfully updated! New spatial version saved.`);
      await loadOffices();
    } catch {
      setErrorMsg('Failed to save updated polygon boundary.');
    } finally {
      setSavingPolygon(false);
    }
  };

  // Add new vertex point
  const handleAddVertex = () => {
    if (editableVertices.length === 0) return;
    const last = editableVertices[editableVertices.length - 1];
    const first = editableVertices[0];
    const midLat = (Number(last.latitude) + Number(first.latitude)) / 2 + 0.0002;
    const midLng = (Number(last.longitude) + Number(first.longitude)) / 2 + 0.0002;

    const newVertex: PolygonVertex = {
      sequence: editableVertices.length,
      latitude: Number(midLat.toFixed(6)),
      longitude: Number(midLng.toFixed(6)),
    };

    setEditableVertices([...editableVertices, newVertex]);
    setSuccessMsg('Added new vertex point V' + editableVertices.length + '. Drag it to position the boundary.');
  };

  // Reset to original
  const handleResetVertices = () => {
    if (selectedOffice?.activePolygon?.vertices) {
      setEditableVertices(selectedOffice.activePolygon.vertices);
      setSuccessMsg('Reset vertices to saved database state.');
    }
  };

  // Delete polygon boundary
  const handleDeletePolygon = async () => {
    if (!selectedOffice) return;
    setDeletingPolygon(true);
    setErrorMsg(null);
    try {
      await geofenceApi.deleteOfficePolygon(selectedOffice.id);
      setSuccessMsg(`Geofence boundary polygon for "${selectedOffice.name}" deleted successfully.`);
      setEditableVertices([]);
      await loadOffices();
      setDeleteConfirmOpen(false);
    } catch {
      setErrorMsg('Failed to delete geofence polygon.');
    } finally {
      setDeletingPolygon(false);
    }
  };

  // Delete complete office entity and its boundary polygons
  const handleDeleteOffice = async () => {
    const target = officeToDelete || selectedOffice;
    if (!target) return;
    setDeletingOffice(true);
    setErrorMsg(null);
    try {
      await geofenceApi.deleteOffice(target.id, true);
      setSuccessMsg(`Office "${target.name}" (${target.code}) and all associated boundaries were permanently deleted.`);
      setDeleteOfficeConfirmOpen(false);
      setOfficeToDelete(null);
      if (selectedOffice?.id === target.id) {
        setSelectedOffice(null);
        setEditableVertices([]);
      }
      await loadOffices();
    } catch {
      setErrorMsg(`Failed to delete office "${target.name}".`);
    } finally {
      setDeletingOffice(false);
    }
  };

  // Apply pasted GPS coordinates from Mobile
  const handleApplyPastedGps = () => {
    if (!pasteInputText.trim()) return;
    const lines = pasteInputText.trim().split('\n').map((l) => l.trim()).filter(Boolean);

    if (lines.length === 1 && lines[0].includes(',')) {
      const [latStr, lngStr] = lines[0].split(',').map((s) => s.trim());
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (isNaN(lat) || isNaN(lng)) {
        setErrorMsg('Invalid coordinates. Please enter valid numbers (e.g. 18.520432, 73.856743).');
        return;
      }
      const latDelta = pasteRadius / 111000;
      const lngDelta = pasteRadius / (111000 * Math.cos((lat * Math.PI) / 180));

      const newVertices: PolygonVertex[] = [
        { sequence: 0, latitude: Number((lat + latDelta).toFixed(6)), longitude: Number((lng - lngDelta).toFixed(6)) },
        { sequence: 1, latitude: Number((lat + latDelta).toFixed(6)), longitude: Number((lng + lngDelta).toFixed(6)) },
        { sequence: 2, latitude: Number((lat - latDelta).toFixed(6)), longitude: Number((lng + lngDelta).toFixed(6)) },
        { sequence: 3, latitude: Number((lat - latDelta).toFixed(6)), longitude: Number((lng - lngDelta).toFixed(6)) },
      ];
      setEditableVertices(newVertices);
      setPasteCoordsOpen(false);
      setSuccessMsg(`Generated a ${pasteRadius}m polygon boundary centered on mobile GPS (${lat.toFixed(6)}, ${lng.toFixed(6)})! Tap "Save Boundary" to save.`);
    } else if (lines.length >= 3) {
      const parsedVertices: PolygonVertex[] = [];
      for (let i = 0; i < lines.length; i++) {
        const parts = lines[i].split(',').map((s) => s.trim());
        if (parts.length >= 2) {
          const lat = parseFloat(parts[0]);
          const lng = parseFloat(parts[1]);
          if (!isNaN(lat) && !isNaN(lng)) {
            parsedVertices.push({ sequence: i, latitude: lat, longitude: lng });
          }
        }
      }
      if (parsedVertices.length < 3) {
        setErrorMsg('Please provide at least 3 valid coordinate pairs.');
        return;
      }
      setEditableVertices(parsedVertices);
      setPasteCoordsOpen(false);
      setSuccessMsg(`Applied ${parsedVertices.length} vertex points from mobile to the boundary! Tap "Save Boundary" to save.`);
    } else {
      setErrorMsg('Please provide a single coordinate (e.g. 18.5204, 73.8567) or at least 3 polygon points.');
    }
  };

  const handleTestVerify = async () => {
    if (!selectedOffice) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await geofenceApi.verifyLocation({
        officeId: selectedOffice.code,
        latitude: parseFloat(testLat),
        longitude: parseFloat(testLng),
        altitudeMeters: parseFloat(testAltitude) || undefined,
      });
      setVerifyResult(res);
    } catch {
      setErrorMsg('Location verification failed. Please check inputs.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCreateOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const lines = verticesInput.trim().split('\n');
    if (lines.length < 3) {
      setErrorMsg('A valid geofence polygon requires at least 3 coordinate vertices.');
      setSubmitting(false);
      return;
    }

    const parsedVertices = lines.map((line, idx) => {
      const [latStr, lngStr] = line.split(',').map((s) => s.trim());
      return {
        sequence: idx,
        latitude: parseFloat(latStr),
        longitude: parseFloat(lngStr),
      };
    });

    try {
      await geofenceApi.createOffice({
        code: newOfficeCode,
        name: newOfficeName,
        city: newCity,
        country: newCountry,
        minAltitudeMeters: parseFloat(newMinAlt) || undefined,
        maxAltitudeMeters: parseFloat(newMaxAlt) || undefined,
        polygon: {
          name: `${newOfficeName} Boundary`,
          vertices: parsedVertices,
        },
      });

      setSuccessMsg(`Office ${newOfficeName} (${newOfficeCode}) created with ${parsedVertices.length}-point polygon!`);
      setIsAddOpen(false);
      setNewOfficeCode('');
      setNewOfficeName('');
      setNewCity('');
      await loadOffices();
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      setErrorMsg(
        errorObj.response?.data?.error?.message ||
          errorObj.response?.data?.message ||
          'Failed to create office geofence.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Compute test GPS point position on SVG if active
  const testPointSvg = useMemo(() => {
    if (!testLat || !testLng) return null;
    const lat = parseFloat(testLat);
    const lng = parseFloat(testLng);
    if (isNaN(lat) || isNaN(lng)) return null;
    return toSvgCoords(lat, lng);
  }, [testLat, testLng, bounds]);

  return (
    <Box>
      {/* Top Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <AddLocationAltIcon sx={{ color: '#FF6B35', fontSize: 28 }} />
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0F172A' }}>
              Geofence & Interactive Polygon Studio
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Drag vertex endpoints directly on the interactive map canvas to reshape workplace boundaries in real-time.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddLocationAltIcon />}
          onClick={() => setIsAddOpen(true)}
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            textTransform: 'none',
            background: 'linear-gradient(135deg, #FF6B35 0%, #FFA043 100%)',
          }}
        >
          Add New Office Polygon
        </Button>
      </Box>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2.5 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2.5 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '4.5fr 7.5fr' }, gap: 3 }}>
          {/* Left Column: Office List & Details */}
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5 }}>
              Registered Office Locations ({offices.length})
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {offices.map((office) => {
                const isSelected = selectedOffice?.id === office.id;
                return (
                  <Card
                    key={office.id}
                    onClick={() => setSelectedOffice(office)}
                    sx={{
                      p: 2.5,
                      cursor: 'pointer',
                      borderRadius: 3,
                      border: '1.5px solid',
                      borderColor: isSelected ? '#FF6B35' : '#FED7AA',
                      bgcolor: isSelected ? 'rgba(255, 107, 53, 0.06)' : '#FFFFFF',
                      boxShadow: isSelected ? '0 4px 14px rgba(255, 107, 53, 0.2)' : 'none',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: '#FF6B35' },
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                          {office.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Code: {office.code} • {office.city || 'Remote'}, {office.country || 'Global'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                          label={office.isActive ? 'ACTIVE' : 'INACTIVE'}
                          size="small"
                          color={office.isActive ? 'success' : 'default'}
                          sx={{ fontWeight: 700, fontSize: 10 }}
                        />
                        <IconButton
                          size="small"
                          color="error"
                          title="Delete Complete Office"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOfficeToDelete(office);
                            setDeleteOfficeConfirmOpen(true);
                          }}
                          sx={{
                            p: 0.5,
                            borderRadius: 1.5,
                            color: '#EF4444',
                            '&:hover': { bgcolor: '#FEE2E2', color: '#DC2626' },
                          }}
                        >
                          <DeleteForeverIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip
                        label={`${office.activePolygon?.vertices?.length || 0} Vertices`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: 11, fontWeight: 600 }}
                      />
                      {office.minAltitudeMeters && (
                        <Chip
                          label={`Elev: ${office.minAltitudeMeters}m - ${office.maxAltitudeMeters}m`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 11, fontWeight: 600 }}
                        />
                      )}
                    </Box>
                  </Card>
                );
              })}
            </Box>
          </Box>

          {/* Right Column: Interactive Drag & Drop Visualizer & Simulator */}
          <Box>
            {selectedOffice ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Interactive Polygon Studio Card */}
                <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1.5 }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                        Polygon Perimeter: {selectedOffice.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Version {selectedOffice.activePolygon?.version || 1} • {editableVertices.length} Vertices • <strong>Click and drag any vertex point to reshape boundary</strong>
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAddVertex}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                      >
                        Add Point
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ContentCopyIcon />}
                        onClick={() => {
                          setPasteInputText('');
                          setPasteCoordsOpen(true);
                        }}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: 12,
                          borderColor: '#FF6B35',
                          color: '#FF6B35',
                          '&:hover': { bgcolor: '#FFF7ED', borderColor: '#FF6B35' },
                        }}
                      >
                        Paste Mobile GPS
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RestartAltIcon />}
                        onClick={handleResetVertices}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                      >
                        Reset
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteForeverIcon />}
                        onClick={() => setDeleteConfirmOpen(true)}
                        disabled={deletingPolygon || editableVertices.length === 0}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, fontSize: 12 }}
                      >
                        Delete Boundary
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteForeverIcon />}
                        onClick={() => {
                          setOfficeToDelete(selectedOffice);
                          setDeleteOfficeConfirmOpen(true);
                        }}
                        disabled={deletingOffice}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: 12,
                          borderColor: '#FCA5A5',
                          color: '#DC2626',
                          bgcolor: '#FEF2F2',
                          '&:hover': { bgcolor: '#FEE2E2', borderColor: '#EF4444' },
                        }}
                      >
                        Delete Office
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSavePolygonChanges}
                        disabled={savingPolygon}
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: 12,
                          bgcolor: '#10B981',
                          '&:hover': { bgcolor: '#059669' },
                        }}
                      >
                        {savingPolygon ? 'Saving...' : 'Save Boundary'}
                      </Button>
                    </Box>
                  </Box>

                  {/* Interactive SVG Canvas with Drag & Drop Vertex Handles */}
                  <Box
                    sx={{
                      bgcolor: '#0F172A',
                      borderRadius: 3,
                      p: 2,
                      display: 'flex',
                      justifyContent: 'center',
                      position: 'relative',
                      userSelect: 'none',
                      touchAction: 'none',
                      boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)',
                    }}
                  >
                    <svg
                      ref={svgRef}
                      viewBox="0 0 360 240"
                      onPointerMove={handlePointerMoveSvg}
                      onPointerUp={handlePointerUpSvg}
                      style={{
                        width: '100%',
                        height: '280px',
                        cursor: draggedVertexIdx !== null ? 'grabbing' : 'default',
                      }}
                    >
                      {/* Grid Backdrop Pattern */}
                      <defs>
                        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                        </pattern>
                      </defs>
                      <rect width="360" height="240" fill="url(#grid)" />

                      {/* Closed Polygon Body */}
                      {svgPoints && (
                        <polygon
                          points={svgPoints}
                          fill="rgba(79, 70, 229, 0.22)"
                          stroke="#818CF8"
                          strokeWidth="2.5"
                          strokeDasharray={draggedVertexIdx !== null ? '5,5' : 'none'}
                        />
                      )}

                      {/* Interactive Draggable Vertex Handles */}
                      {editableVertices.map((v, i) => {
                        const { x, y } = toSvgCoords(Number(v.latitude), Number(v.longitude));
                        const isDragged = draggedVertexIdx === i;
                        const isHovered = hoveredVertexIdx === i;

                        return (
                          <g key={i}>
                            {/* Outer pulsating ring for active dragging */}
                            {isDragged && (
                              <circle
                                cx={x}
                                cy={y}
                                r="16"
                                fill="none"
                                stroke="#38BDF8"
                                strokeWidth="2"
                                opacity="0.6"
                              >
                                <animate attributeName="r" values="10;18;10" dur="1.2s" repeatCount="indefinite" />
                              </circle>
                            )}

                            {/* Main draggable vertex circle */}
                            <circle
                              cx={x}
                              cy={y}
                              r={isDragged ? 8 : isHovered ? 7 : 5.5}
                              fill={isDragged ? '#FCD34D' : '#38BDF8'}
                              stroke="#FFFFFF"
                              strokeWidth="2"
                              onPointerDown={(e) => handlePointerDownVertex(i, e)}
                              onPointerEnter={() => setHoveredVertexIdx(i)}
                              onPointerLeave={() => setHoveredVertexIdx(null)}
                              style={{
                                cursor: isDragged ? 'grabbing' : 'grab',
                                transition: 'r 0.15s',
                              }}
                            />

                            {/* Vertex Label */}
                            <text
                              x={x + 10}
                              y={y - 8}
                              fill="#E2E8F0"
                              fontSize="11"
                              fontWeight="bold"
                              fontFamily="monospace"
                              pointerEvents="none"
                            >
                              V{i}
                            </text>
                          </g>
                        );
                      })}

                      {/* Test Simulated GPS Point if active */}
                      {testPointSvg && (
                        <g>
                          <circle
                            cx={testPointSvg.x}
                            cy={testPointSvg.y}
                            r="8"
                            fill={verifyResult ? (verifyResult.isInside ? '#10B981' : '#EF4444') : '#F59E0B'}
                            stroke="#FFFFFF"
                            strokeWidth="2"
                          >
                            <animate attributeName="r" values="6;11;6" dur="1s" repeatCount="indefinite" />
                          </circle>
                          <text
                            x={testPointSvg.x + 10}
                            y={testPointSvg.y + 4}
                            fill="#FFFFFF"
                            fontSize="10"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            Test GPS
                          </text>
                        </g>
                      )}
                    </svg>

                    {/* Canvas Floating Status Badge */}
                    <Box sx={{ position: 'absolute', bottom: 12, left: 16, display: 'flex', gap: 1, alignItems: 'center' }}>
                      <PanToolIcon sx={{ color: '#38BDF8', fontSize: 16 }} />
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontFamily: 'monospace', fontSize: 11 }}>
                        {draggedVertexIdx !== null
                          ? `Dragging V${draggedVertexIdx}: Lat ${Number(editableVertices[draggedVertexIdx]?.latitude).toFixed(6)}, Lng ${Number(editableVertices[draggedVertexIdx]?.longitude).toFixed(6)}`
                          : 'Interactive Mode: Grab and drag vertices to resize polygon'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Vertices Coordinate Table / Pills */}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                    {editableVertices.map((v, i) => (
                      <Chip
                        key={i}
                        label={`V${i}: ${Number(v.latitude).toFixed(4)}, ${Number(v.longitude).toFixed(4)}`}
                        size="small"
                        sx={{
                          bgcolor: draggedVertexIdx === i ? '#FEF3C7' : '#F8FAFC',
                          color: draggedVertexIdx === i ? '#92400E' : '#475569',
                          border: '1px solid #E2E8F0',
                          fontFamily: 'monospace',
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      />
                    ))}
                  </Box>
                </Card>

                {/* Real-time Location Verification Simulator */}
                <Card sx={{ p: 3, borderRadius: 3, border: '1px solid #E2E8F0' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <ExploreIcon color="primary" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0F172A' }}>
                      Live Geofence Verification Simulator (Jordan-Curve Ray-Casting)
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Test arbitrary GPS coordinates against <strong>{selectedOffice.name}</strong> to evaluate mathematical ray-crossings.
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <TextField
                      label="Latitude"
                      size="small"
                      value={testLat}
                      onChange={(e) => setTestLat(e.target.value)}
                      sx={{ flexGrow: 1 }}
                    />
                    <TextField
                      label="Longitude"
                      size="small"
                      value={testLng}
                      onChange={(e) => setTestLng(e.target.value)}
                      sx={{ flexGrow: 1 }}
                    />
                    <TextField
                      label="Altitude (m)"
                      size="small"
                      value={testAltitude}
                      onChange={(e) => setTestAltitude(e.target.value)}
                      sx={{ width: 140 }}
                    />
                    <Button
                      variant="contained"
                      startIcon={<MyLocationIcon />}
                      onClick={handleTestVerify}
                      disabled={verifying}
                      sx={{ fontWeight: 700, borderRadius: 2, bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E8551E' } }}
                    >
                      {verifying ? 'Calculating...' : 'Run Ray-Casting Test'}
                    </Button>
                  </Box>

                  {/* Simulator Result */}
                  {verifyResult && (
                    <Box
                      sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        bgcolor: verifyResult.isInside ? '#ECFDF5' : '#FEF2F2',
                        border: '1.5px solid',
                        borderColor: verifyResult.isInside ? '#A7F3D0' : '#FECACA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {verifyResult.isInside ? (
                          <CheckCircleIcon sx={{ color: '#059669', fontSize: 32 }} />
                        ) : (
                          <CancelIcon sx={{ color: '#DC2626', fontSize: 32 }} />
                        )}
                        <Box>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 800, color: verifyResult.isInside ? '#065F46' : '#991B1B' }}
                          >
                            {verifyResult.isInside ? 'INSIDE GEOFENCE BOUNDARY ✅' : 'OUTSIDE GEOFENCE BOUNDARY ❌'}
                          </Typography>
                          <Typography variant="body2" sx={{ color: verifyResult.isInside ? '#047857' : '#B91C1C' }}>
                            Distance to polygon edge: <strong>{verifyResult.distanceToBoundaryMeters.toFixed(1)} meters</strong>
                            {verifyResult.withinElevation !== undefined &&
                              ` • Elevation valid: ${verifyResult.withinElevation ? 'Yes' : 'No'}`}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={verifyResult.isInside ? 'ALLOW CHECK-IN' : 'DENY / EXCEPTION REQUIRED'}
                        color={verifyResult.isInside ? 'success' : 'error'}
                        sx={{ fontWeight: 800, fontSize: 11 }}
                      />
                    </Box>
                  )}
                </Card>
              </Box>
            ) : (
              <Box sx={{ p: 6, textAlign: 'center', color: '#64748B' }}>
                <Typography>Select an office location on the left to inspect and edit its polygon.</Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Create Office Dialog */}
      <Dialog open={isAddOpen} onClose={() => setIsAddOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleCreateOffice}>
          <DialogTitle sx={{ fontWeight: 800 }}>Define New Office & Geofence Polygon</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                required
                fullWidth
                label="Office Code"
                placeholder="e.g. BLR-01"
                value={newOfficeCode}
                onChange={(e) => setNewOfficeCode(e.target.value.toUpperCase())}
              />
              <TextField
                required
                fullWidth
                label="Office Name"
                placeholder="e.g. Bangalore Tech Hub"
                value={newOfficeName}
                onChange={(e) => setNewOfficeName(e.target.value)}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                required
                fullWidth
                label="City"
                placeholder="e.g. Bangalore"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
              />
              <TextField
                required
                fullWidth
                label="Country"
                value={newCountry}
                onChange={(e) => setNewCountry(e.target.value)}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Min Elevation (m)"
                type="number"
                value={newMinAlt}
                onChange={(e) => setNewMinAlt(e.target.value)}
              />
              <TextField
                fullWidth
                label="Max Elevation (m)"
                type="number"
                value={newMaxAlt}
                onChange={(e) => setNewMaxAlt(e.target.value)}
              />
            </Box>

            <TextField
              required
              fullWidth
              multiline
              rows={4}
              label="Polygon Coordinates (Lat, Lng per line - Minimum 3 vertices)"
              value={verticesInput}
              onChange={(e) => setVerticesInput(e.target.value)}
              helperText="Example: 18.5210, 73.8560 (One latitude, longitude pair per line)"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ fontWeight: 700, bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E8551E' } }}
            >
              {submitting ? 'Creating...' : 'Create Office Polygon'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Polygon Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#DC2626' }}>Delete Geofence Boundary?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to delete the active geofence boundary polygon for{' '}
            <strong>{selectedOffice?.name}</strong>? Employees assigned to this office will not have a spatial boundary check until a new boundary is configured.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deletingPolygon} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeletePolygon}
            variant="contained"
            color="error"
            disabled={deletingPolygon}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {deletingPolygon ? 'Deleting...' : 'Confirm Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Complete Office Confirmation Dialog */}
      <Dialog
        open={deleteOfficeConfirmOpen}
        onClose={() => !deletingOffice && setDeleteOfficeConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteForeverIcon color="error" />
          Delete Complete Office?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Are you sure you want to permanently delete{' '}
            <strong>{officeToDelete?.name || selectedOffice?.name}</strong>{' '}
            (Code: <code>{officeToDelete?.code || selectedOffice?.code}</code>)?
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            This will permanently remove the office record, its coordinate settings, elevation parameters, and all associated spatial geofence polygon boundaries.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteOfficeConfirmOpen(false)}
            disabled={deletingOffice}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteOffice}
            variant="contained"
            color="error"
            disabled={deletingOffice}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {deletingOffice ? 'Deleting Office...' : 'Confirm Delete Office'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Paste Mobile GPS Coordinates Dialog */}
      <Dialog open={pasteCoordsOpen} onClose={() => setPasteCoordsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#FF6B35', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ContentCopyIcon />
          Paste Mobile GPS Coordinates
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Paste the coordinates copied from the mobile app (or a 4-point polygon box). We will automatically center or reshape this office boundary around your exact position!
          </Typography>

          <TextField
            multiline
            rows={4}
            fullWidth
            label="GPS Coordinates"
            placeholder={"18.520432, 73.856743\nOR\n18.520932, 73.856243\n18.520932, 73.857243\n18.519932, 73.857243\n18.519932, 73.856243"}
            value={pasteInputText}
            onChange={(e) => setPasteInputText(e.target.value)}
            helperText="Single lat,lng pair centers a polygon around your spot; multiple pairs define the full boundary."
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B' }}>
              RADIUS (IF SINGLE COORDINATE):
            </Typography>
            {[50, 100, 200].map((r) => (
              <Chip
                key={r}
                label={`${r} meters`}
                clickable
                color={pasteRadius === r ? 'primary' : 'default'}
                onClick={() => setPasteRadius(r)}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setPasteCoordsOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApplyPastedGps}
            sx={{ fontWeight: 700, bgcolor: '#FF6B35', '&:hover': { bgcolor: '#E8551E' } }}
          >
            Apply to Boundary Canvas
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
