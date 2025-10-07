### checklist para ir viendo que pasa

📝 Checklist de flujos iniciales de un dueño

1. Configuración básica del restaurante

Entrar a Administración → Cajas / Turnos Z → ¿Puedo ver que no hay turno abierto? ¿Puedo abrir uno nuevo?

Ir a Parámetros fiscales → ¿Puedo definir hora de corte, IVA, moneda?

Revisar Métodos de pago y propinas → ¿Están activos efectivo, tarjeta, transferencia? ¿Puedo habilitar/deshabilitar?

👉 Esto asegura que el restaurante queda con reglas claras para cobrar.

2. Alta de usuarios y roles

En Usuarios crear un mesero.

Crear un cajero.

Crear un gerente.

Confirmar que puedo asignar roles correctos y que se guardan en DB (con /api/users).

👉 Flujo intuitivo: 2–3 clics, formulario simple.

3. Mesas y áreas

Ir a Catálogo → Mesas (Administración) → ¿Puedo crear áreas (Comedor, Terraza)?

Crear mesas con numeración y capacidad.

Revisar que aparecen en /api/tables y /api/areas.

👉 Esto valida que al abrir servicio el día de mañana, el mesero pueda abrir una mesa.

4. Productos y catálogo

En Catálogo → Categorías crear “Bebidas” y “Alimentos”.

En Grupos crear “Cervezas”, “Entradas”.

En Subgrupos opcionalmente crear variaciones (ej. “Artesanales”).

En Productos agregar un producto sencillo (ej. Corona 355ml, $50).

Ver que el código se genera bien (y que se guarda en DB).

Probar un modificador (ej. Limón extra).

👉 Intuitivo si cada paso tarda menos de 1 min y el producto queda listo para venta.

5. Punto de venta (operación real)

Ir a 🛒 Punto de venta.

Abrir una mesa recién creada.

Capturar el producto “Corona 355ml” desde catálogo.

Enviar comanda.

Revisar que el Dashboard ahora refleja una mesa abierta y 1 orden activa.

👉 Esto valida que admin + comandero + order-api se hablan bien.

6. Cierre de turno y caja

Ir a Administración → Cajas / Turnos Z.

Revisar que el turno abierto muestra ingresos de ventas.

Hacer cierre de turno.

Ver que en Dashboard ya no aparece caja activa y que hay registro en “Cortes Z históricos”.

👉 Con esto validas el ciclo completo: abrir → vender → cerrar.

7. Facturación

En Facturas (CFDI) emitir una factura de una venta cerrada.

Revisar que se guarda con serie, folio y cliente fiscal.

👉 Importante para dueños que necesitan timbrar facturas.

8. Validación de Dashboard

En el Dashboard ver que:

Ventas de hoy suben al registrar orden.

Tickets/Mesas aumentan.

Ticket promedio cambia.

Propina % se mueve si agrego propina en un pago.

Estado operativo (mesas, órdenes, caja) refleja en tiempo real.

Si dejo una mesa abierta más de 3h, aparece alerta.

👉 Checklist de UX: ¿el dueño entiende todo con solo ver el dashboard 10 segundos?

🔍 Cómo probar intuitividad

Cuando hagas este checklist:

Simula que nunca usaste un POS → ¿entiendes dónde hacer clic solo leyendo etiquetas/íconos?

Mide tiempo → Alta de producto + apertura de mesa + captura de venta debería tardar menos de 5 minutos.

Observa consistencia → Todos los CRUD deben verse y sentirse iguales (modal crear, tabla con editar/eliminar).

📌 Con este checklist puedes detectar rápido qué está funcionando y qué no en tu POS Admin.

¿Quieres que te arme este checklist en formato tabla paso a paso (acción → endpoint involucrado → éxito esperado) para que sirva también a tu QA/testers?
