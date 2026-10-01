import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { palette } from '../theme/theme';
import { geofenceApi } from '../api/geofenceApi';
import type { Office, VerifyLocationResponse } from '../api/geofenceApi';

interface GpsLocationInspectorProps {
  assignedOfficeId?: string;
  assignedOfficeName?: string;
  onLocationUpdate?: (coords: { latitude: number; longitude: number; altitudeMeters?: number }) => void;
}

export default function GpsLocationInspector({
  assignedOfficeId,
  assignedOfficeName,
  onLocationUpdate,
}: GpsLocationInspectorProps) {
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
    altitude?: number | null;
    accuracy?: number | null;
    timestamp?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  // Office verification
  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | undefined>(assignedOfficeId);
  const [verifyResult, setVerifyResult] = useState<VerifyLocationResponse | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch current GPS position
  const fetchCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        throw new Error('Device GPS is turned off. Please turn on Location services.');
      }

      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        const req = await Location.requestForegroundPermissionsAsync();
        status = req.status;
      }
      if (status !== 'granted') {
        throw new Error('Location permission is denied. Enable it in app settings.');
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        altitude: loc.coords.altitude,
        accuracy: loc.coords.accuracy,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      setCoords(newCoords);
      onLocationUpdate?.({
        latitude: newCoords.latitude,
        longitude: newCoords.longitude,
        altitudeMeters: newCoords.altitude ?? undefined,
      });

      // Also verify with current office if selected
      const targetOffice = selectedOfficeId || assignedOfficeId;
      if (targetOffice) {
        verifyOffice(targetOffice, newCoords.latitude, newCoords.longitude, newCoords.altitude ?? undefined);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not fetch device GPS position.');
    } finally {
      setLoading(false);
    }
  }, [selectedOfficeId, assignedOfficeId, onLocationUpdate]);

  // Verify against office geofence
  const verifyOffice = async (officeId: string, lat: number, lng: number, alt?: number) => {
    try {
      setVerifying(true);
      const res = await geofenceApi.verifyLocation({
        officeId,
        latitude: lat,
        longitude: lng,
        altitudeMeters: alt,
      });
      setVerifyResult(res);
    } catch {
      // ignore non-fatal geofence check error in inspector
      setVerifyResult(null);
    } finally {
      setVerifying(false);
    }
  };

  // Load available offices once
  useEffect(() => {
    geofenceApi.listOffices().then((list) => {
      setOffices(list);
      if (!selectedOfficeId && list.length > 0) {
        setSelectedOfficeId(assignedOfficeId || list[0].id);
      }
    }).catch(() => {});
  }, [assignedOfficeId]);

  // Initial fetch on mount
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  // Copy single Lat, Lng
  const handleCopyCoords = async () => {
    if (!coords) return;
    const str = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    await Clipboard.setStringAsync(str);
    setCopiedMsg(`Copied: ${str}`);
    setTimeout(() => setCopiedMsg(null), 3500);
  };

  // Copy 50-meter Polygon Box centered on current location
  const handleCopyPolygonBox = async () => {
    if (!coords) return;
    const lat = coords.latitude;
    const lng = coords.longitude;
    // ~50 meter offset delta (approx 0.00045 degrees lat, 0.00045/cos(lat) degrees lng)
    const latDelta = 0.0005;
    const lngDelta = 0.0005;

    // Line-by-line format for easy pasting into office polygon textareas:
    const polyText = [
      `${(lat + latDelta).toFixed(6)}, ${(lng - lngDelta).toFixed(6)}`,
      `${(lat + latDelta).toFixed(6)}, ${(lng + lngDelta).toFixed(6)}`,
      `${(lat - latDelta).toFixed(6)}, ${(lng + lngDelta).toFixed(6)}`,
      `${(lat - latDelta).toFixed(6)}, ${(lng - lngDelta).toFixed(6)}`,
    ].join('\n');

    await Clipboard.setStringAsync(polyText);
    setCopiedMsg('Copied 50m Polygon Box (4 vertices)! Paste in Geofence Studio.');
    setTimeout(() => setCopiedMsg(null), 4000);
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity
        style={styles.headerRow}
        activeOpacity={0.8}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={palette.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Device GPS & Geofence Inspector</Text>
            <Text style={styles.headerSubtitle}>
              {loading
                ? 'Acquiring satellite lock...'
                : coords
                  ? `Lat: ${coords.latitude.toFixed(4)}, Lng: ${coords.longitude.toFixed(4)}`
                  : 'Tap refresh to acquire GPS'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={fetchCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={20} color={palette.primary} />
            )}
          </TouchableOpacity>
          <MaterialCommunityIcons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={palette.muted}
          />
        </View>
      </TouchableOpacity>

      {/* Copy Notification Toast */}
      {copiedMsg && (
        <View style={styles.toast}>
          <MaterialCommunityIcons name="check-circle" size={16} color={palette.success} />
          <Text style={styles.toastText}>{copiedMsg}</Text>
        </View>
      )}

      {/* Error state */}
      {error && (
        <View style={styles.errorBox}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={palette.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Expanded Content */}
      {isExpanded && coords && (
        <View style={styles.body}>
          {/* Coordinates Grid */}
          <View style={styles.grid}>
            <View style={styles.gridCol}>
              <Text style={styles.gridLabel}>LATITUDE</Text>
              <Text style={styles.gridValue}>{coords.latitude.toFixed(6)}</Text>
            </View>
            <View style={styles.gridCol}>
              <Text style={styles.gridLabel}>LONGITUDE</Text>
              <Text style={styles.gridValue}>{coords.longitude.toFixed(6)}</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="target" size={14} color={palette.inkSecondary} />
              <Text style={styles.metaText}>
                Accuracy: {coords.accuracy ? `±${Math.round(coords.accuracy)}m` : 'Unknown'}
              </Text>
            </View>
            {coords.altitude != null && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="image-filter-hdr" size={14} color={palette.inkSecondary} />
                <Text style={styles.metaText}>Alt: {Math.round(coords.altitude)}m</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={palette.inkSecondary} />
              <Text style={styles.metaText}>{coords.timestamp}</Text>
            </View>
          </View>

          {/* Geofence Comparison Pill */}
          <View style={styles.fenceSection}>
            <View style={styles.fenceHeader}>
              <Text style={styles.fenceTitle}>Target Office Geofence</Text>
              <Text style={styles.fenceOfficeName}>
                {verifyResult?.officeName || assignedOfficeName || 'Selected Office'}
              </Text>
            </View>

            {verifying ? (
              <View style={styles.verifyingRow}>
                <ActivityIndicator size="small" color={palette.primary} />
                <Text style={styles.verifyingText}>Testing polygon ray-casting containment...</Text>
              </View>
            ) : verifyResult ? (
              <View
                style={[
                  styles.fenceBadge,
                  {
                    backgroundColor: verifyResult.isInside ? '#ECFDF5' : '#FEF2F2',
                    borderColor: verifyResult.isInside ? '#A7F3D0' : '#FECACA',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={verifyResult.isInside ? 'shield-check' : 'shield-alert'}
                  size={20}
                  color={verifyResult.isInside ? palette.success : palette.error}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.fenceBadgeTitle,
                      { color: verifyResult.isInside ? '#065F46' : '#991B1B' },
                    ]}
                  >
                    {verifyResult.isInside
                      ? 'Inside Authorized Office Geofence'
                      : 'Outside Office Geofence Perimeter'}
                  </Text>
                  <Text
                    style={[
                      styles.fenceBadgeSub,
                      { color: verifyResult.isInside ? '#047857' : '#B91C1C' },
                    ]}
                  >
                    {verifyResult.isInside
                      ? 'Attendance check-in allowed'
                      : `Distance to boundary: ~${Math.round(verifyResult.distanceToBoundaryMeters)} meters outside`}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Action Buttons Row */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCoords}>
              <MaterialCommunityIcons name="content-copy" size={16} color="#FFFFFF" />
              <Text style={styles.copyBtnText}>Copy Lat, Lng</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.copyPolygonBtn} onPress={handleCopyPolygonBox}>
              <MaterialCommunityIcons name="vector-polygon" size={16} color={palette.primary} />
              <Text style={styles.copyPolygonBtnText}>Copy 50m Box</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Guidance */}
          <View style={styles.tipBox}>
            <MaterialCommunityIcons name="lightbulb-outline" size={16} color={palette.primary} />
            <Text style={styles.tipText}>
              <Text style={{ fontWeight: '800', color: palette.primary }}>Tip: </Text>
              Tap <Text style={{ fontWeight: '700', color: palette.ink }}>"Copy Lat, Lng"</Text> and paste into the Web Portal (Admin → Geofence Studio) to reshape the office polygon around your exact location.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: palette.border,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: palette.surfaceElevated,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: palette.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    color: palette.inkSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.border,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderBottomWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toastText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.errorSurface,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    fontSize: 12,
    color: palette.error,
    fontWeight: '600',
    flex: 1,
  },
  body: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridCol: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 10,
    padding: 10,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: palette.muted,
    letterSpacing: 0.5,
  },
  gridValue: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.ink,
    fontFamily: 'monospace',
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: palette.inkSecondary,
    fontWeight: '600',
  },
  fenceSection: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  fenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fenceTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: palette.muted,
    textTransform: 'uppercase',
  },
  fenceOfficeName: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.primary,
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  verifyingText: {
    fontSize: 12,
    color: palette.inkSecondary,
  },
  fenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  fenceBadgeTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  fenceBadgeSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  copyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  copyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  copyPolygonBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1.5,
    borderColor: palette.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  copyPolygonBtnText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: palette.surfaceElevated,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  tipText: {
    fontSize: 11,
    color: palette.inkSecondary,
    lineHeight: 16,
    flex: 1,
  },
});
