// Fondo del sitio: NEGRO PLANO, nada más.
//
// REDISEÑO 17-09-2026 (pedido del dueño): "sin diseño de esas líneas
// geométricas, solo el color y yap". Este archivo tenía cinco capas
// decorativas superpuestas — rejilla hexagonal en dos escalas, un piso en
// perspectiva estilo synthwave, dos resplandores de neón, líneas de escaneo
// tipo CRT y una viñeta. Eso era exactamente lo que había que sacar.
//
// El componente NO se borró a propósito: sigue montado una sola vez en
// layout.tsx, detrás de todo el árbol. Si algún día se quiere una textura
// de fondo, este es el lugar donde va y ya está enganchado. Mientras tanto
// pinta el negro y nada más (sigue siendo un Server Component: cero costo
// en el cliente).
export function FondoCinematico() {
  return <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-paper" />;
}
