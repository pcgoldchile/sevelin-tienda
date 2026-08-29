# Procedimiento de respuesta ante incidentes de datos personales — Sevelin

> **Documento interno.** Da cumplimiento al Art. 14 sexies de la Ley 21.719 (deber de reportar las
> vulneraciones a las medidas de seguridad). Vigente desde el 29-08-2026, antes de la entrada en
> vigencia de la ley el **1 de diciembre de 2026**.

- **Responsable de activar este procedimiento:** Carlos Silva (Administrador). Es el contacto
  directo y único punto de decisión.
- **Alcance:** cualquier vulneración que afecte datos personales tratados por `sevelin-tienda`
  (base de datos Supabase Web, cuentas de cliente, pedidos), incluidos los incidentes que ocurran
  en un proveedor (Supabase, Vercel, Flow).
- **Versión:** 1.0 · **Próxima revisión:** junto con `POLITICA-SEGURIDAD-DATOS.md`.

## Qué cuenta como incidente

El artículo habla de vulneraciones que ocasionen **destrucción, filtración, pérdida o alteración**
accidental o ilícita de datos personales, o la **comunicación o acceso no autorizados** a ellos.
En concreto, acá: acceso indebido a la base de datos, filtración de la `service_role` o de
cualquier secreto, acceso no autorizado al panel de Supabase o de Vercel, un bug que exponga datos
de un cliente a otro, borrado accidental de datos sin respaldo recuperable, o un aviso de brecha
del propio proveedor.

**Un plazo importante, y uno que no existe:** la ley exige reportar "sin dilaciones indebidas". No
fija 24, 48 ni 72 horas. Cualquier plazo en horas que se lea por ahí viene del RGPD europeo, no de
esta ley. La regla operativa es: apenas se tenga certeza razonable de que hubo vulneración y de que
hay riesgo, se reporta — sin esperar a tener el análisis completo.

---

## 1. Detección

Fuentes de detección: aviso del propio proveedor, reclamo de un cliente, comportamiento anómalo en
los logs de Vercel o Supabase, hallazgo propio al revisar el código o los accesos.

Al detectarlo, anotar de inmediato **fecha y hora, quién lo detectó y cómo**. Ese dato es parte de
la evidencia y después no se reconstruye.

## 2. Contención

Primero cortar, después entender. Según el caso: rotar el secreto comprometido (`SUPABASE_WEB_SERVICE_ROLE_KEY`,
`SYNC_SECRET`, claves de Flow), cerrar las sesiones activas, revertir el despliegue afectado,
revocar el acceso de la cuenta comprometida, o poner el sitio en mantenimiento si la filtración
sigue activa.

**No borrar nada** mientras se contiene: los logs y el estado son la prueba del paso 8.

## 3. Evaluación del riesgo

Responder por escrito, aunque sea en tres líneas:

- ¿Qué categorías de datos se vieron afectadas? (contacto, dirección, credenciales, pedidos)
- ¿Cuántos titulares, aproximadamente?
- ¿Los datos salieron efectivamente del sistema, o solo quedaron expuestos?
- ¿Hay riesgo razonable para los derechos y libertades de esas personas?

Esa última pregunta es la que determina si el reporte a la Agencia es obligatorio.

## 4. Registro del incidente

Abrir una entrada en la bitácora del final de este documento. El inciso 2º del Art. 14 sexies exige
registrar: **naturaleza de la vulneración, sus efectos, las categorías de datos y el número
aproximado de titulares afectados, y las medidas adoptadas** para gestionarla y precaver incidentes
futuros. La bitácora está estructurada con esos campos exactos.

## 5. ¿Corresponde informar a la Agencia?

**Sí, cuando exista un riesgo razonable para los derechos y libertades de los titulares.** En caso
de duda, se reporta: el costo de reportar de más es bajo, el de no reportar es una infracción.

- **Cómo:** por el medio más expedito que la Agencia haya habilitado (a la fecha de redacción
  todavía no publica sus canales — verificarlo en la primera revisión posterior al 01-12-2026).
- **Cuándo:** sin dilaciones indebidas, sin esperar a cerrar la investigación.
- **Qué:** lo mismo del paso 4, más lo que la Agencia pida.

## 6. ¿Corresponde informar a los titulares?

La comunicación directa a los afectados es **obligatoria** cuando la vulneración recae sobre:

- datos personales **sensibles**;
- datos de **niños y niñas menores de catorce años**;
- datos relativos a **obligaciones de carácter económico, financiero, bancario o comercial**.

Sevelin no trata ninguna de esas tres categorías: no recolecta datos sensibles, no trata datos de
menores de catorce, y el historial de compras pagadas no constituye una obligación económica o
comercial en el sentido de la norma. **Por eso, por regla general, la comunicación obligatoria a los
titulares no se gatillará** — lo que no impide informarles igual si es lo correcto, y en un caso
como una filtración de credenciales de cuenta, avisar es lo correcto aunque no sea obligatorio.

Si se comunica, debe ser en lenguaje claro y sencillo, singularizando los datos afectados, las
posibles consecuencias y las medidas de solución adoptadas. Se notifica a cada titular afectado; si
eso no fuera posible, mediante aviso en un medio de comunicación social masivo y de alcance
nacional.

## 7. Medidas correctivas

Arreglar la causa, no solo el síntoma: corregir el bug, rotar lo que quedó expuesto, cerrar el
acceso de más, agregar la validación que faltaba. Anotar cada medida en la bitácora — el artículo
exige registrar también las medidas "para precaver incidentes futuros".

## 8. Registro de evidencia

Guardar y conservar: logs relevantes (Vercel, Supabase), capturas del estado del sistema, el
intercambio con el proveedor, el reporte enviado a la Agencia y su acuse, y las comunicaciones a
los titulares si las hubo. Se conservan mientras pueda ser requerido acreditar el manejo del
incidente.

## 9. Seguimiento posterior

A los 30 días de cerrado el incidente, revisar: ¿la corrección quedó efectivamente aplicada en
producción? ¿aparecieron efectos que no se vieron al inicio? ¿hay que cambiar algo en
`POLITICA-SEGURIDAD-DATOS.md`? El incidente no se cierra hasta que esa revisión esté hecha y
anotada.

---

## Bitácora de incidentes

Sin incidentes registrados a la fecha.

<!-- Plantilla — copiar para cada incidente:

### YYYY-MM-DD — <título breve>

- **Detección:** fecha/hora, quién y cómo.
- **Naturaleza de la vulneración:** qué ocurrió.
- **Efectos:** qué alcanzó a pasar.
- **Categorías de datos afectadas:**
- **Número aproximado de titulares afectados:**
- **Contención:** qué se hizo y cuándo.
- **Evaluación de riesgo:** ¿riesgo razonable para los titulares? Sí/No y por qué.
- **Reporte a la Agencia:** Sí/No · fecha · medio · acuse.
- **Comunicación a titulares:** Sí/No · fundamento.
- **Medidas correctivas y de prevención:**
- **Evidencia guardada:** dónde.
- **Seguimiento a 30 días:** fecha y conclusión.
-->
