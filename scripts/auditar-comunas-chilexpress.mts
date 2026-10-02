/**
 * Auditoría de solo lectura: ¿cuántas de las 346 comunas del checkout calzan
 * con un nombre de cobertura de Chilexpress? (pendiente #24 del POS)
 *
 * Usa la MISMA función que el checkout (`elegirCobertura` de
 * src/lib/chilexpress.ts) contra la API real de coberturas. No cotiza ni crea
 * envíos: son 16 GET, uno por región.
 *
 *   npx tsx scripts/auditar-comunas-chilexpress.mts
 */
import { readFileSync } from 'node:fs';
import { COMUNAS_POR_REGION } from '../src/lib/comunas-chile';
import { CODIGO_REGION_CHILEXPRESS } from '../src/lib/chilexpress-regiones';

for (const linea of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/)) {
  const m = linea.match(/^\s*(CHILEXPRESS_[A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const { elegirCobertura } = await import('../src/lib/chilexpress');

const base = process.env.CHILEXPRESS_API_BASE || 'https://testservices.wschilexpress.com';
console.log('API:', new URL(base).host);

let total = 0;
let exactas = 0;
let calzan = 0;
const sinCobertura: string[] = [];

for (const [region, comunas] of Object.entries(COMUNAS_POR_REGION)) {
  const codigo = CODIGO_REGION_CHILEXPRESS[region as keyof typeof CODIGO_REGION_CHILEXPRESS];
  const r = await fetch(`${base}/georeference/api/v1.0/coverage-areas?RegionCode=${codigo}&type=0`, {
    headers: { 'Ocp-Apim-Subscription-Key': process.env.CHILEXPRESS_API_KEY_COBERTURAS || '' },
  });
  const data = (await r.json()) as { coverageAreas?: { countyCode: string; coverageName: string }[] };
  const areas = data.coverageAreas || [];
  if (!r.ok || !areas.length) {
    console.log(`${region} (${codigo}): HTTP ${r.status}, ${areas.length} coberturas`);
  }
  for (const comuna of comunas) {
    total++;
    if (areas.some((a) => a.coverageName?.trim().toLowerCase() === comuna.trim().toLowerCase())) exactas++;
    const elegida = elegirCobertura(areas, comuna);
    if (elegida) calzan++;
    else sinCobertura.push(`${region} · ${comuna}`);
  }
}

console.log(`Comunas del checkout: ${total}`);
console.log(`Calzan con la comparación exacta (como estaba): ${exactas}`);
console.log(`Calzan con elegirCobertura (como queda): ${calzan}`);
console.log(`Sin cobertura (${sinCobertura.length}):`);
for (const s of sinCobertura) console.log('  -', s);
