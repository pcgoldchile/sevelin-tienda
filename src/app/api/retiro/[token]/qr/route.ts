import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { esTokenRetiroValido, urlRetiro } from '@/lib/retiro-ot';

/**
 * GET /api/retiro/<código>/qr — el QR de retiro como PNG.
 *
 * Existe por el correo: Gmail y la mayoría de los clientes bloquean las
 * imágenes incrustadas (data: URI o SVG), pero sí muestran una imagen con
 * URL. El PNG no revela nada que no esté ya en el link: es el mismo link
 * dibujado.
 *
 * No consulta al POS a propósito: una imagen de correo se pide muchas
 * veces (previsualizaciones, reenvíos) y no debe despertar al POS cada vez.
 * Si el código ya no sirve, la página a la que lleva lo dice.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!esTokenRetiroValido(token)) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const png = await QRCode.toBuffer(urlRetiro(token), { type: 'png', margin: 2, width: 360 });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
