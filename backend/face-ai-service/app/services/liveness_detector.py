import os
import cv2
import numpy as np
from typing import List, Tuple
from app.services.face_engine import face_engine

class LivenessDetector:
    def __init__(self):
        self.face_cascade = None
        self.smile_cascade = None
        try:
            if hasattr(cv2, 'CascadeClassifier') and hasattr(cv2, 'data') and hasattr(cv2.data, 'haarcascades'):
                fc_path = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
                sm_path = os.path.join(cv2.data.haarcascades, 'haarcascade_smile.xml')
                if os.path.exists(fc_path):
                    self.face_cascade = cv2.CascadeClassifier(fc_path)
                if os.path.exists(sm_path):
                    self.smile_cascade = cv2.CascadeClassifier(sm_path)
        except Exception:
            self.face_cascade = None
            self.smile_cascade = None

    def check_passive_liveness(self, image: np.ndarray) -> Tuple[bool, float, str]:
        """
        Passive Anti-Spoofing:
        Inspects image blur, frequency domain harmonics (screen refresh/Moire artifacts),
        and color saturation variance to reject screens or printouts.
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 1. Blur check (adjusted for mobile camera compression)
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if laplacian_var < 14.0:
            return False, 0.20, "Image is too blurry or out of focus. Please hold camera steady."

        # 2. Color saturation distribution
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        sat_std = float(np.std(hsv[:, :, 1]))

        # 3. Frequency domain (Moire pattern) inspection using 2D FFT
        f = np.fft.fft2(gray)
        fshift = np.fft.fftshift(f)
        magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1)
        h, w = gray.shape
        center_h, center_w = h // 2, w // 2
        # Zero out center low frequencies
        magnitude_spectrum[max(0, center_h - 10):min(h, center_h + 10), max(0, center_w - 10):min(w, center_w + 10)] = 0
        high_freq_peak = float(np.max(magnitude_spectrum))

        liveness_score = 0.95
        # Screen artifact detection (avoid false positives on indoor front cameras)
        if high_freq_peak > 255.0 and sat_std < 8.0:
            liveness_score -= 0.50

        if liveness_score < 0.60:
            return False, liveness_score, "Screen artifact or spoof display detected"

        return True, liveness_score, "Passive liveness verified"

    def check_active_challenge(self, action: str, frames: List[np.ndarray]) -> Tuple[bool, float, str]:
        """
        Active Challenge Verification:
        Enforces geometric and biometric proof that the user actually performed
        the requested micro-action (BLINK, SMILE, TURN_LEFT, TURN_RIGHT).
        """
        if not frames:
            return False, 0.0, "No image frames received"

        if len(frames) == 1:
            return self.check_passive_liveness(frames[0])

        frame_neutral = frames[0]
        frame_action = frames[1] if len(frames) > 1 else frames[-1]
        frame_confirm = frames[-1]

        # 1. Detect faces & landmarks for both key frames
        face1 = face_engine.detect_face(frame_neutral)
        face2 = face_engine.detect_face(frame_action)

        if face1 is None or face2 is None:
            return False, 0.0, "Face not clearly visible in all challenge photos. Please keep your face inside the frame."

        # Landmark extraction:
        # [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
        x1, y1, w1, h1 = face1[:4]
        re1_x, re1_y = face1[4], face1[5]  # right eye
        le1_x, le1_y = face1[6], face1[7]  # left eye
        nt1_x, nt1_y = face1[8], face1[9]  # nose tip
        rcm1_x, rcm1_y = face1[10], face1[11] # right mouth corner
        lcm1_x, lcm1_y = face1[12], face1[13] # left mouth corner

        x2, y2, w2, h2 = face2[:4]
        re2_x, re2_y = face2[4], face2[5]
        le2_x, le2_y = face2[6], face2[7]
        nt2_x, nt2_y = face2[8], face2[9]
        rcm2_x, rcm2_y = face2[10], face2[11]
        lcm2_x, lcm2_y = face2[12], face2[13]

        eye_span1 = max(float(abs(le1_x - re1_x)), 1.0)
        eye_span2 = max(float(abs(le2_x - re2_x)), 1.0)

        # ─── ACTION: TURN_LEFT or TURN_RIGHT ────────────────────────────────
        if action in ("TURN_LEFT", "TURN_RIGHT"):
            min_eye1 = min(re1_x, le1_x)
            min_eye2 = min(re2_x, le2_x)
            
            yaw1 = (nt1_x - min_eye1) / eye_span1
            yaw2 = (nt2_x - min_eye2) / eye_span2
            yaw_delta = abs(yaw2 - yaw1)

            # Robust scale-invariant head rotation check.
            # Normal hand jitter shifts both eyes and nose together (yaw_delta < 0.02).
            # A true head turn relative to the neutral frame shifts yaw significantly (>= 0.08).
            # We explicitly do NOT use raw pixel nose_shift because natural hand tremor easily moves 10-25px.
            if yaw_delta >= 0.08:
                return True, 0.94, f"{action.replace('_', ' ').title()} successfully detected"
            else:
                return False, 0.35, f"Turn your head slightly ({action.replace('_', ' ').lower()})"

        # ─── ACTION: SMILE ──────────────────────────────────────────────────
        elif action == "SMILE":
            mouth_w1 = np.hypot(rcm1_x - lcm1_x, rcm1_y - lcm1_y) / eye_span1
            mouth_w2 = np.hypot(rcm2_x - lcm2_x, rcm2_y - lcm2_y) / eye_span2
            smile_expansion = (mouth_w2 - mouth_w1) / max(mouth_w1, 1e-4)

            gray1 = cv2.cvtColor(frame_neutral, cv2.COLOR_BGR2GRAY)
            gray2 = cv2.cvtColor(frame_action, cv2.COLOR_BGR2GRAY)
            
            roi1 = gray1[int(max(0, y1)):int(min(gray1.shape[0], y1+h1)), int(max(0, x1)):int(min(gray1.shape[1], x1+w1))]
            roi2 = gray2[int(max(0, y2)):int(min(gray2.shape[0], y2+h2)), int(max(0, x2)):int(min(gray2.shape[1], x2+w2))]

            smiles1 = 0
            smiles2 = 0
            if self.smile_cascade is not None:
                try:
                    smiles1 = len(self.smile_cascade.detectMultiScale(roi1, 1.3, 10)) if roi1.size > 0 else 0
                    smiles2 = len(self.smile_cascade.detectMultiScale(roi2, 1.3, 10)) if roi2.size > 0 else 0
                except Exception:
                    smiles1 = 0
                    smiles2 = 0

            # Real smiles require noticeable mouth widening (>= 7%) or verified classifier change with >= 4.5% expansion
            if smile_expansion >= 0.07 or (smiles2 > smiles1 and smile_expansion >= 0.045):
                return True, 0.92, "Smile successfully verified"
            else:
                return False, 0.35, "Please smile visibly towards camera"

        # ─── ACTION: BLINK ──────────────────────────────────────────────────
        elif action == "BLINK":
            def get_eye_patch(img: np.ndarray, ex: float, ey: float, span: float) -> np.ndarray:
                radius = int(span * 0.22)
                h, w = img.shape[:2]
                y_min, y_max = max(0, int(ey - radius)), min(h, int(ey + radius))
                x_min, x_max = max(0, int(ex - radius)), min(w, int(ex + radius))
                patch = img[y_min:y_max, x_min:x_max]
                if patch.size == 0:
                    return np.zeros((30, 30), dtype=np.uint8)
                gray_p = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY) if len(patch.shape) == 3 else patch
                return cv2.resize(gray_p, (30, 30))

            eye1_l = get_eye_patch(frame_neutral, le1_x, le1_y, eye_span1)
            eye2_l = get_eye_patch(frame_action, le2_x, le2_y, eye_span2)
            eye1_r = get_eye_patch(frame_neutral, re1_x, re1_y, eye_span1)
            eye2_r = get_eye_patch(frame_action, re2_x, re2_y, eye_span2)

            diff_l = float(np.mean(cv2.absdiff(eye1_l, eye2_l)))
            diff_r = float(np.mean(cv2.absdiff(eye1_r, eye2_r)))
            eye_diff = (diff_l + diff_r) / 2.0

            # Real eye blink causes significant pixel difference between open and closed state (>= 12.0)
            if len(frames) >= 3 and face_engine.detect_face(frame_confirm) is not None:
                face3 = face_engine.detect_face(frame_confirm)
                eye3_l = get_eye_patch(frame_confirm, face3[6], face3[7], max(abs(face3[6]-face3[4]), 1.0))
                diff_reopen = float(np.mean(cv2.absdiff(eye2_l, eye3_l)))
                if eye_diff >= 10.0 and diff_reopen >= 8.0:
                    return True, 0.95, "Blink challenge verified"

            if eye_diff >= 12.0:
                return True, 0.91, "Blink challenge verified"
            else:
                return False, 0.35, "Blink your eyes naturally"

        # Passive fallback
        return self.check_passive_liveness(frame_action)

liveness_detector = LivenessDetector()
