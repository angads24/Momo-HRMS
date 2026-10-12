import time
import uuid
from typing import Optional, Tuple, Dict
from jose import jwt, JWTError
from app.config import settings

# In-memory store for consumed token JTIs: jti -> expiration_timestamp
_consumed_tokens: Dict[str, float] = {}

def _cleanup_consumed_tokens():
    now = time.time()
    expired = [jti for jti, exp in _consumed_tokens.items() if now > exp]
    for jti in expired:
        del _consumed_tokens[jti]

def create_verification_token(employee_id: str, confidence: float) -> str:
    now = int(time.time())
    token_jti = str(uuid.uuid4())
    payload = {
        "jti": token_jti,
        "sub": employee_id,
        "type": "FACE_VERIFICATION",
        "confidence": round(confidence, 4),
        "iat": now,
        "exp": now + settings.VERIFICATION_TOKEN_TTL_SECONDS,
    }
    return jwt.encode(payload, settings.FACE_JWT_SECRET, algorithm="HS256")

def verify_token(token: str, expected_employee_id: str, consume: bool = True) -> Tuple[bool, float, str]:
    _cleanup_consumed_tokens()
    try:
        payload = jwt.decode(token, settings.FACE_JWT_SECRET, algorithms=["HS256"])
        if payload.get("type") != "FACE_VERIFICATION":
            return False, 0.0, "Invalid token type"

        jti = payload.get("jti")
        if jti and jti in _consumed_tokens:
            return False, 0.0, "Verification token has already been consumed (replay attack detected)"

        employee_id = payload.get("sub")
        if employee_id != expected_employee_id:
            return False, 0.0, f"Token employee mismatch (expected {expected_employee_id}, found {employee_id})"

        confidence = float(payload.get("confidence", 0.0))

        # Mark token as consumed so it cannot be used again
        if consume and jti:
            _consumed_tokens[jti] = float(payload.get("exp", time.time() + 300))

        return True, confidence, "Token verified successfully"
    except JWTError as e:
        return False, 0.0, f"Token invalid or expired: {str(e)}"
