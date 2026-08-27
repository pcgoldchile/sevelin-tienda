const ITEMS = [
  { icono: "🔒", texto: "Pago seguro" },
  { icono: "💬", texto: "Atención por WhatsApp" },
  { icono: "✅", texto: "Garantía en todos los productos" },
  { icono: "🚚", texto: "Despacho a todo Arica y Chile" },
];

export function FranjaConfianza() {
  return (
    <section className="border-y border-zinc-200 bg-zinc-50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:px-8">
        {ITEMS.map((item) => (
          <div key={item.texto} className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden>{item.icono}</span>
            <span className="text-sm font-medium text-zinc-700">{item.texto}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
