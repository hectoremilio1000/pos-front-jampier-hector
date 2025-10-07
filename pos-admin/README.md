### lista de permisos hacer por roles!!

###

"owner", "admin", definir bien que es cada cosa por ejemplo dueño y gerente

###meter en mi pos
🧭 Fronts y quién entra a cada uno

pos-admin (config & análisis)

Acceso: owner, admin, manager

Vistas: Inicio (Dashboard/Reportes), Administración (Usuarios, Facturas, Métodos de pago, Parámetros fiscales, Roles\*), Operación (Cajas/Mesas/Órdenes), Menú (Productos + tabs internas), Infraestructura (Áreas impresión, Monitores, Pairing), General (Configuración).

pos-cash (cajas/turnos/pagos)

Acceso: cashier, manager, admin

Vistas: abrir/cerrar turno, cobros, cortes Z.

pos-comandero (piso/captura)

Acceso: waiter, manager

Vistas: abrir mesa, capturar comanda, enviar a impresión.

pos-monitor (KDS/Expo)

Acceso: kds_kitchen, kds_bar, expo (o vía pairing de dispositivo)

Vistas: cola de producción por área, estados.

\*“Roles y permisos” en Administración será solo gestión de roles (no permisos finos), o lo omitimos si no quieres que el dueño cambie roles.

### estructura sidebar

🚀Inicio
🏠 Dashboard
📊 Reportes

🛒 Punto de venta

📘 Administración
💵 Cajas / Turnos Z
👥 Usuarios
🧾 Facturas (CFDI)
💳 Métodos de pago y Propinas
⏰ Parámetros fiscales
💵 Cuentas (histórico / auditoría)

📦 Catálogo
📑 Grupos
🗂️ Categorías
🍩 Productos
🧩 Subgrupos
🎛️ Modificadores
🍽️ Mesas (Administración)

🛠️ Infraestructura
🖨️ Áreas de impresión
🖥️ Monitores de producción
🔗 KDS Pairing

### DASHBOARD

🟦 Fila 1 – Tarjetas principales (KPIs rápidos)

💵 Ventas de hoy (MXN)

🍽️ Tickets/Mesas atendidas

📊 Ticket promedio

💸 Propina % promedio

👉 Tarjetas grandes, color de fondo según estado (verde 🔼, rojo 🔽), número en grande y debajo un mini comparativo “vs. ayer”.

🟩 Fila 2 – Estado operativo (en vivo)

En un bloque tipo “panel de control”:

Cajas abiertas → nombre del cajero, saldo actual.

Mesas abiertas → total y por área (Comedor, Terraza, Bar).

Órdenes activas → cocina, barra, expo (con chips de colores).

Staff en turno → lista corta de meseros/cajeros activos (nombre + emoji de rol).

👉 Todo como numeritos y chips claros, no tablas.

🟨 Fila 3 – Visualización rápida

Top 5 productos más vendidos (lista con cantidades y $).

Categorías más fuertes (ej. bebidas vs. alimentos, gráfico de barras).

Horas pico del día (mini gráfico lineal de horas).

👉 Esto ayuda a responder la pregunta del dueño: “¿qué se está moviendo hoy?”.

🟥 Fila 4 – Alertas simples

Tarjetas pequeñas con icono ❗:

Mesas sin cobrar después de 3h.

Impresora sin papel.

Caja con diferencia provisional.

CFDI o CSD por vencer.

👉 Que sean obvias: icono grande, color rojo/amarillo, texto corto.

🟧 Fila 5 – Acciones rápidas

Botones grandes estilo call-to-action:

🛒 Abrir Punto de venta

🧾 Emitir factura

📈 Reporte detallado del día

👉 Siempre visibles, accesibles en un clic.

🎨 Estilo visual

Moderno pero simple → tarjetas planas, iconos grandes, colores primarios.

Lenguaje claro → “Mesas abiertas”, no “Active sessions”.

Semáforo visual → verde = bien, rojo = mal, amarillo = alerta.

Adaptado a móvil → KPIs primero, scroll para lo demás.

📌 Con esto, un restaurantero que no domina tecnología puede entrar y en 10 segundos ver:

Cuánto lleva vendido.

Cuántas mesas tiene.

Qué productos se están vendiendo más.

Si hay alguna alerta.

Y un botón grande para abrir ventas o sacar reporte.
