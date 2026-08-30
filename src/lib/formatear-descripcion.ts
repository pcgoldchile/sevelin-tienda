import { escaparParaSanitizar } from './escapar-html';

/**
 * Convierte una descripción de TEXTO PLANO (líneas sueltas separadas por
 * saltos de línea, no HTML) en HTML estructurado: título de sección,
 * lista de características, párrafos.
 *
 * POR QUÉ HACE FALTA
 * El editor del POS es Quill (da negrita, listas, links), pero en la
 * práctica NINGUNA descripción del catálogo real se guardó como el HTML
 * que Quill produce — se revisaron todas: son texto plano, con líneas
 * como "✅ Pantalla de 24.5 pulgadas..." separadas por líneas en blanco.
 * Renderizado tal cual con `white-space: pre-line`, sale como un bloque
 * de texto sin ninguna jerarquía visual (el reclamo real: "se sienten muy
 * planas"). Esta función le da esa estructura ANTES de sanitizar.
 *
 * `sanitizarDescripcionHtml()` (sanitizar-html.ts) es quien decide si
 * corresponde llamar a esta función: si el texto YA trae HTML de verdad
 * (por si en el futuro alguna descripción sí llega vía Quill), no se
 * toca — transformarlo de nuevo rompería su estructura.
 *
 * REGLAS (pensadas para lo que hay hoy en el catálogo, no genéricas)
 *   - Un bloque de una sola línea, corto, que termina en ":" → título de
 *     sección (h3). Ej: "✨ Características principales:".
 *   - Un bloque donde TODAS las líneas empiezan con una viñeta conocida
 *     (✅ ✔ ✓ ☑ • - * o "1.") → lista. Se quita la viñeta del texto: el
 *     diseño pone su propio ícono, consistente entre productos aunque el
 *     admin haya escrito emojis distintos en cada uno.
 *   - Bloques de viñetas CONSECUTIVOS se fusionan en un solo <ul> — así
 *     vienen guardados en la base: cada característica es su propio
 *     párrafo, separado por línea en blanco, no una lista real.
 *   - Cualquier otro bloque → párrafo normal (los saltos de línea sueltos
 *     dentro de un mismo bloque quedan como <br>).
 *   - Dentro de cualquier línea, `**negrita**` y `[texto](url)` se
 *     interpretan (ver `conEnfasis`) — es lo mínimo que necesita el pie
 *     de envíos fijo, no un parser de markdown completo.
 */

const PATRON_VINETA = /^(?:[✅✔️✓☑•▪▸▶]+|[-*]|\d+[.)])[ \t]+/u;

function quitarVineta(linea: string): string | null {
  const coincide = linea.match(PATRON_VINETA);
  if (!coincide) return null;
  const resto = linea.slice(coincide[0].length).trim();
  return resto || null;
}

/** Un título de sección es corto y va solo en su bloque — una frase larga
 *  que termine en ":" (como el cierre de un párrafo largo) no debe
 *  convertirse en encabezado. */
const LARGO_MAXIMO_TITULO = 100;

/**
 * Énfasis MUY limitado dentro de una línea: `**negrita**` y
 * `[texto](url)`. No es un parser de markdown general a propósito — solo
 * lo que necesita el pie de envíos fijo ("**Envíos a todo Chile.**",
 * "[www.sevelin.cl](https://www.sevelin.cl)"), para no abrir la puerta a
 * que cualquier texto suelto con un asterisco se empiece a interpretar
 * como marcado. Todo lo que no matchea se escapa igual que siempre.
 */
const TOKEN_ENFASIS = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*/g;

function conEnfasis(linea: string): string {
  let salida = '';
  let ultimo = 0;
  let m: RegExpExecArray | null;

  TOKEN_ENFASIS.lastIndex = 0;
  while ((m = TOKEN_ENFASIS.exec(linea))) {
    salida += escaparParaSanitizar(linea.slice(ultimo, m.index));
    if (m[1] !== undefined) {
      // [texto](url) — la URL nunca lleva comillas en la práctica, pero
      // se escapan igual por si acaso: sigue siendo texto de un admin.
      const href = m[2].replace(/"/g, '%22');
      salida += `<a href="${href}" target="_blank" rel="noopener noreferrer">${escaparParaSanitizar(m[1])}</a>`;
    } else {
      salida += `<strong>${escaparParaSanitizar(m[3] as string)}</strong>`;
    }
    ultimo = TOKEN_ENFASIS.lastIndex;
  }
  salida += escaparParaSanitizar(linea.slice(ultimo));
  return salida;
}

export function formatearDescripcionPlana(texto: string): string {
  const bloques = texto
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  let html = '';
  let listaAbierta = false;

  const cerrarLista = () => {
    if (listaAbierta) {
      html += '</ul>';
      listaAbierta = false;
    }
  };

  for (const bloque of bloques) {
    const lineas = bloque
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lineas.length === 0) continue;

    const items = lineas.map(quitarVineta);
    const esLista = items.every((item) => item !== null);

    if (esLista) {
      if (!listaAbierta) {
        html += '<ul>';
        listaAbierta = true;
      }
      for (const item of items) html += `<li>${conEnfasis(item as string)}</li>`;
      continue;
    }

    cerrarLista();

    const esTitulo = lineas.length === 1 && lineas[0].length <= LARGO_MAXIMO_TITULO && /[:：]$/.test(lineas[0]);
    if (esTitulo) {
      html += `<h3>${conEnfasis(lineas[0])}</h3>`;
      continue;
    }

    html += `<p>${lineas.map(conEnfasis).join('<br>')}</p>`;
  }

  cerrarLista();
  return html;
}
