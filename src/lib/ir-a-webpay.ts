/**
 * Lleva al cliente al formulario de pago de Webpay Plus.
 *
 * Transbank pide llegar por POST con el token en la variable `token_ws`
 * (documentación de Webpay Plus, "Flujo en caso de éxito", paso 4), así que no
 * sirve un `window.location.href` como con Khipu: se arma un formulario oculto
 * y se envía. Solo para el navegador ("use client").
 *
 * Ojo con la política de seguridad del sitio: el destino tiene que estar en
 * `form-action` (next.config.ts), o el navegador bloquea este envío en silencio.
 */
export function irAWebpay(url: string, token: string): void {
  const formulario = document.createElement("form");
  formulario.method = "POST";
  formulario.action = url;
  formulario.style.display = "none";

  const campo = document.createElement("input");
  campo.type = "hidden";
  campo.name = "token_ws";
  campo.value = token;

  formulario.appendChild(campo);
  document.body.appendChild(formulario);
  formulario.submit();
}
