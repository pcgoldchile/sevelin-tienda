"use client";

import { useState } from "react";

/** Campo de contraseña con un botón propio de mostrar/ocultar — el estado
 * (`visible`) es independiente del valor del input, así que borrar el
 * campo entero nunca lo resetea (a diferencia del ícono nativo del
 * navegador, que en algunos casos sí se reiniciaba). */
export function CampoPassword({
  name,
  placeholder,
  required,
  minLength,
  className,
}: {
  name: string;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  className: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete="new-password"
        className={`${className} pr-16 w-full`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-faint transition-colors hover:text-ink"
      >
        {visible ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}
