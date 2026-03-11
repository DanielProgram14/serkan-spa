from typing import Optional

ROLE_ADMINISTRADOR = "ADMINISTRADOR"
ROLE_RRHH = "RRHH"
ROLE_SUPERVISOR = "SUPERVISOR"
ROLE_TRABAJADOR = "TRABAJADOR"

ROLE_CHOICES = (
    (ROLE_ADMINISTRADOR, "Administrador"),
    (ROLE_RRHH, "RRHH"),
    (ROLE_SUPERVISOR, "Supervisor"),
    (ROLE_TRABAJADOR, "Trabajador"),
)

CANONICAL_ROLE_VALUES = tuple(choice[0] for choice in ROLE_CHOICES)

LEGACY_ROLE_ALIASES = {
    "RECURSOS_HUMANOS": ROLE_RRHH,
    "OPERARIO": ROLE_TRABAJADOR,
}


def normalize_role(role: Optional[str]) -> Optional[str]:
    if not role:
        return None
    normalized = role.strip().upper()
    return LEGACY_ROLE_ALIASES.get(normalized, normalized)
