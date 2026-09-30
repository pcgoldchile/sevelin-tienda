import { MessageCircle } from "lucide-react";
import { urlPedirAgotado } from "@/lib/agotados";

/**
 * Reemplaza al cuadro de compra en la ficha de un producto agotado
 * (30-09-2026). Antes solo decía "Agotado por ahora" y ofrecía dejar el
 * correo: quien lo necesitaba YA se iba. Ahora tiene una salida inmediata
 * —pedirlo por encargo o cotizarlo por WhatsApp, con el producto ya escrito—
 * y la lista de espera sigue justo debajo para quien prefiere esperar.
 * Las alternativas con stock aparecen al final de la ficha.
 */
export function OpcionesAgotado({ nombre, url }: { nombre: string; url: string }) {
  const whatsapp = urlPedirAgotado(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, nombre, url);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-sunken p-4">
      <div>
        <p className="text-sm font-semibold text-ink">Agotado por ahora</p>
        <p className="mt-1 text-sm text-ink-soft">
          Te lo podemos conseguir: escríbenos y te decimos si lo traemos por encargo y en cuánto tiempo.
          Si prefieres esperar, deja tu correo aquí abajo y te avisamos apenas vuelva.
        </p>
      </div>
      {whatsapp && (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white shadow-glow-accent transition-colors hover:bg-accent-deep"
        >
          <MessageCircle className="h-4 w-4" aria-hidden /> Pídelo por encargo o cotízalo
        </a>
      )}
    </div>
  );
}
