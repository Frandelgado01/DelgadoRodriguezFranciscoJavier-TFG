"""Reloj inyectable: la API obtiene "ahora" y "hoy" de aquí para que las pruebas puedan fijarlos."""

from datetime import UTC, date, datetime

from cuaderno.config import ZONA_HORARIA


class Reloj:
    def ahora(self) -> datetime:
        """Instante actual con zona (UTC)."""
        return datetime.now(UTC)

    def hoy(self) -> date:
        """Fecha de hoy en Europe/Madrid."""
        return self.ahora().astimezone(ZONA_HORARIA).date()


def obtener_reloj() -> Reloj:
    """Dependencia de FastAPI; las pruebas la sustituyen por un reloj fijo."""
    return Reloj()
