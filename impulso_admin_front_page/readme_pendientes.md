2. Si quieres evaluación real con IA, agrega OPENAI_API_KEY (y opcional OPENAI_MODEL) al .env del back.

• La vista se entiende, pero hay áreas para pulir la experiencia de Insumos y Presentaciones:

- Claridad de columnas: “Unidad base” y “Tipo” son claros; podrías agregar la unidad en el título de Presentaciones (ej.
  “Contenido (base, g/ml/pza)”) para reforzar la conversión.

### cambios puntuales

- Form de Presentaciones: los labels son buenos; podrías bloquear el submit hasta tener contenido base > 0 y mostrar el preview
  (“1 Botella = X unidad base”) siempre visible arriba para evitar errores.
- Costos: muestra la moneda en el header “Costo std (MXN)” y añade un tag de proveedor default si ya existe; ayuda a quien captura
  a saber qué proveedor afecta.
- Filtros: en Insumos, además de búsqueda, un filtro rápido por Grupo/Tipo aliviaría listas largas sin perder el autocompletado de
  código/nombre.

### ciclo completo

Puntos de fricción del flujo actual (insumo → presentación → proveedor):

- Salto mental entre pantallas: creas el insumo, luego entras a Presentaciones, luego a Proveedores. Cada paso abre otro drawer/
  modal y el usuario pierde el hilo. Riesgo: cerrar sin guardar, o no notar que falta configurar proveedor.
- Orden invertido para costos: los costos viven en la presentación, pero el proveedor se agrega después y en otra pestaña; es
  fácil que alguien guarde sin proveedor default y luego no entienda por qué no hay último costo o tag en la tabla.
- Duplicación de campos de costo: en “Compra/Costos” tienes costo estándar y botón de “usar último costo”, pero el último costo
  depende del proveedor que se configura en otra pestaña. La dependencia no es obvia.
- Descubribilidad del default: en la tabla de presentaciones apenas se ve el tag Default; igual pasa con el proveedor default, que
  ahora se muestra dentro de la columna de costo. Si hay muchas filas, cuesta verlo.

Mejoras rápidas sin re-arquitectura:

- Wizard corto al crear presentación: un solo flujo en el modal con pasos “Datos básicos” → “Costos y proveedor” → “Confirmar”.
  Así el usuario no guarda la presentación sin proveedor default si el costo depende de él.
- CTA directo desde la lista: en la tabla de insumos, botón “Nueva presentación” que abre el modal ya con el insumo seleccionado,
  sin pasar por otro drawer.
- Preseleccionar proveedor cuando solo hay uno: si la API devuelve un único proveedor activo, autoseleccionarlo como default y
  mostrarlo en el modal.
- Validaciones amigables: no permitir guardar presentación con costo estándar vacío si se marcó “Presentación de compra habitual”;
  o guiar a “Selecciona proveedor default o confirma que no lo tienes”.

Mejoras de diseño/info:

- En la tabla de presentaciones, mostrar dos tags compactos: Default (si aplica) y Proveedor (nombre). Dejar el costo en primera
  línea y tags en una segunda línea más ligera.
- En la pestaña de Proveedores, resaltar el default con un fondo suave y mover el botón “Hacer default” a un menú o a la fila,
  evitando clics repetidos.
- Copia de ayuda inline: en “Compra/Costos” un aviso: “Selecciona el proveedor default para calcular el último costo y actualizar
  el estándar”.

Si quieres algo más profundo:

1. Convertir el modal en flujo por pasos (no pestañas).
2. Traer los proveedores justo al abrir el modal y permitir crear presentación + default en un solo submit.
3. Añadir aviso/blocker: si guardas sin proveedor default y marcaste “compra habitual”, mostrar confirmación “Guardar sin
   proveedor default” con texto de riesgo.

Dime si quieres que implemente el paso a paso en el modal o alguna validación específica.
