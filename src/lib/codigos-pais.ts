/** Códigos telefónicos de país para el checkout — Chile primero (destino
 * principal de la tienda), el resto son los países vecinos/frecuentes.
 * Amplía esta lista si hace falta, no es exhaustiva a propósito. */
export interface CodigoPais {
  codigo: string;
  pais: string;
}

export const CODIGOS_PAIS: CodigoPais[] = [
  { codigo: "+56", pais: "Chile" },
  { codigo: "+51", pais: "Perú" },
  { codigo: "+54", pais: "Argentina" },
  { codigo: "+591", pais: "Bolivia" },
  { codigo: "+57", pais: "Colombia" },
  { codigo: "+52", pais: "México" },
  { codigo: "+1", pais: "EE.UU. / Canadá" },
  { codigo: "+34", pais: "España" },
];

export const CODIGO_PAIS_POR_DEFECTO = "+56";
