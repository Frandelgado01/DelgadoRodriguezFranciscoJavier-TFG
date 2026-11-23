"""Envío de correo por SMTP con la biblioteca estándar (research R10).

En local y en las pruebas el servidor es Mailpit, que recoge los correos sin enviarlos.
"""

import smtplib
from email.message import EmailMessage

from cuaderno.config import leer_config


def enviar(destinatario: str, asunto: str, texto: str) -> None:
    config = leer_config()
    correo = EmailMessage()
    correo["From"] = config.correo_remitente
    correo["To"] = destinatario
    correo["Subject"] = asunto
    correo.set_content(texto)
    with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=10) as smtp:
        smtp.send_message(correo)
