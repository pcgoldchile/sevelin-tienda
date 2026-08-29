/**
 * Correo transaccional vía la API REST de Resend — fetch directo, sin el
 * SDK de `resend` (es una sola llamada HTTP, no vale la pena la
 * dependencia extra para esto). Nunca lanza: el llamador (checkout,
 * cancelación) decide si un envío fallido debe loguearse nomás o algo
 * más — pero jamás debe frenar un pago ya confirmado ni una cancelación
 * ya decidida.
 */
export async function enviarCorreo(params: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Sevelin <onboarding@resend.dev>';

  if (!apiKey) {
    console.warn('[resend] Falta RESEND_API_KEY — no se envió el correo a', params.to);
    return false;
  }
  if (!params.to) return false;

  try {
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });

    if (!respuesta.ok) {
      const cuerpo = await respuesta.text().catch(() => '');
      // Causa más probable mientras no haya dominio verificado: Resend
      // solo entrega al correo de la cuenta que creó la API key cuando
      // se envía desde el dominio de prueba (onboarding@resend.dev).
      console.error('[resend] Envío rechazado', respuesta.status, cuerpo);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[resend] Error de red al enviar:', err instanceof Error ? err.message : err);
    return false;
  }
}
