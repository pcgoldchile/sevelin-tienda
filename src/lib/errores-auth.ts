/** Supabase Auth devuelve sus mensajes de error en inglés — el proyecto
 * mantiene todo en español (ver CLAUDE.md), así que se traducen los casos
 * más comunes acá. Si no hay traducción conocida, se muestra el mensaje
 * original (mejor eso que ocultar el error). */
const TRADUCCIONES: [RegExp, string][] = [
  [/email rate limit exceeded/i, "Se enviaron demasiados correos en poco tiempo. Espera unos minutos y vuelve a intentar."],
  [/invalid login credentials/i, "Correo o contraseña incorrectos."],
  [/user already registered/i, "Ya existe una cuenta con ese correo."],
  [/email not confirmed/i, "Todavía no confirmaste tu correo — revisa tu bandeja de entrada."],
  [/email address .* is invalid/i, "Ese correo no es válido."],
  [/password should be at least/i, "La contraseña es muy corta (mínimo 6 caracteres)."],
  [/for security purposes, you can only request this after/i, "Espera unos segundos antes de volver a intentar."],
];

export function traducirErrorAuth(mensaje: string): string {
  const encontrada = TRADUCCIONES.find(([patron]) => patron.test(mensaje));
  return encontrada ? encontrada[1] : mensaje;
}
