import uuid
import random
import time
from typing import Dict, Optional, Set
from app.services.employee_resolver import get_employee_identifiers

CHALLENGE_ACTIONS = {
    "BLINK": "Blink your eyes naturally toward the camera",
    "TURN_LEFT": "Turn your head slightly to the left",
    "TURN_RIGHT": "Turn your head slightly to the right",
    "SMILE": "Smile gently at the camera",
}

class ChallengeService:
    def __init__(self, ttl_seconds: int = 180):
        self.ttl_seconds = ttl_seconds
        # In-memory store: challenge_id -> { employee_id, aliases, action, created_at, expires_at }
        self._challenges: Dict[str, dict] = {}
        # Grace store for recently consumed challenges to prevent rapid race/retry failures: challenge_id -> dict
        self._recently_consumed: Dict[str, dict] = {}

    def create_challenge(self, employee_id: str, aliases: Optional[Set[str]] = None) -> dict:
        self._cleanup_expired()
        
        challenge_id = str(uuid.uuid4())
        action, instruction = random.choice(list(CHALLENGE_ACTIONS.items()))
        now = time.time()
        
        all_aliases = set(aliases) if aliases else get_employee_identifiers(employee_id)
        all_aliases.add(employee_id)
        
        challenge_data = {
            "challenge_id": challenge_id,
            "employee_id": employee_id,
            "aliases": all_aliases,
            "action": action,
            "instruction": instruction,
            "created_at": now,
            "expires_at": now + self.ttl_seconds,
        }
        
        self._challenges[challenge_id] = challenge_data
        return {
            "challenge_id": challenge_id,
            "employee_id": employee_id,
            "action": action,
            "instruction": instruction,
            "expires_in_seconds": self.ttl_seconds,
        }

    def validate_and_consume(self, challenge_id: str, employee_id: str) -> Optional[dict]:
        self._cleanup_expired()
        
        challenge = self._challenges.get(challenge_id)
        if not challenge:
            # Check recently consumed cache within grace window (15s)
            recent = self._recently_consumed.get(challenge_id)
            if recent:
                recent_aliases = recent.get("aliases", {recent.get("employee_id")})
                incoming_aliases = get_employee_identifiers(employee_id)
                if (employee_id in recent_aliases) or (recent_aliases & incoming_aliases):
                    return recent
            return None
            
        expected_aliases = challenge.get("aliases", {challenge.get("employee_id")})
        incoming_aliases = get_employee_identifiers(employee_id)
        if employee_id not in expected_aliases and not (expected_aliases & incoming_aliases):
            return None
            
        if time.time() > challenge["expires_at"]:
            del self._challenges[challenge_id]
            return None
            
        # One-time use: consume challenge and remember in grace cache
        del self._challenges[challenge_id]
        self._recently_consumed[challenge_id] = {
            **challenge,
            "consumed_at": time.time(),
        }
        return challenge

    def _cleanup_expired(self):
        now = time.time()
        expired = [cid for cid, c in self._challenges.items() if now > c["expires_at"]]
        for cid in expired:
            del self._challenges[cid]
        # Clean grace cache older than 15s
        expired_grace = [cid for cid, c in self._recently_consumed.items() if (now - c.get("consumed_at", now)) > 15.0]
        for cid in expired_grace:
            del self._recently_consumed[cid]

challenge_service = ChallengeService(ttl_seconds=180)
