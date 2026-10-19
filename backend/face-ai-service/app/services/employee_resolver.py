import logging
from typing import Set
from sqlalchemy import text
from app.database import engine

logger = logging.getLogger(__name__)

# In-memory cache for fast lookups: identifier -> (set of aliases, timestamp)
_cache: dict[str, tuple[Set[str], float]] = {}
CACHE_TTL = 300.0  # 5 minutes

def get_employee_identifiers(identifier: str) -> Set[str]:
    """
    Resolves an employee code, employee UUID, or user UUID into the full set of
    identifiers for that employee from employee_db.employees.
    Returns a set of strings, always including the given identifier.
    """
    clean = str(identifier).strip()
    if not clean:
        return set()

    import time
    now = time.time()
    if clean in _cache:
        aliases, exp = _cache[clean]
        if exp > now:
            return aliases

    result: Set[str] = {clean}
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text(
                    "SELECT id, employee_code, user_id FROM employee_db.employees "
                    "WHERE id = :val OR employee_code = :val OR user_id = :val LIMIT 1"
                ),
                {"val": clean},
            ).fetchone()
            if row:
                for val in row:
                    if val:
                        result.add(str(val))
        # Cache for all resolved aliases
        exp_time = now + CACHE_TTL
        for alias in result:
            _cache[alias] = (result, exp_time)
    except Exception as e:
        logger.debug(f"Could not resolve cross-database identifiers for {clean}: {e}")

    return result

def get_canonical_employee_code(identifier: str) -> str:
    """
    Returns the clean employeeCode (e.g. 'EMP-1158') if found,
    or the provided identifier as fallback.
    """
    ids = get_employee_identifiers(identifier)
    for i in ids:
        if i.startswith("EMP-"):
            return i
    return identifier
