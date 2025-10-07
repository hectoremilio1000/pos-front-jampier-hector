#### pruebas

1. Operación en piso (Comandero)

En POS Admin → 🛒 Punto de venta (o tu app Comandero):

Abrir mesa (ej. “C01-M5”, 2 personas).

Capturar productos (al menos 2 ítems de categorías diferentes).

Enviar comanda (debería imprimir/emitir a KDS según el printArea).

Verifica:

Dashboard Admin: sube Mesas abiertas y Órdenes activas.

KDS/Monitores (si tienes): los ítems aparecen por área.

📊 SQL rápido (opcional):

SELECT id, status, created_at FROM orders ORDER BY id DESC LIMIT 3;
SELECT order_id, product_id, qty FROM order_items ORDER BY id DESC LIMIT 5;

2. Cobro en caja (POS Cash)

En POS Cash → Órdenes (o en tu UI de cobro):

Seleccionar la mesa/orden creada.

Cobrar con efectivo (ideal 1 venta con propina y otra sin propina).

Asegúrate de estar enviando X-Shift-Id en el request (tu ensureShift() lo exige).

Verifica:

payments tiene la fila con shift_id, amount, payment_method_id.

La mesa queda cerrada / orden status='closed'.

📊 SQL rápido:

SELECT id, order_id, shift_id, amount FROM payments ORDER BY id DESC LIMIT 5;
SELECT id, status, closed_at FROM orders ORDER BY id DESC LIMIT 5;

3. Dashboard (KPIs por front)

Ventas de hoy, Tickets, Ticket promedio, Propina % deben moverse.

Horas pico debe reflejar la nueva venta en la hora actual.

Top productos muestra los ítems que acabas de vender.

Si algún KPI no cambia, revisa que orders incluya amount_total, tip_amount y closed_at (el hook de front deriva a partir de esos campos).

4. Auditoría de caja (en vivo)

En POS Cash → Turnos:

Registrar un movimiento de efectivo (IN/OUT) si ya tienes UI.

Verifica que cambia el expected_cash del turno.

En POS Admin → Cajas/Turnos Z:

Ver la estación con turno abierto y movimientos listados.

📊 SQL:

SELECT \* FROM cash_movements ORDER BY id DESC LIMIT 5;
SELECT id, opening_cash, expected_cash, difference FROM shifts ORDER BY id DESC LIMIT 3;

5. Cierre de turno (Z)

En POS Cash → Turnos → Cerrar turno:

Declara closingCash (igual o distinto al esperado para probar diferencia).

Verifica:

shifts con closed_at, status='CLOSED', difference.

shift_totals tenga acumulados por método de pago.

Si tienes closure_totals diarios, genera y valida.

📊 SQL:

SELECT id, closed_at, expected_cash, closing_cash, difference, status
FROM shifts ORDER BY id DESC LIMIT 3;

SELECT \* FROM shift_totals ORDER BY id DESC LIMIT 5;

6. Facturación (opcional ahora)

En Admin → Facturas (CFDI) emite una factura de la venta cerrada.

Verifica que se guarde con serie/folio (si ya lo tienes), y el PDF/UUID si timbras.

7. Alertas/Infra

Alertas (Dashboard): si dejas una mesa >3h sin cobrar, debe salir aviso.

Infraestructura: desconecta temporalmente una impresora/monitor para probar alerta (si reportas last_seen_at).

8. Dependientes (si los usarás)

Crea estación DEPENDENT (ej. “C02 BAR”).

Intenta abrir turno en DEPENDENT:

Si tu política es “depende de MASTER”, debe esperar a que MASTER esté abierto (ya lo marca tu UI).

Si implementas turnos independientes por estación, valida station_id correcto en shifts.

Si algo falla, mira aquí 👇

Turno no abre: revisa asignación (pivot station_users) y que /shifts/open valide userId contra esa estación.

No aparecen cajeros: endpoint /users/cashiers debe recibir roles=cashier,owner,admin (ya lo hiciste) y filtra por restaurantId.

KPI no cambia: confirma que el cobro marca orders.status='closed' y setea amount_total, closed_at.

Error de enum: ya blindaste shift_status y movement_type con existingType:true o specificType().
