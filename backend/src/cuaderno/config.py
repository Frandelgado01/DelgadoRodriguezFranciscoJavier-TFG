"""Configuración de la API leída de las variables de entorno documentadas en .env.example."""

import os
from collections.abc import Mapping
from dataclasses import dataclass
from zoneinfo import ZoneInfo

# Las fechas del cuaderno ("hoy", fecha de registro, vencimientos) se calculan en esta zona.
ZONA_HORARIA = ZoneInfo("Europe/Madrid")


@dataclass(frozen=True)
class Config:
    url_base_datos: str
    url_publica: str
    smtp_host: str
    smtp_port: int
    correo_remitente: str


def leer_config(entorno: Mapping[str, str] = os.environ) -> Config:
    """Lee la configuración; falla con un mensaje claro si falta alguna variable."""
    faltan = [
        nombre
        for nombre in (
            "URL_BASE_DATOS",
            "URL_PUBLICA",
            "SMTP_HOST",
            "SMTP_PORT",
            "CORREO_REMITENTE",
        )
        if not entorno.get(nombre)
    ]
    if faltan:
        raise RuntimeError(f"Faltan variables de entorno: {', '.join(faltan)} (ver .env.example)")
    return Config(
        url_base_datos=entorno["URL_BASE_DATOS"],
        url_publica=entorno["URL_PUBLICA"].rstrip("/"),
        smtp_host=entorno["SMTP_HOST"],
        smtp_port=int(entorno["SMTP_PORT"]),
        correo_remitente=entorno["CORREO_REMITENTE"],
    )
