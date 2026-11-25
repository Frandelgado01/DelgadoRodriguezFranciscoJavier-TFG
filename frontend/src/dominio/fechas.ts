// Fechas del cuaderno en Europe/Madrid (data-model, convenciones), con independencia de la zona del dispositivo.

const FORMATO = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Madrid",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha "AAAA-MM-DD" de un instante en Madrid. */
export function fechaEnMadrid(instante: Date): string {
  const partes = Object.fromEntries(FORMATO.formatToParts(instante).map(({ type, value }) => [type, value]));
  return `${partes["year"]}-${partes["month"]}-${partes["day"]}`;
}

export function hoyEnMadrid(): string {
  return fechaEnMadrid(new Date());
}
