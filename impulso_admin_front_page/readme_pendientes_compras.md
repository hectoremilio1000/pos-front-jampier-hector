- Nombres y CTA claros: cambia “Nueva compra” por un split-button o modal inicial: + Traer del comisariato vs + Comprar a
  proveedor. Si mantienes un solo botón, abre un modal con dos tarjetas breves explicando qué hace cada opción.
- Encabezados/tab copy: renombra tabs a algo más explícito, ej. Órdenes a proveedor y Viajes de compra/comisariato. Agrega
  tooltips cortos en las pestañas: “Órdenes a proveedor: pedidos que generan factura/recepción” vs “Viajes: checklist para surtir
  desde comisariato o múltiples tiendas”.
- Flujo de decisión: al crear, pregunta primero “¿Origen del surtido?” con opciones (Comisariato / Proveedor / Mixto). Si eligen
  Comisariato, muestra disponibilidad y alertas de “No hay stock en comisariato → ¿quieres convertir a compra a proveedor?” antes
  de cerrar el viaje.
- Unir el flujo: un “Viaje” debería poder levantar múltiples órdenes ligadas (o convertir líneas sin stock a una orden a
  proveedor). Muestra en el viaje un panel de “Pendientes a comprar” vs “Tomar de comisariato”.
- Estado visible: en tablas, pinta status con color (draft, in-progress, received) y añade columna “Origen” o un badge por fila
  (Comisariato / Proveedor / Mixto) para que se entienda de un vistazo.
- Microcopys de campo: cambia “Compra (aplica)” por algo como “Fecha de entrega” o “Fecha de aplicación” y agrega placeholder o
  hint.
- Evitar confusión al recibir: si una orden es de comisariato, el botón “Recibir” debería decir “Registrar salida de comisariato”;
  si es a proveedor, “Recibir compra”. Diferencia el diálogo de recepción según origen.
- Mejora del botón Abrir en viajes: hazlo más descriptivo (“Abrir checklist” o “Abrir ruta”) y agrega columna “Proveedores/
  tiendas” o “Almacén destino” para saber qué cubre el viaje.

Si quieres lo más inmediato: 1) cambia el CTA “Nueva compra” a dos opciones con texto breve; 2) renombra tabs y agrega tooltips; 3) agrega badge de origen en las filas y colorea status. Con eso ya se reduce mucha confusión sobre “viaje” vs “compra”.

### pendientes conteo

Lista de conteos (tabla)

- Falta fecha/hora del conteo (cuándo se realizó). Es lo primero que alguien busca.
- El campo “Conteo” es ambiguo; podría ser “Conteo en” o “Fecha de conteo”.
- Agregaría # de ítems contados (rápido para saber tamaño del conteo).
- Agregaría Total diferencia ($) y Total diferencia (unidad base) para saber impacto.
- El status “closed” está bien, pero podrías mostrar quién cerró o cerrado el.
- Acción “Abrir” podría ser “Ver detalle” si ya está cerrado para evitar confusión.

Detalle / modal del conteo

- En el header, mostrar Almacén, Fecha de conteo, Status, Responsable.
- Mostrar Totales arriba: total diferencia (qty) + total costo (ya tienes costo).
- La sección “Agregar item” debería tener:
  - Filtro por presentación + item (ya existe), pero pondría también último conteo o stock teórico visible.
  - Botón “Agregar todo top 10” o “Agregar top faltantes” (si quieres velocidad).
- En “Items del conteo”:
  - Columna Teórico visible (ya).
  - Columna Contado editable inline (ya).
  - Agregar columna Unidad para que sea claro (kg, pza, lt).
  - Agregar columna Último conteo (si existe) para comparar.
  - La diferencia en rojo/verde ya ayuda; pondría también un badge de “sobrante/faltante”.
- Si el conteo está cerrado, desactivar edición y mostrarlo como lectura.

Flujo

- Crear conteo: pedir Almacén + Fecha/hora desde el inicio.
- Cerrar conteo: mostrar resumen (totales) y pedir confirmación.

Si te late, te propongo cambios concretos en UI y API.
Solo dime qué priorizamos:

1. Fechas/metadata en lista
2. Totales en header
3. Mejoras de tabla en detalle
4. Flujo de crear/cerrar conteo

Y te pido autorización antes de tocar código.
