import { NextRequest, NextResponse } from 'next/server';
import { anotarAviso } from '@/lib/avisos-producto';
import { obtenerProductoPorSku } from '@/lib/catalogo';

/**
 * POST /api/avisos — "avísame cuando llegue".
 *
 * Público a propósito: la gracia es que cualquiera pueda dejar su correo
 * sin registrarse. Por eso el producto NO se toma del cuerpo: llega solo
 * el sku y el servidor resuelve el resto contra el catálogo. Si se
 * confiara en lo que manda el navegador, se podría anotar gente a
 * productos inventados o guardar nombres falsos en la base.
 *
 * El consentimiento se exige explícito (Ley 21.719): sin la casilla
 * marcada no se guarda nada. El correo se usa solo para avisar de ESTE
 * producto — no habilita marketing, que es otro consentimiento.
 */
export async function POST(req: NextRequest) {
  let cuerpo: { sku?: string; email?: string; nombre?: string; telefono?: string; consentimiento?: boolean };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido' }, { status: 400 });
  }

  const sku = String(cuerpo.sku || '').trim();
  const email = String(cuerpo.email || '').trim().toLowerCase();

  if (!sku) return NextResponse.json({ error: 'Falta el producto' }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Revisa tu correo, no parece válido' }, { status: 400 });
  }
  if (!cuerpo.consentimiento) {
    return NextResponse.json(
      { error: 'Necesitamos tu autorización para guardar tu correo y avisarte.' },
      { status: 400 }
    );
  }

  const producto = await obtenerProductoPorSku(sku).catch(() => null);
  if (!producto) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

  try {
    const { yaEstaba } = await anotarAviso({
      productoPosId: producto.producto_pos_id,
      sku: producto.sku,
      nombreProducto: producto.nombre,
      tipo: 'AVISO',
      email,
      nombre: cuerpo.nombre,
      telefono: cuerpo.telefono,
    });
    return NextResponse.json({ ok: true, yaEstaba });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : 'No pudimos anotarte';
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
