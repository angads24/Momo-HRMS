import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import GpsLocationInspector from '../components/GpsLocationInspector';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { palette } from '../theme/theme';
import { api } from '../api/client';
import {
  checkIn,
  checkOut,
  geofenceExit,
  geofenceReturn,
  getTodayAttendance,
  getAttendanceHistory,
} from '../api/attendanceApi';
import type { AttendanceSession, TodayAttendance, HistoryItem } from '../api/attendanceApi';
import { getMyProfile, type Employee, type EmployeeAssignment } from '../api/employeeApi';
import {
  getFaceStatus,
  getChallenge,
  verifyFace,
  enrollFace,
  detectNeutralPose,
  detectLiveAction,
} from '../api/faceApi';
import { geofenceApi } from '../api/geofenceApi';
import { downsampleFaceImage } from '../utils/imageUtils';

const { width } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getDeviceLocation(): Promise<{
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  accuracyMeters?: number;
  timestamp: string;
}> {
  const isServicesEnabled = await Location.hasServicesEnabledAsync();
  if (!isServicesEnabled) {
    throw new Error('Device Location / GPS is turned off. Please enable Location in your phone quick settings.');
  }

  let { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }
  if (status !== 'granted') {
    throw new Error('Location permission is required to record workplace attendance.');
  }

  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      altitudeMeters: loc.coords.altitude ?? undefined,
      accuracyMeters: loc.coords.accuracy ? Math.min(loc.coords.accuracy, 250) : undefined,
      timestamp: new Date().toISOString(),
    };
  } catch {
    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown) {
      return {
        latitude: lastKnown.coords.latitude,
        longitude: lastKnown.coords.longitude,
        altitudeMeters: lastKnown.coords.altitude ?? undefined,
        accuracyMeters: lastKnown.coords.accuracy ? Math.min(lastKnown.coords.accuracy, 250) : undefined,
        timestamp: new Date().toISOString(),
      };
    }
    const lowest = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      latitude: lowest.coords.latitude,
      longitude: lowest.coords.longitude,
      altitudeMeters: lowest.coords.altitude ?? undefined,
      accuracyMeters: lowest.coords.accuracy ? Math.min(lowest.coords.accuracy, 250) : undefined,
      timestamp: new Date().toISOString(),
    };
  }
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function statusColor(status: string): string {
  switch (status) {
    case 'WORKING': return palette.success;
    case 'PAUSED': return palette.warning;
    case 'CHECKED_OUT': return palette.muted;
    default: return palette.muted;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'WORKING': return 'Working';
    case 'PAUSED': return 'Paused';
    case 'CHECKED_OUT': return 'Checked Out';
    default: return status;
  }
}

// ─── Challenge Helpers ────────────────────────────────────────────────────────

const CHALLENGE_METADATA: Record<string, { icon: any; title: string; instruction: string; prompt: string }> = {
  BLINK: {
    icon: 'eye-outline',
    title: 'Blink Your Eyes',
    instruction: 'Look straight at the camera, then blink your eyes naturally.',
    prompt: '👁️ BLINK YOUR EYES NOW!',
  },
  SMILE: {
    icon: 'emoticon-happy-outline',
    title: 'Smile at Camera',
    instruction: 'Look straight at the camera, then give a natural smile.',
    prompt: '😊 SMILE AT THE CAMERA NOW!',
  },
  TURN_LEFT: {
    icon: 'arrow-left-circle-outline',
    title: 'Turn Head Left',
    instruction: 'Look straight at the camera, then turn your head slightly left.',
    prompt: '👈 TURN HEAD SLIGHTLY LEFT!',
  },
  TURN_RIGHT: {
    icon: 'arrow-right-circle-outline',
    title: 'Turn Head Right',
    instruction: 'Look straight at the camera, then turn your head slightly right.',
    prompt: '👉 TURN HEAD SLIGHTLY RIGHT!',
  },
};

// ─── Face Enroll Modal (First-time / Onboarding) ──────────────────────────────

interface FaceEnrollModalProps {
  visible: boolean;
  employeeId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

function FaceEnrollModal({ visible, employeeId, onSuccess, onCancel }: FaceEnrollModalProps) {
  const [step, setStep] = useState<'ready' | 'capturing' | 'enrolling' | 'success' | 'error'>('ready');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (visible) {
      setStep('ready');
      setErrorMsg('');
      void requestPerm();
    }
  }, [visible]);

  const requestPerm = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Camera access is required to register your face biometrics.');
        setStep('error');
        return;
      }
      setHasCameraPermission(true);
    } catch {
      setErrorMsg('Failed to initialize camera permissions.');
      setStep('error');
    }
  };

  const handleCaptureAndEnroll = async () => {
    if (!cameraRef.current) return;
    setStep('capturing');
    try {
      // Capture and downsample to 480px width to avoid excess memory usage
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,
        base64: false,
        skipProcessing: false,
      });

      const photoSource = photo?.uri || (photo as any)?.base64;
      if (!photoSource) {
        setErrorMsg('Failed to capture a clear photo. Please try again.');
        setStep('error');
        return;
      }

      setStep('enrolling');
      const downscaledB64 = await downsampleFaceImage(photoSource, 480, 0.65);
      const res = await enrollFace({
        employee_id: employeeId,
        image_base64: downscaledB64,
      });

      if (res.success) {
        setStep('success');
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setErrorMsg(res.message || 'Face registration failed. Please try again.');
        setStep('error');
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        e?.response?.data?.message ??
        e?.message ??
        'Face enrollment error. Please center your face in good lighting and try again.';
      setErrorMsg(msg);
      setStep('error');
    }
  };

  if (!visible) return null;

  return (
    <View style={faceStyles.overlay}>
      <View style={faceStyles.modal}>
        <View style={faceStyles.enrollHeader}>
          <MaterialCommunityIcons name="face-recognition" size={28} color={palette.accent} />
          <Text style={faceStyles.title}>Register Face Biometrics</Text>
        </View>

        {(step === 'ready' || step === 'capturing') && hasCameraPermission && (
          <>
            <View style={faceStyles.cameraWrap}>
              <CameraView ref={cameraRef} style={faceStyles.camera} facing="front" />
              <View style={[faceStyles.cameraBorder, { borderColor: palette.accent }]} />
              <View style={faceStyles.faceGuideOverlay}>
                <View style={faceStyles.faceGuideOval} />
              </View>
            </View>

            <View style={faceStyles.enrollInfoBox}>
              <Text style={faceStyles.enrollInfoTitle}>1-Time Face Registration</Text>
              <Text style={faceStyles.instructions}>
                Position your face inside the circle in good lighting. 1 photo will be captured to create your encrypted biometric profile.
              </Text>
            </View>

            <TouchableOpacity
              style={[faceStyles.captureBtn, { backgroundColor: palette.accent }, step === 'capturing' && { opacity: 0.6 }]}
              onPress={handleCaptureAndEnroll}
              disabled={step === 'capturing'}
            >
              {step === 'capturing' ? (
                <ActivityIndicator color="#0D0F14" />
              ) : (
                <>
                  <MaterialCommunityIcons name="camera" size={22} color="#0D0F14" />
                  <Text style={[faceStyles.captureBtnText, { color: '#0D0F14' }]}>Capture & Register Face</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {step === 'ready' && !hasCameraPermission && (
          <View style={faceStyles.center}>
            <ActivityIndicator color={palette.primary} size="large" />
            <Text style={faceStyles.subtext}>Requesting camera permission...</Text>
          </View>
        )}

        {step === 'enrolling' && (
          <View style={faceStyles.center}>
            <ActivityIndicator color={palette.accent} size="large" />
            <Text style={[faceStyles.subtext, { fontWeight: '700' }]}>Creating 512-D Biometric Vector...</Text>
            <Text style={[faceStyles.instructions, { fontSize: 13, marginTop: 4 }]}>
              Validating face angle, lighting, and encrypting profile at rest.
            </Text>
          </View>
        )}

        {step === 'success' && (
          <View style={faceStyles.center}>
            <MaterialCommunityIcons name="check-decagram" size={64} color={palette.success} />
            <Text style={[faceStyles.subtext, { color: palette.success, fontSize: 18, fontWeight: '700' }]}>
              Face Registered!
            </Text>
            <Text style={[faceStyles.instructions, { marginTop: 4 }]}>
              Your face profile is now active. You can now use facial check-in.
            </Text>
          </View>
        )}

        {step === 'error' && (
          <View style={faceStyles.center}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={palette.error} />
            <Text style={[faceStyles.subtext, { color: palette.error, textAlign: 'center' }]}>{errorMsg}</Text>
            <TouchableOpacity style={faceStyles.retryBtn} onPress={() => { setErrorMsg(''); setStep('ready'); }}>
              <Text style={faceStyles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {step !== 'success' && step !== 'enrolling' && onCancel && (
          <TouchableOpacity style={faceStyles.cancelBtn} onPress={onCancel}>
            <Text style={faceStyles.cancelBtnText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Face Verify Modal (Interactive User-Controlled 3-Frame Active Liveness) ───

type FaceStep = 'preparing' | 'capturing' | 'verifying' | 'done' | 'error';

interface FaceVerifyModalProps {
  visible: boolean;
  employeeId: string;
  onSuccess: (token: string) => void;
  onCancel: () => void;
  onRequestReEnroll?: () => void;
}

function FaceVerifyModal({ visible, employeeId, onSuccess, onCancel, onRequestReEnroll }: FaceVerifyModalProps) {
  const [step, setStep] = useState<FaceStep>('preparing');
  const [challenge, setChallenge] = useState<{ id: string; action: string; instructions: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<1 | 2 | 3>(1);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [isSnapping, setIsSnapping] = useState(false);
  const [flashBorder, setFlashBorder] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [autoScanStatus, setAutoScanStatus] = useState('Position face in oval guide...');

  const cameraRef = useRef<CameraView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setStep('preparing');
      setErrorMsg('');
      setCurrentFrame(1);
      setCapturedFrames([]);
      setCountdown(null);
      setAutoScanStatus('Position face in oval guide...');
      void initFaceVerify();
    }
  }, [visible]);

  useEffect(() => {
    if (currentFrame === 2) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [currentFrame]);

  // ─── Real-Time Continuous Auto-Detection Loop ─────────────────────────────
  useEffect(() => {
    if (!visible || step !== 'capturing' || !hasCameraPermission) return;
    let isMounted = true;
    let inFlight = false;
    let timeoutId: any;

    const runScanLoop = async () => {
      if (!isMounted) return;
      if (!inFlight && !isSnapping && cameraRef.current) {
        inFlight = true;
        try {
          const preview = await cameraRef.current.takePictureAsync({
            quality: 0.4,
            base64: false,
            skipProcessing: true,
          });

          const previewSource = preview?.uri || (preview as any)?.base64;
          if (previewSource && isMounted) {
            const previewB64 = await downsampleFaceImage(previewSource, 360, 0.5);
            if (currentFrame === 1) {
              const res = await detectNeutralPose(previewB64);
              if (res.detected && isMounted) {
                triggerShutterFlash();
                setAutoScanStatus('✓ Neutral pose detected!');
                setCapturedFrames([previewB64]);
                setCurrentFrame(2);
              } else if (isMounted) {
                setAutoScanStatus(res.message || 'Align face looking forward...');
              }
            } else if (currentFrame === 2 && challenge && capturedFrames.length >= 1) {
              const res = await detectLiveAction({
                action: challenge.action,
                neutral_frame: capturedFrames[0],
                current_frame: previewB64,
              });

              if (res.detected && isMounted) {
                setIsSnapping(true);
                triggerShutterFlash();
                setAutoScanStatus(`✓ ${res.message || 'Action verified!'}`);
                const verifiedFrames = [capturedFrames[0], previewB64];
                setCapturedFrames(verifiedFrames);
                void submitVerification(verifiedFrames);
                return;
              } else if (isMounted) {
                setAutoScanStatus(res.message || 'Detecting activity...');
              }
            }
          }
        } catch {
          // ignore transient frame capture errors
        } finally {
          inFlight = false;
        }
      }

      if (isMounted && !isSnapping) {
        timeoutId = setTimeout(runScanLoop, 550);
      }
    };

    timeoutId = setTimeout(runScanLoop, 400);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [visible, step, hasCameraPermission, currentFrame, challenge, capturedFrames, isSnapping]);

  const initFaceVerify = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Camera permission is required for face verification.');
        setStep('error');
        return;
      }
      setHasCameraPermission(true);

      const ch = await getChallenge(employeeId);
      const instruction = (ch as any).instruction || (ch as any).instructions || '';
      setChallenge({ id: ch.challenge_id, action: ch.action, instructions: instruction });
      setCurrentFrame(1);
      setCapturedFrames([]);
      setStep('capturing');
    } catch (e: any) {
      setErrorMsg(e?.response?.data?.message ?? e?.message ?? 'Failed to get liveness challenge.');
      setStep('error');
    }
  };

  const triggerShutterFlash = () => {
    setFlashBorder(true);
    setTimeout(() => setFlashBorder(false), 200);
  };

  const snapPhoto = async (): Promise<string | null> => {
    if (!cameraRef.current) return null;
    triggerShutterFlash();
    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.6,
      base64: false,
      skipProcessing: false,
    });
    const photoSource = photo?.uri || (photo as any)?.base64;
    if (!photoSource) return null;
    return await downsampleFaceImage(photoSource, 480, 0.65);
  };

  const handleManualSnapFrame1 = async () => {
    if (isSnapping) return;
    setIsSnapping(true);
    try {
      const b64 = await snapPhoto();
      if (b64) {
        setCapturedFrames([b64]);
        setCurrentFrame(2);
        setAutoScanStatus('Photo 1 captured! Ready for action challenge.');
      }
    } finally {
      setIsSnapping(false);
    }
  };

  const handleManualSnapFrame2 = async () => {
    if (isSnapping || capturedFrames.length === 0) return;
    setIsSnapping(true);
    try {
      const b64 = await snapPhoto();
      if (b64) {
        const verifiedFrames = [capturedFrames[0], b64];
        setCapturedFrames(verifiedFrames);
        void submitVerification(verifiedFrames);
      }
    } finally {
      setIsSnapping(false);
    }
  };

  // Immediate verification submission
  const submitVerification = async (frames: string[]) => {
    if (!challenge) return;
    setStep('verifying');
    setAutoScanStatus('Matching face neural embedding...');
    try {
      const result = await verifyFace({
        employee_id: employeeId,
        challenge_id: challenge.id,
        frames,
      });

      if (result.verified && result.verification_token) {
        setStep('done');
        setTimeout(() => onSuccess(result.verification_token!), 900);
      } else {
        setErrorMsg(result.message || 'Face verification failed.');
        setStep('error');
      }
    } catch (e: any) {
      const rawDetail = e?.response?.data?.detail;
      const detailStr = Array.isArray(rawDetail)
        ? rawDetail.map((d: any) => d.msg).join(', ')
        : typeof rawDetail === 'string'
          ? rawDetail
          : undefined;

      setErrorMsg(
        detailStr ??
        e?.response?.data?.message ??
        e?.message ??
        'Biometric verification failed. Please try again.'
      );
      setStep('error');
    } finally {
      setIsSnapping(false);
    }
  };

  const handleRetakeToFrame1 = () => {
    setIsSnapping(false);
    setCurrentFrame(1);
    setCapturedFrames([]);
    setAutoScanStatus('Position face in oval guide...');
  };

  const actionMeta = challenge ? CHALLENGE_METADATA[challenge.action] ?? {
    icon: 'face-recognition',
    title: challenge.action.replace('_', ' '),
    instruction: challenge.instructions,
    prompt: `NOW: ${challenge.action}!`,
  } : null;

  const isLegacyError =
    errorMsg.toLowerCase().includes('legacy') ||
    errorMsg.toLowerCase().includes('re-register') ||
    errorMsg.toLowerCase().includes('needs updating');

  if (!visible) return null;

  return (
    <View style={faceStyles.overlay}>
      <View style={faceStyles.modal}>
        <Text style={faceStyles.title}>Biometric Face Verification</Text>

        {(step === 'capturing' || step === 'verifying') && hasCameraPermission && (
          <View style={faceStyles.cameraWrap}>
            <CameraView ref={cameraRef} style={faceStyles.camera} facing="front" />
            <View
              style={[
                faceStyles.cameraBorder,
                flashBorder && { borderColor: '#fff', borderWidth: 5 },
                currentFrame === 2 && { borderColor: palette.warning, borderWidth: 3.5 },
                currentFrame === 3 && { borderColor: palette.success, borderWidth: 3.5 },
              ]}
            />
            {/* Guide circle outline */}
            <View style={faceStyles.faceGuideOverlay}>
              <View style={faceStyles.faceGuideOval} />
            </View>

            {/* Countdown Overlay */}
            {countdown !== null && (
              <View style={faceStyles.countdownOverlay}>
                <Text style={faceStyles.countdownNumber}>{countdown}</Text>
                <Text style={faceStyles.countdownLabel}>Capturing photo...</Text>
              </View>
            )}
          </View>
        )}

        {step === 'preparing' && (
          <View style={faceStyles.center}>
            <ActivityIndicator color={palette.primary} size="large" />
            <Text style={faceStyles.subtext}>Starting biometric sensor...</Text>
          </View>
        )}

        {step === 'capturing' && actionMeta && (
          <View style={{ width: '100%', alignItems: 'center' }}>
            {/* Real-Time Detection Status Banner */}
            <View style={faceStyles.autoDetectBadge}>
              <ActivityIndicator size="small" color={currentFrame === 2 ? palette.warning : palette.accent} />
              <Text style={faceStyles.autoDetectText}>{autoScanStatus}</Text>
            </View>

            {/* Step Indicator Progress Bar */}
            <View style={faceStyles.frameDotsContainer}>
              <View style={[faceStyles.frameDot, currentFrame >= 1 && faceStyles.frameDotActive]}>
                <Text style={faceStyles.frameDotText}>1</Text>
              </View>
              <View style={faceStyles.frameDotLine} />
              <View style={[faceStyles.frameDot, currentFrame >= 2 && faceStyles.frameDotActive]}>
                <Text style={faceStyles.frameDotText}>2</Text>
              </View>
            </View>

            {/* FRAME 1: Neutral */}
            {currentFrame === 1 && (
              <View style={faceStyles.stepCard}>
                <View style={faceStyles.stepHeader}>
                  <MaterialCommunityIcons name="face-man" size={20} color={palette.primary} />
                  <Text style={faceStyles.stepTitle}>Photo 1 of 2: Look Forward</Text>
                </View>
                <Text style={faceStyles.stepDesc}>
                  Align your face directly in the oval guide. The camera will automatically capture once facing forward, or tap below to snap immediately.
                </Text>

                <TouchableOpacity
                  style={[faceStyles.captureBtn, { marginTop: 10, backgroundColor: palette.primary }]}
                  onPress={handleManualSnapFrame1}
                  disabled={isSnapping}
                >
                  <MaterialCommunityIcons name="camera" size={20} color="#FFFFFF" />
                  <Text style={[faceStyles.captureBtnText, { color: '#FFFFFF' }]}>
                    {isSnapping ? 'Capturing...' : '📸 Auto-Scanning (or Tap to Snap)'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* FRAME 2: Action Challenge (Turn, Smile, Blink) */}
            {currentFrame === 2 && (
              <View style={[faceStyles.stepCard, { borderColor: palette.warning }]}>
                <Animated.View style={[faceStyles.actionHighlightBox, { transform: [{ scale: pulseAnim }] }]}>
                  <MaterialCommunityIcons name={actionMeta.icon} size={28} color={palette.warning} />
                  <Text style={faceStyles.actionPromptTitle}>{actionMeta.prompt}</Text>
                  <Text style={faceStyles.actionPromptSub}>{actionMeta.instruction}</Text>
                </Animated.View>

                <Text style={faceStyles.stepDesc}>
                  ⚡ Please {actionMeta.instruction.toLowerCase()} — auto-detecting, or tap below to snap immediately!
                </Text>

                <TouchableOpacity
                  style={[faceStyles.captureBtn, { marginTop: 10, backgroundColor: palette.warning }]}
                  onPress={handleManualSnapFrame2}
                  disabled={isSnapping}
                >
                  <MaterialCommunityIcons name="camera" size={20} color="#1F2937" />
                  <Text style={[faceStyles.captureBtnText, { color: '#1F2937' }]}>
                    {isSnapping ? 'Capturing...' : `📸 Auto-Detecting (or Tap to Snap ${challenge?.action || 'Action'})`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[faceStyles.secondaryBtn, { marginTop: 8 }]}
                  onPress={handleRetakeToFrame1}
                >
                  <MaterialCommunityIcons name="undo" size={16} color={palette.ink} />
                  <Text style={faceStyles.secondaryBtnText}>↺ Restart from Photo 1</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {step === 'verifying' && (
          <View style={faceStyles.center}>
            <ActivityIndicator color={palette.accent} size="large" />
            <Text style={[faceStyles.subtext, { fontWeight: '700' }]}>Analyzing Biometric Frames...</Text>
            <Text style={[faceStyles.instructions, { fontSize: 13, marginTop: 4 }]}>
              Evaluating YuNet facial landmarks, 3D motion geometry, and matching neural face embedding.
            </Text>
          </View>
        )}

        {step === 'done' && (
          <View style={faceStyles.center}>
            <MaterialCommunityIcons name="check-circle" size={56} color={palette.success} />
            <Text style={[faceStyles.subtext, { color: palette.success, fontWeight: '700', fontSize: 18 }]}>
              Verified & Live!
            </Text>
            <Text style={[faceStyles.instructions, { marginTop: 4 }]}>
              Biometric check-in authorized.
            </Text>
          </View>
        )}

        {step === 'error' && (
          <View style={faceStyles.center}>
            <MaterialCommunityIcons name="alert-circle" size={48} color={palette.error} />
            <Text style={[faceStyles.subtext, { color: palette.error, textAlign: 'center', lineHeight: 20 }]}>
              {errorMsg}
            </Text>

            {isLegacyError && onRequestReEnroll && (
              <TouchableOpacity
                style={[faceStyles.captureBtn, { backgroundColor: palette.accent, marginTop: 12 }]}
                onPress={onRequestReEnroll}
              >
                <MaterialCommunityIcons name="face-recognition" size={20} color="#0D0F14" />
                <Text style={[faceStyles.captureBtnText, { color: '#0D0F14' }]}>
                  Re-Register Face Biometrics Now
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={faceStyles.retryBtn}
              onPress={() => {
                setErrorMsg('');
                void initFaceVerify();
              }}
            >
              <Text style={faceStyles.retryBtnText}>Retry Scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {step !== 'done' && step !== 'verifying' && (
          <TouchableOpacity style={faceStyles.cancelBtn} onPress={onCancel}>
            <Text style={faceStyles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const faceStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modal: {
    width: width * 0.92,
    maxHeight: '90%',
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.ink,
    marginBottom: 14,
    textAlign: 'center',
  },
  cameraWrap: {
    width: 210,
    height: 210,
    borderRadius: 105,
    overflow: 'hidden',
    marginBottom: 14,
    position: 'relative',
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraBorder: {
    ...StyleSheet.absoluteFill,
    borderRadius: 105,
    borderWidth: 3,
    borderColor: palette.primary,
  },
  faceGuideOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  faceGuideOval: {
    width: 130,
    height: 160,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderStyle: 'dashed',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: '#fff',
  },
  countdownLabel: {
    fontSize: 14,
    color: palette.inkSecondary,
    marginTop: 4,
    fontWeight: '600',
  },
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${palette.primary}22`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 10,
  },
  challengeAction: {
    color: palette.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  autoDetectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: palette.border,
  },
  autoDetectText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  challengeContextCard: {
    width: '100%',
    backgroundColor: palette.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  contextTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.ink,
  },
  contextBody: {
    fontSize: 12,
    color: palette.inkSecondary,
    marginBottom: 6,
    lineHeight: 16,
  },
  stepList: {
    gap: 4,
  },
  stepItem: {
    fontSize: 12,
    color: palette.ink,
    lineHeight: 16,
  },
  stepBold: {
    fontWeight: '700',
    color: palette.accent,
  },
  enrollInfoBox: {
    width: '100%',
    backgroundColor: palette.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
  },
  enrollInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.accent,
    marginBottom: 4,
  },
  capturingInfo: {
    alignItems: 'center',
    width: '100%',
    marginVertical: 6,
  },
  activePromptBanner: {
    width: '100%',
    backgroundColor: palette.surfaceElevated,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  activePromptBannerAction: {
    backgroundColor: `${palette.warning}30`,
    borderColor: palette.warning,
  },
  activePromptText: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  activePromptTextAction: {
    color: palette.warning,
    fontSize: 15,
    fontWeight: '800',
  },
  actionHighlightText: {
    color: palette.accent,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  frameDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  frameDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1.5,
    borderColor: palette.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameDotActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  frameDotText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  frameDotLine: {
    width: 20,
    height: 2,
    backgroundColor: palette.border,
  },
  stepCard: {
    width: '100%',
    backgroundColor: palette.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.ink,
  },
  stepDesc: {
    fontSize: 12,
    color: palette.inkSecondary,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  timerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  timerBtnText: {
    fontSize: 12,
    color: palette.inkSecondary,
    fontWeight: '600',
  },
  actionHighlightBox: {
    width: '100%',
    backgroundColor: `${palette.warning}20`,
    borderWidth: 1,
    borderColor: palette.warning,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  actionPromptTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.warning,
    textAlign: 'center',
  },
  actionPromptSub: {
    fontSize: 12,
    color: palette.ink,
    textAlign: 'center',
    fontWeight: '600',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  secondaryBtnText: {
    fontSize: 12,
    color: palette.ink,
    fontWeight: '600',
  },
  instructions: {
    color: palette.inkSecondary,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: palette.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
    width: '100%',
  },
  captureBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  center: {
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  subtext: {
    color: palette.inkSecondary,
    fontSize: 14,
    marginTop: 6,
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: palette.primary,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    color: palette.muted,
    fontSize: 13,
  },
  enrollHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
});


// ─── Main Employee Home Screen ────────────────────────────────────────────────

type Screen = 'dashboard' | 'history' | 'profile';

export default function EmployeeHomeScreen() {
  const { user, logout } = useAuth();
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');

  // Employee profile
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Attendance state
  const [today, setToday] = useState<TodayAttendance | null>(null);
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [loadingToday, setLoadingToday] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Actions & Modals
  const [isFaceEnrolled, setIsFaceEnrolled] = useState<boolean | null>(null);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Load profile
  useEffect(() => {
    if (user?.id) void loadProfile();
  }, [user?.id]);

  // Load today on mount
  useEffect(() => {
    void loadToday();
  }, []);

  // Grace Countdown Timer - ticks every second when status === 'PAUSED'
  const [graceSecondsLeft, setGraceSecondsLeft] = useState<number>(0);
  const [geofenceChecking, setGeofenceChecking] = useState<boolean>(false);
  const [lastGeofenceResult, setLastGeofenceResult] = useState<{
    isInside: boolean;
    distanceMeters?: number;
    officeName?: string;
    checkedAt: Date;
  } | null>(null);

  useEffect(() => {
    if (activeSession?.status === 'PAUSED') {
      const calcGrace = () => {
        let deadline = 0;
        if (activeSession.currentGraceDeadline) {
          deadline = new Date(activeSession.currentGraceDeadline).getTime();
        } else if (activeSession.currentPauseStartedAt) {
          deadline = new Date(activeSession.currentPauseStartedAt).getTime() + 60 * 60 * 1000;
        } else {
          deadline = Date.now() + 60 * 60 * 1000;
        }
        const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
        setGraceSecondsLeft(diff);
        if (diff === 0) {
          void loadToday();
        }
      };
      calcGrace();
      const interval = setInterval(calcGrace, 1000);
      return () => clearInterval(interval);
    } else {
      setGraceSecondsLeft(0);
    }
  }, [activeSession?.status, activeSession?.currentGraceDeadline, activeSession?.currentPauseStartedAt]);

  // Timer for elapsed time - stops at 12:00 AM (midnight, no night shifts)
  useEffect(() => {
    if (activeSession?.status === 'WORKING' && activeSession.checkInAt) {
      const update = () => {
        const checkInDate = new Date(activeSession.checkInAt);
        const checkInTime = checkInDate.getTime();
        const now = new Date();

        // 12:00 AM (midnight) boundary of the check-in day: 23:59:59.999
        const midnight = new Date(
          checkInDate.getFullYear(),
          checkInDate.getMonth(),
          checkInDate.getDate(),
          23, 59, 59, 999
        ).getTime();

        // Stop timer after 12 o'clock at night (midnight)
        if (now.getTime() >= midnight) {
          const cappedSeconds = Math.max(0, Math.floor((midnight - checkInTime) / 1000));
          setElapsedSeconds(cappedSeconds);

          // If current calendar day has advanced, reload today to reset for the new day
          if (now.toDateString() !== checkInDate.toDateString()) {
            void loadToday();
          }
          return;
        }

        const seconds = Math.floor((now.getTime() - checkInTime) / 1000);
        setElapsedSeconds(Math.max(activeSession.totalWorkingSeconds || 0, seconds));
      };
      update();
      timerRef.current = setInterval(update, 1000);
      return () => clearInterval(timerRef.current);
    } else if (activeSession?.status === 'PAUSED') {
      clearInterval(timerRef.current);
      setElapsedSeconds(activeSession.totalWorkingSeconds || 0);
    } else {
      clearInterval(timerRef.current);
      setElapsedSeconds(0);
    }
  }, [activeSession]);

  // Concurrent Geofence Location Monitor
  const performGeofenceCheck = useCallback(async (manual = false) => {
    if (!activeSession || (activeSession.status !== 'WORKING' && activeSession.status !== 'PAUSED')) {
      return;
    }
    if (geofenceChecking) return;

    setGeofenceChecking(true);
    try {
      const loc = await getDeviceLocation();
      const officeTarget = activeSession.officeId;

      const res = await geofenceApi.verifyLocation({
        officeId: officeTarget,
        latitude: loc.latitude,
        longitude: loc.longitude,
        altitudeMeters: loc.altitudeMeters,
      });

      const isInside = res?.isInside ?? false;
      const distance = res?.distanceToBoundaryMeters ?? 0;
      setLastGeofenceResult({
        isInside,
        distanceMeters: Math.round(distance),
        officeName: res?.officeName || officeTarget,
        checkedAt: new Date(),
      });

      // CASE 1: Employee was WORKING, but stepped OUTSIDE office boundary!
      if (activeSession.status === 'WORKING' && !isInside) {
        console.log(`[GeofenceMonitor] Employee left office (~${Math.round(distance)}m outside). Triggering geofence-exit...`);
        try {
          const pausedSession = await geofenceExit({
            officeId: officeTarget,
            location: loc,
            clientEventId: generateUUID(),
            employeeId: employee?.id,
          });
          setActiveSession(pausedSession);
          await loadToday();
          Alert.alert(
            '⚠️ Stepped Outside Workplace',
            `You are outside your office boundary (~${Math.round(distance)}m away).\n\nYour working timer has been automatically paused. A 60-minute grace period has started.\n\nPlease return to the office within 60 minutes to resume your timer, or your shift will be automatically checked out.`,
            [{ text: 'Understood' }]
          );
        } catch (exitErr: any) {
          console.warn('Geofence exit call warning:', exitErr?.message);
        }
      }
      // CASE 2: Employee was PAUSED, and walked BACK INSIDE office boundary!
      else if (activeSession.status === 'PAUSED' && isInside) {
        console.log(`[GeofenceMonitor] Employee returned inside office. Triggering geofence-return...`);
        try {
          const resumedSession = await geofenceReturn({
            officeId: officeTarget,
            location: loc,
            clientEventId: generateUUID(),
            employeeId: employee?.id,
          });
          setActiveSession(resumedSession);
          await loadToday();
          Alert.alert(
            '✅ Back in Office',
            `Welcome back inside the office geofence!\n\nYour working timer has automatically resumed.`,
            [{ text: 'Continue Working' }]
          );
        } catch (returnErr: any) {
          console.warn('Geofence return call warning:', returnErr?.message);
        }
      } else if (manual) {
        if (isInside) {
          Alert.alert('📍 Location Verified', `You are safely inside the office boundary (${res?.officeName || officeTarget}).`);
        } else {
          Alert.alert('📍 Outside Office', `You are currently ~${Math.round(distance)}m outside the office perimeter.`);
        }
      }
    } catch (e: any) {
      console.warn('[GeofenceMonitor] Background location check warning:', e?.message);
    } finally {
      setGeofenceChecking(false);
    }
  }, [activeSession, employee?.id, geofenceChecking]);

  // Periodic 30-second background location checks while session is active
  useEffect(() => {
    if (activeSession && (activeSession.status === 'WORKING' || activeSession.status === 'PAUSED')) {
      const interval = setInterval(() => {
        void performGeofenceCheck();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [activeSession?.status, activeSession?.id, performGeofenceCheck]);

  // Load history when screen changes
  useEffect(() => {
    if (activeScreen === 'history' && history.length === 0) {
      void loadHistory();
    }
  }, [activeScreen]);

  const checkFaceStatus = async (empId: string) => {
    try {
      const status = await getFaceStatus(empId);
      setIsFaceEnrolled(status.is_enrolled);
      if (!status.is_enrolled) {
        // Automatically prompt face enrollment at first login!
        setShowEnrollModal(true);
      }
    } catch (e: any) {
      console.warn('Face status check warning:', e?.message);
    }
  };

  const [selectedCheckInOfficeId, setSelectedCheckInOfficeId] = useState<string | null>(null);

  const loadProfile = async () => {
    try {
      setLoadingProfile(true);
      const emp = await getMyProfile(user!.id);
      setEmployee(emp);
      if (emp?.id) {
        api.defaults.headers.common['x-employee-id'] = emp.id;
        void checkFaceStatus(emp.id);
      }
    } catch {
      // silent fail - profile might not be created yet
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadToday = async () => {
    try {
      setLoadingToday(true);
      const data = await getTodayAttendance();
      setToday(data);
      const sessions = Array.isArray(data?.sessions) ? data.sessions : [];
      const active = sessions.find(
        (s) => s.status === 'WORKING' || s.status === 'PAUSED'
      );
      setActiveSession(active ?? null);
    } catch (e: any) {
      console.error('Load today error:', e?.message);
    } finally {
      setLoadingToday(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await getAttendanceHistory({ page: 1, limit: 30 });
      setHistory(Array.isArray(data?.items) ? data.items : []);
    } catch (e: any) {
      console.error('Load history error:', e?.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadToday();
    if (employee?.id) await checkFaceStatus(employee.id);
    if (activeScreen === 'history') await loadHistory();
    setRefreshing(false);
  }, [activeScreen, employee?.id]);

  // Check-in flow: verify enrollment & location/geofence FIRST, then launch face verification
  const handleCheckIn = async () => {
    if (!employee) {
      Alert.alert('Profile Not Found', 'Your employee profile has not been set up yet. Please contact HR.');
      return;
    }

    // 1. Mandatory Face Enrollment Check
    if (isFaceEnrolled === false) {
      Alert.alert(
        'Face Registration Required',
        'You must complete your one-time face biometric registration before checking in.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Register Face Now', onPress: () => setShowEnrollModal(true) },
        ],
      );
      return;
    }

    // 2. Pre-verify device location and office geofence BEFORE opening face scanner
    const activeAssignments = employee.assignments?.filter((a) => a.isActive) || [];
    if (activeAssignments.length === 0) {
      Alert.alert('No Office Assigned', 'You are not assigned to any office. Please contact HR.');
      return;
    }

    try {
      setActionLoading(true);
      const loc = await getDeviceLocation();

      // Check all assigned offices to see if user is inside any of them
      let verifiedAssignment: EmployeeAssignment | null = null;
      let minDistance = 999999;
      let closestOfficeName = 'Office';

      for (const assign of activeAssignments) {
        try {
          const res = await geofenceApi.verifyLocation({
            officeId: assign.officeId,
            latitude: loc.latitude,
            longitude: loc.longitude,
            altitudeMeters: loc.altitudeMeters,
          });
          if (res?.isInside) {
            verifiedAssignment = assign;
            break;
          }
          if (res && typeof res.distanceToBoundaryMeters === 'number' && res.distanceToBoundaryMeters < minDistance) {
            minDistance = res.distanceToBoundaryMeters;
            closestOfficeName = res.officeName || assign.officeId;
          }
        } catch {
          // continue checking other assignments
        }
      }

      if (!verifiedAssignment) {
        // Fallback to first primary or active assignment if geofence check could not confirm
        const fallback = activeAssignments.find((a) => a.isPrimary) || activeAssignments[0];
        const dist = Math.round(minDistance < 999999 ? minDistance : 0);
        const lat = loc.latitude.toFixed(6);
        const lng = loc.longitude.toFixed(6);
        Alert.alert(
          '📍 Outside Office Geofence',
          `You are currently ~${dist}m outside your designated office area (${closestOfficeName}).\n\nYour Current GPS Location:\n• Latitude: ${lat}\n• Longitude: ${lng}\n• Accuracy: ${loc.accuracyMeters ? `±${Math.round(loc.accuracyMeters)}m` : 'N/A'}\n\nTip: You can copy these coordinates to adjust your office geofence in the Web Portal (Admin → Geofence Studio).`,
          [
            { text: 'Dismiss', style: 'cancel' },
            {
              text: '📋 Copy Coordinates',
              onPress: async () => {
                await Clipboard.setStringAsync(`${lat}, ${lng}`);
                Alert.alert('✅ Copied', `Coordinates "${lat}, ${lng}" copied to clipboard! Paste this into the Web Portal Geofence Studio.`);
              },
            },
          ]
        );
        return;
      }

      // Store the verified office for this check-in session
      setSelectedCheckInOfficeId(verifiedAssignment.officeId);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not verify your GPS location.';
      Alert.alert('Location Verification Failed', msg);
      return;
    } finally {
      setActionLoading(false);
    }

    // 3. Office location confirmed! Launch auto-detect face verification modal
    setShowFaceModal(true);
  };

  const handleFaceSuccess = async (faceVerificationToken: string) => {
    setShowFaceModal(false);
    if (!employee) return;

    try {
      setActionLoading(true);
      const loc = await getDeviceLocation();

      // Resolve office assignment (verified office from step 2, or first active assignment)
      const activeAssignments = employee.assignments?.filter((a) => a.isActive) || [];
      const targetOfficeId =
        selectedCheckInOfficeId ||
        activeAssignments.find((a) => a.isPrimary)?.officeId ||
        activeAssignments[0]?.officeId;

      if (!targetOfficeId) {
        Alert.alert('No Office Assigned', 'You are not assigned to any office. Please contact HR.');
        return;
      }

      const session = await checkIn({
        officeId: targetOfficeId,
        location: loc,
        faceVerificationToken,
        clientEventId: generateUUID(),
        employeeId: employee.id,
      });

      setActiveSession(session);
      await loadToday();
      Alert.alert('✅ Checked In', `Welcome! You checked in at ${formatTime(session.checkInAt)}`);
    } catch (e: any) {
      const resData = e?.response?.data;
      const msg =
        (typeof resData?.message === 'string' && resData.message) ||
        (Array.isArray(resData?.message) && resData.message.join(', ')) ||
        resData?.error?.message ||
        resData?.detail ||
        e?.message ||
        'Check-in failed. Please verify your location and try again.';
      Alert.alert('Check-in Failed', msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!activeSession) return;
    Alert.alert('Check Out', 'Are you sure you want to check out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Check Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoading(true);
            const loc = await getDeviceLocation();
            const session = await checkOut({
              officeId: activeSession.officeId,
              location: {
                latitude: loc.latitude,
                longitude: loc.longitude,
              },
              clientEventId: generateUUID(),
            });
            setActiveSession(null);
            await loadToday();
            Alert.alert('👋 Checked Out', `Total work time: ${formatDuration(session.totalWorkingSeconds)}`);
          } catch (e: any) {
            const msg = e?.response?.data?.message ?? e?.message ?? 'Check-out failed';
            Alert.alert('Check-out Failed', msg);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const renderDashboard = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Greeting */}
      <View style={styles.greetingRow}>
        <View>
          <Text style={styles.greeting}>
            {new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening'} 👋
          </Text>
          <Text style={styles.greetingName}>{user?.fullName ?? user?.username}</Text>
        </View>
        <TouchableOpacity onPress={() => void logout()} style={styles.logoutBtn}>
          <MaterialCommunityIcons name="logout" size={20} color={palette.muted} />
        </TouchableOpacity>
      </View>

      {/* Date */}
      <Text style={styles.dateText}>{new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>

      {/* Face Biometric Registration Banner */}
      {isFaceEnrolled === false && (
        <TouchableOpacity style={styles.enrollBanner} onPress={() => setShowEnrollModal(true)}>
          <View style={styles.enrollBannerIcon}>
            <MaterialCommunityIcons name="face-recognition" size={24} color={palette.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.enrollBannerTitle}>Face Registration Required</Text>
            <Text style={styles.enrollBannerSub}>Set up your face biometrics to enable attendance check-in.</Text>
          </View>
          <View style={styles.enrollBannerBtn}>
            <Text style={styles.enrollBannerBtnText}>Enroll</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Status Card */}
      {(() => {
        const isSessionActiveToday = Boolean(
          activeSession &&
          (activeSession.status === 'WORKING' || activeSession.status === 'PAUSED') &&
          new Date(activeSession.checkInAt).toDateString() === new Date().toDateString()
        );
        const isPastMidnightSession = Boolean(
          activeSession &&
          (activeSession.status === 'WORKING' || activeSession.status === 'PAUSED') &&
          new Date(activeSession.checkInAt).toDateString() !== new Date().toDateString()
        );

        return (
          <>
            <View style={[styles.statusCard, { borderColor: isSessionActiveToday ? statusColor(activeSession!.status) + '44' : palette.border }]}>
              <View style={styles.statusHeader}>
                <View style={[styles.statusDot, { backgroundColor: isSessionActiveToday ? statusColor(activeSession!.status) : (isPastMidnightSession ? palette.warning : palette.muted) }]} />
                <Text style={[styles.statusLabel, { color: isSessionActiveToday ? statusColor(activeSession!.status) : (isPastMidnightSession ? palette.warning : palette.muted) }]}>
                  {isSessionActiveToday
                    ? statusLabel(activeSession!.status)
                    : isPastMidnightSession
                      ? 'Workday Ended at 12:00 AM'
                      : 'Not Checked In'}
                </Text>
              </View>

              {isSessionActiveToday && activeSession?.status === 'WORKING' && (
                <>
                  <Text style={styles.timerText}>{formatDuration(elapsedSeconds)}</Text>
                  <Text style={styles.timerSub}>since {formatTime(activeSession.checkInAt)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                    <MaterialCommunityIcons name="map-marker-radius" size={16} color="#15803D" />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#15803D' }}>
                      Inside Office Perimeter (Active 30s Check)
                    </Text>
                  </View>
                </>
              )}

              {isSessionActiveToday && activeSession?.status === 'PAUSED' && (
                <View style={{ width: '100%', alignItems: 'center', marginTop: 4 }}>
                  <Text style={[styles.timerText, { color: palette.warning, fontSize: 36 }]}>
                    {formatDuration(elapsedSeconds)}
                  </Text>
                  <Text style={[styles.timerSub, { color: palette.warning, fontWeight: '700' }]}>
                    ⏸ Working Timer Paused
                  </Text>

                  {/* Grace Countdown Alert Box */}
                  <View style={{
                    width: '100%',
                    backgroundColor: '#FFFBEB',
                    borderColor: '#FCD34D',
                    borderWidth: 1.5,
                    borderRadius: 14,
                    padding: 14,
                    marginTop: 12,
                    alignItems: 'center',
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MaterialCommunityIcons name="timer-sand" size={20} color="#D97706" />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309', textTransform: 'uppercase' }}>
                        Grace Period Countdown
                      </Text>
                    </View>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: '#D97706', marginVertical: 4 }}>
                      {formatCountdown(graceSecondsLeft)}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#92400E', textAlign: 'center' }}>
                      Step back inside the office boundary to automatically resume your working timer.
                    </Text>

                    {lastGeofenceResult?.distanceMeters ? (
                      <Text style={{ fontSize: 11, color: '#B45309', marginTop: 4, fontWeight: '600' }}>
                        Currently ~{lastGeofenceResult.distanceMeters}m outside {lastGeofenceResult.officeName || 'office'}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#FEF3C7',
                        borderColor: '#F59E0B',
                        borderWidth: 1,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        borderRadius: 10,
                        marginTop: 10,
                      }}
                      onPress={() => performGeofenceCheck(true)}
                      disabled={geofenceChecking}
                    >
                      {geofenceChecking ? (
                        <ActivityIndicator size="small" color="#D97706" />
                      ) : (
                        <>
                          <MaterialCommunityIcons name="crosshairs-gps" size={16} color="#D97706" />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#B45309' }}>
                            Verify Location Now
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {isPastMidnightSession && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.timerSub, { color: palette.muted }]}>
                    Previous session closed at midnight. No night shifts.
                  </Text>
                </View>
              )}

              {!isSessionActiveToday && !isPastMidnightSession && today?.sessions && today.sessions.length > 0 && (
                <Text style={[styles.timerSub, { color: palette.success }]}>
                  Total today: {formatDuration(today.totalWorkingSecondsToday ?? 0)}
                </Text>
              )}

              {loadingToday && <ActivityIndicator color={palette.primary} style={{ marginTop: 12 }} />}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              {!isSessionActiveToday ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.checkInBtn, actionLoading && styles.btnDisabled]}
                  onPress={handleCheckIn}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="login" size={24} color="#fff" />
                      <Text style={styles.actionBtnText}>Check In</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.checkOutBtn, actionLoading && styles.btnDisabled]}
                  onPress={handleCheckOut}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="logout" size={24} color="#fff" />
                      <Text style={styles.actionBtnText}>Check Out</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </>
        );
      })()}

      {/* Real-time GPS Location & Geofence Inspector */}
      <GpsLocationInspector
        assignedOfficeId={employee?.assignments?.find((a) => a.isActive)?.officeId}
        assignedOfficeName={employee?.assignments?.find((a) => a.isActive)?.officeName}
      />


      {/* Today Sessions */}
      {today?.sessions && today.sessions.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Today's Sessions</Text>
          {today.sessions.map((s, i) => (
            <View key={s.id} style={[styles.sessionRow, i > 0 && styles.sessionDivider]}>
              <View style={[styles.sessionStatusDot, { backgroundColor: statusColor(s.status) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.sessionTime}>
                  {formatTime(s.checkInAt)} → {s.checkOutAt ? formatTime(s.checkOutAt) : 'ongoing'}
                </Text>
                <Text style={styles.sessionStatus}>{statusLabel(s.status)}</Text>
              </View>
              {s.totalWorkingSeconds > 0 && (
                <Text style={styles.sessionDuration}>{formatDuration(s.totalWorkingSeconds)}</Text>
              )}
            </View>
          ))}
          <View style={styles.sessionTotal}>
            <Text style={styles.sessionTotalLabel}>Total</Text>
            <Text style={styles.sessionTotalValue}>{formatDuration(today.totalWorkingSecondsToday)}</Text>
          </View>
        </View>
      )}

      {/* Office Info */}
      {employee?.assignments && employee.assignments.filter((a) => a.isActive).length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>My Offices</Text>
          {employee.assignments.filter((a) => a.isActive).map((a) => (
            <View key={a.id} style={styles.officeRow}>
              <MaterialCommunityIcons name="office-building" size={18} color={palette.primary} />
              <Text style={styles.officeName}>{a.officeName ?? a.officeId}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Attendance History</Text>
      </View>

      {loadingHistory ? (
        <ActivityIndicator color={palette.primary} style={{ marginTop: 40 }} />
      ) : history.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="calendar-blank" size={48} color={palette.muted} />
          <Text style={styles.emptyText}>No attendance records yet</Text>
        </View>
      ) : (
        history.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyDateRow}>
              <Text style={styles.historyDate}>{formatDate(item.attendanceDate)}</Text>
              <View style={[styles.historyBadge, { backgroundColor: statusColor(item.status) + '22' }]}>
                <Text style={[styles.historyBadgeText, { color: statusColor(item.status) }]}>
                  {statusLabel(item.status)}
                </Text>
              </View>
            </View>
            <View style={styles.historyTimes}>
              <View style={styles.historyTimeItem}>
                <MaterialCommunityIcons name="login" size={14} color={palette.success} />
                <Text style={styles.historyTimeText}>{formatTime(item.checkInAt)}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={14} color={palette.muted} />
              <View style={styles.historyTimeItem}>
                <MaterialCommunityIcons name="logout" size={14} color={palette.error} />
                <Text style={styles.historyTimeText}>{item.checkOutAt ? formatTime(item.checkOutAt) : '—'}</Text>
              </View>
              {item.totalWorkingSeconds > 0 && (
                <Text style={styles.historyDuration}>{formatDuration(item.totalWorkingSeconds)}</Text>
              )}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const renderProfile = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>My Profile</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{(user?.fullName ?? user?.username ?? '?')[0].toUpperCase()}</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileRow}>
          <MaterialCommunityIcons name="account" size={18} color={palette.primary} />
          <View>
            <Text style={styles.profileLabel}>Full Name</Text>
            <Text style={styles.profileValue}>{user?.fullName ?? '—'}</Text>
          </View>
        </View>
        <View style={styles.profileDivider} />
        <View style={styles.profileRow}>
          <MaterialCommunityIcons name="email" size={18} color={palette.primary} />
          <View>
            <Text style={styles.profileLabel}>Email</Text>
            <Text style={styles.profileValue}>{user?.email}</Text>
          </View>
        </View>
        {employee && (
          <>
            <View style={styles.profileDivider} />
            <View style={styles.profileRow}>
              <MaterialCommunityIcons name="badge-account" size={18} color={palette.primary} />
              <View>
                <Text style={styles.profileLabel}>Employee Code</Text>
                <Text style={styles.profileValue}>{employee.employeeCode}</Text>
              </View>
            </View>
            {employee.department && (
              <>
                <View style={styles.profileDivider} />
                <View style={styles.profileRow}>
                  <MaterialCommunityIcons name="domain" size={18} color={palette.primary} />
                  <View>
                    <Text style={styles.profileLabel}>Department</Text>
                    <Text style={styles.profileValue}>{employee.department}</Text>
                  </View>
                </View>
              </>
            )}
            {employee.jobTitle && (
              <>
                <View style={styles.profileDivider} />
                <View style={styles.profileRow}>
                  <MaterialCommunityIcons name="briefcase" size={18} color={palette.primary} />
                  <View>
                    <Text style={styles.profileLabel}>Job Title</Text>
                    <Text style={styles.profileValue}>{employee.jobTitle}</Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </View>

      {/* Biometrics Card */}
      {employee && (
        <View style={[styles.profileCard, { marginTop: 16 }]}>
          <Text style={styles.profileSectionTitle}>Biometrics & Security</Text>
          <View style={styles.profileRow}>
            <MaterialCommunityIcons
              name={isFaceEnrolled ? 'check-decagram' : 'alert-circle'}
              size={22}
              color={isFaceEnrolled ? palette.success : palette.warning}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.profileLabel}>Face Biometrics</Text>
              <Text style={styles.profileValue}>
                {isFaceEnrolled ? 'Enrolled & Active' : 'Not Registered'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.smallBtn, isFaceEnrolled ? styles.reEnrollBtn : styles.enrollBtn]}
              onPress={() => setShowEnrollModal(true)}
            >
              <Text style={styles.smallBtnText}>{isFaceEnrolled ? 'Re-enroll' : 'Enroll Now'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.logoutFullBtn} onPress={() => void logout()}>
        <MaterialCommunityIcons name="logout" size={18} color={palette.error} />
        <Text style={styles.logoutFullBtnText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Face Enroll Modal (First-time / Onboarding) */}
      {employee && (
        <FaceEnrollModal
          visible={showEnrollModal}
          employeeId={employee.id}
          onSuccess={() => {
            setIsFaceEnrolled(true);
            setShowEnrollModal(false);
            Alert.alert('✅ Face Registered', 'Your face biometric profile is now active! You can now check in.');
          }}
          onCancel={() => setShowEnrollModal(false)}
        />
      )}

      {/* Face Verify Modal */}
      {employee && (
        <FaceVerifyModal
          visible={showFaceModal}
          employeeId={employee.id}
          onSuccess={handleFaceSuccess}
          onCancel={() => setShowFaceModal(false)}
          onRequestReEnroll={() => {
            setShowFaceModal(false);
            setShowEnrollModal(true);
          }}
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {activeScreen === 'dashboard' && renderDashboard()}
        {activeScreen === 'history' && renderHistory()}
        {activeScreen === 'profile' && renderProfile()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {(
          [
            { key: 'dashboard', icon: 'view-dashboard', label: 'Home' },
            { key: 'history', icon: 'calendar-clock', label: 'History' },
            { key: 'profile', icon: 'account-circle', label: 'Profile' },
          ] as const
        ).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveScreen(tab.key)}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={24}
              color={activeScreen === tab.key ? palette.primary : palette.muted}
            />
            <Text style={[styles.tabLabel, activeScreen === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  content: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Greeting
  greetingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  greeting: { color: palette.inkSecondary, fontSize: 14 },
  greetingName: { color: palette.ink, fontSize: 22, fontWeight: '700', marginTop: 2 },
  logoutBtn: { padding: 8, backgroundColor: palette.card, borderRadius: 10 },
  dateText: { color: palette.muted, fontSize: 13, marginBottom: 20 },

  // Status Card
  statusCard: {
    backgroundColor: palette.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  timerText: { fontSize: 48, fontWeight: '800', color: palette.ink, letterSpacing: -1 },
  timerSub: { color: palette.inkSecondary, fontSize: 13, marginTop: 4 },
  graceWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },

  // Action Row
  actionRow: { marginBottom: 20 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
  },
  checkInBtn: { backgroundColor: palette.success },
  checkOutBtn: { backgroundColor: palette.error },
  btnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  // Section Card
  sectionCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: palette.border,
  },
  sectionTitle: { color: palette.inkSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },

  // Sessions
  sessionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  sessionDivider: { borderTopWidth: 1, borderTopColor: palette.border },
  sessionStatusDot: { width: 8, height: 8, borderRadius: 4 },
  sessionTime: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  sessionStatus: { color: palette.muted, fontSize: 12, marginTop: 2 },
  sessionDuration: { color: palette.inkSecondary, fontSize: 14, fontWeight: '600' },
  sessionTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.border },
  sessionTotalLabel: { color: palette.muted, fontSize: 13, fontWeight: '600' },
  sessionTotalValue: { color: palette.primary, fontSize: 15, fontWeight: '700' },

  // Offices
  officeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  officeName: { color: palette.ink, fontSize: 14 },

  // Screens
  screenHeader: { marginBottom: 20 },
  screenTitle: { color: palette.ink, fontSize: 22, fontWeight: '700' },

  // History
  historyCard: {
    backgroundColor: palette.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: palette.border,
  },
  historyDateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historyDate: { color: palette.ink, fontSize: 14, fontWeight: '600' },
  historyBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  historyBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  historyTimes: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  historyTimeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  historyTimeText: { color: palette.inkSecondary, fontSize: 13 },
  historyDuration: { marginLeft: 'auto', color: palette.primary, fontSize: 13, fontWeight: '700' },

  // Empty
  emptyState: { alignItems: 'center', gap: 12, marginTop: 60 },
  emptyText: { color: palette.muted, fontSize: 15 },

  // Profile
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: palette.primary + '33',
    borderWidth: 2, borderColor: palette.primary,
    alignSelf: 'center',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: palette.primary },
  profileCard: {
    backgroundColor: palette.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 0,
  },
  profileRow: { flexDirection: 'row', gap: 14, paddingVertical: 12, alignItems: 'flex-start' },
  profileDivider: { height: 1, backgroundColor: palette.border, marginHorizontal: -16 },
  profileLabel: { color: palette.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  profileValue: { color: palette.ink, fontSize: 15, fontWeight: '500' },
  logoutFullBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginTop: 24, paddingVertical: 16,
    backgroundColor: palette.error + '15',
    borderRadius: 14, borderWidth: 1, borderColor: palette.error + '33',
  },
  logoutFullBtnText: { color: palette.error, fontSize: 16, fontWeight: '600' },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 11, color: palette.muted },
  tabLabelActive: { color: palette.primary, fontWeight: '600' },

  // Face Enrollment Banner & Profile Card
  enrollBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: `${palette.accent}15`,
    borderColor: `${palette.accent}40`,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  enrollBannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${palette.accent}25`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  enrollBannerTitle: { color: palette.ink, fontSize: 15, fontWeight: '700' },
  enrollBannerSub: { color: palette.inkSecondary, fontSize: 12, marginTop: 2 },
  enrollBannerBtn: {
    backgroundColor: palette.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  enrollBannerBtnText: { color: '#0D0F14', fontWeight: '700', fontSize: 13 },
  profileSectionTitle: {
    color: palette.inkSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  smallBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignSelf: 'center',
  },
  enrollBtn: { backgroundColor: palette.accent },
  reEnrollBtn: { backgroundColor: `${palette.primary}33`, borderWidth: 1, borderColor: palette.primary },
  smallBtnText: { color: palette.ink, fontSize: 12, fontWeight: '600' },
});
